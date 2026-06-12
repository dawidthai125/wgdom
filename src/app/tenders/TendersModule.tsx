import { useEffect } from "react";
import {
  List,
  LayoutGrid,
  MapPin,
  Building2,
  Settings2,
  RefreshCw,
  Scale,
} from "lucide-react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { TENDERS_MODULE_LABELS, type TendersTabId } from "@/lib/tenders-module-labels";
import { SECTION_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";
import { TendersListTab } from "@/app/tenders/tabs/TendersListTab";
import { TendersStrategyTab } from "@/app/tenders/tabs/TendersStrategyTab";
import { TendersMapTab } from "@/app/tenders/tabs/TendersMapTab";
import { TendersProfileTab } from "@/app/tenders/tabs/TendersProfileTab";
import { TendersSettingsTab } from "@/app/tenders/tabs/TendersSettingsTab";

const TAB_CONFIG: { id: TendersTabId; icon: typeof List }[] = [
  { id: "list", icon: List },
  { id: "strategy", icon: LayoutGrid },
  { id: "map", icon: MapPin },
  { id: "profile", icon: Building2 },
  { id: "settings", icon: Settings2 },
];

function TendersTabBar() {
  const { activeTab, setActiveTab } = useTendersContext();

  return (
    <div className="shrink-0 px-4 sm:px-6 py-2 border-b border-border bg-secondary/30 overflow-x-auto">
      <div
        className="inline-flex min-w-full sm:min-w-0 rounded-xl bg-secondary p-0.5 border border-border gap-0.5"
        role="tablist"
        aria-label="Zakładki modułu Przetargi"
      >
        {TAB_CONFIG.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px] whitespace-nowrap flex-1 sm:flex-none justify-center ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} />
            {TENDERS_MODULE_LABELS.tabs[id]}
          </button>
        ))}
      </div>
    </div>
  );
}

function TendersModuleHeader({ showTestBadge }: { showTestBadge?: boolean }) {
  const { snapshot } = useTendersContext();
  const { pipeline } = snapshot;

  return (
    <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-border bg-card/95 backdrop-blur flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-primary shrink-0" />
          <h1 className="text-lg font-semibold">{TENDERS_MODULE_LABELS.moduleTitle}</h1>
          {showTestBadge && (
            <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Super Admin · test
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pipeline BZP, analiza strategiczna i decyzje STARTUJ / ANALIZUJ / ODPUŚĆ
        </p>
      </div>
      <button
        type="button"
        onClick={() => void pipeline.refreshFromBzp()}
        disabled={pipeline.syncing}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px] shrink-0"
      >
        <RefreshCw size={16} className={pipeline.syncing || pipeline.autoSyncing ? "animate-spin" : ""} />
        {pipeline.syncing ? "Pobieranie…" : pipeline.autoSyncing ? SECTION_LABEL_PL.autoSync : "Odśwież z BZP"}
      </button>
    </div>
  );
}

export function TendersModule({
  showTestBadge = false,
  onCreateJobFromTender,
  onOpenJob,
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  athPreviewEnabled = true,
  initialExpandedId = null,
  jobs: _jobs,
  directory: _directory,
  productionWeekEmployees: _productionWeekEmployees,
  weekFrom: _weekFrom,
  weekTo: _weekTo,
  savedWeeks: _savedWeeks,
}: {
  showTestBadge?: boolean;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  setJobs?: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  tenderJobUploadedBy?: string;
  onNavigateToJobFromTender?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
  initialExpandedId?: string | null;
  /** @deprecated ETAP 2 — dane w TendersProvider; zachowane dla kompatybilności sygnatury. */
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
}) {
  void _jobs;
  void _directory;
  void _productionWeekEmployees;
  void _weekFrom;
  void _weekTo;
  void _savedWeeks;

  const { activeTab, snapshot, openTenderInList } = useTendersContext();
  const { pipeline } = snapshot;

  useEffect(() => {
    if (initialExpandedId) {
      openTenderInList(initialExpandedId);
    }
  }, [initialExpandedId, openTenderInList]);

  if (pipeline.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {TENDERS_MODULE_LABELS.loading}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <TendersModuleHeader showTestBadge={showTestBadge} />
      <TendersTabBar />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === "list" && (
          <TendersListTab
            showTestBadge={false}
            onCreateJobFromTender={onCreateJobFromTender}
            onOpenJob={onOpenJob}
            athPreviewEnabled={athPreviewEnabled}
          />
        )}
        {activeTab === "strategy" && (
          <TendersStrategyTab
            setJobs={setJobs}
            tenderJobUploadedBy={tenderJobUploadedBy}
            onNavigateToJobFromTender={onNavigateToJobFromTender}
            onOpenJob={onOpenJob}
            onCreateJobFromTender={onCreateJobFromTender}
          />
        )}
        {activeTab === "map" && <TendersMapTab />}
        {activeTab === "profile" && <TendersProfileTab />}
        {activeTab === "settings" && <TendersSettingsTab />}
      </div>
    </div>
  );
}
