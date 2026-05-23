'use client';
// src/components/layout/Sidebar.tsx

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Bot,
  Layers,
} from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { conversations, activeConversationId, loadConversations, loadConversation, setActiveConversation, archiveConversation, newConversation } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const navItems = [
    { href: '/chat', icon: MessageSquare, label: 'Chat' },
    { href: '/conversations', icon: Layers, label: 'Conversations' },
    { href: '/dashboard', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-zinc-800">
        <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-zinc-900" />
        </div>
        <span className="font-semibold text-zinc-100 text-sm tracking-tight">LLM Platform</span>
      </div>

      {/* Nav */}
      <nav className="px-2 py-3 border-b border-zinc-800">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-0.5',
              pathname.startsWith(href)
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* New Chat button */}
      <div className="px-2 py-2">
        <Link
          href="/chat"
          onClick={newConversation}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Link>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <p className="text-xs text-zinc-600 px-3 py-1.5 uppercase tracking-wider">Recent</p>
        {conversations.slice(0, 30).map(conv => (
          <div
            key={conv.id}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors mb-0.5',
              activeConversationId === conv.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
            onClick={() => { loadConversation(conv.id); }}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 truncate text-xs">{conv.title || 'Untitled'}</span>
            <button
              onClick={e => { e.stopPropagation(); archiveConversation(conv.id); }}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-xs text-zinc-600 px-3 py-4 text-center">No conversations yet</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">Session active</p>
      </div>
    </aside>
  );
}
