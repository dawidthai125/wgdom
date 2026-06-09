import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { JobAttachment } from "@/lib/job-attachments";
import { filterJobAttachmentsByTombstones } from "@/lib/job-attachments";

export type JobAttachmentsPackSource = {
  id: string;
  address: string;
  flatNumber: string;
  jobAttachments?: JobAttachment[];
  deletedJobAttachmentTombstones?: import("@/lib/job-attachments").JobAttachmentTombstone[];
};

export type AttachmentPackEntry = {
  zipPath: string;
  url: string;
};

function safeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim() || "plik";
}

function packSlug(job: JobAttachmentsPackSource): string {
  const base = (job.address || "robota")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const flat = job.flatNumber ? `-m${job.flatNumber.replace(/\W/g, "")}` : "";
  return `${base || "robota"}${flat}`.toLowerCase();
}

export function collectActiveJobAttachments(job: JobAttachmentsPackSource): JobAttachment[] {
  return filterJobAttachmentsByTombstones(
    job.jobAttachments,
    job.deletedJobAttachmentTombstones,
  );
}

/** Lista załączników ogólnych do ZIP (folder zalaczniki/). */
export function collectJobAttachmentPackEntries(job: JobAttachmentsPackSource): AttachmentPackEntry[] {
  const entries: AttachmentPackEntry[] = [];
  const usedPaths = new Set<string>();

  for (const a of collectActiveJobAttachments(job)) {
    if (!a.publicUrl?.trim()) continue;
    let zipPath = `zalaczniki/${safeFilename(a.filename)}`;
    let n = 2;
    while (usedPaths.has(zipPath)) {
      const dot = zipPath.lastIndexOf(".");
      if (dot > 0) zipPath = `${zipPath.slice(0, dot)}-${n}${zipPath.slice(dot)}`;
      else zipPath = `${zipPath}-${n}`;
      n++;
    }
    usedPaths.add(zipPath);
    entries.push({ zipPath, url: a.publicUrl });
  }

  return entries;
}

export function jobAttachmentsPackHasFiles(job: JobAttachmentsPackSource): boolean {
  return collectJobAttachmentPackEntries(job).length > 0;
}

export async function downloadJobAttachmentsZip(
  job: JobAttachmentsPackSource,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fileEntries = collectJobAttachmentPackEntries(job);
  if (fileEntries.length === 0) {
    return { ok: false, error: "Brak załączników ogólnych do spakowania." };
  }

  const zip = new JSZip();
  const total = fileEntries.length;
  let done = 0;
  onProgress?.(done, total);

  const failures: string[] = [];
  for (const entry of fileEntries) {
    try {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(entry.zipPath, blob);
    } catch {
      failures.push(entry.zipPath);
    }
    done++;
    onProgress?.(done, total);
  }

  if (failures.length > 0) {
    zip.file(
      "UWAGA-brakujace-pliki.txt",
      `Nie udało się pobrać ${failures.length} plik(ów):\n\n${failures.map((f) => `- ${f}`).join("\n")}`,
    );
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `wgdom-zalaczniki-${packSlug(job)}-${date}.zip`);
  return { ok: true };
}
