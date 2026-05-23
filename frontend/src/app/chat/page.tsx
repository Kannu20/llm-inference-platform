// src/app/chat/page.tsx
import { Sidebar } from '../../components/layout/Sidebar';
import { ChatWindow } from '../../components/chat/ChatWindow';

export default function ChatPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  );
}
