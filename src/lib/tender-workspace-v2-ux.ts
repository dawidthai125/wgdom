/**
 * Tender Workspace V2 — status, timeline, checklista, automatyzacja (UX only).
 * Wyłącznie read-only SSOT z pipeline/item — bez zmian provider/sync/parserów.
 */

import type { TenderBzpDocument, TenderPipelineItem } from "@/lib/tenders-bzp";
import { daysUntilTenderDeadline, isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { computeReferenceMatchSummary } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import {
  countTenderAttachments,
  isKosztorysAwaitingHeavyParse,
} from "@/lib/tender-analysis-status-ux";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import {
  classifyTenderDocumentDisplayTier,
  type TenderDocumentDisplayTier,
} from "@/lib/tender-workspace-ux";
import { isZipFilename, is7zFilename } from "@/lib/tenders-bzp-filename";
import { isKosztorysPreviewExt } from "@/lib/ath-parser";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { IntelligenceNextAction } from "@/lib/tender-intelligence-next-action";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";

export const TENDER_WORKSPACE_V2_CHECKLIST_KEY = "wg-tender-ws-v2-checklist-v1";

export type WorkspaceV2PillarId =
  | "documents"
  | "analysis"
  | "kosztorys"
  | "references"
  | "wadium"
  | "offer";

export type WorkspaceV2PillarStatus = "done" | "partial" | "missing";

export interface WorkspaceV2Pillar {
  id: WorkspaceV2PillarId;
  label: string;
  status: WorkspaceV2PillarStatus;
}

export interface WorkspaceV2Progress {
  pillars: WorkspaceV2Pillar[];
  percent: number;
}

export type WorkspaceV2DocSlot = "swz" | "kosztorys" | "ath" | "formularz" | "zip";

export interface WorkspaceV2KeyDocument {
  slot: WorkspaceV2DocSlot;
  label: string;
  filename: string | null;
  available: boolean;
  navigateTab: TenderDetailV4TabId;
  documentIndex?: number;
}

export type WorkspaceV2TimelineKind =
  | "today"
  | "tomorrow"
  | "deadline"
  | "opening"
  | "implementation";

export interface WorkspaceV2TimelineNode {
  id: WorkspaceV2TimelineKind;
  label: string;
  dateLabel: string;
  sortKey: number;
  isPast: boolean;
  isActive: boolean;
}

export type WorkspaceV2ChecklistId =
  | "wadium"
  | "references"
  | "offer"
  | "attachments"
  | "signature"
  | "submitted";

export interface WorkspaceV2ChecklistItem {
  id: WorkspaceV2ChecklistId;
  label: string;
  checked: boolean;
  manual: boolean;
}

/** Auto checklist — źródła dokumentowe + formalia (automatyczna ocena). */
export type WorkspaceV2AutoChecklistId =
  | "swz"
  | "ath"
  | "formularz"
  | "references"
  | "wadium";

export type WorkspaceV2AutoStatus = "ready" | "missing" | "action";

export interface WorkspaceV2AutoChecklistItem {
  id: WorkspaceV2AutoChecklistId;
  label: string;
  status: WorkspaceV2AutoStatus;
  hint?: string;
}

export interface WorkspaceV2TimelineAutomation {
  daysRemaining: number | null;
  daysRemainingLabel: string;
  suggestedValuationStart: string;
  suggestedValuationEnd: string;
  lastSafeSubmit: string;
}

export type WorkspaceV2InsightTone = "neutral" | "warn" | "positive";

export interface WorkspaceV2Insight {
  text: string;
  tone: WorkspaceV2InsightTone;
  priority: number;
}

const AUTO_CHECKLIST_LABELS: Record<WorkspaceV2AutoChecklistId, string> = {
  swz: "SWZ",
  ath: "ATH / kosztorys",
  formularz: "Formularz ofertowy",
  references: "Referencje",
  wadium: "Wadium",
};

const AUTO_STATUS_SCORE: Record<WorkspaceV2AutoStatus, number> = {
  ready: 1,
  action: 0.5,
  missing: 0,
};

const PILLAR_LABELS: Record<WorkspaceV2PillarId, string> = {
  documents: "Dokumenty",
  analysis: "Analiza",
  kosztorys: "Kosztorys",
  references: "Referencje",
  wadium: "Wadium",
  offer: "Oferta",
};

const DOC_SLOT_LABELS: Record<WorkspaceV2DocSlot, string> = {
  swz: "SWZ",
  kosztorys: "Kosztorys",
  ath: "ATH",
  formularz: "Formularz",
  zip: "ZIP",
};

const PL_TZ = "Europe/Warsaw";

function plDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: PL_TZ });
}

