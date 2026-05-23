'use client';
// src/app/conversations/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Trash2, ExternalLink, Search, Bot,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { useChatStore } from '../../stores/chatStore';
import { Conversation } from '../../types';
import { formatRelativeTime, PROVIDER_LABELS, PROVIDER_COLORS } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function ConversationsPage() {
  const router = useRouter();
  const { conversations, loadConversations, loadConversation, archiveConversation } = useChatStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = async (conv: Conversation) => {
    await loadConversation(conv.id);
    router.push('/chat');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <div className="px-6 py-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-bold text-zinc-100">Conversations</h1>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full ml-1">
                {conversations.length}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">
                {search ? 'No conversations match your search' : 'No conversations yet. Start chatting!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(conv => (
                <ConversationCard
                  key={conv.id}
                  conversation={conv}
                  onOpen={handleOpen}
                  onArchive={archiveConversation}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ConversationCard({
  conversation: conv,
  onOpen,
  onArchive,
}: {
  conversation: Conversation;
  onOpen: (c: Conversation) => void;
  onArchive: (id: string) => void;
}) {
  const lastMessage = conv.messages?.[0];
  const msgCount = conv._count?.messages || conv.messages?.length || 0;

  return (
    <div className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4.5 h-4.5 text-zinc-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-200 truncate">{conv.title || 'Untitled'}</h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{
                background: `${PROVIDER_COLORS[conv.provider]}15`,
                color: PROVIDER_COLORS[conv.provider],
              }}
            >
              {PROVIDER_LABELS[conv.provider]}
            </span>
          </div>

          {lastMessage && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {lastMessage.role === 'assistant' ? '🤖' : '👤'} {lastMessage.content}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
            <span>{msgCount} message{msgCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{conv.model}</span>
            <span>·</span>
            <span>{formatRelativeTime(conv.updatedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onOpen(conv)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Open conversation"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onArchive(conv.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Archive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
