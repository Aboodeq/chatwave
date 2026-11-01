import { Link, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { ArrowLeft, History, LayoutDashboard, Server, Users, type LucideIcon } from "lucide-react";
import { useSession } from "../../hooks/useSession";
import { signInIdentifier } from "../../lib/account";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../../components/ui/Avatar";
import { Logo } from "../../components/ui/Logo";
import ActivityPage from "./ActivityPage";
import OverviewPage from "./OverviewPage";
import PeoplePage from "./PeoplePage";
import PersonPage from "./PersonPage";
import SystemPage from "./SystemPage";

const sections: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/people", label: "People", icon: Users },
  { to: "/admin/activity", label: "Activity", icon: History },
  { to: "/admin/system", label: "System", icon: Server },
];

/** The admin dashboard (admins only; App.tsx guards the route). */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="people/:id" element={<PersonPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="system" element={<SystemPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  // Keeps the role fresh: someone who loses admin access is sent back to the chat.
  useSession();

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo />
          <AdminPill />
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-0.5 px-3 pt-2">
          {sections.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )
              }
            >
              <Icon className="size-[1.125rem]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link
            to="/chat"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-[1.125rem] rtl:rotate-180" aria-hidden="true" />
            Back to chats
          </Link>
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{user?.name}</p>
              <p className="truncate text-xs text-fg-subtle">{signInIdentifier(user)}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phones and tablets: a top bar with tabs. */}
        <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-2.5">
              <Logo />
              <AdminPill />
            </div>
            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              Chats
            </Link>
          </div>
          <nav aria-label="Admin" className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-2">
            {sections.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                    isActive ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-2",
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminPill() {
  return (
    <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-primary-soft-fg uppercase">
      Admin
    </span>
  );
}
