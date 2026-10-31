import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import { useSignOut } from "../../hooks/useSession";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../ui/Avatar";
import { settingsCategories } from "./settingsCategories";

const row =
  "flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const tile = "grid size-10 shrink-0 place-items-center rounded-xl transition-colors";

/** The list of settings categories. Takes the chat list's place while Settings is open. */
export function SettingsNav({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();

  return (
    <aside aria-label="Settings" className={cn("min-h-0 flex-col border-e border-line bg-surface", className)}>
      <header className="flex h-16 shrink-0 items-center gap-1 px-2 md:px-3">
        <Link
          to="/chat"
          aria-label="Back to chats"
          className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
        <h1 className="font-display text-lg font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Link
          to="/settings/profile"
          className="flex items-center gap-4 rounded-2xl px-3 py-3 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={user?.name} src={user?.avatar} size="xl" />
          <span className="min-w-0">
            <span dir="auto" className="block truncate font-display text-lg font-semibold tracking-tight text-fg">
              {user?.name}
            </span>
            <span dir="auto" className="block truncate text-sm text-fg-muted">
              {user?.status_text || user?.email}
            </span>
          </span>
          <span className="sr-only">. Edit your profile</span>
        </Link>

        <nav aria-label="Settings categories" className="mt-2 border-t border-line pt-2">
          <ul className="space-y-0.5">
            {settingsCategories.map(({ id, title, description, icon: Icon }) => (
              <li key={id}>
                <NavLink
                  to={`/settings/${id}`}
                  className={({ isActive }) => cn(row, isActive ? "bg-primary-soft" : "hover:bg-surface-2")}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          tile,
                          isActive ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg-muted",
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9375rem] font-medium text-fg">{title}</span>
                        <span className="block truncate text-sm text-fg-muted">{description}</span>
                      </span>
                      {/* On phones each row opens a new screen. */}
                      <ChevronRight className="size-4 shrink-0 text-fg-subtle md:hidden rtl:rotate-180" aria-hidden="true" />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-2 border-t border-line pt-2">
          <button type="button" onClick={() => void signOut()} className={cn(row, "text-danger hover:bg-danger-soft")}>
            <span className={cn(tile, "bg-danger-soft")}>
              <LogOut className="size-5" aria-hidden="true" />
            </span>
            <span className="text-[0.9375rem] font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
