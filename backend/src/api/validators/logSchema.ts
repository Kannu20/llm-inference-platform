// src/api/validators/logSchema.ts
import { z } from 'zod';

const ProviderEnum = z.enum(['GEMINI', 'OPENAI', 'CLAUDE', 'GROK', 'OPENROUTER']);
const StatusEnum = z.enum(['PENDING', 'SUCCESS', 'ERROR', 'CANCELLED', 'STREAMING']);

export const InferenceLogSchema = z.object({
  messageId: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  provider: ProviderEnum,
  model: z.string().min(1).max(100),
  status: StatusEnum,
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  latencyMs: z.number().int().min(0).optional(),
  requestDurationMs: z.number().int().min(0).optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  inputPreview: z.string().max(500).optional(),
  outputPreview: z.string().max(500).optional(),
  isStreaming: z.boolean().optional().default(false),
  errorMessage: z.string().max(1000).optional(),
  errorCode: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const LogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  provider: ProviderEnum.optional(),
  status: StatusEnum.optional(),
  conversationId: z.string().uuid().optional(),
});

// src/api/validators/chatSchema.ts
export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(32000),
      })
    )
    .min(1)
    .max(200),
  provider: ProviderEnum.default('OPENROUTER'),
  model: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().max(4000).optional(),
  stream: z.boolean().optional().default(true),
});

export const NewConversationSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  provider: ProviderEnum.optional().default('OPENROUTER'),
  model: z.string().optional(),
  systemPrompt: z.string().max(4000).optional(),
});