function autoStatusScore(status: WorkspaceV2AutoStatus): number {
  return AUTO_STATUS_SCORE[status];
}

function resolveSwzAutoStatus(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): WorkspaceV2AutoChecklistItem {
  const swzDoc = findDocForSlot(item, "swz");
  if (swz?.source || swzDoc) {
    return { id: "swz", label: AUTO_CHECKLIST_LABELS.swz, status: "ready" };
  }
  const docCount = countTenderAttachments(item);
  if (docCount > 0 || item.noticeHtml) {
    return {
      id: "swz",
      label: AUTO_CHECKLIST_LABELS.swz,
      status: "action",
      hint: "Pobierz lub przeanalizuj SWZ",
    };
  }
  return { id: "swz", label: AUTO_CHECKLIST_LABELS.swz, status: "missing", hint: "Brak SWZ" };
}

function resolveAthAutoStatus(item: TenderPipelineItem): WorkspaceV2AutoChecklistItem {
  const costStatus = resolvedCostStatus(item);
  const athDoc = findDocForSlot(item, "ath");
  const kosztorysOk = Boolean(item.tenderDossier?.kosztorys?.ok);

  if (kosztorysOk && costStatus !== "NOT_FOUND") {
    return { id: "ath", label: AUTO_CHECKLIST_LABELS.ath, status: "ready" };
  }
  if (isKosztorysAwaitingHeavyParse(item)) {
    return {
      id: "ath",
      label: AUTO_CHECKLIST_LABELS.ath,
      status: "action",
      hint: "Trwa przetwarzanie ATH",
    };
  }
  if (athDoc) {
    return {
      id: "ath",
      label: AUTO_CHECKLIST_LABELS.ath,
      status: "action",
      hint: "Otwórz kosztorys i uruchom analizę",
    };
  }
  const docCount = countTenderAttachments(item);
  if (docCount > 0) {
    return { id: "ath", label: AUTO_CHECKLIST_LABELS.ath, status: "missing", hint: "Brak ATH/PDF" };
  }
  return { id: "ath", label: AUTO_CHECKLIST_LABELS.ath, status: "missing", hint: "Brak załączników" };
}

function resolveFormularzAutoStatus(item: TenderPipelineItem): WorkspaceV2AutoChecklistItem {
  const form = findDocForSlot(item, "formularz");
  if (form) {
    return { id: "formularz", label: AUTO_CHECKLIST_LABELS.formularz, status: "ready" };
  }
  const docCount = countTenderAttachments(item);
  if (docCount > 0) {
    return {
      id: "formularz",
      label: AUTO_CHECKLIST_LABELS.formularz,
      status: "action",
      hint: "Szukaj w ZIP lub na platformie",
    };
  }
  return {
    id: "formularz",
    label: AUTO_CHECKLIST_LABELS.formularz,
    status: "missing",
    hint: "Brak formularza",
  };
}

