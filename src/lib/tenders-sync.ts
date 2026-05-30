/**
 * Merge i sync przetargów między urządzeniami — bez importu cloud-sync (unikamy cykli).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export const TENDERS_PIPELINE_KEY = "kw-tenders-pipeline";
export const TENDERS_COMPANY_PROFILE_KEY = "kw-tenders-company-profile";
export const TENDERS_CUSTOM_KEYWORDS_KEY = "kw-tenders-custom-keywords";
export const TENDERS_DELETED_IDS_KEY = "kw-tenders-deleted-ids";

export const TENDER_DATA_KEYS = [
  TENDERS_PIPELINE_KEY,
  TENDERS_COMPANY_PROFILE_KEY,
  TENDERS_CUSTOM_KEYWORDS_KEY,
] as const;

export type TenderDataKey = (typeof TENDER_DATA_KEYS)[number];

function sortPipeline(items: TenderPipelineItem[]): TenderPipelineItem[] {
  const open = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
  };
  return [...items].sort((a, b) => {
    const aOpen = open(a.submittingOffersDate);
    const bOpen = open(b.submittingOffersDate);
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    if (aOpen && bOpen) {
      return (a.submittingOffersDate || "").localeCompare(b.submittingOffersDate || "");
    }
    return (b.publicationDate || "").localeCompare(a.publicationDate || "");
  });
}

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function mergePipelineItem(a: TenderPipelineItem, b: TenderPipelineItem): TenderPipelineItem {
  const primary = ts(a.updatedAt) >= ts(b.updatedAt) ? a : b;
  const secondary = primary === a ? b : a;
  const status =
    primary.status !== "new" ? primary.status
      : secondary.status !== "new" ? secondary.status
        : "new";
  return {
    ...secondary,
    ...primary,
    status,
    notes: primary.notes || secondary.notes,
    addedAt: ts(a.addedAt) <= ts(b.addedAt) ? a.addedAt : b.addedAt,
    bzpDocuments: primary.bzpDocuments?.length ? primary.bzpDocuments : secondary.bzpDocuments,
    documentsFetchedAt: primary.documentsFetchedAt ?? secondary.documentsFetchedAt,
    swzAnalysis: primary.swzAnalysis ?? secondary.swzAnalysis,
    uploadedFile: primary.uploadedFile ?? secondary.uploadedFile,
    ourEstimatePln: primary.ourEstimatePln ?? secondary.ourEstimatePln,
    linkedJobId: primary.linkedJobId ?? secondary.linkedJobId,
    tenderState: primary.tenderState ?? secondary.tenderState,
    noticeHtml: primary.noticeHtml ?? secondary.noticeHtml,
    noticeHtmlFetchedAt: primary.noticeHtmlFetchedAt ?? secondary.noticeHtmlFetchedAt,
    tenderDossier: primary.tenderDossier ?? secondary.tenderDossier,
    tenderFit: primary.tenderFit ?? secondary.tenderFit,
    externalDocDiscovery: primary.externalDocDiscovery ?? secondary.externalDocDiscovery,
    updatedAt: ts(a.updatedAt) >= ts(b.updatedAt) ? a.updatedAt : b.updatedAt,
  };
}

export function getDeletedTenderIds(): string[] {
  try {
    const raw = localStorage.getItem(TENDERS_DELETED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function addDeletedTenderId(id: string): void {
  const set = new Set(getDeletedTenderIds());
  set.add(id);
  try {
    localStorage.setItem(TENDERS_DELETED_IDS_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function clearDeletedTenderIds(): void {
  try {
    localStorage.removeItem(TENDERS_DELETED_IDS_KEY);
  } catch { /* ignore */ }
}

export function mergeTenderPipelineForCloud(
  local: unknown,
  cloud: unknown,
  deletedIds: string[] = getDeletedTenderIds(),
): TenderPipelineItem[] {
  const deleted = new Set(deletedIds);
  const localArr = (Array.isArray(local) ? local : []) as TenderPipelineItem[];
  const cloudArr = (Array.isArray(cloud) ? cloud : []) as TenderPipelineItem[];
  const map = new Map<string, TenderPipelineItem>();
  for (const item of localArr) {
    if (!item?.id || deleted.has(item.id)) continue;
    map.set(item.id, item);
  }
  for (const item of cloudArr) {
    if (!item?.id || deleted.has(item.id)) continue;
    const prev = map.get(item.id);
    map.set(item.id, prev ? mergePipelineItem(prev, item) : item);
  }
  return sortPipeline([...map.values()]);
}

export function mergeCompanyProfileForCloud(local: unknown, cloud: unknown): unknown {
  const l = local && typeof local === "object" ? local as { updatedAt?: string } : null;
  const c = cloud && typeof cloud === "object" ? cloud as { updatedAt?: string } : null;
  if (!l && !c) return cloud ?? local ?? null;
  if (!l) return c;
  if (!c) return l;
  return ts(l.updatedAt) >= ts(c.updatedAt) ? l : c;
}

function uniqWords(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...a, ...b]) {
    const k = w.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(w.trim());
  }
  return out;
}

export function mergeCustomKeywordsForCloud(local: unknown, cloud: unknown): unknown {
  type Kw = { action?: string[]; scope?: string[]; exclude?: string[]; learnedFromCount?: number; updatedAt?: string };
  const empty: Kw = { action: [], scope: [], exclude: [], learnedFromCount: 0, updatedAt: "" };
  const l = (local && typeof local === "object" ? local : empty) as Kw;
  const c = (cloud && typeof cloud === "object" ? cloud : empty) as Kw;
  const primary = ts(l.updatedAt) >= ts(c.updatedAt) ? l : c;
  const secondary = primary === l ? c : l;
  return {
    action: uniqWords(primary.action ?? [], secondary.action ?? []),
    scope: uniqWords(primary.scope ?? [], secondary.scope ?? []),
    exclude: uniqWords(primary.exclude ?? [], secondary.exclude ?? []),
    learnedFromCount: Math.max(l.learnedFromCount ?? 0, c.learnedFromCount ?? 0),
    updatedAt: ts(l.updatedAt) >= ts(c.updatedAt) ? (l.updatedAt ?? "") : (c.updatedAt ?? ""),
  };
}

export function mergeTenderDataKey(key: TenderDataKey, local: unknown, cloud: unknown): unknown {
  switch (key) {
    case TENDERS_PIPELINE_KEY:
      return mergeTenderPipelineForCloud(local, cloud);
    case TENDERS_COMPANY_PROFILE_KEY:
      return mergeCompanyProfileForCloud(local, cloud);
    case TENDERS_CUSTOM_KEYWORDS_KEY:
      return mergeCustomKeywordsForCloud(local, cloud);
    default:
      return local ?? cloud;
  }
}

/** Eksport pipeline do CSV (UTF-8 BOM dla Excela). */
export function exportTendersPipelineCsv(items: TenderPipelineItem[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = [
    "Numer BZP", "Tytuł", "Zamawiający", "Miasto", "Status", "Termin składania",
    "Trafność", "Nasz szacunek PLN", "Notatki", "Data dodania",
  ].map(esc).join(";");
  const rows = items.map((i) => [
    i.bzpNumber,
    i.title,
    i.organizationName,
    i.organizationCity,
    i.status,
    i.submittingOffersDate ?? "",
    String(i.relevanceScore),
    i.ourEstimatePln != null ? String(i.ourEstimatePln) : "",
    i.notes.replace(/\s+/g, " "),
    i.addedAt,
  ].map(esc).join(";"));
  return `\uFEFF${header}\n${rows.join("\n")}`;
}
