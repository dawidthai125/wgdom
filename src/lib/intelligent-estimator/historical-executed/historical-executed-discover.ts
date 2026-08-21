/**
 * IK-HISTORICAL-EXECUTED-ATH Host Hydrate — discover completed kosztorys *.ath from jobs.
 *
 * READ-ONLY · dynamic discovery · ZERO hardcode jobId list · ZERO Catalog / KL-6.
 */

import type { Job } from "@/app/app-domain";
import {
  resolveJobFileStoragePath,
  type JobFileAttachment,
} from "@/lib/job-documents";

export type HistoricalExecutedAthCandidate = {
  jobId: string;
  address: string;
  jobStatus: string;
  filename: string;
  storagePath: string;
  publicUrl: string | null;
  fileId: string;
};

function isAthFilename(name: string): boolean {
  return /\.ath$/i.test(String(name || "").trim());
}

/**
 * Pure discovery from in-memory jobs (props SSOT). No localStorage. No hardcode.
 */
export function discoverHistoricalExecutedAthCandidates(
  jobs: readonly Job[] | null | undefined,
): HistoricalExecutedAthCandidate[] {
  const list = Array.isArray(jobs) ? jobs : [];
  const out: HistoricalExecutedAthCandidate[] = [];

  for (const job of list) {
    if (!job || job.status !== "completed") continue;
    const files = Array.isArray(job.jobFiles) ? job.jobFiles : [];
    for (const file of files) {
      if (!file || file.kind !== "kosztorys") continue;
      const filename = String(file.filename || "").trim()
        || String(file.path || "").replace(/\\/g, "/").split("/").pop()
        || "";
      if (!isAthFilename(filename) && !isAthFilename(file.path || "")) continue;
      const resolvedName = isAthFilename(filename)
        ? filename
        : String(file.path || "").replace(/\\/g, "/").split("/").pop() || filename;
      const storagePath = resolveJobFileStoragePath(
        file as Pick<JobFileAttachment, "path" | "publicUrl">,
      );
      if (!storagePath) continue;
      out.push({
        jobId: String(job.id || "").trim(),
        address: [job.address, job.flatNumber].filter(Boolean).join(" ").trim(),
        jobStatus: job.status,
        filename: resolvedName,
        storagePath,
        publicUrl: file.publicUrl ? String(file.publicUrl) : null,
        fileId: String(file.id || "").trim(),
      });
    }
  }

  return out;
}

/** Stable fingerprint of discovered sources (paths) for hydrate skip. */
export function fingerprintHistoricalAthCandidates(
  candidates: readonly HistoricalExecutedAthCandidate[],
): string {
  return candidates
    .map((c) => `${c.jobId}|${c.storagePath}|${c.filename}`)
    .sort()
    .join("\n");
}