function resolveReferencesAutoStatus(
  item: TenderPipelineItem,
): WorkspaceV2AutoChecklistItem {
  const profile = loadCompanyProfileLocal();
  const ref = computeReferenceMatchSummary(item, profile);
  if (ref.status === "ok") {
    return { id: "references", label: AUTO_CHECKLIST_LABELS.references, status: "ready" };
  }
  if (ref.status === "partial") {
    return {
      id: "references",
      label: AUTO_CHECKLIST_LABELS.references,
      status: "action",
      hint: ref.summary ?? "Uzupełnij referencje",
    };
  }
  if (ref.status === "gap") {
    return {
      id: "references",
      label: AUTO_CHECKLIST_LABELS.references,
      status: "missing",
      hint: ref.summary ?? "Brakuje referencji",
    };
  }
  return {
    id: "references",
    label: AUTO_CHECKLIST_LABELS.references,
    status: "action",
    hint: "Sprawdź wymagania w SWZ",
  };
}

function resolveWadiumAutoStatus(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): WorkspaceV2AutoChecklistItem {
  const profile = loadCompanyProfileLocal();
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  if (wadium.blocked) {
    return {
      id: "wadium",
      label: AUTO_CHECKLIST_LABELS.wadium,
      status: "missing",
      hint: wadium.summary ?? "Wadium blokuje start",
    };
  }
  if (wadium.amountPln != null || wadium.raw) {
    return { id: "wadium", label: AUTO_CHECKLIST_LABELS.wadium, status: "ready" };
  }
  if (swz) {
    return {
      id: "wadium",
      label: AUTO_CHECKLIST_LABELS.wadium,
      status: "action",
      hint: "Potwierdź kwotę i sposób wniesienia",
    };
  }
  return { id: "wadium", label: AUTO_CHECKLIST_LABELS.wadium, status: "missing", hint: "Brak danych o wadium" };
}

export function buildWorkspaceV2AutoChecklist(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): WorkspaceV2AutoChecklistItem[] {
  return [
    resolveSwzAutoStatus(item, swz),
    resolveAthAutoStatus(item),
    resolveFormularzAutoStatus(item),
    resolveReferencesAutoStatus(item),
    resolveWadiumAutoStatus(item, swz),
  ];
}

/** Postęp z auto-checklisty + filarów operacyjnych (analiza, kosztorys, oferta, dokumenty, referencje). */
export function computeWorkspaceV2AutoProgress(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): WorkspaceV2Progress {
  const auto = buildWorkspaceV2AutoChecklist(item, swz);
  const base = computeWorkspaceV2Progress(item, swz);

  const autoAvg = auto.reduce((s, row) => s + autoStatusScore(row.status), 0) / auto.length;
  const pillarAvg = base.pillars.reduce((s, p) => s + pillarScore(p.status), 0) / base.pillars.length;

  const weighted = autoAvg * 0.55 + pillarAvg * 0.45;
  const percent = Math.round(weighted * 100);

  const pillars = base.pillars.map((p) => {
    if (p.id === "references") {
      const refRow = auto.find((r) => r.id === "references");
      if (refRow?.status === "ready") return { ...p, status: "done" as const };
      if (refRow?.status === "action") return { ...p, status: "partial" as const };
      if (refRow?.status === "missing") return { ...p, status: "missing" as const };
    }
    if (p.id === "kosztorys") {
      const athRow = auto.find((r) => r.id === "ath");
      if (athRow?.status === "ready") return { ...p, status: "done" as const };
      if (athRow?.status === "action") return { ...p, status: "partial" as const };
    }
    if (p.id === "documents") {
      const swzRow = auto.find((r) => r.id === "swz");
      if (swzRow?.status === "ready") return { ...p, status: "done" as const };
      if (swzRow?.status === "action") return { ...p, status: "partial" as const };
    }
    return p;
  });

  return { pillars, percent };
}

function addCalendarDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatPlDate(d: Date): string {
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: PL_TZ,
  });
}

