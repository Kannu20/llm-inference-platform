// src/api/controllers/DashboardController.ts
import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../../services/analytics/AnalyticsService';
import { ProviderFactory } from '../../services/providers/ProviderFactory';
import { logService } from '../../services/logging/LogService';
import { ApiResponse } from '../../types';

export class DashboardController {
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const window = parseInt(req.query.window as string) || 60; // minutes
      const metrics = await analyticsService.getDashboardMetrics(window);

      res.json({ success: true, data: metrics } as ApiResponse);
    } catch (err) {
      next(err);
    }
  }

  async getProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const available = ProviderFactory.getAvailableProviders();
      const defaults = ProviderFactory.getDefaultModels();
      res.json({ success: true, data: { available, defaults } });
    } catch (err) {
      next(err);
    }
  }

  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queueHealth = await logService.getQueueHealth();
      res.json({
        success: true,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          queue: queueHealth,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
