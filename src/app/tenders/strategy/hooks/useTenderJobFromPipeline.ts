import { useCallback } from "react";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import { executeCreateJobFromTender } from "@/lib/create-job-from-tender";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
export type UseTenderJobFromPipelineOptions = {
  setJobs: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  uploadedBy: string;
  onNavigateToJob: (jobId: string) => void;
  onOpenJob: (jobId: string) => void;
  /** Pipeline przetargów — aktualizacja linkedJobId po utworzeniu. */
  pipeline?: {
    updateItem: (id: string, patch: Partial<TenderPipelineItem>) => void;
  };
};

/** Wspólny handler listy i strategii (bez duplikacji executeCreateJobFromTender). */
export function useTenderJobFromPipeline({
  setJobs,
  uploadedBy,
  onNavigateToJob,
  onOpenJob,
  pipeline,
}: UseTenderJobFromPipelineOptions) {
  const createJobFromTender = useCallback(
    (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => {
      const jobId = executeCreateJobFromTender(draft, item, {
        setJobs,
        uploadedBy,
        onNavigateToJob,
      });
      if (pipeline) {
        pipeline.updateItem(item.id, {
          linkedJobId: jobId,
          status: item.status === "won" ? "won" : item.status,
        });
      }
      toast.success("Utworzono robótę z przetargu");
      return jobId;
    },
    [setJobs, uploadedBy, onNavigateToJob, pipeline],
  );

  const createJobFromTenderItem = useCallback(
    (item: TenderPipelineItem) => createJobFromTender(jobDraftFromTender(item), item),
    [createJobFromTender],
  );

  const openLinkedJob = useCallback(
    (jobId: string) => onOpenJob(jobId),
    [onOpenJob],
  );

  return { createJobFromTender, createJobFromTenderItem, openLinkedJob };
}
