'use client';
// src/components/chat/ChatWindow.tsx

import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

export function ChatWindow() {
  const {
    activeConversationId,
    messages,
    streamingMessageId,
    isLoading,
    sendMessage,
    cancelStream,
  } = useChatStore();

  const { activeProvider, getActiveModel } = useSettingsStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentMessages = activeConversationId
    ? messages[activeConversationId] || []
    : messages['pending'] || [];

  const isStreaming = Boolean(streamingMessageId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, currentMessages[currentMessages.length - 1]?.content]);

  const handleSend = (content: string) => {
    sendMessage(content, activeProvider, getActiveModel());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {currentMessages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {currentMessages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Provider indicator */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-zinc-600">
              {activeProvider} · {getActiveModel()}
            </span>
          </div>
          <MessageInput
            onSend={handleSend}
            onCancel={cancelStream}
            isStreaming={isStreaming}
            disabled={isLoading && !isStreaming}
          />
          <p className="text-xs text-zinc-700 mt-2 text-center">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <Bot className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-200">Start a conversation</h2>
        <p className="text-sm text-zinc-500 mt-1">Multi-provider AI with inference logging</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm w-full">
        {[
          'Explain quantum entanglement simply',
          'Write a Python function to parse JSON',
          'What are the key principles of clean architecture?',
          'Help me debug a React state issue',
        ].map(prompt => (
          <button
            key={prompt}
            className="text-left text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 py-2.5 transition-colors"
            onClick={() => {
              // Trigger send via store — would need to be wired up
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
