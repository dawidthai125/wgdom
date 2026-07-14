/**
 * LOCALSTORAGE-ARCH-02 C — lean pipeline w LS + full cold w IndexedDB.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { idbGet, idbSet } from "@/lib/storage/storage-idb";
import { estimateJsonBytes } from "@/lib/storage/storage-budget";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

export const PIPELINE_COLD_IDB_KEY = "tenders-pipeline-full";

let coldMem: TenderPipelineItem[] | null = null;
let coldHydrated = false;

/** Usuń pola ciężkie z kopii hot (LS). Full zostaje w IDB / coldMem. */
export function stripTenderPipelineForLocalStorage(items: TenderPipelineItem[]): TenderPipelineItem[] {
  return items.map((item) => {
    const next: TenderPipelineItem = { ...item };
    if (next.noticeHtml) {
      delete next.noticeHtml;
    }
    if (next.tenderDossier && typeof next.tenderDossier === "object") {
      const dossier = { ...next.tenderDossier } as Record<string, unknown>;
      const kosztorys = dossier.kosztorys;
      if (kosztorys && typeof kosztorys === "object") {
        const k = { ...(kosztorys as Record<string, unknown>) };
        const rows = Array.isArray(k.rows) ? k.rows : [];
        k.rows = [];
        k._coldRowsCount = rows.length;
        dossier.kosztorys = k;
      }
      next.tenderDossier = dossier as TenderPipelineItem["tenderDossier"];
    }
    return next;
  });
}

export function setPipelineColdMemory(items: TenderPipelineItem[]): void {
  coldMem = items;
  coldHydrated = true;
  const bytes = estimateJsonBytes(items);
  void idbSet(PIPELINE_COLD_IDB_KEY, items).then((ok) => {
    recordStorageWrite({
      key: PIPELINE_COLD_IDB_KEY,
      bytes,
      writer: "tenders-pipeline.cold",
      ok,
      tier: 2,
    });
  });
}

export function getPipelineColdMemory(): TenderPipelineItem[] | null {
  return coldMem;
}

/** Prefer full cold; w przeciwnym razie lean. */
export function resolvePipelineLocalWithCold(lean: TenderPipelineItem[]): TenderPipelineItem[] {
  if (coldMem && coldMem.length > 0) return coldMem;
  return lean;
}

export async function hydratePipelineColdFromIdb(): Promise<TenderPipelineItem[] | null> {
  if (coldHydrated && coldMem) return coldMem;
  const full = await idbGet<TenderPipelineItem[]>(PIPELINE_COLD_IDB_KEY);
  if (Array.isArray(full) && full.length > 0) {
    coldMem = full;
    coldHydrated = true;
    return full;
  }
  coldHydrated = true;
  return null;
}
