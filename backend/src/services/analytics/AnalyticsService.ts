// src/services/analytics/AnalyticsService.ts
// Computes dashboard metrics from inference_logs table
// Uses raw SQL for percentile calculations (Prisma doesn't support PERCENTILE_CONT)

import prisma from '../../db/prismaClient';
import { DashboardMetrics, Provider } from '../../types';

export class AnalyticsService {
  /**
   * Returns the full dashboard metrics object.
   * Combines multiple queries — results are cached by caller via Redis.
   */
  async getDashboardMetrics(windowMinutes = 60): Promise<DashboardMetrics> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const [
      totals,
      providerUsage,
      tokenUsage,
      latencyStats,
      recentLogs,
      latencyOverTime,
    ] = await Promise.all([
      this.getTotals(since),
      this.getProviderUsage(since),
      this.getTokenUsage(since),
      this.getLatencyStats(since),
      this.getRecentLogs(20),
      this.getLatencyOverTime(since),
    ]);

    const total = totals.total || 0;
    const successCount = totals.success || 0;
    const errorCount = totals.error || 0;
    const windowSeconds = windowMinutes * 60;

    return {
      totalRequests: total,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
      errorRate: total > 0 ? (errorCount / total) * 100 : 0,
      avgLatencyMs: latencyStats.avg || 0,
      requestsPerMinute: total / windowMinutes,
      providerUsage,
      tokenUsage: {
        input: tokenUsage.input || 0,
        output: tokenUsage.output || 0,
        total: tokenUsage.total || 0,
      },
      throughput: total / windowSeconds,
      recentLogs,
      latencyOverTime,
    };
  }

  private async getTotals(since: Date) {
    const result = await prisma.inferenceLog.groupBy({
      by: ['status'],
      where: { startedAt: { gte: since } },
      _count: { id: true },
    });

    const map = Object.fromEntries(
      result.map(r => [r.status.toLowerCase(), r._count.id])
    );

    return {
      total: Object.values(map).reduce((a, b) => a + b, 0),
      success: map['success'] || 0,
      error: map['error'] || 0,
      cancelled: map['cancelled'] || 0,
    };
  }

  private async getProviderUsage(since: Date): Promise<Record<Provider, number>> {
    const result = await prisma.inferenceLog.groupBy({
      by: ['provider'],
      where: { startedAt: { gte: since } },
      _count: { id: true },
    });

    const usage: Partial<Record<Provider, number>> = {};
    for (const r of result) {
      usage[r.provider as Provider] = r._count.id;
    }
    return usage as Record<Provider, number>;
  }

  private async getTokenUsage(since: Date) {
    const result = await prisma.inferenceLog.aggregate({
      where: { startedAt: { gte: since }, status: 'SUCCESS' },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    });

    return {
      input: result._sum.inputTokens || 0,
      output: result._sum.outputTokens || 0,
      total: result._sum.totalTokens || 0,
    };
  }

  private async getLatencyStats(since: Date) {
    const result = await prisma.inferenceLog.aggregate({
      where: {
        startedAt: { gte: since },
        status: 'SUCCESS',
        latencyMs: { not: null },
      },
      _avg: { latencyMs: true },
      _min: { latencyMs: true },
      _max: { latencyMs: true },
    });

    return {
      avg: result._avg.latencyMs,
      min: result._min.latencyMs,
      max: result._max.latencyMs,
    };
  }

  private async getRecentLogs(limit: number) {
    return prisma.inferenceLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  private async getLatencyOverTime(since: Date) {
    // Group by 5-minute buckets using raw SQL
    const rows = await prisma.$queryRaw<Array<{ bucket: Date; avg: number; p95: number }>>`
      SELECT
        date_trunc('hour', started_at) + 
          INTERVAL '5 min' * FLOOR(EXTRACT(MINUTE FROM started_at) / 5) AS bucket,
        AVG(latency_ms)::float AS avg,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::float AS p95
      FROM inference_logs
      WHERE started_at >= ${since}
        AND status = 'SUCCESS'
        AND latency_ms IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return rows.map(r => ({
      time: r.bucket.toISOString(),
      avg: Math.round(r.avg),
      p95: Math.round(r.p95),
    }));
  }

  /**
   * Aggregate hourly snapshot — called by analytics worker
   */
  async aggregateHourlySnapshot(hour: Date): Promise<void> {
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    const groups = await prisma.inferenceLog.groupBy({
      by: ['provider', 'model'],
      where: {
        startedAt: { gte: hourStart, lt: hourEnd },
      },
      _count: { id: true },
      _avg: { latencyMs: true },
      _sum: { inputTokens: true, outputTokens: true },
    });

    for (const group of groups) {
      const successCount = await prisma.inferenceLog.count({
        where: {
          startedAt: { gte: hourStart, lt: hourEnd },
          provider: group.provider,
          model: group.model,
          status: 'SUCCESS',
        },
      });
      const errorCount = await prisma.inferenceLog.count({
        where: {
          startedAt: { gte: hourStart, lt: hourEnd },
          provider: group.provider,
          model: group.model,
          status: 'ERROR',
        },
      });

      await prisma.analyticsSnapshot.upsert({
        where: {
          period_provider_model: {
            period: hourStart,
            provider: group.provider,
            model: group.model,
          },
        },
        update: {
          totalRequests: group._count.id,
          successCount,
          errorCount,
          avgLatencyMs: group._avg.latencyMs || 0,
          totalInputTokens: group._sum.inputTokens || 0,
          totalOutputTokens: group._sum.outputTokens || 0,
        },
        create: {
          period: hourStart,
          provider: group.provider,
          model: group.model,
          totalRequests: group._count.id,
          successCount,
          errorCount,
          avgLatencyMs: group._avg.latencyMs || 0,
          totalInputTokens: group._sum.inputTokens || 0,
          totalOutputTokens: group._sum.outputTokens || 0,
        },
      });
    }
  }
}

export const analyticsService = new AnalyticsService();
