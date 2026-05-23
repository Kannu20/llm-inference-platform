// src/api/routes/chat.ts
import { Router } from 'express';
import { chatController } from '../controllers/ChatController';
import { chatRateLimiter } from '../../middleware/rateLimit';

const router = Router();

router.post('/message', chatRateLimiter, chatController.sendMessage.bind(chatController));

export default router;
