/**
 * Wspólna logika tworzenia roboty z przetargu (Classic + COMMAND CENTER).
 * Nie modyfikuje jobDraftFromTender ani attachTenderAssetsToJob.
 */

import { defaultJob, normalizeJob, type Job } from "@/app/app-domain";
import { appendJobActivity } from "@/lib/job-activity";
import {
  attachTenderAssetsToJob,
  type TenderJobDraft,
  type TenderPipelineItem,
} from "@/lib/tenders-bzp";

/** ETAP 8.2 — rozszerzona notatka w historii przy utworzeniu z przetargu. */
function buildTenderJobCreatedActivityText(
  item: TenderPipelineItem,
  draft: TenderJobDraft,
  plannedHandoverDate?: string,
): string {
  const lines = [`Utworzono z przetargu BZP: ${item.bzpNumber}`];
  if (draft.invoiceAmount) {
    const n = parseFloat(draft.invoiceAmount.replace(/\s/g, "").replace(",", "."));
    const label = Number.isFinite(n) && n > 0
      ? `${Math.round(n).toLocaleString("pl-PL")} PLN`
      : `${draft.invoiceAmount} PLN`;
    lines.push(`Wartość kontraktu: ${label}`);
  }
  if (draft.startDate) lines.push(`Start umowy: ${draft.startDate}`);
  if (draft.endDate) lines.push(`Koniec realizacji: ${draft.endDate}`);
  if (plannedHandoverDate) lines.push(`Planowany odbiór WM: ${plannedHandoverDate}`);
  return lines.join("\n");
}

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
  if (draft.startDate) j.startDate = draft.startDate;
  if (draft.endDate) {
    j.endDate = draft.endDate;
    j.plannedHandoverDate = draft.endDate;
  }
  j.linkedTenderId = draft.linkedTenderId;
  j.linkedTenderBzpNumber = draft.linkedTenderBzpNumber;
  appendJobActivity(
    j,
    "note",
    buildTenderJobCreatedActivityText(item, draft, j.plannedHandoverDate),
    deps.uploadedBy,
  );
  deps.setJobs((prev) => [normalizeJob(j), ...prev]);

  void attachTenderAssetsToJob(j.id, item, deps.uploadedBy).then((attachments) => {
    if (!attachments?.length) return;
    deps.setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== j.id) return job;
        const merged: Job = {
          ...job,
          jobFiles: [...(job.jobFiles || []), ...attachments],
        };
        return normalizeJob(merged);
      }),
    );
  });

  deps.onNavigateToJob?.(j.id);
  return j.id;
}