export function buildWorkspaceV2TimelineAutomation(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  now = new Date(),
): WorkspaceV2TimelineAutomation {
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate, now);
  const days = offerOpen ? daysUntilTenderDeadline(item.submittingOffersDate, now) : null;

  let daysRemainingLabel: string;
  if (!offerOpen) {
    daysRemainingLabel = "Termin minął";
  } else if (days == null) {
    daysRemainingLabel = "Brak daty terminu";
  } else if (days === 0) {
    daysRemainingLabel = "Ostatni dzień składania";
  } else if (days === 1) {
    daysRemainingLabel = "Został 1 dzień";
  } else {
    daysRemainingLabel = `Zostało ${days} dni`;
  }

  const deadline = parseLooseDate(item.submittingOffersDate);
  const athReady = resolveAthAutoStatus(item).status === "ready";

  let suggestedValuationStart: string;
  if (!offerOpen) {
    suggestedValuationStart = "—";
  } else if (athReady) {
    suggestedValuationStart = formatPlDate(now);
  } else if (days != null && days <= 3) {
    suggestedValuationStart = formatPlDate(now);
  } else {
    suggestedValuationStart = formatPlDate(addCalendarDays(now, 1));
  }

  let suggestedValuationEnd: string;
  if (!offerOpen || !deadline) {
    suggestedValuationEnd = "—";
  } else {
    const bufferDays = days != null && days <= 7 ? 2 : 3;
    const end = addCalendarDays(deadline, -bufferDays);
    suggestedValuationEnd = end.getTime() < now.getTime()
      ? formatPlDate(now)
      : formatPlDate(end);
  }

  let lastSafeSubmit: string;
  if (!offerOpen) {
    lastSafeSubmit = "Termin minął";
  } else if (!deadline) {
    lastSafeSubmit = "Ustal z ogłoszenia";
  } else if (days === 0) {
    lastSafeSubmit = `Dziś do ${deadline.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days === 1) {
    lastSafeSubmit = formatPlDate(deadline);
  } else {
    const safe = addCalendarDays(deadline, -1);
    lastSafeSubmit = formatPlDate(safe);
  }

  return {
    daysRemaining: days,
    daysRemainingLabel,
    suggestedValuationStart,
    suggestedValuationEnd,
    lastSafeSubmit,
  };
}

export function buildWorkspaceV2Insights(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  autoChecklist?: WorkspaceV2AutoChecklistItem[],
  timeline?: WorkspaceV2TimelineAutomation,
): WorkspaceV2Insight[] {
  const auto = autoChecklist ?? buildWorkspaceV2AutoChecklist(item, swz);
  const tl = timeline ?? buildWorkspaceV2TimelineAutomation(item, swz);
  const out: WorkspaceV2Insight[] = [];

  const wadium = auto.find((r) => r.id === "wadium");
  if (wadium?.status === "missing" && wadium.hint?.toLowerCase().includes("blokuje")) {
    out.push({ text: "Wadium blokuje start.", tone: "warn", priority: 0 });
  }

  const refs = auto.find((r) => r.id === "references");
  if (refs?.status === "missing" || refs?.status === "action") {
    out.push({
      text: refs.status === "missing" ? "Brakuje referencji." : "Referencje wymagają uzupełnienia.",
      tone: "warn",
      priority: 1,
    });
  }

  const ath = auto.find((r) => r.id === "ath");
  if (ath?.status === "missing") {
    out.push({ text: "Brak kosztorysu ATH — wycena niemożliwa.", tone: "warn", priority: 2 });
  } else if (ath?.status === "action") {
    out.push({ text: "Kosztorys wymaga przetworzenia lub wyceny.", tone: "warn", priority: 3 });
  }

  const offerReady = resolvePillarStatus("offer", item, swz) !== "missing"
    && ath?.status === "ready"
    && wadium?.status !== "missing";
  if (offerReady && tl.daysRemaining != null && tl.daysRemaining >= 0) {
    out.push({
      text: tl.daysRemaining === 0
        ? "Oferta może zostać przygotowana jeszcze dziś."
        : "Oferta może zostać przygotowana w tym tygodniu.",
      tone: "positive",
      priority: 4,
    });
  }

  if (tl.daysRemaining != null && tl.daysRemaining <= 3 && tl.daysRemaining >= 0) {
    out.push({
      text: `Pilne: ${tl.daysRemainingLabel.toLowerCase()}.`,
      tone: "warn",
      priority: 5,
    });
  }

  const swzRow = auto.find((r) => r.id === "swz");
  if (swzRow?.status === "missing") {
    out.push({ text: "Brak SWZ — pobierz dokumenty z BZP.", tone: "warn", priority: 6 });
  }

  return out
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

export function workspaceV2AutoStatusGlyph(status: WorkspaceV2AutoStatus): string {
  switch (status) {
    case "ready":
      return "✔";
    case "action":
      return "⌛";
    default:
      return "⚠";
  }
}

function pillarScore(status: WorkspaceV2PillarStatus): number {
  if (status === "done") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

function resolvePillarStatus(
  id: WorkspaceV2PillarId,
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): WorkspaceV2PillarStatus {
  const profile = loadCompanyProfileLocal();
  const docCount = countTenderAttachments(item);
  const costStatus = resolvedCostStatus(item);
  const ref = computeReferenceMatchSummary(item, profile);
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);

  switch (id) {
    case "documents":
      return docCount > 0 ? "done" : "missing";
    case "analysis":
      if (swz?.source) return "done";
      if (item.noticeHtml || item.swzAnalysis) return "partial";
      return docCount > 0 ? "partial" : "missing";
    case "kosztorys":
      if (costStatus !== "NOT_FOUND" && item.tenderDossier?.kosztorys?.ok) return "done";
      if (isKosztorysAwaitingHeavyParse(item) || costStatus !== "NOT_FOUND") return "partial";
      return docCount > 0 ? "partial" : "missing";
    case "references":
      if (ref.status === "ok") return "done";
      if (ref.status === "partial") return "partial";
      if (ref.status === "gap") return "missing";
      return "partial";
    case "wadium":
      if (wadium.blocked) return "missing";
      if (wadium.amountPln != null || wadium.raw) return "done";
      return swz ? "partial" : "missing";
    case "offer":
      if (["submitted", "won", "lost"].includes(item.status)) return "done";
      if (item.ourEstimatePln != null || item.submittedBidPln != null) return "partial";
      if (item.status === "preparing") return "partial";
      return "missing";
    default:
      return "missing";
  }
}

export function computeWorkspaceV2Progress(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): WorkspaceV2Progress {
  const ids: WorkspaceV2PillarId[] = [
    "documents", "analysis", "kosztorys", "references", "wadium", "offer",
  ];
  const pillars = ids.map((id) => ({
    id,
    label: PILLAR_LABELS[id],
    status: resolvePillarStatus(id, item, swz),
  }));
  const score = pillars.reduce((sum, p) => sum + pillarScore(p.status), 0);
  const percent = Math.round((score / pillars.length) * 100);
  return { pillars, percent };
}

export function buildWorkspaceV2NextActionLabel(action: IntelligenceNextAction): string {
  const map: Partial<Record<IntelligenceNextAction["ruleId"], string>> = {
    P5: "Znajdź kosztorys",
    P6: "Policz kosztorys",
    P2: "Uzupełnij referencje",
    P10: "Przygotuj ofertę",
    P7: "Popraw wycenę",
    P3: "Sprawdź formalia",
    P8: "Zatwierdź STARTUJ",
    P11: "Sprawdź zmiany w dokumentach",
  };
  return map[action.ruleId] ?? action.title;
}

export function legacyWorkspaceTabToV4Navigate(
  tab: TenderWorkspaceTabId | null,
  preferKosztorys = false,
): TenderDetailV4TabId {
  if (!tab) return "przetarg";
  switch (tab) {
    case "documents":
      return preferKosztorys ? "kosztorys" : "dokumenty";
    case "valuation":
      return "ceny";
    case "qualification":
      return "decyzja";
    case "offer":
      return "decyzja";
    case "overview":
    default:
      return "przetarg";
  }
}

function parseLooseDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimelineDate(d: Date | null, fallback: string): string {
  if (!d) return fallback;
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: PL_TZ,
  });
}

export function buildWorkspaceV2Timeline(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  now = new Date(),
): WorkspaceV2TimelineNode[] {
  const todayKey = plDayKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = plDayKey(tomorrow);

  const deadline = parseLooseDate(item.submittingOffersDate);
  const opening = parseLooseDate(item.tenderDossier?.brief?.offerOpening ?? null);
  const contractRaw = item.tenderDossier?.brief?.contractPeriod?.trim()
    ?? item.swzAnalysis?.implementationDeadlineRaw?.trim()
    ?? null;
  const implementation = parseLooseDate(contractRaw);

  const nodes: WorkspaceV2TimelineNode[] = [
    {
      id: "today",
      label: "Dziś",
      dateLabel: formatTimelineDate(now, "—"),
      sortKey: now.getTime(),
      isPast: false,
      isActive: true,
    },
    {
      id: "tomorrow",
      label: "Jutro",
      dateLabel: formatTimelineDate(tomorrow, "—"),
      sortKey: tomorrow.getTime(),
      isPast: false,
      isActive: todayKey === tomorrowKey,
    },
    {
      id: "deadline",
      label: "Termin składania",
      dateLabel: deadline
        ? formatTimelineDate(deadline, "—")
        : (isTenderOpenForOffers(item.submittingOffersDate) ? "Brak daty" : "Termin minął"),
      sortKey: deadline?.getTime() ?? Number.MAX_SAFE_INTEGER - 2,
      isPast: deadline ? deadline.getTime() < now.getTime() : false,
      isActive: Boolean(deadline && plDayKey(deadline) === todayKey),
    },
    {
      id: "opening",
      label: "Otwarcie",
      dateLabel: opening
        ? formatTimelineDate(opening, "Jak w SWZ")
        : "Jak w SWZ",
      sortKey: opening?.getTime() ?? Number.MAX_SAFE_INTEGER - 1,
      isPast: opening ? opening.getTime() < now.getTime() : false,
      isActive: Boolean(opening && plDayKey(opening) === todayKey),
    },
    {
      id: "implementation",
      label: "Realizacja",
      dateLabel: contractRaw ?? "Po wygranej",
      sortKey: implementation?.getTime() ?? Number.MAX_SAFE_INTEGER,
      isPast: false,
      isActive: false,
    },
  ];

  return nodes.sort((a, b) => a.sortKey - b.sortKey);
}

function tierToSlot(tier: TenderDocumentDisplayTier): WorkspaceV2DocSlot | null {
  switch (tier) {
    case "swz":
      return "swz";
    case "kosztorys":
      return "kosztorys";
    case "ath_przedmiar":
      return "ath";
    case "formularz_ofertowy":
      return "formularz";
    default:
      return null;
  }
}

function collectBzpDocs(item: TenderPipelineItem): TenderBzpDocument[] {
  return item.bzpDocuments ?? [];
}

function findDocForSlot(
  item: TenderPipelineItem,
  slot: WorkspaceV2DocSlot,
): { filename: string; documentIndex: number } | null {
  const docs = collectBzpDocs(item);

  if (slot === "zip") {
    const zip = docs.find((d) => isZipFilename(d.filename) || is7zFilename(d.filename));
    if (zip) return { filename: zip.filename, documentIndex: zip.index };
    return null;
  }

  if (slot === "kosztorys" && item.tenderDossier?.kosztorys?.ok) {
    const src = item.tenderDossier.kosztorys.sourceFilename;
    if (src) {
      const match = docs.find((d) => d.filename === src);
      if (match) return { filename: match.filename, documentIndex: match.index };
    }
  }

  for (const doc of docs) {
    if (slot === "ath" && isKosztorysPreviewExt(doc.filename)) {
      return { filename: doc.filename, documentIndex: doc.index };
    }
    const tier = classifyTenderDocumentDisplayTier(doc.filename, {
      isSwzHint: doc.isSwzHint,
    });
    const mapped = tierToSlot(tier);
    if (mapped === slot) {
      return { filename: doc.filename, documentIndex: doc.index };
    }
  }

  return null;
}

export function resolveWorkspaceV2KeyDocuments(item: TenderPipelineItem): WorkspaceV2KeyDocument[] {
  const slots: WorkspaceV2DocSlot[] = ["swz", "kosztorys", "ath", "formularz", "zip"];
  return slots.map((slot) => {
    const found = findDocForSlot(item, slot);
    const navigateTab: TenderDetailV4TabId = slot === "kosztorys" ? "kosztorys" : "dokumenty";
    return {
      slot,
      label: DOC_SLOT_LABELS[slot],
      filename: found?.filename ?? null,
      available: Boolean(found),
      navigateTab,
      documentIndex: found?.documentIndex,
    };
  });
}

export interface WorkspaceV2ChecklistPersist {
  signature: boolean;
}

export function loadWorkspaceV2ChecklistPersist(tenderId: string): WorkspaceV2ChecklistPersist {
  try {
    const raw = localStorage.getItem(TENDER_WORKSPACE_V2_CHECKLIST_KEY);
    if (!raw) return { signature: false };
    const all = JSON.parse(raw) as Record<string, Partial<WorkspaceV2ChecklistPersist>>;
    const row = all[tenderId];
    return { signature: row?.signature === true };
  } catch {
    return { signature: false };
  }
}

export function saveWorkspaceV2ChecklistPersist(
  tenderId: string,
  patch: Partial<WorkspaceV2ChecklistPersist>,
): WorkspaceV2ChecklistPersist {
  try {
    const raw = localStorage.getItem(TENDER_WORKSPACE_V2_CHECKLIST_KEY);
    const all: Record<string, WorkspaceV2ChecklistPersist> = raw
      ? (JSON.parse(raw) as Record<string, WorkspaceV2ChecklistPersist>)
      : {};
    const next = { ...loadWorkspaceV2ChecklistPersist(tenderId), ...patch };
    all[tenderId] = next;
    localStorage.setItem(TENDER_WORKSPACE_V2_CHECKLIST_KEY, JSON.stringify(all));
    return next;
  } catch {
    return { signature: patch.signature === true };
  }
}

export function buildWorkspaceV2Checklist(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  persist: WorkspaceV2ChecklistPersist,
): WorkspaceV2ChecklistItem[] {
  const profile = loadCompanyProfileLocal();
  const ref = computeReferenceMatchSummary(item, profile);
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const docCount = countTenderAttachments(item);

  return [
    {
      id: "wadium",
      label: "Wadium",
      checked: !wadium.blocked && (wadium.amountPln != null || Boolean(wadium.raw)),
      manual: false,
    },
    {
      id: "references",
      label: "Referencje",
      checked: ref.status === "ok",
      manual: false,
    },
    {
      id: "offer",
      label: "Oferta",
      checked: item.ourEstimatePln != null
        || item.submittedBidPln != null
        || ["submitted", "won"].includes(item.status),
      manual: false,
    },
    {
      id: "attachments",
      label: "Załączniki",
      checked: docCount > 0,
      manual: false,
    },
    {
      id: "signature",
      label: "Podpis",
      checked: persist.signature,
      manual: true,
    },
    {
      id: "submitted",
      label: "Wysłano",
      checked: ["submitted", "won", "lost"].includes(item.status),
      manual: false,
    },
  ];
}
