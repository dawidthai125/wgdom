/**
 * UX.1A/1B — Tender Workspace: sekcje, summary, monitoring, zakładki workspace (UI only).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { TENDER_STATUS_LABELS } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { resolveTenderValue } from "@/lib/tender-data-ssot";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";

export const TENDER_SUMMARY_BAR_ID = "tender-summary-bar";
export const TENDER_ATTACHMENTS_SECTION_ID = "tender-attachments-section";
export const TENDER_QUALIFICATION_SECTION_ID = "tender-qualification-section";
export const TENDER_VALUATION_SECTION_ID = "tender-valuation-section";
export const TENDER_OFFER_SECTION_ID = "tender-offer-section";
export const TENDER_FORMAL_DETAILS_SECTION_ID = "tender-formal-details-section";

/** Kolejność sekcji workspace (UX.1A) — indeks rośnie w dół strony. */
export const TENDER_WORKSPACE_SECTION_ORDER = [
  "summary",
  "bidPrep",
  "attachments",
  "qualification",
  "valuation",
  "offer",
  "formalDetails",
  "noticeHtml",
] as const;

export type TenderWorkspaceSectionId = (typeof TENDER_WORKSPACE_SECTION_ORDER)[number];

export interface TenderMonitoringCounts {
  changes: number;
  qa: number;
  total: number;
}

export interface TenderSummarySnapshot {
  statusLabel: string;
  deadlineDisplay: string;
  deadlineDays: number | null;
  offerOpen: boolean;
  valueDisplay: string;
  monitoring: TenderMonitoringCounts;
  readyLabel: string | null;
}

export function getTenderMonitoringCounts(item: TenderPipelineItem): TenderMonitoringCounts {
  const changes = item.changeMonitor?.unseenCount ?? 0;
  const qa = item.qaMonitor?.unseenCount ?? 0;
  return { changes, qa, total: changes + qa };
}

export function shouldShowTenderMonitoringBanner(item: TenderPipelineItem): boolean {
  return getTenderMonitoringCounts(item).total > 0;
}

