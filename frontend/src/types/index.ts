// src/types/index.ts

export type Provider = 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'GROK' | 'OPENROUTER';
export type MessageRole = 'user' | 'assistant' | 'system';
export type RequestStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'CANCELLED' | 'STREAMING';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount?: number;
  createdAt: string;
  // UI-only
  isStreaming?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  provider: Provider;
  model: string;
  systemPrompt?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: { messages: number };
}

export interface InferenceLog {
  id: string;
  conversationId: string;
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
  isStreaming: boolean;
  errorMessage?: string;
}

export interface DashboardMetrics {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  requestsPerMinute: number;
  providerUsage: Record<Provider, number>;
  tokenUsage: { input: number; output: number; total: number };
  throughput: number;
  recentLogs: InferenceLog[];
  latencyOverTime: Array<{ time: string; avg: number; p95: number }>;
}

export interface ProviderConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: { page?: number; limit?: number; total?: number };
}
