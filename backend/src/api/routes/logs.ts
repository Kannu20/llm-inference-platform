// src/api/routes/logs.ts
import { Router } from 'express';
import { logController } from '../controllers/LogController';
import { logIngestionLimiter } from '../../middleware/rateLimit';

const router = Router();

router.post('/', logIngestionLimiter, logController.ingest.bind(logController));
router.post('/batch', logIngestionLimiter, logController.batchIngest.bind(logController));
router.get('/', logController.list.bind(logController));
router.get('/health', logController.queueHealth.bind(logController));

export default router;
