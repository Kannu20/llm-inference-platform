// src/api/controllers/ConversationController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../db/prismaClient';
import { AppError } from '../../middleware/errorHandler';
import { ApiResponse } from '../../types';

export class ConversationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const skip = (page - 1) * limit;

      const where: any = { isArchived: false };
      if (sessionId) where.sessionId = sessionId;

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          include: {
            _count: { select: { messages: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { content: true, role: true, createdAt: true },
            },
          },
        }),
        prisma.conversation.count({ where }),
      ]);

      res.json({
        success: true,
        data: conversations,
        meta: { page, limit, total },
      } as ApiResponse);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) throw new AppError('Conversation not found', 404);

      res.json({ success: true, data: conversation } as ApiResponse);
    } catch (err) {
      next(err);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.conversation.update({
        where: { id },
        data: { isArchived: true },
      });
      res.json({ success: true, message: 'Conversation archived' });
    } catch (err) {
      next(err);
    }
  }

  async updateTitle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const updated = await prisma.conversation.update({
        where: { id },
        data: { title },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const conversationController = new ConversationController();
