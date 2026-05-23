// src/api/controllers/ChatController.ts
// Handles streaming and non-streaming chat completions.
// Creates conversation + message records, then calls provider.
// Log is sent to queue after response completes.

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ChatRequestSchema } from '../validators/logSchema';
import { ProviderFactory } from '../../services/providers/ProviderFactory';
import { logService } from '../../services/logging/LogService';
import { PIIRedactor } from '../../services/logging/PIIRedactor';
import prisma from '../../db/prismaClient';
import { ApiResponse, InferenceLogPayload, StreamChunk } from '../../types';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

export class ChatController {
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ChatRequestSchema.parse(req.body);
      const { messages, provider, model, sessionId, systemPrompt, stream } = body;
      console.log("STREAM VALUE:", stream);

      if (stream) {
        console.log("Entered stream block");
      } else {
        console.log("Entered non-stream block");
      }
      let { conversationId } = body;

      // Resolve or create conversation
      let conversation;
      if (conversationId) {
        conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conversation) throw new AppError('Conversation not found', 404);
      } else {
        // Auto-create session if it doesn't exist
        await prisma.session.upsert({
          where: { id: sessionId },
          update: { lastActiveAt: new Date() },
          create: { id: sessionId },
        });

        conversation = await prisma.conversation.create({
          data: {
            sessionId,
            provider,
            model: model || ProviderFactory.getDefaultModels()[provider],
            systemPrompt,
            title: messages[0]?.content?.slice(0, 60) || 'New Conversation',
          },
        });
        conversationId = conversation.id;
      }

      // Save user message to DB
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversationId!,
          role: 'user',
          content: messages[messages.length - 1].content,
        },
      });

      // Initialize provider
      const providerInstance = ProviderFactory.create(provider, { model });
      if (!providerInstance.isAvailable()) {
        throw new AppError(`Provider ${provider} is not configured`, 400);
      }

      const logId = uuidv4();
      const messageId = uuidv4();
      const startedAt = new Date();
      let firstByteTime: number | null = null;

      if (stream) {
        // ── Streaming mode ─────────────────────────────────────
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Conversation-Id', conversationId!);

        // Send conversation ID immediately so client can track
        res.write(
          `data: ${JSON.stringify({ type: 'meta', conversationId, logId })}\n\n`
        );

        let fullContent = '';
        const abortController = new AbortController();

        req.on('close', () => abortController.abort());

        try {
          const providerResponse = await providerInstance.stream(
            messages,
            systemPrompt,
            (chunk: StreamChunk) => {
              if (chunk.type === 'content') {
                if (firstByteTime === null) firstByteTime = Date.now();
                fullContent += chunk.content;
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              } else if (chunk.type === 'done') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
              }
            },
            abortController.signal
          );

          const completedAt = new Date();
          const latencyMs = firstByteTime ? firstByteTime - startedAt.getTime() : null;
          const requestDurationMs = completedAt.getTime() - startedAt.getTime();

          // Save assistant message
          await prisma.message.create({
            data: {
              id: messageId,
              conversationId: conversationId!,
              role: 'assistant',
              content: fullContent,
              tokenCount: providerResponse.outputTokens,
            },
          });

          // Enqueue inference log — non-blocking
          const logPayload: InferenceLogPayload = {
            messageId,
            conversationId: conversationId!,
            sessionId,
            provider,
            model: providerResponse.model,
            status: abortController.signal.aborted ? 'CANCELLED' : 'SUCCESS',
            inputTokens: providerResponse.inputTokens,
            outputTokens: providerResponse.outputTokens,
            totalTokens: providerResponse.totalTokens,
            latencyMs: latencyMs ?? undefined,
            requestDurationMs,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            inputPreview: PIIRedactor.preview(messages[messages.length - 1].content),
            outputPreview: PIIRedactor.preview(fullContent),
            isStreaming: true,
            metadata: { finishReason: providerResponse.finishReason },
          };

          await logService.enqueue(logPayload);
        } catch (streamErr) {
          const errMsg = streamErr instanceof Error ? streamErr.message : 'Stream error';
          res.write(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`);
          res.end();

          // Log the error
          await logService.enqueue({
            conversationId: conversationId!,
            sessionId,
            provider,
            model: model || ProviderFactory.getDefaultModels()[provider],
            status: 'ERROR',
            startedAt: startedAt.toISOString(),
            errorMessage: errMsg,
            isStreaming: true,
            inputPreview: PIIRedactor.preview(messages[messages.length - 1].content),
          });
        }
      } else {
        // ── Non-streaming mode ──────────────────────────────────
        const providerResponse = await providerInstance.chat(messages, systemPrompt);
        const completedAt = new Date();

        await prisma.message.create({
          data: {
            id: messageId,
            conversationId: conversationId!,
            role: 'assistant',
            content: providerResponse.content,
            tokenCount: providerResponse.outputTokens,
          },
        });

        await logService.enqueue({
          messageId,
          conversationId: conversationId!,
          sessionId,
          provider,
          model: providerResponse.model,
          status: 'SUCCESS',
          inputTokens: providerResponse.inputTokens,
          outputTokens: providerResponse.outputTokens,
          totalTokens: providerResponse.totalTokens,
          requestDurationMs: completedAt.getTime() - startedAt.getTime(),
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          inputPreview: PIIRedactor.preview(messages[messages.length - 1].content),
          outputPreview: PIIRedactor.preview(providerResponse.content),
          isStreaming: false,
        });

        const response: ApiResponse = {
          success: true,
          data: {
            conversationId,
            messageId,
            content: providerResponse.content,
            usage: {
              inputTokens: providerResponse.inputTokens,
              outputTokens: providerResponse.outputTokens,
              totalTokens: providerResponse.totalTokens,
            },
          },
        };
        res.json(response);
      }
    } catch (err) {
      next(err);
    }
  }
}

export const chatController = new ChatController();
