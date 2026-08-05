import { useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { InspectorDashboard } from "@/app/InspectorDashboard";
import { InspectorHint } from "@/app/InspectorHelp";
import { InspectorJobCard } from "@/app/InspectorJobCard";
import { InspectorJobPhotosGalleryView } from "@/app/InspectorJobPhotosGalleryView";
import { JobFilesBrowser } from "@/app/JobFilesBrowser";
import { WmPortfolioView } from "@/app/WmPortfolioView";
import type { InspectorJobSection, InspectorMainTab } from "@/app/InspectorNavigation";
import { PullToRefreshIndicator, usePullToRefresh } from "@/app/usePullToRefresh";
import { WgButton, WgEmptyState, WgField } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_TOUCH_MIN,
  WG_TYPE_TITLE,
} from "@/lib/wg-ui-tokens";
import type { InspectorDashboardJob } from "@/lib/inspector-dashboard";
import { sortJobsByInspectionPriority } from "@/lib/inspector-dashboard";
import type { DocType } from "@/lib/job-documents";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import { buildRecoverableStatsByJobId } from "@/lib/recoverable-charges";

export type InspectorViewRouterProps = {
  tab: InspectorMainTab;
  loading: boolean;
  jobs: InspectorDashboardJob[];
  displayName: string;
  adminNotesPending: InspectorDashboardJob[];
  recoverableCharges: RecoverableCharge[];
  athPreviewEnabled: boolean;
  onPullRefresh: () => void | Promise<void>;
  onOpenJob: (jobId: string, section?: InspectorJobSection, fromTab?: InspectorMainTab, drawingId?: string) => void;
  onMarkDoc: (jobId: string, doc: DocType) => void;
};

export function InspectorViewRouter({
  tab,
  loading,
  jobs,
  displayName,
  adminNotesPending,
  recoverableCharges,
  athPreviewEnabled,
  onPullRefresh,
  onOpenJob,
  onMarkDoc,
}: InspectorViewRouterProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  const dashboardScrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const portfolioScrollRef = useRef<HTMLDivElement>(null);
  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const filesScrollRef = useRef<HTMLDivElement>(null);

  const dashboardPull = usePullToRefresh(dashboardScrollRef, onPullRefresh, tab === "dashboard");
  const listPull = usePullToRefresh(listScrollRef, onPullRefresh, tab === "jobs");
  const galleryPull = usePullToRefresh(galleryScrollRef, onPullRefresh, tab === "gallery");
  const filesPull = usePullToRefresh(filesScrollRef, onPullRefresh, tab === "files");
  const portfolioPull = usePullToRefresh(portfolioScrollRef, onPullRefresh, tab === "portfolio");

  const recoverableStatsByJobId = useMemo(
    () => buildRecoverableStatsByJobId(jobs, recoverableCharges),
    [jobs, recoverableCharges],
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = jobs.filter((j) => {
      if (filter === "active" && j.status !== "in_progress") return false;
      if (filter === "completed" && j.status !== "completed") return false;
      if (!q) return true;
      return (
        j.address.toLowerCase().includes(q)
        || j.client.toLowerCase().includes(q)
        || (j.flatNumber || "").toLowerCase().includes(q)
      );
    });
    if (filter === "active") return sortJobsByInspectionPriority(list);
    return [...list].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [jobs, search, filter]);

  switch (tab) {
    case "dashboard":
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PullToRefreshIndicator pull={dashboardPull.pull} refreshing={dashboardPull.refreshing} ready={dashboardPull.ready} />
          <div ref={dashboardScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
            <div
              className="max-w-2xl mx-auto w-full px-4 py-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <InspectorDashboard
                  jobs={jobs}
                  displayName={displayName}
                  adminNotesPending={adminNotesPending}
                  onOpenJob={onOpenJob}
                  onMarkDoc={onMarkDoc}
                />
              )}
            </div>
          </div>
        </div>
      );

    case "portfolio":
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PullToRefreshIndicator pull={portfolioPull.pull} refreshing={portfolioPull.refreshing} ready={portfolioPull.ready} />
          <WmPortfolioView
            jobs={jobs}
            scrollRef={portfolioScrollRef}
            onOpenJob={(id) => onOpenJob(id, undefined, "portfolio")}
          />
        </div>
      );

    case "gallery":
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PullToRefreshIndicator pull={galleryPull.pull} refreshing={galleryPull.refreshing} ready={galleryPull.ready} />
          <InspectorJobPhotosGalleryView
            jobs={jobs}
            scrollRef={galleryScrollRef}
            onOpenJob={(id) => onOpenJob(id, "photos", "gallery")}
          />
        </div>
      );

    case "files":
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PullToRefreshIndicator pull={filesPull.pull} refreshing={filesPull.refreshing} ready={filesPull.ready} />
          <JobFilesBrowser
            jobs={jobs}
            athPreviewEnabled={athPreviewEnabled}
            scrollRef={filesScrollRef}
            onOpenJob={(id) => onOpenJob(id, "files", "files")}
          />
        </div>
      );

    case "jobs":
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 space-y-3 border-b border-border/60 bg-card/50 shrink-0">
            <div className="flex items-end justify-between gap-2">
              <div>
                <h2 className={cn(WG_TYPE_TITLE, "text-base")}>Roboty WM</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filter === "active" ? "Aktywne remonty" : filter === "completed" ? "Zdane klucze" : "Pełna lista"}
                  {" · "}
                  {filteredJobs.length} {filteredJobs.length === 1 ? "adres" : "adresów"}
                </p>
              </div>
            </div>
            <WgField
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj adresu, klienta…"
              aria-label="Szukaj adresu, klienta"
              className="relative w-full !space-y-0"
              controlClassName="h-11 min-h-[44px] rounded-xl bg-secondary/50"
              leading={
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
              }
            />
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                Status
                <InspectorHint text="Aktywne = remont trwa. Zdane = klucze oddane. Wszystkie = pełna lista." />
              </span>
              {(["active", "completed", "all"] as const).map((f) => {
                const on = filter === f;
                return (
                  <WgButton
                    key={f}
                    type="button"
                    variant="secondary"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex-1",
                      WG_TOUCH_MIN,
                      "h-11 py-2.5 text-xs font-medium",
                      `transition-colors ${WG_DURATION_HOVER}`,
                      WG_FOCUS_RING,
                      on
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f === "active" ? "Aktywne" : f === "completed" ? "Zdane" : "Wszystkie"}
                  </WgButton>
                );
              })}
            </div>
          </div>

          <PullToRefreshIndicator pull={listPull.pull} refreshing={listPull.refreshing} ready={listPull.ready} />
          <div ref={listScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <WgEmptyState
                icon={MapPin}
                title="Brak robót w tym filtrze"
                description="Zmień filtr na „Wszystkie” lub użyj wyszukiwarki"
              />
            ) : (
              filteredJobs.map((job) => {
                const rcStats = recoverableStatsByJobId.get(job.id);
                return (
                  <InspectorJobCard
                    key={job.id}
                    job={job}
                    hasAdminReply={adminNotesPending.some((j) => j.id === job.id)}
                    recoverableUnsettledCount={rcStats?.unsettledCount}
                    recoverableToRecoverAmount={rcStats?.toRecoverAmount}
                    onSelect={() => onOpenJob(job.id, undefined, "jobs")}
                  />
                );
              })
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
