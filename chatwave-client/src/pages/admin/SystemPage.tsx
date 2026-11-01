import { CircleCheck, Info, OctagonAlert, RefreshCw, TriangleAlert } from "lucide-react";
import { useSystem } from "../../hooks/useAdmin";
import { cn } from "../../lib/utils";
import type { CheckStatus, SystemInfo } from "../../types/admin";
import { PageHeader } from "../../components/admin/PageHeader";
import { formatCount } from "../../components/admin/charts/chartUtils";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

// Status is always an icon and a word, never color alone.
const statusStyle: Record<CheckStatus, { icon: typeof Info; tone: string; label: string }> = {
  ok: { icon: CircleCheck, tone: "bg-success-soft text-success", label: "OK" },
  info: { icon: Info, tone: "bg-surface-2 text-fg-muted", label: "Note" },
  warning: { icon: TriangleAlert, tone: "bg-warning-soft text-warning", label: "Check" },
  problem: { icon: OctagonAlert, tone: "bg-danger-soft text-danger", label: "Fix" },
};

const bytes = (value: number | null) => {
  if (value === null) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

export default function SystemPage() {
  const { data, isPending, isError, isFetching, refetch } = useSystem();

  return (
    <>
      <PageHeader
        title="System"
        description="Configuration and health at a glance, including the checklist for running in production."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} loading={isFetching && !isPending}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Check again
          </Button>
        }
      />

      {isPending ? (
        <div className="space-y-5" aria-label="Loading">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">We couldn't check the system.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Checks data={data} />
          <Environment data={data} />
        </div>
      )}
    </>
  );
}

function Checks({ data }: { data: SystemInfo }) {
  const needsAttention = data.checks.filter((check) => check.status === "warning" || check.status === "problem").length;

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold text-fg">Health checks</h2>
      <p className="mt-0.5 text-sm text-fg-muted">
        {needsAttention === 0 ? "Everything looks good." : `${needsAttention} ${needsAttention === 1 ? "item needs" : "items need"} attention.`}
      </p>
      <ul className="mt-4 divide-y divide-line">
        {data.checks.map((check) => {
          const { icon: Icon, tone, label } = statusStyle[check.status];
          return (
            <li key={check.key} className="flex items-start gap-3 py-3.5 first:pt-1 last:pb-0">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone)}>
                <Icon className="size-[1.125rem]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                  {check.title}
                  <span className={cn("rounded-full px-1.5 py-px text-[0.625rem] font-semibold tracking-wide uppercase", tone)}>{label}</span>
                </p>
                <p className="mt-0.5 text-sm break-words text-fg-muted">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Environment({ data }: { data: SystemInfo }) {
  const rows: [string, string][] = [
    ["Environment", data.app.environment],
    ["Debug mode", data.app.debug ? "On" : "Off"],
    ["Laravel", data.app.laravel],
    ["PHP", data.app.php],
    ["Database", `${data.services.database}${data.services.database_size !== null ? ` · ${bytes(data.services.database_size)}` : ""}`],
    ["Queue", `${data.services.queue}${data.services.pending_jobs !== null ? ` · ${formatCount(data.services.pending_jobs)} waiting` : ""}`],
    ["Failed jobs", formatCount(data.services.failed_jobs)],
    ["Email", data.services.mail],
    ["Text messages", data.services.sms],
    ["Profile photos", `${formatCount(data.storage.avatars)} · ${bytes(data.storage.avatar_bytes)}`],
    ["Time zone", data.app.timezone],
  ];

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold text-fg">Environment</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line pb-3 text-sm">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-end font-medium text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
