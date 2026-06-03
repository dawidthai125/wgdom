/**
 * Wspólna logika tworzenia roboty z przetargu (Classic + COMMAND CENTER).
 * Nie modyfikuje jobDraftFromTender ani attachTenderAssetsToJob.
 */

import { defaultJob, type Job } from "@/app/app-domain";
import { appendJobActivity } from "@/lib/job-activity";
import {
  attachTenderAssetsToJob,
  type TenderJobDraft,
  type TenderPipelineItem,
} from "@/lib/tenders-bzp";

export type CreateJobFromTenderDeps = {
  setJobs: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  uploadedBy: string;
  /** Nawigacja do Roboty + otwarcie nowej roboty (jak Classic flow). */
  onNavigateToJob?: (jobId: string) => void;
};

/**
 * Tworzy robotę z draftu przetargu, kopiuje pliki (async), zwraca id roboty.
 * Powiązanie linkedJobId w pipeline — po stronie wywołującego (Classic: TenderDetailPanel).
 */
export function executeCreateJobFromTender(
  draft: TenderJobDraft,
  item: TenderPipelineItem,
  deps: CreateJobFromTenderDeps,
): string {
  const j = defaultJob();
  j.address = draft.address.slice(0, 120);
  j.client = draft.client;
  j.notes = draft.notes;
  if (draft.invoiceAmount) j.invoiceAmount = draft.invoiceAmount;
  j.linkedTenderId = draft.linkedTenderId;
  j.linkedTenderBzpNumber = draft.linkedTenderBzpNumber;
  appendJobActivity(j, "note", `Utworzono z przetargu BZP: ${item.bzpNumber}`);
  deps.setJobs((prev) => [j, ...prev]);

  void attachTenderAssetsToJob(j.id, item, deps.uploadedBy).then((attachments) => {
    if (!attachments?.length) return;
    deps.setJobs((prev) =>
      prev.map((job) =>
        job.id === j.id
          ? { ...job, jobFiles: [...(job.jobFiles || []), ...attachments] }
          : job,
      ),
    );
  });

  deps.onNavigateToJob?.(j.id);
  return j.id;
}
