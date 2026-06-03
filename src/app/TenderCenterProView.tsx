import { useCallback, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { TendersView } from "@/app/TendersView";
import { OwnerDashboard } from "@/app/tender-center/components/OwnerDashboard";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";

export type TenderCenterViewMode = "pro" | "classic";

const VIEW_MODE_STORAGE_KEY = "kw-tender-center-view-mode";

function loadViewMode(): TenderCenterViewMode {
  try {
    const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (raw === "classic" || raw === "pro") return raw;
  } catch { /* ignore */ }
  return "pro";
}

function saveViewMode(mode: TenderCenterViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch { /* ignore */ }
}

function TenderCenterViewToggle({
  mode,
  onChange,
}: {
  mode: TenderCenterViewMode;
  onChange: (mode: TenderCenterViewMode) => void;
}) {
  return (
    <div className="shrink-0 px-4 sm:px-6 py-2 border-b border-border bg-secondary/30 flex items-center justify-end">
      <div
        className="inline-flex rounded-xl bg-secondary p-0.5 border border-border"
        role="tablist"
        aria-label="Tryb widoku przetargów"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pro"}
          onClick={() => onChange("pro")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            mode === "pro"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid size={14} />
          {COMMAND_CENTER_BRAND.togglePro}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "classic"}
          onClick={() => onChange("classic")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            mode === "classic"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List size={14} />
          {COMMAND_CENTER_BRAND.toggleClassic}
        </button>
      </div>
    </div>
  );
}

export function TenderCenterProView({
  showTestBadge = false,
  onCreateJobFromTender,
  onOpenJob,
  athPreviewEnabled = true,
  initialExpandedId = null,
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
}: {
  showTestBadge?: boolean;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
  initialExpandedId?: string | null;
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
}) {
  const [viewMode, setViewMode] = useState<TenderCenterViewMode>(loadViewMode);
  const [classicExpandedId, setClassicExpandedId] = useState<string | null>(
    initialExpandedId ?? null,
  );

  const handleViewModeChange = useCallback((mode: TenderCenterViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  }, []);

  const handleOpenTenderInClassic = useCallback((tenderId: string) => {
    setClassicExpandedId(tenderId);
    setViewMode("classic");
    saveViewMode("classic");
  }, []);

  const classicInitialExpanded = classicExpandedId ?? initialExpandedId ?? null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <TenderCenterViewToggle mode={viewMode} onChange={handleViewModeChange} />
      {viewMode === "classic" ? (
        <TendersView
          showTestBadge={showTestBadge}
          onCreateJobFromTender={onCreateJobFromTender}
          onOpenJob={onOpenJob}
          athPreviewEnabled={athPreviewEnabled}
          initialExpandedId={classicInitialExpanded}
        />
      ) : (
        <OwnerDashboard
          jobs={jobs}
          directory={directory}
          productionWeekEmployees={productionWeekEmployees}
          weekFrom={weekFrom}
          weekTo={weekTo}
          savedWeeks={savedWeeks}
          showTestBadge={showTestBadge}
          onOpenTender={handleOpenTenderInClassic}
        />
      )}
    </div>
  );
}
