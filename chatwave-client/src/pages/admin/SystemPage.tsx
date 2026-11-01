import { CircleCheck, Info, OctagonAlert, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSystem } from "../../hooks/useAdmin";
import { cn } from "../../lib/utils";
import type { CheckStatus, SystemInfo } from "../../types/admin";
import { PageHeader } from "../../components/admin/PageHeader";
import { formatBytes, formatCount } from "../../components/admin/charts/chartUtils";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

// Status is always an icon and a word, never color alone.
const statusStyle: Record<CheckStatus, { icon: typeof Info; tone: string }> = {
  ok: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  info: { icon: Info, tone: "bg-surface-2 text-fg-muted" },
  warning: { icon: TriangleAlert, tone: "bg-warning-soft text-warning" },
  problem: { icon: OctagonAlert, tone: "bg-danger-soft text-danger" },
};

export default function SystemPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, isFetching, refetch } = useSystem();

  return (
    <>
      <PageHeader
        title={t("admin.system.title")}
        description={t("admin.system.description")}
        actions={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} loading={isFetching && !isPending}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {t("admin.system.checkAgain")}
          </Button>
        }
      />

      {isPending ? (
        <div className="space-y-5" aria-label={t("admin.person.loading")}>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">{t("admin.system.loadFailed")}</p>
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
  const { t } = useTranslation();
  const needsAttention = data.checks.filter((check) => check.status === "warning" || check.status === "problem").length;

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold text-fg">{t("admin.system.health")}</h2>
      <p className="mt-0.5 text-sm text-fg-muted">
        {needsAttention === 0 ? t("admin.system.allGood") : t("admin.system.attention", { count: needsAttention })}
      </p>
      <ul className="mt-4 divide-y divide-line">
        {data.checks.map((check) => {
          const { icon: Icon, tone } = statusStyle[check.status];
          return (
            <li key={check.key} className="flex items-start gap-3 py-3.5 first:pt-1 last:pb-0">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone)}>
                <Icon className="size-[1.125rem]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                  {check.title}
                  <span className={cn("rounded-full px-1.5 py-px text-[0.625rem] font-semibold tracking-wide uppercase", tone)}>
                    {t(`admin.system.statuses.${check.status}`)}
                  </span>
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
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t("admin.system.rows.environment"), data.app.environment],
    [t("admin.system.rows.debug"), data.app.debug ? t("admin.system.on") : t("admin.system.off")],
    [t("admin.system.rows.laravel"), data.app.laravel],
    [t("admin.system.rows.php"), data.app.php],
    [
      t("admin.system.rows.database"),
      `${data.services.database}${data.services.database_size !== null ? ` · ${formatBytes(data.services.database_size)}` : ""}`,
    ],
    [
      t("admin.system.rows.queue"),
      `${data.services.queue}${data.services.pending_jobs !== null ? ` · ${t("admin.system.waiting", { count: formatCount(data.services.pending_jobs) })}` : ""}`,
    ],
    [t("admin.system.rows.failedJobs"), formatCount(data.services.failed_jobs)],
    [t("admin.system.rows.email"), data.services.mail],
    [t("admin.system.rows.sms"), data.services.sms],
    [t("admin.system.rows.photos"), `${formatCount(data.storage.avatars)} · ${formatBytes(data.storage.avatar_bytes)}`],
    [t("admin.system.rows.timezone"), data.app.timezone],
  ];

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold text-fg">{t("admin.system.environment")}</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line pb-3 text-sm">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-end font-medium text-fg tabular-nums">
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
