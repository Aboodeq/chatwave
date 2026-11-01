import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Mail, Smartphone, UsersRound } from "lucide-react";
import { usePeople } from "../../hooks/useAdmin";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useNow } from "../../hooks/useNow";
import { signInIdentifier } from "../../lib/account";
import { cn, formatLastSeen, formatShortDate } from "../../lib/utils";
import type { AdminUser, PeopleQuery } from "../../types/admin";
import { RoleBadge, StatusBadge } from "../../components/admin/Badges";
import { PageHeader } from "../../components/admin/PageHeader";
import { formatCount } from "../../components/admin/charts/chartUtils";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { Skeleton } from "../../components/ui/Skeleton";

const STATUSES = [
  { value: "all", label: "Everyone" },
  { value: "active", label: "Active" },
  { value: "online", label: "Online now" },
  { value: "suspended", label: "Suspended" },
] as const;

const select =
  "h-10 rounded-xl border border-line-strong bg-surface ps-3 pe-8 text-sm text-fg shadow-soft outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

/** Everyone with an account: search, filter, sort, and open a person. */
export default function PeoplePage() {
  const navigate = useNavigate();
  const now = useNow(60_000);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const query: PeopleQuery = {
    search: debouncedSearch,
    status: (params.get("status") as PeopleQuery["status"]) ?? "all",
    role: (params.get("role") as PeopleQuery["role"]) ?? "all",
    method: (params.get("method") as PeopleQuery["method"]) ?? "all",
    sort: params.get("sort") ?? "-created_at",
    page: Number(params.get("page") ?? 1),
  };
  const { data, isPending, isError, isPlaceholderData, refetch } = usePeople(query);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };

  const filtered = query.status !== "all" || query.role !== "all" || query.method !== "all" || Boolean(debouncedSearch);

  return (
    <>
      <PageHeader
        title="People"
        description={data ? `${formatCount(data.meta.total)} ${data.meta.total === 1 ? "account" : "accounts"}${filtered ? " match" : ""}` : "Everyone with an account"}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              update({ q: value.trim() || null });
            }}
            label="Search by name, email or phone"
          />
        </div>
        <div role="radiogroup" aria-label="Status" className="inline-flex rounded-xl bg-surface p-1 shadow-soft ring-1 ring-line">
          {STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              role="radio"
              aria-checked={query.status === status.value}
              onClick={() => update({ status: status.value })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                query.status === status.value ? "bg-primary text-primary-fg shadow-soft" : "text-fg-muted hover:text-fg",
              )}
            >
              {status.label}
            </button>
          ))}
        </div>
        <select aria-label="Role" value={query.role} onChange={(event) => update({ role: event.target.value })} className={select}>
          <option value="all">Any role</option>
          <option value="admin">Admins</option>
          <option value="user">Members</option>
        </select>
        <select aria-label="Signs in with" value={query.method} onChange={(event) => update({ method: event.target.value })} className={select}>
          <option value="all">Email or phone</option>
          <option value="email">Email</option>
          <option value="phone">Phone number</option>
        </select>
      </div>

      <div className={cn("overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-line transition-opacity", isPlaceholderData && "opacity-60")}>
        {isPending ? (
          <TableSkeleton />
        ) : isError || !data ? (
          <div className="p-10 text-center">
            <p className="text-sm text-fg-muted">We couldn't load people.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : data.data.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <UsersRound className="size-7 text-fg-subtle" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-fg">No one matches these filters</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearch("");
                setParams(new URLSearchParams(), { replace: true });
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-xs text-fg-muted">
              <tr>
                <SortHeader label="Person" column="name" sort={query.sort!} onSort={(sort) => update({ sort })} />
                <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">
                  Role
                </th>
                <th scope="col" className="hidden px-4 py-3 text-start font-medium sm:table-cell">
                  Status
                </th>
                <SortHeader label="Messages" column="messages_count" sort={query.sort!} onSort={(sort) => update({ sort })} align="end" className="hidden lg:table-cell" />
                <SortHeader label="Joined" column="created_at" sort={query.sort!} onSort={(sort) => update({ sort })} className="hidden lg:table-cell" />
                <SortHeader label="Last active" column="last_seen_at" sort={query.sort!} onSort={(sort) => update({ sort })} className="hidden md:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.data.map((person) => (
                <PersonRow key={person.id} person={person} now={now} onOpen={() => navigate(`/admin/people/${person.id}`)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm text-fg-muted">
          <p>
            {formatCount(data.meta.from ?? 0)}–{formatCount(data.meta.to ?? 0)} of {formatCount(data.meta.total)}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.meta.current_page <= 1} onClick={() => update({ page: String(data.meta.current_page - 1) })}>
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => update({ page: String(data.meta.current_page + 1) })}>
              Next
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </>
  );
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
  align = "start",
  className,
}: {
  label: string;
  column: string;
  sort: string;
  onSort: (sort: string) => void;
  align?: "start" | "end";
  className?: string;
}) {
  const active = sort.replace(/^-/, "") === column;
  const descending = sort.startsWith("-");
  // Names read best A→Z first; numbers and dates newest/highest first.
  const next = active ? (descending ? column : `-${column}`) : column === "name" ? column : `-${column}`;

  return (
    <th
      scope="col"
      aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
      className={cn("px-4 py-3 font-medium", align === "end" ? "text-end" : "text-start", className)}
    >
      <button
        type="button"
        onClick={() => onSort(next)}
        className={cn("inline-flex items-center gap-1 rounded outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring", active && "text-fg")}
      >
        {label}
        {active && (descending ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />)}
      </button>
    </th>
  );
}

function PersonRow({ person, now, onOpen }: { person: AdminUser; now: number; onOpen: () => void }) {
  const MethodIcon = person.sign_up_method === "phone" ? Smartphone : Mail;

  return (
    <tr onClick={onOpen} className="cursor-pointer transition-colors hover:bg-surface-2/70">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={person.name} src={person.avatar} online={person.is_online} />
          <div className="min-w-0">
            <Link
              to={`/admin/people/${person.id}`}
              onClick={(event) => event.stopPropagation()}
              className="block truncate font-medium text-fg outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {person.name}
            </Link>
            <p className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
              <MethodIcon className="size-3 shrink-0" aria-label={person.sign_up_method === "phone" ? "Phone" : "Email"} />
              <span className="truncate tabular-nums">{signInIdentifier(person)}</span>
            </p>
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <RoleBadge role={person.role} />
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <StatusBadge user={person} />
      </td>
      <td className="hidden px-4 py-3 text-end font-medium text-fg tabular-nums lg:table-cell">{formatCount(person.messages_count ?? 0)}</td>
      <td className="hidden px-4 py-3 text-fg-muted lg:table-cell">{formatShortDate(person.created_at)}</td>
      <td className="hidden px-4 py-3 text-fg-muted md:table-cell">
        {person.last_seen_at ? formatLastSeen(person.last_seen_at, now, "").trim() : "Never"}
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-line" aria-label="Loading people">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}
