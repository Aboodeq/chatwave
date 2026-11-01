import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActivity } from "../../hooks/useAdmin";
import { cn } from "../../lib/utils";
import { ActivityList } from "../../components/admin/ActivityList";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

/** Every admin action, newest first. Entries can't be edited or removed. */
export default function ActivityPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const { data, isPending, isError, isPlaceholderData, refetch } = useActivity(page);
  const goTo = (next: number) => setParams(next > 1 ? { page: String(next) } : {}, { replace: true });

  return (
    <>
      <PageHeader title={t("admin.activityPage.title")} description={t("admin.activityPage.description")} />

      <section className={cn("rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-line transition-opacity sm:p-4", isPlaceholderData && "opacity-60")}>
        {isPending ? (
          <div className="space-y-3 p-2" aria-label={t("admin.activityPage.loading")}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center">
            <p className="text-sm text-fg-muted">{t("admin.activityPage.loadFailed")}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <ActivityList entries={data.data} empty={t("admin.activityPage.empty")} />
        )}
      </section>

      {data && data.meta.last_page > 1 && (
        <nav aria-label={t("admin.pagination.label")} className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t("admin.pagination.newer")}
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => goTo(page + 1)}>
            {t("admin.pagination.older")}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </>
  );
}
