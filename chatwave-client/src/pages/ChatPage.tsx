import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useConversations } from "../hooks/useConversations";
import { useSession } from "../hooks/useSession";
import { cn } from "../lib/utils";
import { ConversationView } from "../components/chat/ConversationView";
import { EmptyThread } from "../components/chat/EmptyThread";
import { NewChatDialog } from "../components/chat/NewChatDialog";
import { Sidebar } from "../components/chat/Sidebar";

export default function ChatPage() {
  const params = useParams();
  const parsed = Number(params.conversationId);
  const activeId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const [newChatOpen, setNewChatOpen] = useState(false);

  useSession();
  useUnreadTitle(activeId);

  // Ctrl/Cmd + K starts a new chat from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setNewChatOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      {/* On phones, show either the list or the open conversation. */}
      <Sidebar
        activeId={activeId}
        onNewChat={() => setNewChatOpen(true)}
        className={cn("w-full md:w-[22rem] lg:w-96", activeId ? "hidden md:flex" : "flex")}
      />
      <main className={cn("min-w-0 flex-1 flex-col", activeId ? "flex" : "hidden md:flex")}>
        {activeId ? (
          <ConversationView key={activeId} conversationId={activeId} />
        ) : (
          <EmptyThread onNewChat={() => setNewChatOpen(true)} />
        )}
      </main>
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </div>
  );
}

/** "(3) ChatWave" in the tab title when other conversations have unread messages. */
function useUnreadTitle(activeId: number | null) {
  const { data: conversations } = useConversations();
  const unread = conversations?.reduce((sum, c) => sum + (c.id === activeId ? 0 : c.unread_count), 0) ?? 0;

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ChatWave` : "ChatWave";
    return () => {
      document.title = "ChatWave";
    };
  }, [unread]);
}
