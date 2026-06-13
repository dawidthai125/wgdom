/**
 * UX.1A — Tender Workspace Cleanup: sekcje, summary, monitoring (bez logiki wyceny).
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
