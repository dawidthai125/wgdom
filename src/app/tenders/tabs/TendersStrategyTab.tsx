import { TendersStrategyContent } from "@/app/tenders/components/TendersStrategyContent";
import type { Job } from "@/app/app-domain";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";

export function TendersStrategyTab({
  setJobs,
  tenderJobUploadedBy = "Administrator",
  onNavigateToJobFromTender,
  onOpenJob,
  onCreateJobFromTender,
  onOpenTender,
}: {
  setJobs?: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  tenderJobUploadedBy?: string;
  onNavigateToJobFromTender?: (jobId: string) => void;
  onOpenJob?: (jobId: string) => void;
  onCreateJobFromTender?: (
    draft: ReturnType<typeof jobDraftFromTender>,
    item: TenderPipelineItem,
  ) => string | void;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <TendersStrategyContent
      showHeader={false}
      onOpenTender={onOpenTender}
      setJobs={setJobs}
      tenderJobUploadedBy={tenderJobUploadedBy}
      onNavigateToJobFromTender={onNavigateToJobFromTender}
      onOpenJob={onOpenJob}
      onCreateJobFromTender={onCreateJobFromTender}
    />
  );
}
