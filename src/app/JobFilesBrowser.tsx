import { useMemo, useState, type RefObject } from "react";
import {
  FolderOpen, Search, ChevronRight, ChevronDown, Package,
} from "lucide-react";
import {
  countBrowserFiles,
  jobBrowserTitle,
  jobHasBrowserFiles,
  summarizeJobBrowserFiles,
  jobFileSummaryChips,
  type JobFilesBrowserSource,
  type JobFileSummaryChip,
} from "@/lib/job-files-browser";
import { JobFilesHub } from "@/app/JobFilesHub";
import { downloadJobDocumentsPack, type JobPackSource } from "@/lib/job-documents-pack";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { WgButton, WgCard, WgEmptyState, WgField, WgKpi } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_SM,
  WG_TOUCH_MIN,
  WG_TYPE_TITLE,
} from "@/lib/wg-ui-tokens";

const CHIP_STYLE: Record<JobFileSummaryChip["key"], string> = {
  zlecenie: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  kosztorys: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  plan_techniczny: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  reports: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  attachments: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function JobFileSummaryBadges({ job }: { job: JobFilesBrowserSource }) {
  const summary = summarizeJobBrowserFiles(job);
  const chips = jobFileSummaryChips(summary);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className={cn("text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground font-medium", WG_RADIUS_SM)}>
        {summary.total} {summary.total === 1 ? "plik" : summary.total < 5 ? "pliki" : "plików"}
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={cn("text-[10px] px-2 py-0.5 font-medium", WG_RADIUS_SM, CHIP_STYLE[chip.key])}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function JobFilesBrowser({
  jobs,
  athPreviewEnabled,
  onOpenJob,
  layout = "inspector",
  embedded = false,
  scrollRef,
}: {
  jobs: JobFilesBrowserSource[];
  athPreviewEnabled: boolean;
  onOpenJob: (jobId: string) => void;
  layout?: "inspector" | "admin";
  /** Ukryj nagłówek h1 — np. w zakładce Media */
  embedded?: boolean;
  /** Jeden scroll-container — np. pull-to-refresh w panelu Inspektora */
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [packBusy, setPackBusy] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);

  const jobsWithFiles = useMemo(
    () => jobs.filter(jobHasBrowserFiles).sort((a, b) => jobBrowserTitle(a).localeCompare(jobBrowserTitle(b), "pl")),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobsWithFiles;
    return jobsWithFiles.filter((j) =>
      (j.address || "").toLowerCase().includes(q) ||
      (j.flatNumber || "").toLowerCase().includes(q) ||
      (j.client || "").toLowerCase().includes(q),
    );
  }, [jobsWithFiles, search]);

  const totalFiles = useMemo(
    () => jobsWithFiles.reduce((s, j) => s + countBrowserFiles(j), 0),
    [jobsWithFiles],
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadPack = async (job: JobFilesBrowserSource) => {
    setPackBusy(job.id);
    try {
      await downloadJobDocumentsPack(job as JobPackSource);
    } finally {
      setPackBusy(null);
    }
  };

  const maxW = layout === "admin" ? "max-w-4xl" : "max-w-2xl";
  const titleCls = layout === "admin"
    ? cn(WG_TYPE_TITLE, "text-xl font-bold")
    : cn(WG_TYPE_TITLE, "text-base");
  const descCls = layout === "admin" ? "text-sm" : "text-[11px]";

  const scrollPad = scrollRef ? "" : "pb-20 sm:pb-6";

  return (
    <div className={`flex flex-col min-h-0 overflow-hidden ${scrollRef ? "flex-1 w-full" : "flex-1"}`}>
      <div ref={scrollRef} className={`flex-1 w-full overflow-y-auto overscroll-contain ${scrollPad}`}>
        <div className={`${maxW} mx-auto w-full px-4 sm:px-8 py-6 space-y-4`} style={{ paddingBottom: layout === "inspector" ? "max(1rem, env(safe-area-inset-bottom))" : undefined }}>
          {!embedded && (
            <div>
              <h1 className={`${titleCls} flex items-center gap-2`}>
                <FolderOpen size={layout === "admin" ? 22 : 18} className="text-primary"/>
                Pliki robot
              </h1>
              <p className={`${descCls} text-muted-foreground mt-1 leading-relaxed`}>
                Kontrakt, dokumentacja ekipy i załączniki — podgląd read-only. Pełna obsługa w Robotach → Pliki.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <WgKpi
              label="Roboty z plikami"
              value={String(jobsWithFiles.length)}
              status="info"
              className="min-w-0"
            />
            <WgKpi
              label="Łącznie w hubie plików"
              value={String(totalFiles)}
              status="neutral"
              className="min-w-0"
            />
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

          {filtered.length === 0 ? (
            <WgEmptyState
              icon={FolderOpen}
              title="Brak wgranych plików na robotach."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => {
                const expanded = expandedIds.has(job.id);
                return (
                  <WgCard
                    key={job.id}
                    elevation="soft"
                    padding="sm"
                    radius="md"
                    className="overflow-hidden !p-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(job.id)}
                      className={cn(
                        "w-full text-left px-4 sm:px-5 py-4 hover:bg-secondary/30 transition-colors",
                        WG_FOCUS_RING,
                        WG_DURATION_HOVER,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{jobBrowserTitle(job)}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.client || "—"}</p>
                          <JobFileSummaryBadges job={job}/>
                        </div>
                        {expanded ? <ChevronDown size={16} className="shrink-0 mt-1"/> : <ChevronRight size={16} className="shrink-0 mt-1"/>}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 sm:px-5 pb-4 space-y-4 border-t border-border pt-4">
                        <div className="flex flex-wrap gap-2">
                          <WgButton
                            type="button"
                            variant="secondary"
                            disabled={packBusy === job.id}
                            onClick={() => downloadPack(job)}
                            className={cn(
                              WG_TOUCH_MIN,
                              "h-11 gap-1.5 px-3 text-xs font-medium",
                              "bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:opacity-50",
                            )}
                          >
                            <Package size={13}/>
                            {packBusy === job.id ? "Pakowanie…" : "Dokumenty ZIP"}
                          </WgButton>
                          <WgButton
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenJob(job.id)}
                            className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 px-3 text-xs font-medium")}
                          >
                            Otwórz robotę
                          </WgButton>
                        </div>
                        <JobFilesHub
                          job={job}
                          mode="readonly"
                          onPreviewContract={(item) => setPreviewItem(item.previewItem)}
                        />
                      </div>
                    )}
                  </WgCard>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

/** @deprecated Użyj JobFilesBrowser */
export const InspectorJobFilesBrowser = JobFilesBrowser;
