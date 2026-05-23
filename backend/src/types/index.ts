// src/types/index.ts
// Central type definitions for the entire backend

// export type Provider = 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'GROK';
// export type MessageRole = 'user' | 'assistant' | 'system';
// export type RequestStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'CANCELLED' | 'STREAMING';

// export interface Message {
//   id: string;
//   conversationId: string;
//   role: MessageRole;
//   content: string;
//   tokenCount?: number;
//   createdAt: Date;
// }

// export interface Conversation {
//   id: string;
//   userId?: string;
//   sessionId: string;
//   title: string;
//   provider: Provider;
//   model: string;
//   systemPrompt?: string;
//   isArchived: boolean;
//   createdAt: Date;
//   updatedAt: Date;
//   messages?: Message[];
// }

// export interface InferenceLog {
//   id: string;
//   messageId?: string;
//   conversationId: string;
//   sessionId: string;
//   provider: Provider;
//   model: string;
//   status: RequestStatus;
//   inputTokens?: number;
//   outputTokens?: number;
//   totalTokens?: number;
//   latencyMs?: number;
//   requestDurationMs?: number;
//   startedAt: Date;
//   completedAt?: Date;
//   inputPreview?: string;
//   outputPreview?: string;
//   isStreaming: boolean;
//   errorMessage?: string;
//   errorCode?: string;
//   metadata?: Record<string, unknown>;
// }

// export interface InferenceLogPayload {
//   messageId?: string;
//   conversationId: string;
//   sessionId: string;
//   provider: Provider;
//   model: string;
//   status: RequestStatus;
//   inputTokens?: number;
//   outputTokens?: number;
//   totalTokens?: number;
//   latencyMs?: number;
//   requestDurationMs?: number;
//   startedAt: string; // ISO string from SDK
//   completedAt?: string;
//   inputPreview?: string;
//   outputPreview?: string;
//   isStreaming?: boolean;
//   errorMessage?: string;
//   errorCode?: string;
//   metadata?: Record<string, unknown>;
// }

// export interface ChatMessage {
//   role: MessageRole;
//   content: string;
// }

// export interface ChatRequest {
//   conversationId?: string;
//   sessionId: string;
//   messages: ChatMessage[];
//   provider: Provider;
//   model: string;
//   systemPrompt?: string;
//   stream?: boolean;
// }

// export interface DashboardMetrics {
//   totalRequests: number;
//   successRate: number;
//   errorRate: number;
//   avgLatencyMs: number;
//   requestsPerMinute: number;
//   providerUsage: Record<Provider, number>;
//   tokenUsage: {
//     input: number;
//     output: number;
//     total: number;
//   };
//   throughput: number;
//   recentLogs: InferenceLog[];
//   latencyOverTime: Array<{ time: string; avg: number; p95: number }>;
// }

// export interface ApiResponse<T = unknown> {
//   success: boolean;
//   data?: T;
//   error?: string;
//   message?: string;
//   meta?: {
//     page?: number;
//     limit?: number;
//     total?: number;
//   };
// }

// export interface ProviderConfig {
//   provider: Provider;
//   model: string;
//   apiKey: string;
// }

// export interface StreamChunk {
//   type: 'content' | 'done' | 'error';
//   content?: string;
//   conversationId?: string;
//   messageId?: string;
//   logId?: string;
//   error?: string;
// }

export type Provider = 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'GROK' | 'OPENROUTER';
export type MessageRole = 'user' | 'assistant' | 'system';
export type RequestStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'CANCELLED' | 'STREAMING';

export interface Message {
  id: string | null;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount?: number;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId?: string;
  sessionId: string;
  title: string;
  provider: Provider;
  model: string;
  systemPrompt?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface InferenceLog {
  id: string;
  messageId: string | null;
  conversationId: string;
  sessionId: string;
  provider: Provider;
  model: string;
  status: RequestStatus;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  requestDurationMs?: number;
  startedAt: Date;
  completedAt?: Date;
  inputPreview?: string;
  outputPreview?: string;
  isStreaming: boolean;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface InferenceLogPayload {
  messageId?: string | null;
  conversationId: string;
  sessionId: string;
  provider: Provider;
  model: string;
  status: RequestStatus;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  requestDurationMs?: number;
  startedAt: string;
  completedAt?: string;
  inputPreview?: string;
  outputPreview?: string;
  isStreaming?: boolean;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  conversationId?: string;
  sessionId: string;
  messages: ChatMessage[];
  provider: Provider;
  model: string;
  systemPrompt?: string;
  stream?: boolean;
}

export interface DashboardMetrics {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  requestsPerMinute: number;
  providerUsage: Record<Provider, number>;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  throughput: number;
  recentLogs: InferenceLog[];
  latencyOverTime: Array<{ time: string; avg: number; p95: number }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ProviderConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  conversationId?: string;
  messageId?: string;
  logId?: string;
  error?: string;
}