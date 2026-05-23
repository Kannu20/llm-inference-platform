// src/stores/chatStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, Provider } from '../types';
import { api } from '../lib/api';

interface ChatState {
  sessionId: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId → messages
  streamingMessageId: string | null;
  isLoading: boolean;
  error: string | null;
  abortController: AbortController | null;

  // Actions
  setActiveConversation: (id: string | null) => void;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, provider: Provider, model: string) => Promise<void>;
  cancelStream: () => void;
  archiveConversation: (id: string) => Promise<void>;
  clearError: () => void;
  newConversation: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: (() => {
    if (typeof window === 'undefined') return uuidv4();
    const stored = localStorage.getItem('session-id');
    if (stored) return stored;
    const newId = uuidv4();
    localStorage.setItem('session-id', newId);
    return newId;
  })(),
  conversations: [],
  activeConversationId: null,
  messages: {},
  streamingMessageId: null,
  isLoading: false,
  error: null,
  abortController: null,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  newConversation: () => set({ activeConversationId: null }),

  loadConversations: async () => {
    try {
      const { sessionId } = get();
      const res = await api.conversations.list(sessionId);
      if (res.success && res.data) {
        set({ conversations: res.data });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load conversations' });
    }
  },

  loadConversation: async (id) => {
    const existing = get().messages[id];
    if (existing?.length) {
      set({ activeConversationId: id });
      return;
    }
    try {
      set({ isLoading: true });
      const res = await api.conversations.get(id);
      if (res.success && res.data) {
        set(state => ({
          activeConversationId: id,
          messages: { ...state.messages, [id]: res.data!.messages || [] },
          isLoading: false,
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load conversation', isLoading: false });
    }
  },

  sendMessage: async (content, provider, model) => {
    const { sessionId, activeConversationId, messages } = get();
    const conversationId = activeConversationId;

    // Optimistic user message
    const userMsgId = uuidv4();
    const userMsg: Message = {
      id: userMsgId,
      conversationId: conversationId || 'pending',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    const streamingMsgId = uuidv4();
    const streamingMsg: Message = {
      id: streamingMsgId,
      conversationId: conversationId || 'pending',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    const currentMessages = conversationId ? (messages[conversationId] || []) : [];
    const key = conversationId || 'pending';

    set(state => ({
      messages: {
        ...state.messages,
        [key]: [...currentMessages, userMsg, streamingMsg],
      },
      streamingMessageId: streamingMsgId,
      isLoading: true,
      error: null,
    }));

    const abortController = new AbortController();
    set({ abortController });

    try {
      const allMessages = [...currentMessages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.chat.stream(
        { conversationId: conversationId || undefined, sessionId, messages: allMessages, provider, model },
        abortController.signal
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Extract conversation ID from headers if new
      const newConvId = response.headers.get('X-Conversation-Id') || conversationId;

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let resolvedConvId = newConvId || 'pending';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'meta') {
              resolvedConvId = data.conversationId || resolvedConvId;
            } else if (data.type === 'content') {
              accumulated += data.content;
              set(state => {
                const msgs = state.messages[key] || [];
                return {
                  messages: {
                    ...state.messages,
                    [key]: msgs.map(m =>
                      m.id === streamingMsgId
                        ? { ...m, content: accumulated, conversationId: resolvedConvId }
                        : m
                    ),
                  },
                };
              });
            } else if (data.type === 'done') {
              // Finalize
              set(state => {
                const msgs = state.messages[key] || [];
                const finalMsgs = msgs.map(m =>
                  m.id === streamingMsgId ? { ...m, isStreaming: false } : m
                );
                // If new conversation, re-key messages
                const newState: Partial<ChatState> = {
                  streamingMessageId: null,
                  isLoading: false,
                  activeConversationId: resolvedConvId,
                };
                if (resolvedConvId !== key) {
                  const { [key]: _, ...rest } = state.messages;
                  newState.messages = { ...rest, [resolvedConvId]: finalMsgs };
                } else {
                  newState.messages = { ...state.messages, [key]: finalMsgs };
                }
                return newState;
              });
              // Reload conversation list to reflect new entry
              get().loadConversations();
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // Ignore JSON parse errors on partial chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        set(state => {
          const key2 = conversationId || 'pending';
          const msgs = state.messages[key2] || [];
          return {
            messages: {
              ...state.messages,
              [key2]: msgs.map(m =>
                m.id === streamingMsgId
                  ? { ...m, isStreaming: false, content: m.content + ' [cancelled]' }
                  : m
              ),
            },
            streamingMessageId: null,
            isLoading: false,
          };
        });
      } else {
        set(state => {
          const key2 = conversationId || 'pending';
          const msgs = state.messages[key2] || [];
          return {
            messages: {
              ...state.messages,
              [key2]: msgs.map(m =>
                m.id === streamingMsgId
                  ? { ...m, isStreaming: false, error: err instanceof Error ? err.message : 'Error' }
                  : m
              ),
            },
            streamingMessageId: null,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to send message',
          };
        });
      }
    }
  },

  cancelStream: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ abortController: null });
  },

  archiveConversation: async (id) => {
    try {
      await api.conversations.archive(id);
      set(state => ({
        conversations: state.conversations.filter(c => c.id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to archive' });
    }
  },

  clearError: () => set({ error: null }),
}));
