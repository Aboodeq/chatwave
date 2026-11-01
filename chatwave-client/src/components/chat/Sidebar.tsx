import { useMemo, useState } from "react";
import { MessageSquarePlus, PanelLeftClose, RefreshCw, SearchX, SquarePen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConversations } from "../../hooks/useConversations";
import { cn, shortcutLabel } from "../../lib/utils";
import { useUIStore } from "../../stores/uiStore";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Logo } from "../ui/Logo";
import { SearchInput } from "../ui/SearchInput";
import { Skeleton } from "../ui/Skeleton";
import { ConversationItem } from "./ConversationItem";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  activeId: number | null;
  onNewChat: () => void;
  className?: string;
}

export function Sidebar({ activeId, onNewChat, className }: SidebarProps) {
  const { t } = useTranslation();
  const { data: conversations, isPending, isError, refetch, isRefetching } = useConversations();
  const setChatListHidden = useUIStore((s) => s.setChatListHidden);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = conversations ?? [];
    return term ? list.filter((c) => (c.name ?? "").toLowerCase().includes(term)) : list;
  }, [conversations, search]);

  return (
    <aside aria-label={t("chat.list.label")} className={cn("min-h-0 flex-col border-e border-line bg-surface", className)}>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
        <Logo />
        <div className="flex items-center gap-1">
          <IconButton icon={SquarePen} label={t("chat.list.newChat", { shortcut: shortcutLabel("K") })} onClick={onNewChat} />
          <UserMenu />
          {/* Hiding the list only makes sense while a chat is open next to it. */}
          {activeId !== null && (
            <IconButton
              icon={PanelLeftClose}
              label={t("chat.list.hide")}
              className="hidden md:inline-grid rtl:[&_svg]:-scale-x-100"
              onClick={() => setChatListHidden(true)}
            />
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <SearchInput value={search} onChange={setSearch} label={t("chat.list.search")} />
      </div>

      <nav aria-label={t("chat.list.nav")} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isPending ? (
          <ListSkeleton />
        ) : isError && !conversations ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-fg-muted">{t("chat.list.loadFailed")}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()} loading={isRefetching}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {t("common.retry")}
            </Button>
          </div>
        ) : filtered.length > 0 ? (
          <ul className="space-y-0.5">
            {filtered.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === activeId} />
            ))}
          </ul>
        ) : search ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <SearchX className="size-6 text-fg-subtle" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">{t("chat.list.noMatch", { query: search.trim() })}</p>
            <button type="button" onClick={onNewChat} className="mt-1 text-sm font-medium text-primary hover:underline">
              {t("chat.list.startInstead")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg">
              <MessageSquarePlus className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-display text-base font-semibold">{t("chat.list.emptyTitle")}</p>
            <p className="mt-1 text-sm text-fg-muted">{t("chat.list.emptyBody")}</p>
            <Button size="sm" className="mt-5" onClick={onNewChat}>
              <SquarePen className="size-3.5" aria-hidden="true" />
              {t("chat.list.startChat")}
            </Button>
          </div>
        )}
      </nav>
    </aside>
  );
}

function ListSkeleton() {
  const { t } = useTranslation();
  return (
    <ul aria-label={t("chat.list.loading")} className="space-y-0.5">
      {Array.from({ length: 7 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
