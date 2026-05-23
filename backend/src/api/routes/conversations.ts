// src/api/routes/conversations.ts
import { Router } from 'express';
import { conversationController } from '../controllers/ConversationController';

const router = Router();

router.get('/', conversationController.list.bind(conversationController));
router.get('/:id', conversationController.getById.bind(conversationController));
router.delete('/:id', conversationController.archive.bind(conversationController));
router.patch('/:id/title', conversationController.updateTitle.bind(conversationController));

export default router;
