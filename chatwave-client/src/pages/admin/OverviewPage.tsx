import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { useOverview } from "../../hooks/useAdmin";
import { useNow } from "../../hooks/useNow";
import { signInIdentifier } from "../../lib/account";
import { cn, formatMoment } from "../../lib/utils";
import type { Overview, RangeDays } from "../../types/admin";
import { ActivityList } from "../../components/admin/ActivityList";
import { PageHeader } from "../../components/admin/PageHeader";
import { StatTile } from "../../components/admin/StatTile";
import { AreaChart } from "../../components/admin/charts/AreaChart";
import { ChartCard, ValueTable } from "../../components/admin/charts/ChartCard";
import { ColumnChart } from "../../components/admin/charts/ColumnChart";
import { SegmentedBar } from "../../components/admin/charts/SegmentedBar";
import { formatCount, formatDay, formatPercent } from "../../components/admin/charts/chartUtils";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

const RANGES: RangeDays[] = [7, 30, 90];

/** "30 days", with the right plural in each language. */
const period = (days: number) => i18n.t("admin.days", { count: days });
const unit = (noun: "messages" | "people" | "accounts") => (count: number) => i18n.t(`admin.units.${noun}`, { count });

export default function OverviewPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState<RangeDays>(30);
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useOverview(days);
  const dimmed = isPlaceholderData || (isFetching && !isPending);

  return (
    <>
      <PageHeader title={t("admin.overview.title")} description={t("admin.overview.description")} />

      {/* One filter row above everything it scopes. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label={t("admin.overview.rangeLabel")} className="inline-flex rounded-xl bg-surface p-1 shadow-soft ring-1 ring-line">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              role="radio"
              aria-checked={days === range}
              onClick={() => setDays(range)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                days === range ? "bg-primary text-primary-fg shadow-soft" : "text-fg-muted hover:text-fg",
              )}
            >
              {t("admin.overview.last", { period: period(range) })}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refetch()} loading={isFetching && !isPending}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {t("admin.overview.refresh")}
        </Button>
        {data && (
          <p className="text-xs text-fg-subtle">
            {t("admin.overview.timezone", { zone: data.range.timezone })}
          </p>
        )}
      </div>

      {isPending ? (
        <OverviewSkeleton />
      ) : isError || !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">{t("admin.overview.loadFailed")}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <div className={cn("space-y-5 transition-opacity", dimmed && "opacity-60")}>
          <Totals data={data} />
          <div className="grid gap-5 xl:grid-cols-3">
            <MessagesCard data={data} className="xl:col-span-2" />
            <AccountsCard data={data} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <DailyCard data={data} field="senders" />
            <DailyCard data={data} field="sign_ups" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <RecentSignUps data={data} />
            <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
              <ListHeader title={t("admin.overview.recentActivity")} to="/admin/activity" linkLabel={t("admin.overview.allActivity")} />
              <ActivityList entries={data.recent_activity} empty={t("admin.overview.noActions")} />
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function Totals({ data }: { data: Overview }) {
  const { t } = useTranslation();
  const { totals, range, series } = data;
  const vs = t("admin.overview.vsPrevious", { period: period(range.days) });

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label={t("admin.overview.messagesLast", { period: period(range.days) })}
        value={totals.messages}
        delta={{ current: totals.messages, previous: totals.messages_previous, period: vs }}
        trend={series.map((day) => day.messages)}
      />
      <StatTile
        label={t("admin.overview.signUpsLast", { period: period(range.days) })}
        value={totals.sign_ups}
        delta={{ current: totals.sign_ups, previous: totals.sign_ups_previous, period: vs }}
        trend={series.map((day) => day.sign_ups)}
      />
      <StatTile
        label={t("admin.overview.activeToday")}
        value={totals.active_today}
        footnote={
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {t("admin.overview.onlineNow", { count: formatCount(totals.online_now) })}
          </span>
        }
      />
      <StatTile
        label={t("admin.overview.people")}
        value={totals.people}
        footnote={t("admin.overview.peopleFootnote", { admins: formatCount(totals.admins), suspended: formatCount(totals.suspended) })}
      />
    </div>
  );
}

function MessagesCard({ data, className }: { data: Overview; className?: string }) {
  const { t } = useTranslation();
  const points = data.series.map((day) => ({ date: day.date, value: day.messages }));
  const description = t("admin.overview.messagesSummary", { period: period(data.range.days), count: formatCount(data.totals.messages) });

  return (
    <ChartCard
      className={className}
      title={t("admin.overview.messagesPerDay")}
      subtitle={description}
      chart={<AreaChart points={points} seriesLabel={unit("messages")} description={description} height={260} />}
      table={
        <ValueTable
          columns={[t("admin.overview.columns.day"), t("admin.overview.columns.messages")]}
          rows={points.map((point) => [formatDay(point.date, "long"), point.value])}
        />
      }
    />
  );
}

function DailyCard({ data, field }: { data: Overview; field: "senders" | "sign_ups" }) {
  const { t } = useTranslation();
  const senders = field === "senders";
  const title = senders ? t("admin.overview.sendersTitle") : t("admin.overview.signUpsTitle");
  const points = data.series.map((day) => ({ date: day.date, value: day[field] }));
  const peak = Math.max(0, ...points.map((point) => point.value));
  const description = t("admin.overview.dailyDescription", { title, period: period(data.range.days), peak: formatCount(peak) });

  return (
    <ChartCard
      title={title}
      subtitle={senders ? t("admin.overview.sendersSubtitle") : t("admin.overview.signUpsSubtitle")}
      chart={<ColumnChart points={points} seriesLabel={unit(senders ? "people" : "accounts")} description={description} />}
      table={
        <ValueTable
          columns={[t("admin.overview.columns.day"), senders ? t("admin.overview.columns.people") : t("admin.overview.columns.accounts")]}
          rows={points.map((point) => [formatDay(point.date, "long"), point.value])}
        />
      }
    />
  );
}

function AccountsCard({ data }: { data: Overview }) {
  const { t } = useTranslation();
  const { totals } = data;
  const email = totals.people - totals.phone_accounts;
  const parts = [
    { key: "email", label: t("admin.overview.email"), value: email, color: "bg-viz-1", unit: unit("people")(email) },
    {
      key: "phone",
      label: t("admin.overview.phone"),
      value: totals.phone_accounts,
      color: "bg-viz-2",
      unit: unit("people")(totals.phone_accounts),
    },
  ];
  const share = (value: number) => formatPercent(totals.people ? Math.round((value / totals.people) * 100) / 100 : 0);

  return (
    <ChartCard
      title={t("admin.overview.signInTitle")}
      subtitle={t("admin.overview.allAccounts", { count: formatCount(totals.people) })}
      chart={
        <div className="flex h-full flex-col">
          <SegmentedBar parts={parts} label={t("admin.overview.byMethod")} />
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5">
            <Figure label={t("admin.overview.figures.conversations")} value={totals.conversations} />
            <Figure label={t("admin.overview.figures.online")} value={totals.online_now} />
            <Figure label={t("admin.overview.figures.admins")} value={totals.admins} />
            <Figure label={t("admin.overview.figures.suspended")} value={totals.suspended} />
          </dl>
        </div>
      }
      table={
        <ValueTable
          columns={[t("admin.overview.columns.method"), t("admin.overview.columns.people"), t("admin.overview.columns.share")]}
          rows={parts.map((part) => [part.label, part.value, share(part.value)])}
        />
      }
    />
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-fg">{formatCount(value)}</dd>
    </div>
  );
}

function RecentSignUps({ data }: { data: Overview }) {
  const { t } = useTranslation();
  const now = useNow(60_000);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <ListHeader title={t("admin.overview.newest")} to="/admin/people" linkLabel={t("admin.overview.everyone")} />
      <ul className="space-y-0.5">
        {data.recent_sign_ups.map((person) => (
          <li key={person.id}>
            <Link
              to={`/admin/people/${person.id}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar name={person.name} src={person.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{person.name}</p>
                <p className="truncate text-xs text-fg-subtle">
                  <span dir="ltr">{signInIdentifier(person)}</span>
                </p>
              </div>
              <span className="shrink-0 text-xs text-fg-subtle">{formatMoment(person.created_at, now, "joined")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListHeader({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[0.9375rem] font-semibold text-fg">{title}</h2>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {linkLabel}
        <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </div>
  );
}

function OverviewSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5" aria-label={t("admin.overview.loading")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[8.5rem] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[22rem] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[22rem] rounded-2xl" />
      </div>
    </div>
  );
}
