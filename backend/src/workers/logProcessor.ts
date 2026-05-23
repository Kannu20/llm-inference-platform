// src/workers/logProcessor.ts
// BullMQ worker: dequeues inference logs and writes to PostgreSQL
// Runs in the same process but handles jobs asynchronously
// Retry with exponential backoff, failed jobs stay in dead-letter queue

import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { InferenceLogPayload } from '../types';
import { logService } from '../services/logging/LogService';
import { analyticsService } from '../services/analytics/AnalyticsService';
import { eventBus, Events, getRedisConnection } from '../events/eventBus';
import logger from '../utils/logger';

export function startLogProcessorWorker(): Worker {
  const worker = new Worker<InferenceLogPayload>(
    config.queue.logQueueName,
    async (job: Job<InferenceLogPayload>) => {
      const payload = job.data;

      logger.debug({ jobId: job.id, conversationId: payload.conversationId }, 'Processing log job');

      await logService.writeToDatabase(payload);

      // Emit in-process event so Socket.io can push to dashboard clients
      eventBus.emit(Events.LOG_INGESTED, payload);
    },
    {
      connection: getRedisConnection(),
      concurrency: 10, // Process up to 10 logs simultaneously
      limiter: {
        max: 500,
        duration: 1000, // Max 500 DB writes/second
      },
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Log job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Log job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Log worker error');
  });

  logger.info('Log processor worker started');
  return worker;
}

// ─────────────────────────────────────────────────────────────
// Analytics worker — runs hourly aggregation
// ─────────────────────────────────────────────────────────────
export function startAnalyticsWorker(): Worker {
  const worker = new Worker(
    config.queue.analyticsQueueName,
    async (job: Job) => {
      const { hour } = job.data as { hour: string };
      logger.info({ hour }, 'Running hourly analytics aggregation');
      await analyticsService.aggregateHourlySnapshot(new Date(hour));
    },
    {
      connection: getRedisConnection(),
      concurrency: 1, // Serial analytics aggregation to avoid race conditions
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Analytics job failed');
  });

  logger.info('Analytics worker started');
  return worker;
}
