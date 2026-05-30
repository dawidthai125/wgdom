/** Reset i administracja sekcji Przetargi (Super Admin). */

import { persistKey } from "@/lib/cloud-sync";
import { saveTendersPipelineLocal } from "@/lib/tenders-bzp";
import { defaultCompanyProfile, saveCompanyProfile } from "@/lib/tenders-bzp-company";
import { defaultCustomKeywords, saveCustomKeywords } from "@/lib/tenders-bzp-learn";
import {
  TENDERS_PIPELINE_KEY,
  TENDERS_DELETED_IDS_KEY,
  clearDeletedTenderIds,
} from "@/lib/tenders-sync";

export async function resetTendersPipeline(): Promise<void> {
  clearDeletedTenderIds();
  saveTendersPipelineLocal([]);
  await persistKey(TENDERS_PIPELINE_KEY, []);
  await persistKey(TENDERS_DELETED_IDS_KEY, []);
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
