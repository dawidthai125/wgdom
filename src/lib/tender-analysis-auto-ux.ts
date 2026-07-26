/**
 * AP2-S2 — UX auto-analizy (pure): historia + mapowanie etapów na istniejące sygnały pipeline.
 * NIE uruchamia analizy · NIE zmienia fingerprint / bootstrap / heavy guards.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import {
  deriveKosztorysProcessPhase,
  type KosztorysProcessSession,
  type KosztorysProcessPhaseId,
} from "@/lib/tender-kosztorys-process-phase";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { formatRelativeChangeTime } from "@/lib/tender-change-monitor";
import { FIT_LABELS, type TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { ValuationReadinessLevel } from "@/lib/tender-documentation-completeness";

export type AnalysisHistoryStatus =
  | "none"
  | "running"
  | "success"
  | "partial"
  | "failed";

export type AnalysisJourneyStageId =
  | "detect_docs"
  | "classify"
  | "formal"
  | "technical"
  | "risks"
  | "summary";

export type AnalysisJourneyStageState = "done" | "active" | "pending";

export interface AnalysisJourneyStage {
  id: AnalysisJourneyStageId;
  label: string;
  state: AnalysisJourneyStageState;
}

export interface DocumentsAnalysisHistoryView {
  status: AnalysisHistoryStatus;
  statusLabelPl: string;
  atIso: string | null;
  /** np. „Dzisiaj 12:47” / „25.07.2026 12:47” */
  absoluteLabel: string | null;
  /** np. „3 min temu” */
  relativeLabel: string | null;
  documentCount: number;
  /** Jedna linia UI. */
  headline: string;
}

export interface DocumentsAnalysisGlanceView {
  recommendationLabel: string | null;
  riskLabel: string | null;
}

export const ANALYSIS_JOURNEY_STAGE_DEFS: ReadonlyArray<{
  id: AnalysisJourneyStageId;
  label: string;
}> = [
  { id: "detect_docs", label: "Wykrywanie dokumentów" },
  { id: "classify", label: "Klasyfikacja" },
  { id: "formal", label: "Analiza formalna" },
  { id: "technical", label: "Analiza techniczna" },
  { id: "risks", label: "Analiza ryzyk" },
  { id: "summary", label: "Przygotowanie podsumowania" },
];

const STATUS_LABEL: Record<AnalysisHistoryStatus, string> = {
  none: "Brak analizy",
  running: "W toku",
  success: "Zakończona",
  partial: "Częściowa",
  failed: "Błąd",
};

export function resolveLastAnalysisIso(
  item: TenderPipelineItem,
  swz?: TenderSwzAnalysis | null,
): string | null {
  const candidates = [
    swz?.parsedAt,
    item.swzAnalysis?.parsedAt,
    item.tenderDossier?.kosztorys?.parsedAt,
    item.tenderDossier?.builtAt,
    item.tenderFit?.assessedAt,
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

export function formatAnalysisAbsoluteLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Dzisiaj ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Wczoraj ${time}`;
  const date = d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${date} ${time}`;
}

export function isAnalysisSessionBusy(session?: KosztorysProcessSession | null): boolean {
  if (!session) return false;
  return Boolean(
    session.autoRunning
    || session.dossierBuilding
    || session.dossierSaving
    || session.pipelineQueued,
  );
}

export function resolveAnalysisHistoryStatus(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  session?: KosztorysProcessSession | null;
  atIso: string | null;
}): AnalysisHistoryStatus {
  const { item, session, atIso } = opts;
  if (session?.dossierParseFailed) return "failed";
  if (isAnalysisSessionBusy(session)) return "running";

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const docs = countTenderAttachments(item);
  if (!atIso && !heavyDone) return "none";

  if (heavyDone && docs > 0 && !item.swzAnalysis && !opts.swz) return "partial";
  if (heavyDone || atIso) {
    if (session?.parseErrorMessage) return "failed";
    return "success";
  }
  return "none";
}

export function buildDocumentsAnalysisHistory(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  session?: KosztorysProcessSession | null;
  now?: Date;
}): DocumentsAnalysisHistoryView {
  const { item, swz, session, now = new Date() } = opts;
  const atIso = resolveLastAnalysisIso(item, swz);
  const status = resolveAnalysisHistoryStatus({ item, swz, session, atIso });
  const documentCount = countTenderAttachments(item);
  const absoluteLabel = atIso ? formatAnalysisAbsoluteLabel(atIso, now) : null;
  const relativeLabel = atIso ? formatRelativeChangeTime(atIso, now) : null;
  const statusLabelPl = STATUS_LABEL[status];

  let headline: string;
  if (status === "running") {
    headline = "Analiza dokumentów trwa w tle…";
  } else if (status === "none") {
    headline = "Brak analizy";
  } else if (absoluteLabel) {
    const mark = status === "failed" ? "⚠️" : status === "partial" ? "ℹ️" : "✅";
    headline = `${mark} ${absoluteLabel}`;
  } else {
    headline = statusLabelPl;
  }

  return {
    status,
    statusLabelPl,
    atIso,
    absoluteLabel,
    relativeLabel,
    documentCount,
    headline,
  };
}

