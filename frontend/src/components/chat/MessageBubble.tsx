'use client';
// src/components/chat/MessageBubble.tsx

import { Bot, User, AlertCircle } from 'lucide-react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.error);

  return (
    <div className={cn('flex gap-3 group', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isUser ? 'bg-zinc-700' : 'bg-emerald-500/20 border border-emerald-500/30'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-zinc-300" />
        ) : (
          <Bot className="w-4 h-4 text-emerald-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
            : isError
            ? 'bg-red-950/40 border border-red-800/50 text-red-200 rounded-tl-sm'
            : 'bg-zinc-900/80 border border-zinc-800 text-zinc-200 rounded-tl-sm'
        )}
      >
        {isError && (
          <div className="flex items-center gap-1.5 mb-1.5 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error</span>
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'prose-dark whitespace-pre-wrap',
            message.isStreaming && !message.content && 'streaming-cursor'
          )}
        >
          {message.error || message.content}
          {message.isStreaming && message.content && (
            <span className="streaming-cursor" />
          )}
        </div>

        {/* Token info */}
        {message.tokenCount && (
          <div className="mt-1.5 text-xs text-zinc-600">
            {message.tokenCount} tokens
          </div>
        )}
      </div>
    </div>
  );
}
