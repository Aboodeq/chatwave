import type { ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, History, KeyRound, LayoutDashboard, Server, Users, type LucideIcon } from "lucide-react";
import { useSession } from "../../hooks/useSession";
import { signInIdentifier } from "../../lib/account";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type { Permission } from "../../types/user";
import { Avatar } from "../../components/ui/Avatar";
import { LanguageToggle } from "../../components/ui/LanguageToggle";
import { Logo } from "../../components/ui/Logo";
import ActivityPage from "./ActivityPage";
import OverviewPage from "./OverviewPage";
import PeoplePage from "./PeoplePage";
import PersonPage from "./PersonPage";
import RolesPage from "./RolesPage";
import SystemPage from "./SystemPage";

type SectionId = "overview" | "people" | "roles" | "activity" | "system";

/** Each area of the dashboard needs its own permission (the API checks the same ones). */
const sections: { id: SectionId; to: string; icon: LucideIcon; permission: Permission; end?: boolean }[] = [
  { id: "overview", to: "/admin", icon: LayoutDashboard, permission: "admin.overview", end: true },
  { id: "people", to: "/admin/people", icon: Users, permission: "admin.people" },
  { id: "roles", to: "/admin/roles", icon: KeyRound, permission: "admin.roles" },
  { id: "activity", to: "/admin/activity", icon: History, permission: "admin.activity" },
  { id: "system", to: "/admin/system", icon: Server, permission: "admin.system" },
];

function useAllowedSections() {
  const permissions = useAuthStore((s) => s.user?.permissions);
  return sections.filter((section) => permissions?.includes(section.permission));
}

/** Shows a page only to people whose role allows it; others go to the first page they can see. */
function Allowed({ permission, children }: { permission: Permission; children: ReactNode }) {
  const allowed = useAllowedSections();
  if (allowed.some((section) => section.permission === permission)) return <>{children}</>;
  return <Navigate to={allowed[0]?.to ?? "/chat"} replace />;
}

/** The admin dashboard (App.tsx lets in roles with at least one admin permission). */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Allowed permission="admin.overview"><OverviewPage /></Allowed>} />
        <Route path="people" element={<Allowed permission="admin.people"><PeoplePage /></Allowed>} />
        <Route path="people/:id" element={<Allowed permission="admin.people"><PersonPage /></Allowed>} />
        <Route path="roles" element={<Allowed permission="admin.roles"><RolesPage /></Allowed>} />
        <Route path="activity" element={<Allowed permission="admin.activity"><ActivityPage /></Allowed>} />
        <Route path="system" element={<Allowed permission="admin.system"><SystemPage /></Allowed>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

function AdminLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = useAllowedSections();
  // Keeps the role fresh: someone who loses admin access is sent back to the chat.
  useSession();

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo />
          <AdminPill />
        </div>
        <nav aria-label={t("admin.nav.label")} className="flex-1 space-y-0.5 px-3 pt-2">
          {allowed.map(({ id, to, icon: Icon, end }) => (
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
              {t(`admin.nav.${id}`)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <LanguageToggle className="mb-1 w-full justify-center ring-0 hover:ring-1" />
          <Link
            to="/chat"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-[1.125rem] rtl:rotate-180" aria-hidden="true" />
            {t("admin.nav.backToChats")}
          </Link>
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <div className="min-w-0">
              <p dir="auto" className="truncate text-sm font-medium text-fg">
                {user?.name}
              </p>
              <p className="truncate text-xs text-fg-subtle">
                <span dir="ltr">{signInIdentifier(user)}</span>
              </p>
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
            <div className="flex items-center gap-1">
              <LanguageToggle compact className="h-9 gap-1.5 px-2.5 ring-0" />
              <Link
                to="/chat"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                {t("admin.nav.chats")}
              </Link>
            </div>
          </div>
          <nav aria-label={t("admin.nav.label")} className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-2">
            {allowed.map(({ id, to, icon: Icon, end }) => (
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
                {t(`admin.nav.${id}`)}
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
  const { t } = useTranslation();
  return (
    <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-primary-soft-fg uppercase">
      {t("admin.badge")}
    </span>
  );
}
