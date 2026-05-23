// src/lib/api.ts
// Typed API client — thin wrapper around fetch

import {
  ApiResponse,
  Conversation,
  DashboardMetrics,
  InferenceLog,
  Message,
  Provider,
} from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(
  path: string,
  options?: RequestInit,
  sessionId?: string
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId && { 'x-session-id': sessionId }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Conversations
  conversations: {
    list: (sessionId: string, page = 1, limit = 20) =>
      request<Conversation[]>(`/api/conversations?page=${page}&limit=${limit}`, undefined, sessionId),

    get: (id: string) =>
      request<Conversation & { messages: Message[] }>(`/api/conversations/${id}`),

    archive: (id: string) =>
      request(`/api/conversations/${id}`, { method: 'DELETE' }),

    updateTitle: (id: string, title: string) =>
      request(`/api/conversations/${id}/title`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
  },

  // Logs
  logs: {
    list: (params?: {
      page?: number;
      limit?: number;
      provider?: string;
      status?: string;
      conversationId?: string;
    }) => {
      const qs = new URLSearchParams(
        Object.entries(params || {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString();
      return request<InferenceLog[]>(`/api/logs${qs ? `?${qs}` : ''}`);
    },
  },

  // Dashboard
  dashboard: {
    metrics: (window = 60) => request<DashboardMetrics>(`/api/dashboard?window=${window}`),
    providers: () => request<{ available: Provider[]; defaults: Record<Provider, string> }>('/api/dashboard/providers'),
  },

  // Chat — returns a ReadableStream for SSE
  chat: {
    stream: async (
      payload: {
        conversationId?: string;
        sessionId: string;
        messages: Array<{ role: string; content: string }>;
        provider: Provider;
        model?: string;
        systemPrompt?: string;
      },
      signal?: AbortSignal
    ): Promise<Response> => {
      return fetch(`${BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': payload.sessionId,
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal,
      });
    },
  },
};
