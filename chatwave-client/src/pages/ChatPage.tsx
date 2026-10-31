import { useEffect, useState } from "react";
import { useMatch } from "react-router-dom";
import { useConversations } from "../hooks/useConversations";
import { useSession } from "../hooks/useSession";
import { cn } from "../lib/utils";
import { ConversationView } from "../components/chat/ConversationView";
import { EmptyThread } from "../components/chat/EmptyThread";
import { NewChatDialog } from "../components/chat/NewChatDialog";
import { Sidebar } from "../components/chat/Sidebar";
import { SettingsView } from "../components/settings/SettingsView";

/** The signed-in app: the conversation list beside a conversation, or Settings. */
export default function ChatPage() {
  const conversationMatch = useMatch("/chat/:conversationId");
  const onSettings = useMatch("/settings") !== null;
  const parsed = Number(conversationMatch?.params.conversationId);
  const activeId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const showDetail = onSettings || activeId !== null;
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
      {/* On phones, show either the list or what's open next to it. */}
      <Sidebar
        activeId={activeId}
        onNewChat={() => setNewChatOpen(true)}
        className={cn("w-full md:w-[22rem] lg:w-96", showDetail ? "hidden md:flex" : "flex")}
      />
      <main className={cn("min-w-0 flex-1 flex-col", showDetail ? "flex" : "hidden md:flex")}>
        {onSettings ? (
          <SettingsView />
        ) : activeId ? (
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
