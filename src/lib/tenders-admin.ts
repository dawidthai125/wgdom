/** Reset i administracja sekcji Przetargi (Super Admin). */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import { awaitPipelineLocalWriteSettled, saveTendersPipelineLocal } from "@/lib/tenders-bzp";
import { defaultCompanyProfile, saveCompanyProfile } from "@/lib/tenders-bzp-company";
import { defaultCustomKeywords, saveCustomKeywords } from "@/lib/tenders-bzp-learn";
import {
  TENDERS_PIPELINE_KEY,
  TENDERS_DELETED_IDS_KEY,
  clearDeletedTenderIds,
  getDeletedTenderIds,
} from "@/lib/tenders-sync";
import { assertTenderPipelineCloudWriteAllowed } from "@/lib/tender-pipeline-write-safety";
import { pushTenderPipelineToCloud } from "@/lib/tender-pipeline/tender-pipeline-cloud-push";
import { invalidatePipelineSessionCache } from "@/lib/tenders-pipeline-session-cache";

/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 Phase 6 (DF §10, Owner #1) — reset safety-first.
 * Kolejność: cloud read → write-safety verdict → BLOCK ⇒ **zero destrukcji lokalnej** (throw);
 * ALLOW (jawnie pusty cloud) ⇒ cloud `[]` → canonical writer `[]` → tombstony → cache.
 * Zakaz: raw `removeItem`/`setItem` pipeline, lokalny wipe przed verdictem, duplikat zapisu lokalnego.
 */
export async function resetTendersPipeline(): Promise<void> {
  let cloudBody: unknown | "UNAVAILABLE";
  try {
    const [body] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY]);
    cloudBody = body;
  } catch {
    cloudBody = "UNAVAILABLE";
  }
  assertTenderPipelineCloudWriteAllowed([], cloudBody, { deletedIds: getDeletedTenderIds() });

  await pushTenderPipelineToCloud([]);
  saveTendersPipelineLocal([]);
  await awaitPipelineLocalWriteSettled();
  clearDeletedTenderIds();
  await persistKey(TENDERS_DELETED_IDS_KEY, []);
  invalidatePipelineSessionCache("reset-pipeline");
}

export async function resetTendersKeywords(): Promise<void> {
  const kw = { ...defaultCustomKeywords(), updatedAt: new Date().toISOString() };
  await saveCustomKeywords(kw);
}

export async function resetTendersCompanyProfile(): Promise<void> {
  const p = { ...defaultCompanyProfile(), updatedAt: new Date().toISOString() };
  await saveCompanyProfile(p);
}

export async function resetAllTendersSection(): Promise<void> {
  await resetTendersPipeline();
  await resetTendersKeywords();
  await resetTendersCompanyProfile();
}