export function buildTenderSummarySnapshot(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  readyCount?: number,
  readyTotal?: number,
): TenderSummarySnapshot {
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const deadlineStr = item.submittingOffersDate
    ? new Date(item.submittingOffersDate).toLocaleString("pl-PL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : "—";
  const deadlineDisplay = item.submittingOffersDate
    ? (offerOpen && days != null && days >= 0 ? `${deadlineStr} (${days} d.)` : deadlineStr)
    : "—";

  const valueResolved = resolveTenderValue(item, swz ?? null);

  return {
    statusLabel: TENDER_STATUS_LABELS[item.status] ?? item.status,
    deadlineDisplay,
    deadlineDays: days,
    offerOpen,
    valueDisplay: valueResolved.display,
    monitoring: getTenderMonitoringCounts(item),
    readyLabel: readyCount != null && readyTotal != null
      ? `${readyCount}/${readyTotal} gotowych`
      : null,
  };
}

export function workspaceSectionIndex(section: TenderWorkspaceSectionId): number {
  return TENDER_WORKSPACE_SECTION_ORDER.indexOf(section);
}

/** UX.1A: załączniki przed wyceną. */
export function attachmentsBeforeValuationInWorkspace(): boolean {
  return workspaceSectionIndex("attachments") < workspaceSectionIndex("valuation");
}

/** UX.1A: dossier przed HTML. */
export function formalDetailsBeforeNoticeHtml(): boolean {
  return workspaceSectionIndex("formalDetails") < workspaceSectionIndex("noticeHtml");
}

/** UX.1B — max 5 workspace (Anti-CC). */
export const TENDER_WORKSPACE_TAB_ORDER = [
  "overview",
  "documents",
  "qualification",
  "valuation",
  "offer",
] as const;

export type TenderWorkspaceTabId = (typeof TENDER_WORKSPACE_TAB_ORDER)[number];

export const TENDER_WORKSPACE_TAB_LABELS: Record<TenderWorkspaceTabId, string> = {
  overview: "Przegląd",
  documents: "Dokumenty",
  qualification: "Kwalifikacja",
  valuation: "Wycena",
  offer: "Oferta",
};

/** Mapowanie sekcji UX.1A → zakładka UX.1B. */
export const TENDER_SECTION_TO_TAB: Record<TenderWorkspaceSectionId, TenderWorkspaceTabId> = {
  summary: "overview",
  bidPrep: "overview",
  attachments: "documents",
  qualification: "qualification",
  valuation: "valuation",
  offer: "offer",
  formalDetails: "documents",
  noticeHtml: "documents",
};

/** Kafelek gotowości → docelowy workspace (UX.1B — bez scrollIntoView). */
export function bidPrepTileToWorkspace(checkId: string): TenderWorkspaceTabId | null {
  switch (checkId) {
    case "kosztorys":
      return "documents";
    case "wadium":
    case "criteria":
      return "qualification";
    case "our-bid":
      return "valuation";
    default:
      return null;
  }
}

/** Domyślny workspace po wejściu w przetarg. */
export function resolveDefaultTenderWorkspace(item: TenderPipelineItem): TenderWorkspaceTabId {
  if (item.status === "submitted" || item.status === "won" || item.status === "lost") {
    return "offer";
  }
  return "overview";
}

export function isTenderWorkspaceTabId(value: string): value is TenderWorkspaceTabId {
  return (TENDER_WORKSPACE_TAB_ORDER as readonly string[]).includes(value);
}

export function workspaceTabIndex(tab: TenderWorkspaceTabId): number {
  return TENDER_WORKSPACE_TAB_ORDER.indexOf(tab);
}

/** UX.1C — max pozycji w sekcji „Najważniejsze dokumenty”. */
export const TENDER_DOC_TOP_LIMIT = 5;

/** UX.1C — tier priorytetu wyświetlania (niższa liczba = wyżej). */
export type TenderDocumentDisplayTier =
  | "swz"
  | "ath_przedmiar"
  | "formularz_ofertowy"
  | "stwior"
  | "opz"
  | "kosztorys"
  | "wzor_umowy"
  | "zalacznik_formalny"
  | "pozostale";

const TENDER_DOC_TIER_PRIORITY: Record<TenderDocumentDisplayTier, number> = {
  swz: 1,
  ath_przedmiar: 2,
  formularz_ofertowy: 3,
  stwior: 4,
  opz: 5,
  kosztorys: 6,
  wzor_umowy: 7,
  zalacznik_formalny: 8,
  pozostale: 9,
};

const PL_DOC_TITLE_TOKEN_FIXES: ReadonlyArray<[RegExp, string]> = [
  [/Zamowienia/gi, "Zamówienia"],
  [/Zamowien/gi, "Zamówień"],
  [/Warunkow/gi, "Warunków"],
  [/Zalacznik/gi, "Załącznik"],
  [/zalaczniki/gi, "załączniki"],
  [/Formularz/gi, "Formularz"],
  [/Przedmiar/gi, "Przedmiar"],
  [/Obmiar/gi, "Obmiar"],
  [/Kosztorys/gi, "Kosztorys"],
  [/Specyfikacja/gi, "Specyfikacja"],
  [/Wzor/gi, "Wzór"],
  [/Umowy/gi, "Umowy"],
  [/Oswiadczen/gi, "Oświadczen"],
  [/Pelnomocnictw/gi, "Pełnomocnictw"],
  [/Realizacji/gi, "Realizacji"],
];

/** UX.1C — czytelna nazwa pliku (tylko UI; oryginalna nazwa pliku bez zmian). */
export function normalizeTenderDocumentTitle(filename: string): string {
  const trimmed = (filename || "").trim();
  if (!trimmed) return trimmed;

  const extMatch = trimmed.match(/(\.[a-z0-9]{2,5})$/i);
  const ext = extMatch?.[1] ?? "";
  let base = ext ? trimmed.slice(0, -ext.length) : trimmed;
  base = base.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  for (const [pattern, replacement] of PL_DOC_TITLE_TOKEN_FIXES) {
    base = base.replace(pattern, replacement);
  }

  if (base.length > 0) {
    base = base.charAt(0).toUpperCase() + base.slice(1);
  }

  return base + ext;
}

/** UX.1C — klasyfikacja tieru dokumentu do sortowania TOP N. */
export function classifyTenderDocumentDisplayTier(
  filename: string,
  opts?: { isSwzHint?: boolean },
): TenderDocumentDisplayTier {
  const n = filename.toLowerCase();
  if (
    opts?.isSwzHint
    || /swz|specyfikac|modyfik.*swz|swz.*modyfik|zmian.*swz/.test(n)
  ) {
    return "swz";
  }
  if (/\.(ath|nor|xml)$/i.test(filename) || /przedmiar|obmiar/.test(n)) {
    return "ath_przedmiar";
  }
  if (/formularz|ofert/.test(n)) return "formularz_ofertowy";
  if (/stwior|stwi/i.test(n)) return "stwior";
  if (/opz/.test(n)) return "opz";
  if (/kosztorys/.test(n)) return "kosztorys";
  if (/wzor.*umow|umow.*wzor|projekt.*umow/.test(n)) return "wzor_umowy";
  if (/zalacznik|aneks|oswiadczen|pelnomocnictw|referencj|jesp|piib|polisa/.test(n)) {
    return "zalacznik_formalny";
  }
  return "pozostale";
}

export function tenderDocumentDisplayTierPriority(
  filename: string,
  opts?: { isSwzHint?: boolean },
): number {
  return TENDER_DOC_TIER_PRIORITY[classifyTenderDocumentDisplayTier(filename, opts)];
}

/** UX.1C — podział listy dokumentów: TOP N + reszta (collapsed w UI). */
export function prioritizeTenderDocuments<T>(
  items: T[],
  getMeta: (item: T) => { filename: string; isSwzHint?: boolean; sortIndex?: number },
  maxTop: number = TENDER_DOC_TOP_LIMIT,
): { top: T[]; rest: T[] } {
  if (items.length <= maxTop) {
    return { top: items, rest: [] };
  }

  const sorted = [...items].sort((a, b) => {
    const ma = getMeta(a);
    const mb = getMeta(b);
    const pa = tenderDocumentDisplayTierPriority(ma.filename, { isSwzHint: ma.isSwzHint });
    const pb = tenderDocumentDisplayTierPriority(mb.filename, { isSwzHint: mb.isSwzHint });
    if (pa !== pb) return pa - pb;
    return (ma.sortIndex ?? 0) - (mb.sortIndex ?? 0);
  });

  return { top: sorted.slice(0, maxTop), rest: sorted.slice(maxTop) };
}
