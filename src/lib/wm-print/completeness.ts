import type { Job } from "@/app/app-domain";
import { getEnabledWmPrintTemplates } from "@/lib/wm-print/templates";
import type { WmPrintCompleteness, WmPrintJobDocument, WmPrintTemplate } from "@/lib/wm-print/types";

/** Klucz deduplikacji slotu wgrywanego (case-insensitive, trim). */
export function wmPrintJobUploadSlotKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Grupuje sloty job_upload po nazwie — pierwszy wpis zachowuje etykietę wyświetlaną. */
export function groupWmPrintJobUploadSlotsByName(
  slots: WmPrintTemplate[],
): Map<string, { label: string; slots: WmPrintTemplate[] }> {
  const groups = new Map<string, { label: string; slots: WmPrintTemplate[] }>();
  for (const slot of slots) {
    const key = wmPrintJobUploadSlotKey(slot.name);
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
    } else {
      groups.set(key, { label: slot.name, slots: [slot] });
    }
  }
  return groups;
}

export function dedupeWmPrintMissingNames(names: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = wmPrintJobUploadSlotKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

function slotHasJobDocument(
  job: Job,
  slot: WmPrintTemplate,
  jobDocs: WmPrintJobDocument[],
): boolean {
  return jobDocs.some(
    (d) =>
      d.jobId === job.id &&
      (d.templateId === slot.id || d.templateId === undefined && d.name === slot.name),
  );
}

/**
 * Kompletność robota — wyłącznie sloty wgrywane per robota (job_upload).
 * Nazwy slotów deduplikowane (P1.0.5A). Szablony generated nie wpływają na %.
 */
export function computeWmPrintCompleteness(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
): WmPrintCompleteness {
  const allSlots = getEnabledWmPrintTemplates(templates).filter((t) => t.kind === "job_upload");
  const groups = groupWmPrintJobUploadSlotsByName(allSlots);

  let present = 0;
  const missing: string[] = [];

  for (const { label, slots } of groups.values()) {
    const hasDoc = slots.some((slot) => slotHasJobDocument(job, slot, jobDocs));
    if (hasDoc) {
      present += 1;
    } else {
      missing.push(label);
    }
  }

  const total = groups.size;
  const percent = total === 0 ? 100 : Math.round((present / total) * 100);

  return {
    total,
    present,
    percent: Math.min(100, percent),
    missing: dedupeWmPrintMissingNames(missing),
  };
}
