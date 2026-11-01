import { useEffect, useState } from "react";
import { Navigate, useMatch } from "react-router-dom";
import { useConversations } from "../hooks/useConversations";
import { useSession } from "../hooks/useSession";
import { cn, formatNumber } from "../lib/utils";
import { useUIStore } from "../stores/uiStore";
import { ConversationView } from "../components/chat/ConversationView";
import { EmptyThread } from "../components/chat/EmptyThread";
import { NewChatDialog } from "../components/chat/NewChatDialog";
import { Sidebar } from "../components/chat/Sidebar";
import { SettingsNav } from "../components/settings/SettingsNav";
import { SettingsHome, SettingsPage } from "../components/settings/SettingsPage";
import { findSettingsCategory } from "../components/settings/settingsCategories";

/**
 * The signed-in app, in two columns: a list on the start side and what's open from it.
 *   /chat/:id        the chat list and a conversation
 *   /chat/:id/info   the same, with the contact info panel open
 *   /settings/:id    the settings menu and one settings page
 * Phones show one column at a time.
 */
export default function ChatPage() {
  const conversationMatch = useMatch("/chat/:conversationId/*");
  const infoOpen = useMatch("/chat/:conversationId/info") !== null;
  const settingsMatch = useMatch("/settings/:section?");
  const sectionId = settingsMatch?.params.section;
  const category = findSettingsCategory(sectionId);

  const parsed = Number(conversationMatch?.params.conversationId);
  const activeId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const onSettings = settingsMatch !== null;
  const showDetail = onSettings ? sectionId !== undefined : activeId !== null;

  const chatListHidden = useUIStore((s) => s.chatListHidden);
  const setChatListHidden = useUIStore((s) => s.setChatListHidden);
  const listHidden = activeId !== null && chatListHidden;
  const listClass = cn("w-full md:w-[22rem] lg:w-96", listHidden ? "hidden" : showDetail ? "hidden md:flex" : "flex");

  const [newChatOpen, setNewChatOpen] = useState(false);

  useSession();
  useUnreadTitle(activeId);

  // Closing the chat brings the list back for good, so the next chat opens beside it.
  useEffect(() => {
    if (activeId === null && chatListHidden) setChatListHidden(false);
  }, [activeId, chatListHidden, setChatListHidden]);

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
      {onSettings ? (
        <SettingsNav className={listClass} />
      ) : (
        <Sidebar activeId={activeId} onNewChat={() => setNewChatOpen(true)} className={listClass} />
      )}

      <main className={cn("min-w-0 flex-1 flex-col", showDetail ? "flex" : "hidden md:flex")}>
        {onSettings ? (
          sectionId === undefined ? (
            <SettingsHome />
          ) : category ? (
            <SettingsPage key={category.id} category={category} />
          ) : (
            <Navigate to="/settings" replace />
          )
        ) : activeId ? (
          <ConversationView key={activeId} conversationId={activeId} infoOpen={infoOpen} />
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
    document.title = unread > 0 ? `(${formatNumber(unread)}) ChatWave` : "ChatWave";
    return () => {
      document.title = "ChatWave";
    };
  }, [unread]);
}
