import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { cn, formatListTime } from "../../lib/utils";
import type { Conversation } from "../../types/conversation";
import { Avatar } from "../ui/Avatar";

export function ConversationItem({ conversation, active }: { conversation: Conversation; active: boolean }) {
  const meId = useAuthStore((s) => s.user?.id);
  const last = conversation.last_message;
  // The open conversation is being read right now, so don't badge it.
  const unread = active ? 0 : conversation.unread_count;
  const name = conversation.name ?? "Unknown";

  return (
    <li>
      <Link
        to={`/chat/${conversation.id}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-primary-soft" : "hover:bg-surface-2",
        )}
      >
        <Avatar name={name} src={conversation.avatar} online={conversation.is_online} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p dir="auto" className={cn("truncate text-[0.9375rem] text-fg", unread ? "font-semibold" : "font-medium")}>
              {name}
            </p>
            {last && (
              <time
                dateTime={last.created_at}
                className={cn("shrink-0 text-xs", unread ? "font-semibold text-primary" : "text-fg-subtle")}
              >
                {formatListTime(last.created_at)}
              </time>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <p
              dir="auto"
              className={cn("truncate text-sm", unread ? "text-fg" : "text-fg-muted", !last && "text-fg-subtle italic")}
            >
              {last ? (
                <>
                  {last.sender.id === meId && <span className="text-fg-subtle">You: </span>}
                  {last.body}
                </>
              ) : (
                "No messages yet"
              )}
            </p>
            {unread > 0 && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-fg">
                {unread > 99 ? "99+" : unread}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
