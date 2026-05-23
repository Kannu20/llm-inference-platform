// src/services/logging/LogService.ts
// Handles log ingestion: validates, redacts PII, enqueues to BullMQ
// Non-blocking: enqueue returns immediately, worker handles DB write

import { Queue } from 'bullmq';
import { config } from '../../config';
import { InferenceLogPayload } from '../../types';
import { PIIRedactor } from './PIIRedactor';
import { getRedisConnection } from '../../events/eventBus';
import prisma from '../../db/prismaClient';
import logger from '../../utils/logger';

export class LogService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue(config.queue.logQueueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: config.queue.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: config.queue.backoffDelay,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }

  /**
   * Enqueue a log for async processing.
   * Applies PII redaction to previews before queuing.
   * Returns the job ID immediately — non-blocking.
   */
  async enqueue(payload: InferenceLogPayload): Promise<string> {
    // Redact PII from previews before any storage
    const sanitized: InferenceLogPayload = {
      ...payload,
      inputPreview: payload.inputPreview
        ? PIIRedactor.preview(payload.inputPreview)
        : undefined,
      outputPreview: payload.outputPreview
        ? PIIRedactor.preview(payload.outputPreview)
        : undefined,
    };

    const job = await this.queue.add('process-log', sanitized, {
      priority: 10,
    });

    return job.id || 'unknown';
  }

  /**
   * Direct write — used by the BullMQ worker after dequeue.
   * Not called directly from API route.
   */
  async writeToDatabase(payload: InferenceLogPayload): Promise<void> {
    await prisma.inferenceLog.create({
      data: {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        sessionId: payload.sessionId,
        provider: payload.provider,
        model: payload.model,
        status: payload.status,
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        totalTokens: payload.totalTokens,
        latencyMs: payload.latencyMs,
        requestDurationMs: payload.requestDurationMs,
        startedAt: new Date(payload.startedAt),
        completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
        inputPreview: payload.inputPreview,
        outputPreview: payload.outputPreview,
        isStreaming: payload.isStreaming ?? false,
        errorMessage: payload.errorMessage,
        errorCode: payload.errorCode,
        metadata: payload.metadata as any,
      },
    });

    logger.debug({ conversationId: payload.conversationId }, 'Log written to database');
  }

  async getLogs(params: {
    page: number;
    limit: number;
    provider?: string;
    status?: string;
    conversationId?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: any = {};

    if (params.provider) where.provider = params.provider;
    if (params.status) where.status = params.status;
    if (params.conversationId) where.conversationId = params.conversationId;

    const [logs, total] = await Promise.all([
      prisma.inferenceLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: params.limit,
      }),
      prisma.inferenceLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getQueueHealth() {
    const [waiting, active, failed, completed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
      this.queue.getCompletedCount(),
    ]);
    return { waiting, active, failed, completed };
  }
}

export const logService = new LogService();
