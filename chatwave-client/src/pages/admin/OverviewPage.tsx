import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useOverview } from "../../hooks/useAdmin";
import { useNow } from "../../hooks/useNow";
import { signInIdentifier } from "../../lib/account";
import { cn, formatLastSeen } from "../../lib/utils";
import type { Overview, RangeDays } from "../../types/admin";
import { ActivityList } from "../../components/admin/ActivityList";
import { PageHeader } from "../../components/admin/PageHeader";
import { StatTile } from "../../components/admin/StatTile";
import { AreaChart } from "../../components/admin/charts/AreaChart";
import { ChartCard, ValueTable } from "../../components/admin/charts/ChartCard";
import { ColumnChart } from "../../components/admin/charts/ColumnChart";
import { SegmentedBar } from "../../components/admin/charts/SegmentedBar";
import { formatCount, formatDay } from "../../components/admin/charts/chartUtils";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

const RANGES: { days: RangeDays; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default function OverviewPage() {
  const [days, setDays] = useState<RangeDays>(30);
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useOverview(days);
  const dimmed = isPlaceholderData || (isFetching && !isPending);

  return (
    <>
      <PageHeader title="Overview" description="How people are using ChatWave." />

      {/* One filter row above everything it scopes. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-xl bg-surface p-1 shadow-soft ring-1 ring-line">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              role="radio"
              aria-checked={days === range.days}
              onClick={() => setDays(range.days)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                days === range.days ? "bg-primary text-primary-fg shadow-soft" : "text-fg-muted hover:text-fg",
              )}
            >
              Last {range.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refetch()} loading={isFetching && !isPending}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </Button>
        {data && <p className="text-xs text-fg-subtle">Days follow your time zone ({data.range.timezone}).</p>}
      </div>

      {isPending ? (
        <OverviewSkeleton />
      ) : isError || !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">We couldn't load the overview.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
            Try again
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
            <DailyCard data={data} field="senders" title="People who sent messages" seriesLabel="people" />
            <DailyCard data={data} field="sign_ups" title="New accounts" seriesLabel="new accounts" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <RecentSignUps data={data} />
            <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
              <ListHeader title="Recent admin activity" to="/admin/activity" linkLabel="All activity" />
              <ActivityList entries={data.recent_activity} empty="No admin actions yet." />
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function Totals({ data }: { data: Overview }) {
  const { totals, range, series } = data;
  const period = `vs previous ${range.days} days`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label={`Messages, last ${range.days} days`}
        value={totals.messages}
        delta={{ current: totals.messages, previous: totals.messages_previous, period }}
        trend={series.map((day) => day.messages)}
      />
      <StatTile
        label={`New accounts, last ${range.days} days`}
        value={totals.sign_ups}
        delta={{ current: totals.sign_ups, previous: totals.sign_ups_previous, period }}
        trend={series.map((day) => day.sign_ups)}
      />
      <StatTile
        label="Active today"
        value={totals.active_today}
        footnote={
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {formatCount(totals.online_now)} online now
          </span>
        }
      />
      <StatTile
        label="People"
        value={totals.people}
        footnote={`${formatCount(totals.admins)} ${totals.admins === 1 ? "admin" : "admins"} · ${formatCount(totals.suspended)} suspended`}
      />
    </div>
  );
}

function MessagesCard({ data, className }: { data: Overview; className?: string }) {
  const points = data.series.map((day) => ({ date: day.date, value: day.messages }));
  const description = `${formatCount(data.totals.messages)} messages in the last ${data.range.days} days`;

  return (
    <ChartCard
      className={className}
      title="Messages per day"
      subtitle={description}
      chart={<AreaChart points={points} seriesLabel="messages" description={description} height={260} />}
      table={<ValueTable columns={["Day", "Messages"]} rows={points.map((point) => [formatDay(point.date, "long"), point.value])} />}
    />
  );
}

function DailyCard({
  data,
  field,
  title,
  seriesLabel,
}: {
  data: Overview;
  field: "senders" | "sign_ups";
  title: string;
  seriesLabel: string;
}) {
  const points = data.series.map((day) => ({ date: day.date, value: day[field] }));
  const peak = Math.max(0, ...points.map((point) => point.value));
  const description = `${title} per day, last ${data.range.days} days. Busiest day: ${formatCount(peak)}`;

  return (
    <ChartCard
      title={title}
      subtitle={field === "senders" ? "Each day, people who sent at least one message" : "Accounts created each day"}
      chart={<ColumnChart points={points} seriesLabel={seriesLabel} description={description} />}
      table={
        <ValueTable
          columns={["Day", field === "senders" ? "People" : "Accounts"]}
          rows={points.map((point) => [formatDay(point.date, "long"), point.value])}
        />
      }
    />
  );
}

function AccountsCard({ data }: { data: Overview }) {
  const { totals } = data;
  const email = totals.people - totals.phone_accounts;
  const parts = [
    { key: "email", label: "Email", value: email, color: "bg-viz-1", unit: "people" },
    { key: "phone", label: "Phone number", value: totals.phone_accounts, color: "bg-viz-2", unit: "people" },
  ];
  const share = (value: number) => (totals.people ? `${Math.round((value / totals.people) * 100)}%` : "0%");

  return (
    <ChartCard
      title="How people sign in"
      subtitle={`All ${formatCount(totals.people)} accounts`}
      chart={
        <div className="flex h-full flex-col">
          <SegmentedBar parts={parts} label="Accounts by sign-in method" />
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5">
            <Figure label="Conversations" value={totals.conversations} />
            <Figure label="Online now" value={totals.online_now} />
            <Figure label="Admins" value={totals.admins} />
            <Figure label="Suspended" value={totals.suspended} />
          </dl>
        </div>
      }
      table={
        <ValueTable
          columns={["Sign-in method", "People", "Share"]}
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
  const now = useNow(60_000);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <ListHeader title="Newest accounts" to="/admin/people" linkLabel="Everyone" />
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
                <p className="truncate text-xs text-fg-subtle">{signInIdentifier(person)}</p>
              </div>
              <span className="shrink-0 text-xs text-fg-subtle">{formatLastSeen(person.created_at, now, "Joined")}</span>
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
  return (
    <div className="space-y-5" aria-label="Loading the overview">
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
