/**
 * EPIC — Document Summary Header na zakładce Dokumenty (prezentacja only).
 * Agreguje wyłącznie istniejące SSOT — bez nowej logiki biznesowej.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import {
  classifyCostDocument,
  resolvedCostStatus,
  type ResolvedCostStatus,
} from "@/lib/tender-data-ssot";
import {
  buildTenderAnalysisStatusRows,
  type TenderAnalysisStatusRow,
  type TenderAnalysisStepState,
} from "@/lib/tender-analysis-status-ux";
import { classifyDocumentRole } from "@/lib/tender-document-role";
import {
  classifyTenderDocumentDisplayTier,
  type TenderDocumentDisplayTier,
} from "@/lib/tender-workspace-ux";
import { formatRelativeChangeTime } from "@/lib/tender-change-monitor";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";

export type DocumentsTabSummaryTone =
  | "missing"
  | "detected"
  | "ok"
  | "partial"
  | "pending"
  | "warn";

export interface DocumentsTabSummarySlot {
  id: "swz" | "przedmiarAth" | "kosztorys" | "umowa" | "formularz";
  label: string;
  value: string;
  tone: DocumentsTabSummaryTone;
}

export interface TenderDocumentsTabSummary {
  swz: DocumentsTabSummarySlot;
  przedmiarAth: DocumentsTabSummarySlot;
  kosztorys: DocumentsTabSummarySlot;
  umowa: DocumentsTabSummarySlot;
  formularz: DocumentsTabSummarySlot;
  processReadiness: TenderAnalysisStatusRow[];
  lastAnalysisLabel: string;
}

export interface BuildTenderDocumentsTabSummaryOpts {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  kosztorysSession?: KosztorysProcessSession;
  now?: Date;
}

type TenderDocumentRef = { filename: string; isSwzHint?: boolean };

function collectTenderDocumentRefs(item: TenderPipelineItem): TenderDocumentRef[] {
  const refs: TenderDocumentRef[] = [];
  for (const doc of item.bzpDocuments ?? []) {
    refs.push({ filename: doc.filename, isSwzHint: doc.isSwzHint });
  }
  for (const file of item.externalDocDiscovery?.files ?? []) {
    refs.push({ filename: file.filename, isSwzHint: file.isSwzHint });
  }
  if (item.uploadedFile?.filename) {
    refs.push({ filename: item.uploadedFile.filename });
  }
  return refs;
}

function hasDocumentDisplayTier(
  item: TenderPipelineItem,
  tier: TenderDocumentDisplayTier,
): boolean {
  return collectTenderDocumentRefs(item).some(
    (d) => classifyTenderDocumentDisplayTier(d.filename, { isSwzHint: d.isSwzHint }) === tier,
  );
}

function hasDocumentRole(
  item: TenderPipelineItem,
  roles: ReturnType<typeof classifyDocumentRole>[],
): boolean {
  return collectTenderDocumentRefs(item).some((d) => roles.includes(classifyDocumentRole(d.filename)));
}

function hasSwzDocumentSignal(item: TenderPipelineItem, swz?: TenderSwzAnalysis | null): boolean {
  if (swz?.source) return true;
  return collectTenderDocumentRefs(item).some((d) => {
    if (d.isSwzHint) return true;
    if (classifyTenderDocumentDisplayTier(d.filename, { isSwzHint: d.isSwzHint }) === "swz") {
      return true;
    }
    const role = classifyDocumentRole(d.filename);
    return role === "swz" || role === "swz_modification";
  });
}

function hasPrzedmiarAthDocumentSignal(item: TenderPipelineItem): boolean {
  return collectTenderDocumentRefs(item).some((d) => {
    const tier = classifyTenderDocumentDisplayTier(d.filename, { isSwzHint: d.isSwzHint });
    if (tier === "ath_przedmiar" || tier === "kosztorys") return true;
    const role = classifyDocumentRole(d.filename);
    if (role === "przedmiar" || role === "obmiar" || role === "kosztorys" || role === "stwior") {
      return true;
    }
    return /\.(ath|nor|xml)$/i.test(d.filename);
  });
}

function resolveRowCount(item: TenderPipelineItem): number {
  const classified = classifyCostDocument(item);
  const fromDossier = item.tenderDossier?.kosztorys?.rowCount;
  if (classified?.rowCount != null && classified.rowCount > 0) return classified.rowCount;
  if (fromDossier != null && fromDossier > 0) return fromDossier;
  return 0;
}

function pricingSuffix(costStatus: ResolvedCostStatus): string | null {
  if (costStatus === "FOUND_WITH_VALUE") return "Z cenami";
  if (costStatus === "FOUND_NO_VALUE") return "Bez cen";
  return null;
}

function buildSwzSlot(item: TenderPipelineItem, swz?: TenderSwzAnalysis | null): DocumentsTabSummarySlot {
  if (swz?.parsedAt) {
    return { id: "swz", label: "SWZ", value: "Przeanalizowany", tone: "ok" };
  }
  if (hasSwzDocumentSignal(item, swz)) {
    return { id: "swz", label: "SWZ", value: "Wykryty", tone: "detected" };
  }
  return { id: "swz", label: "SWZ", value: "Brak", tone: "missing" };
}

function buildPrzedmiarAthSlot(item: TenderPipelineItem): DocumentsTabSummarySlot {
  const costStatus = resolvedCostStatus(item);
  const rowCount = resolveRowCount(item);
  const suffix = pricingSuffix(costStatus);

  if (costStatus !== "NOT_FOUND") {
    if (rowCount > 0 && suffix) {
      return {
        id: "przedmiarAth",
        label: "Przedmiar / ATH",
        value: `${rowCount} pozycji · ${suffix}`,
        tone: "ok",
      };
    }
    if (suffix) {
      return { id: "przedmiarAth", label: "Przedmiar / ATH", value: suffix, tone: "partial" };
    }
  }

  if (hasPrzedmiarAthDocumentSignal(item)) {
    return { id: "przedmiarAth", label: "Przedmiar / ATH", value: "Wykryty", tone: "detected" };
  }

  return { id: "przedmiarAth", label: "Przedmiar / ATH", value: "Brak", tone: "missing" };
}

function buildKosztorysSlot(item: TenderPipelineItem): DocumentsTabSummarySlot {
  const costStatus = resolvedCostStatus(item);
  const rowCount = resolveRowCount(item);

  if (costStatus === "FOUND_WITH_VALUE" && classifyCostDocument(item)) {
    return {
      id: "kosztorys",
      label: "Kosztorys",
      value: rowCount > 0 ? `Gotowy · ${rowCount} pozycji` : "Gotowy",
      tone: "ok",
    };
  }

  return { id: "kosztorys", label: "Kosztorys", value: "Brak", tone: "missing" };
}

function buildUmowaSlot(item: TenderPipelineItem): DocumentsTabSummarySlot {
  if (hasDocumentDisplayTier(item, "wzor_umowy")) {
    return { id: "umowa", label: "Umowa", value: "Wykryta", tone: "detected" };
  }
  return { id: "umowa", label: "Umowa", value: "Brak", tone: "missing" };
}

function buildFormularzSlot(item: TenderPipelineItem): DocumentsTabSummarySlot {
  if (
    hasDocumentDisplayTier(item, "formularz_ofertowy")
    || hasDocumentRole(item, ["formularz"])
  ) {
    return { id: "formularz", label: "Formularz ofertowy", value: "Wykryty", tone: "detected" };
  }
  return { id: "formularz", label: "Formularz ofertowy", value: "Brak", tone: "missing" };
}

function resolveLastAnalysisIso(
  item: TenderPipelineItem,
  swz?: TenderSwzAnalysis | null,
): string | null {
  const candidates = [
    swz?.parsedAt,
    item.swzAnalysis?.parsedAt,
    item.tenderDossier?.kosztorys?.parsedAt,
  ].filter((v): v is string => Boolean(v?.trim()));

  if (candidates.length === 0) return null;

  let latest = candidates[0];
  let latestMs = new Date(latest).getTime();
  for (const iso of candidates.slice(1)) {
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms) && ms > latestMs) {
      latest = iso;
      latestMs = ms;
    }
  }
  return Number.isNaN(latestMs) ? null : latest;
}

export function formatDocumentsTabLastAnalysisLabel(
  item: TenderPipelineItem,
  swz?: TenderSwzAnalysis | null,
  now = new Date(),
): string {
  const iso = resolveLastAnalysisIso(item, swz);
  if (!iso) return "Brak analizy";
  return formatRelativeChangeTime(iso, now);
}

export function mapAnalysisStepStateLabel(state: TenderAnalysisStepState): string {
  switch (state) {
    case "ready":
      return "Gotowe";
    case "pending":
      return "W toku";
    case "warn":
      return "Uwaga";
    default:
      return "Brak";
  }
}

export function analysisStepStateToTone(state: TenderAnalysisStepState): DocumentsTabSummaryTone {
  switch (state) {
    case "ready":
      return "ok";
    case "pending":
      return "pending";
    case "warn":
      return "warn";
    default:
      return "missing";
  }
}

export function buildTenderDocumentsTabSummary(
  opts: BuildTenderDocumentsTabSummaryOpts,
): TenderDocumentsTabSummary {
  const {
    item,
    swz,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    kosztorysSession,
    now = new Date(),
  } = opts;

  const processReadiness = buildTenderAnalysisStatusRows({
    item,
    swz,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    kosztorysSession,
  });

  return {
    swz: buildSwzSlot(item, swz),
    przedmiarAth: buildPrzedmiarAthSlot(item),
    kosztorys: buildKosztorysSlot(item),
    umowa: buildUmowaSlot(item),
    formularz: buildFormularzSlot(item),
    processReadiness,
    lastAnalysisLabel: formatDocumentsTabLastAnalysisLabel(item, swz, now),
  };
}
