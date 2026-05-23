// src/events/eventBus.ts
// Central event bus using Node.js EventEmitter for in-process events
// Redis connection singleton shared across BullMQ queues and workers

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// In-process event bus for local pub/sub
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

// Redis connection singleton
let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(config.redis.url, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisConnection.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return redisConnection;
}

// Typed event definitions
export const Events = {
  LOG_INGESTED: 'log:ingested',
  CONVERSATION_CREATED: 'conversation:created',
  MESSAGE_CREATED: 'message:created',
  STREAM_CHUNK: 'stream:chunk',
  STREAM_DONE: 'stream:done',
  ANALYTICS_UPDATE: 'analytics:update',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
