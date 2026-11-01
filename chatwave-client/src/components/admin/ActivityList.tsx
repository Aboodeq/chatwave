import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Ban, History, KeyRound, LogOut, RotateCcw, ShieldCheck, ShieldOff, type LucideIcon } from "lucide-react";
import { formatLocale } from "../../i18n";
import { useNow } from "../../hooks/useNow";
import { loggedRoleName, permissionLabel } from "../../lib/roles";
import { formatMoment } from "../../lib/utils";
import type { AdminActionEntry } from "../../types/admin";
import { Avatar } from "../ui/Avatar";

type SentenceKey =
  | "suspended"
  | "restored"
  | "roleChanged"
  | "signedOut"
  | "roleCreated"
  | "roleUpdated"
  | "roleDeleted"
  | "other";

interface Described {
  icon: LucideIcon;
  tone: string;
  sentence: SentenceKey;
  details: string[];
}

const list = (items: string[]) => new Intl.ListFormat(formatLocale(), { type: "conjunction" }).format(items);

function describe(entry: AdminActionEntry, t: ReturnType<typeof useTranslation>["t"]): Described {
  const { details } = entry;
  switch (entry.action) {
    case "user.suspended":
      return { icon: Ban, tone: "bg-danger-soft text-danger", sentence: "suspended", details: details.reason ? [details.reason] : [] };
    case "user.restored":
      return { icon: RotateCcw, tone: "bg-success-soft text-success", sentence: "restored", details: [] };
    case "user.role_changed": {
      const toAdmin = details.to_key === "admin" || details.to === "admin";
      const from = loggedRoleName(details.from, details.from_key);
      const to = loggedRoleName(details.to, details.to_key);
      return {
        icon: toAdmin ? ShieldCheck : ShieldOff,
        tone: toAdmin ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-2 text-fg-muted",
        sentence: "roleChanged",
        // "Member → Admin" (the arrow points the way the language reads).
        details: from && to ? [`${from} ${document.dir === "rtl" ? "←" : "→"} ${to}`] : [],
      };
    }
    case "user.signed_out":
      return {
        icon: LogOut,
        tone: "bg-surface-2 text-fg-muted",
        sentence: "signedOut",
        details: details.devices !== undefined ? [t("admin.activity.devices", { count: details.devices })] : [],
      };
    case "role.created":
    case "role.updated":
    case "role.deleted": {
      const extra: string[] = [];
      if (details.added?.length) extra.push(t("admin.activity.added", { list: list(details.added.map(permissionLabel)) }));
      if (details.removed?.length) extra.push(t("admin.activity.removed", { list: list(details.removed.map(permissionLabel)) }));
      if (details.moved) extra.push(t("admin.activity.moved", { count: details.moved }));
      const sentence = entry.action === "role.created" ? "roleCreated" : entry.action === "role.updated" ? "roleUpdated" : "roleDeleted";
      return { icon: KeyRound, tone: "bg-surface-2 text-fg-muted", sentence, details: extra };
    }
    default:
      return { icon: History, tone: "bg-surface-2 text-fg-muted", sentence: "other", details: [] };
  }
}

/** The admin audit log as sentences: "Ada suspended Sam · Sending spam · 2 hours ago". */
export function ActivityList({ entries, empty }: { entries: AdminActionEntry[]; empty?: string }) {
  const { t } = useTranslation();
  const now = useNow(60_000);

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-subtle">{empty ?? t("admin.activity.empty")}</p>;
  }

  return (
    <ol className="space-y-1">
      {entries.map((entry) => {
        const { icon: Icon, tone, sentence, details } = describe(entry, t);
        const target: ReactElement = entry.target ? (
          <Link to={`/admin/people/${entry.target.id}`} className="font-medium text-primary hover:underline" />
        ) : (
          <span className="font-medium" />
        );

        return (
          <li key={entry.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-fg">
                <Trans
                  i18nKey={`admin.activity.${sentence}`}
                  values={{
                    admin: entry.admin?.name ?? t("admin.activity.formerAdmin"),
                    target: entry.target?.name ?? t("admin.activity.deletedAccount"),
                    role: loggedRoleName(entry.details.role, entry.details.role_key),
                    action: entry.action,
                  }}
                  components={{ admin: <span className="font-medium" />, target, role: <span className="font-medium" /> }}
                />
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {details.map((detail) => (
                  <span key={detail} className="text-fg-muted">
                    {detail} ·{" "}
                  </span>
                ))}
                <time dateTime={entry.created_at}>{formatMoment(entry.created_at, now, "plain")}</time>
              </p>
            </div>
            {entry.admin && <Avatar name={entry.admin.name} src={entry.admin.avatar} size="sm" className="hidden sm:flex" />}
          </li>
        );
      })}
    </ol>
  );
}
