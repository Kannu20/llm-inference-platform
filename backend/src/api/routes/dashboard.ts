// src/api/routes/dashboard.ts
import { Router } from 'express';
import { dashboardController } from '../controllers/DashboardController';

const router = Router();

router.get('/', dashboardController.getMetrics.bind(dashboardController));
router.get('/providers', dashboardController.getProviders.bind(dashboardController));
router.get('/health', dashboardController.getHealth.bind(dashboardController));

export default router;
