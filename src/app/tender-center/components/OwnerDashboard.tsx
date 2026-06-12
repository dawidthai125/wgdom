import { TENDERS_MODULE_LABELS } from "@/lib/tenders-module-labels";
import { TendersStrategyContent } from "@/app/tenders/components/TendersStrategyContent";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { useCommandCenterContext } from "@/app/tender-center/context/CommandCenterContext";

export function OwnerDashboard({
  jobs: _jobs,
  directory: _directory,
  productionWeekEmployees: _productionWeekEmployees,
  weekFrom: _weekFrom,
  weekTo: _weekTo,
  savedWeeks: _savedWeeks,
  showTestBadge = false,
  onOpenTender,
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  onOpenJob,
  onCreateJobFromTender,
}: {
  /** @deprecated ETAP 7H — dane operacyjne z CommandCenterProvider. */
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  showTestBadge?: boolean;
  onOpenTender?: (tenderId: string) => void;
  setJobs?: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  tenderJobUploadedBy?: string;
  onNavigateToJobFromTender?: (jobId: string) => void;
  onOpenJob?: (jobId: string) => void;
  onCreateJobFromTender?: (
    draft: ReturnType<typeof jobDraftFromTender>,
    item: TenderPipelineItem,
  ) => string | void;
}) {
  void _jobs;
  void _directory;
  void _productionWeekEmployees;
  void _weekFrom;
  void _weekTo;
  void _savedWeeks;

  const { snapshot } = useCommandCenterContext();

  if (snapshot.pipeline.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {TENDERS_MODULE_LABELS.loading}
      </div>
    );
  }

  return (
    <TendersStrategyContent
      showHeader
      onOpenTender={onOpenTender}
      setJobs={setJobs}
      tenderJobUploadedBy={tenderJobUploadedBy}
      onNavigateToJobFromTender={onNavigateToJobFromTender}
      onOpenJob={onOpenJob}
      onCreateJobFromTender={onCreateJobFromTender}
    />
  );
}