/** Indeks aktywnego etapu 0..5 na podstawie istniejącej fazy procesu. */
export function resolveAnalysisJourneyActiveIndex(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  session?: KosztorysProcessSession | null;
}): number {
  const { item, swz, session } = opts;
  if (!isAnalysisSessionBusy(session) && !session?.dossierParseFailed) {
    return ANALYSIS_JOURNEY_STAGE_DEFS.length;
  }

  const phase = deriveKosztorysProcessPhase(item, session ?? {});
  const phaseId: KosztorysProcessPhaseId = phase.id;
  const hasSwz = Boolean(swz?.parsedAt || item.swzAnalysis?.parsedAt);
  const docs = countTenderAttachments(item);

  if (phaseId === "failed") return 3;
  if (phaseId === "saving") return 5;
  if (phaseId === "parsing_kosztorys") {
    if (item.tenderFit || hasSwz) return 4;
    return 3;
  }
  if (phaseId === "preparing_docs") return 1;
  if (phaseId === "downloading_docs" || phaseId === "waiting_data") {
    return docs > 0 ? 1 : 0;
  }
  if (session?.dossierSaving) return 5;
  if (session?.dossierBuilding) return hasSwz ? 3 : 2;
  if (session?.autoRunning) return docs > 0 ? 1 : 0;
  if (session?.pipelineQueued) return 2;
  return 0;
}

export function buildAnalysisJourneyStages(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  session?: KosztorysProcessSession | null;
}): AnalysisJourneyStage[] {
  const busy = isAnalysisSessionBusy(opts.session);
  const phase = deriveKosztorysProcessPhase(opts.item, opts.session ?? {});
  const idleComplete = !busy
    && (tenderDossierHeavyParseDone(opts.item.tenderDossier)
      || Boolean(resolveLastAnalysisIso(opts.item, opts.swz)))
    && phase.id !== "failed";

  if (idleComplete) {
    return ANALYSIS_JOURNEY_STAGE_DEFS.map((d) => ({
      ...d,
      state: "done" as const,
    }));
  }

  if (!busy && phase.id === "failed") {
    return ANALYSIS_JOURNEY_STAGE_DEFS.map((d, i) => ({
      ...d,
      state: (i < 3 ? "done" : i === 3 ? "active" : "pending") as AnalysisJourneyStageState,
    }));
  }

  if (!busy) {
    return ANALYSIS_JOURNEY_STAGE_DEFS.map((d) => ({
      ...d,
      state: "pending" as const,
    }));
  }

  const active = resolveAnalysisJourneyActiveIndex(opts);
  return ANALYSIS_JOURNEY_STAGE_DEFS.map((d, i) => ({
    ...d,
    state: (i < active ? "done" : i === active ? "active" : "pending") as AnalysisJourneyStageState,
  }));
}

export function resolveActiveJourneyStageLabel(
  stages: AnalysisJourneyStage[],
): string | null {
  const active = stages.find((s) => s.state === "active");
  return active?.label ?? null;
}

export function buildDocumentsAnalysisGlance(opts: {
  fit?: TenderFitAssessment | null;
  valuationLevel?: ValuationReadinessLevel | null;
}): DocumentsAnalysisGlanceView {
  const fit = opts.fit;
  const recommendationLabel = fit
    ? `${FIT_LABELS[fit.fitLabel]}${fit.fitScore != null ? ` · ${fit.fitScore}/100` : ""}`
    : null;

  let riskLabel: string | null = null;
  if (opts.valuationLevel === "ready") riskLabel = "Ryzyko dokumentacyjne: niskie";
  else if (opts.valuationLevel === "risk") riskLabel = "Ryzyko dokumentacyjne: średnie";
  else if (opts.valuationLevel === "insufficient") riskLabel = "Ryzyko dokumentacyjne: wysokie";

  return { recommendationLabel, riskLabel };
}

export function analysisProgressRatio(stages: AnalysisJourneyStage[]): number {
  if (stages.length === 0) return 0;
  const done = stages.filter((s) => s.state === "done").length;
  const active = stages.some((s) => s.state === "active") ? 0.5 : 0;
  return Math.min(1, (done + active) / stages.length);
}

/** Czy pokazać live header zamiast pełnego skeletonu. */
export function shouldShowLiveAnalysisSummary(opts: {
  busy: boolean;
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
}): boolean {
  if (!opts.busy) return true;
  return Boolean(
    opts.item.tenderDossier
    || resolveLastAnalysisIso(opts.item, opts.swz)
    || countTenderAttachments(opts.item) > 0,
  );
}
