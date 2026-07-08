/**
 * NG-08-04 — Documents workspace UI prefs (session LS only · WF-04a).
 * UI-only · brak pipeline / sync / chmury.
 */

import type { TenderDocumentBusinessGroupId } from "@/lib/tender-grouped-documents";

export const TENDER_DOCUMENT_GROUPS_EXPANDED_KEY_PREFIX = "wg-tender-doc-groups-";

export function tenderDocumentGroupsExpandedKey(tenderId: string): string {
  return `${TENDER_DOCUMENT_GROUPS_EXPANDED_KEY_PREFIX}${tenderId}`;
}

export function loadTenderDocumentGroupExpandedOverrides(
  tenderId: string | undefined,
): Partial<Record<TenderDocumentBusinessGroupId, boolean>> {
  if (!tenderId?.trim()) return {};
  try {
    const raw = localStorage.getItem(tenderDocumentGroupsExpandedKey(tenderId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<TenderDocumentBusinessGroupId, boolean>>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveTenderDocumentGroupExpandedOverrides(
  tenderId: string | undefined,
  overrides: Partial<Record<TenderDocumentBusinessGroupId, boolean>>,
): void {
  if (!tenderId?.trim()) return;
  try {
    localStorage.setItem(tenderDocumentGroupsExpandedKey(tenderId), JSON.stringify(overrides));
  } catch {
    /* quota / private mode */
  }
}
