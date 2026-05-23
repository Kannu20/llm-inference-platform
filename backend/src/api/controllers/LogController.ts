// src/api/controllers/LogController.ts
import { Request, Response, NextFunction } from 'express';
import { InferenceLogSchema, LogQuerySchema } from '../validators/logSchema';
import { logService } from '../../services/logging/LogService';
import { ApiResponse } from '../../types';
import logger from '../../utils/logger';

export class LogController {
  /**
   * POST /api/logs
   * Accepts a single inference log payload from the SDK.
   * Validates, enqueues, returns immediately (non-blocking).
   */
  async ingest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = InferenceLogSchema.parse(req.body);
      const jobId = await logService.enqueue(payload);

      const response: ApiResponse = {
        success: true,
        message: 'Log accepted',
        data: { jobId },
      };
      res.status(202).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/logs/batch
   * Batch ingest up to 100 logs at once (SDK failure queue drain).
   */
  async batchIngest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payloads = req.body;
      if (!Array.isArray(payloads) || payloads.length > 100) {
        res.status(400).json({ success: false, error: 'Expected array of up to 100 logs' });
        return;
      }

      const parsed = payloads.map(p => InferenceLogSchema.parse(p));
      const jobIds = await Promise.all(parsed.map(p => logService.enqueue(p)));

      res.status(202).json({ success: true, data: { jobIds, count: jobIds.length } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/logs
   * Paginated log listing with optional filters.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = LogQuerySchema.parse(req.query);
      const { logs, total } = await logService.getLogs(query);

      const response: ApiResponse = {
        success: true,
        data: logs,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
        },
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/logs/health
   * Returns BullMQ queue health stats.
   */
  async queueHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await logService.getQueueHealth();
      res.json({ success: true, data: health });
    } catch (err) {
      next(err);
    }
  }
}

export const logController = new LogController();
