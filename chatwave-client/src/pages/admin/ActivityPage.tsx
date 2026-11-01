import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useActivity } from "../../hooks/useAdmin";
import { cn } from "../../lib/utils";
import { ActivityList } from "../../components/admin/ActivityList";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

/** Every admin action, newest first. Entries can't be edited or removed. */
export default function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const { data, isPending, isError, isPlaceholderData, refetch } = useActivity(page);
  const goTo = (next: number) => setParams(next > 1 ? { page: String(next) } : {}, { replace: true });

  return (
    <>
      <PageHeader title="Activity" description="Everything admins have done: suspensions, restored access, role changes and sign-outs." />

      <section className={cn("rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line transition-opacity sm:p-4", isPlaceholderData && "opacity-60")}>
        {isPending ? (
          <div className="space-y-3 p-2" aria-label="Loading activity">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center">
            <p className="text-sm text-fg-muted">We couldn't load the activity log.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <ActivityList entries={data.data} empty="No admin actions yet. Suspensions, role changes and sign-outs will show up here." />
        )}
      </section>

      {data && data.meta.last_page > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            Newer
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => goTo(page + 1)}>
            Older
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </>
  );
}
