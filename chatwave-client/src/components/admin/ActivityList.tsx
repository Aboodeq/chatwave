import { Link } from "react-router-dom";
import { Ban, History, LogOut, RotateCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { useNow } from "../../hooks/useNow";
import { formatLastSeen } from "../../lib/utils";
import type { AdminActionEntry } from "../../types/admin";
import { Avatar } from "../ui/Avatar";

function describe(entry: AdminActionEntry): { icon: typeof Ban; tone: string; verb: string; detail?: string } {
  switch (entry.action) {
    case "user.suspended":
      return { icon: Ban, tone: "bg-danger-soft text-danger", verb: "suspended", detail: entry.details.reason };
    case "user.restored":
      return { icon: RotateCcw, tone: "bg-success-soft text-success", verb: "restored access for" };
    case "user.role_changed":
      return entry.details.to === "admin"
        ? { icon: ShieldCheck, tone: "bg-primary-soft text-primary-soft-fg", verb: "made an admin:" }
        : { icon: ShieldOff, tone: "bg-surface-2 text-fg-muted", verb: "removed admin access from" };
    case "user.signed_out":
      return {
        icon: LogOut,
        tone: "bg-surface-2 text-fg-muted",
        verb: "signed out everywhere:",
        detail: entry.details.devices !== undefined ? `${entry.details.devices} ${entry.details.devices === 1 ? "device" : "devices"}` : undefined,
      };
    default:
      return { icon: History, tone: "bg-surface-2 text-fg-muted", verb: entry.action };
  }
}

/** The admin audit log as sentences: "Ada suspended Sam · Sending spam · 2 hours ago". */
export function ActivityList({ entries, empty = "Nothing here yet." }: { entries: AdminActionEntry[]; empty?: string }) {
  const now = useNow(60_000);

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-subtle">{empty}</p>;
  }

  return (
    <ol className="space-y-1">
      {entries.map((entry) => {
        const { icon: Icon, tone, verb, detail } = describe(entry);
        return (
          <li key={entry.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-fg">
                <span className="font-medium">{entry.admin?.name ?? "A former admin"}</span> {verb}{" "}
                {entry.target ? (
                  <Link to={`/admin/people/${entry.target.id}`} className="font-medium text-primary hover:underline">
                    {entry.target.name}
                  </Link>
                ) : (
                  <span className="font-medium">a deleted account</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {detail && <span className="text-fg-muted">{detail} · </span>}
                <time dateTime={entry.created_at}>{formatLastSeen(entry.created_at, now, "").trim()}</time>
              </p>
            </div>
            {entry.admin && <Avatar name={entry.admin.name} src={entry.admin.avatar} size="sm" className="hidden sm:flex" />}
          </li>
        );
      })}
    </ol>
  );
}
