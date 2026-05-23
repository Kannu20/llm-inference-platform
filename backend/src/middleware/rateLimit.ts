// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { ApiResponse } from '../types';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const response: ApiResponse = {
      success: false,
      error: 'Too many requests. Please slow down.',
    };
    res.status(429).json(response);
  },
});

// Stricter limiter for log ingestion endpoint
export const logIngestionLimiter = rateLimit({
  windowMs: 60_000,
  max: 1000, // SDKs can send many logs per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-session-id'] as string || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Log rate limit exceeded' });
  },
});

// Chat endpoint limiter — per session
export const chatRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyGenerator: (req) => req.headers['x-session-id'] as string || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Chat rate limit exceeded. Max 30 messages/minute.' });
  },
});
