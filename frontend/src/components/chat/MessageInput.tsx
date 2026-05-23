'use client';
// src/components/chat/MessageInput.tsx

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  onSend: (content: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, onCancel, isStreaming, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="relative flex items-end gap-2 bg-zinc-900 border border-zinc-700 rounded-xl p-2 focus-within:border-emerald-500/50 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Send a message… (Shift+Enter for newline)'}
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600',
          'resize-none outline-none px-2 py-1.5 max-h-[200px]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      {isStreaming ? (
        <button
          onClick={onCancel}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          title="Cancel"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className={cn(
            'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors',
            value.trim() && !disabled
              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-900'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
          title="Send (Enter)"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
