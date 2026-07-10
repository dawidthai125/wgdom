/**
 * NG-10 — AI Activity Feed + fazy Autonomous Run (prezentacja only).
 * Mapuje sygnały NG-02 na komunikaty agentów — bez zmian runtime.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import { countTenderAttachments, buildTenderAnalysisStatusRows } from "@/lib/tender-analysis-status-ux";
import { resolvedCostStatus, classifyCostDocument } from "@/lib/tender-data-ssot";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { formatBidMarginPct } from "@/lib/tender-bid-ux";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";
import {
  type AutonomousActivityKind,
  type AutonomousAiAgentId,
  type AutonomousRunPhaseId,
  AUTONOMOUS_ETA_MAX_SECONDS,
  AUTONOMOUS_ETA_MIN_SECONDS,
  AUTONOMOUS_FALLBACK_LIVE_MESSAGES,
  formatAutonomousAchievement,
} from "@/lib/tender-autonomous-run-ux";

export interface AutonomousActivityEvent {
  id: string;
  agentId: AutonomousAiAgentId;
  kind: AutonomousActivityKind;
  phaseId: AutonomousRunPhaseId;
  message: string;
  terminal: boolean;
  priority: number;
}

export interface DeriveAutonomousRunPhaseInput {
  item: TenderPipelineItem;
  pipelineState: PipelineState;
  autoRunning: boolean;
  externalRunning?: boolean;
  dossierBuilding: boolean;
  dossierSaving: boolean;
  dossierParseFailed: boolean;
  ownerFinanceProposal: TenderBidProposal | null;
  intelligenceCtx: TenderIntelligenceContext | null;
  trustAssessment: TenderTrustAssessment | null;
  kosztorysProcessSession?: KosztorysProcessSession;
  executiveMainWorksCount?: number;
  elapsedMs?: number;
}

export interface AutonomousRunPhaseView {
  activePhaseId: AutonomousRunPhaseId;
  activeLive: AutonomousActivityEvent | null;
  feed: AutonomousActivityEvent[];
  achievements: AutonomousActivityEvent[];
  pipelineComplete: boolean;
  scoringReady: boolean;
  runComplete: boolean;
}

interface ActivitySpec {
  id: string;
  agentId: AutonomousAiAgentId;
  phaseId: AutonomousRunPhaseId;
  priority: number;
  liveMessage: string;
  isComplete: (input: DeriveAutonomousRunPhaseInput) => boolean;
  isActive: (input: DeriveAutonomousRunPhaseInput) => boolean;
  achievement: (input: DeriveAutonomousRunPhaseInput) => string | null;
}

function rowById(
  input: DeriveAutonomousRunPhaseInput,
  id: "notice" | "documents" | "kosztorys" | "pricing",
) {
  const rows = buildTenderAnalysisStatusRows({
    item: input.item,
    swz: input.item.swzAnalysis,
    bidProposal: input.ownerFinanceProposal,
    autoRunning: input.autoRunning,
    dossierBuilding: input.dossierBuilding,
    dossierSaving: input.dossierSaving,
    kosztorysSession: input.kosztorysProcessSession,
  });
  return rows.find((r) => r.id === id);
}

function costStackLine(
  proposal: TenderBidProposal | null,
  keywords: string[],
): { label: string; pln: number } | null {
  if (!proposal?.costStack?.length) return null;
  const line = proposal.costStack.find((entry) =>
    keywords.some((kw) => entry.label.toLowerCase().includes(kw)),
  );
  return line ?? null;
}

function countTrustRisks(trust: TenderTrustAssessment | null): number {
  if (!trust) return 0;
  return trust.dimensions.reduce((sum, dim) => {
    return sum + dim.reasons.filter((r) => r.severity === "warn" || r.severity === "error").length;
  }, 0);
}

function riskCount(input: DeriveAutonomousRunPhaseInput): number {
  const blocks = input.intelligenceCtx?.overlay.allBlocks.length ?? 0;
  return blocks + countTrustRisks(input.trustAssessment);
}

function scopeCount(input: DeriveAutonomousRunPhaseInput): number {
  const rowCount = input.item.tenderDossier?.kosztorys?.rowCount ?? 0;
  if (rowCount > 0) return rowCount;
  return input.executiveMainWorksCount
    ?? input.intelligenceCtx?.executive?.mainWorks.length
    ?? 0;
}

const ACTIVITY_SPECS: ActivitySpec[] = [
  {
    id: "doc_fetch",
    agentId: "dokumentacja",
    phaseId: "doc_fetch",
    priority: 10,
    liveMessage: "Pobieram dokumenty…",
    isActive: (i) =>
      i.autoRunning
      || i.pipelineState === PipelineState.Notice
      || i.pipelineState === PipelineState.Discovery
      || i.pipelineState === PipelineState.External,
    isComplete: (i) =>
      isDocumentDiscoverySettled(i.item)
      && !i.autoRunning
      && i.pipelineState !== PipelineState.External,
    achievement: (i) => {
      if (!isDocumentDiscoverySettled(i.item)) return null;
      const n = countTenderAttachments(i.item);
      return formatAutonomousAchievement(`Znaleziono ${n} dokumentów`);
    },
  },
  {
    id: "swz_found",
    agentId: "dokumentacja",
    phaseId: "swz_found",
    priority: 20,
    liveMessage: "Znaleziono SWZ.",
    isActive: (i) => !i.item.swzAnalysis && countTenderAttachments(i.item) > 0,
    isComplete: (i) => Boolean(i.item.swzAnalysis),
    achievement: () => formatAutonomousAchievement("Wykryto SWZ"),
  },
  {
    id: "boq_detect",
    agentId: "kosztorys",
    phaseId: "boq_detect",
    priority: 30,
    liveMessage: "Szukam przedmiaru lub kosztorysu…",
    isActive: (i) => {
      const status = resolvedCostStatus(i.item);
      if (status !== "NOT_FOUND") return false;
      if (countTenderAttachments(i.item) === 0) return false;
      return (
        i.dossierBuilding
        || i.dossierSaving
        || i.pipelineState === PipelineState.Heavy
        || (
          deriveAutonomousPipelineComplete(i)
          && !tenderDossierHeavyParseDone(i.item.tenderDossier)
        )
      );
    },
    isComplete: (i) => resolvedCostStatus(i.item) !== "NOT_FOUND",
    achievement: (i) => {
      if (resolvedCostStatus(i.item) === "NOT_FOUND") return null;
      const doc = classifyCostDocument(i.item);
      const pdf = doc?.type === "PDF";
      return formatAutonomousAchievement(pdf ? "Wykryto przedmiar" : "Wykryto kosztorys");
    },
  },
  {
    id: "doc_analyze",
    agentId: "dokumentacja",
    phaseId: "doc_analyze",
    priority: 40,
    liveMessage: "Analizuję dokumentację.",
    isActive: (i) => {
      if (i.autoRunning && !isDocumentDiscoverySettled(i.item)) return false;
      const notice = rowById(i, "notice");
      const docs = rowById(i, "documents");
      return notice?.state === "pending" || docs?.state === "pending";
    },
    isComplete: (i) => {
      const notice = rowById(i, "notice");
      const docs = rowById(i, "documents");
      return notice?.state === "ready" && docs?.state === "ready";
    },
    achievement: () => formatAutonomousAchievement("Przeanalizowano dokumentację"),
  },
  {
    id: "scope_infer",
    agentId: "kosztorys",
    phaseId: "scope_infer",
    priority: 50,
    liveMessage: "Rozpoznaję zakres robót.",
    isActive: (i) => scopeCount(i) === 0 && (i.dossierBuilding || i.dossierSaving),
    isComplete: (i) => scopeCount(i) > 0,
    achievement: (i) => {
      const n = scopeCount(i);
      if (n <= 0) return null;
      return formatAutonomousAchievement(`Rozpoznano ${n} pozycji`);
    },
  },
  {
    id: "dossier_build",
    agentId: "kosztorys",
    phaseId: "dossier_build",
    priority: 60,
    liveMessage: "Buduję kosztorys.",
    isActive: (i) => i.dossierBuilding || i.dossierSaving,
    isComplete: (i) => tenderDossierHeavyParseDone(i.item.tenderDossier),
    achievement: () => formatAutonomousAchievement("Kosztorys gotowy"),
  },
  {
    id: "labor_calc",
    agentId: "wycena",
    phaseId: "labor_calc",
    priority: 70,
    liveMessage: "Wyliczam robociznę.",
    isActive: (i) =>
      i.pipelineState === PipelineState.Pricing
      || (tenderDossierHeavyParseDone(i.item.tenderDossier)
        && !i.ownerFinanceProposal?.ok),
    isComplete: (i) => {
      const line = costStackLine(i.ownerFinanceProposal, ["robociz", "robocizn"]);
      return Boolean(line) || (i.ownerFinanceProposal?.ok && i.ownerFinanceProposal.costPricePln != null);
    },
    achievement: (i) => {
      const line = costStackLine(i.ownerFinanceProposal, ["robociz", "robocizn"]);
      if (line) return formatAutonomousAchievement("Obliczono koszt robocizny");
      if (i.ownerFinanceProposal?.ok && i.ownerFinanceProposal.costPricePln != null) {
        return formatAutonomousAchievement("Obliczono koszt robocizny");
      }
      return null;
    },
  },
  {
    id: "material_calc",
    agentId: "wycena",
    phaseId: "material_calc",
    priority: 80,
    liveMessage: "Wyliczam materiały.",
    isActive: (i) =>
      i.pipelineState === PipelineState.Pricing
      && Boolean(i.ownerFinanceProposal)
      && !costStackLine(i.ownerFinanceProposal, ["materiał", "material"]),
    isComplete: (i) => {
      const line = costStackLine(i.ownerFinanceProposal, ["materiał", "material"]);
      return Boolean(line) || i.ownerFinanceProposal?.ok === true;
    },
    achievement: (i) => {
      const line = costStackLine(i.ownerFinanceProposal, ["materiał", "material"]);
      if (line) return formatAutonomousAchievement("Obliczono koszt materiałów");
      if (i.ownerFinanceProposal?.ok) return formatAutonomousAchievement("Obliczono koszt materiałów");
      return null;
    },
  },
  {
    id: "risk_assess",
    agentId: "ryzyko",
    phaseId: "risk_assess",
    priority: 90,
    liveMessage: "Analizuję ryzyko.",
    isActive: (i) =>
      i.intelligenceCtx != null
      && riskCount(i) === 0
      && !deriveAutonomousPipelineComplete(i),
    isComplete: (i) =>
      i.intelligenceCtx != null
      && (riskCount(i) > 0 || deriveAutonomousPipelineComplete(i)),
    achievement: (i) => {
      const n = riskCount(i);
      if (n <= 0 && deriveAutonomousPipelineComplete(i)) {
        return formatAutonomousAchievement("Ryzyko w normie");
      }
      if (n <= 0) return null;
      return formatAutonomousAchievement(`Wykryto ${n} ryzyka`);
    },
  },
  {
    id: "profitability",
    agentId: "wycena",
    phaseId: "profitability",
    priority: 100,
    liveMessage: "Oceniam opłacalność.",
    isActive: (i) =>
      i.intelligenceCtx != null
      && i.intelligenceCtx.finance.marginPct == null
      && i.pipelineState !== PipelineState.Failed,
    isComplete: (i) => i.intelligenceCtx?.finance.marginPct != null,
    achievement: (i) => {
      const margin = i.intelligenceCtx?.finance.marginPct;
      if (margin == null) return null;
      return formatAutonomousAchievement(`Marża: ${formatBidMarginPct(margin)}`);
    },
  },
  {
    id: "recommendation_prep",
    agentId: "strategia",
    phaseId: "recommendation_prep",
    priority: 110,
    liveMessage: "Przygotowuję rekomendację.",
    isActive: (i) =>
      deriveAutonomousPipelineComplete(i)
      && i.intelligenceCtx != null
      && !deriveAutonomousScoringReady(i),
    isComplete: (i) => deriveAutonomousScoringReady(i),
    achievement: () => null,
  },
];

function specToEvent(
  spec: ActivitySpec,
  kind: AutonomousActivityKind,
  message: string,
  terminal: boolean,
): AutonomousActivityEvent {
  return {
    id: spec.id,
    agentId: spec.agentId,
    kind,
    phaseId: spec.phaseId,
    message,
    terminal,
    priority: spec.priority,
  };
}

export function deriveAutonomousPipelineComplete(
  input: DeriveAutonomousRunPhaseInput,
): boolean {
  const { item, pipelineState, autoRunning, dossierBuilding, dossierSaving } = input;

  if (pipelineState === PipelineState.Ready) return true;

  if (pipelineState === PipelineState.Failed && input.intelligenceCtx != null) {
    return true;
  }

  if (
    pipelineState === PipelineState.Idle
    && isDocumentDiscoverySettled(item)
    && !autoRunning
    && !dossierBuilding
    && !dossierSaving
  ) {
    return true;
  }

  return false;
}

export function deriveAutonomousScoringReady(
  input: DeriveAutonomousRunPhaseInput,
): boolean {
  const ctx = input.intelligenceCtx;
  return Boolean(ctx?.scoringBundle && ctx.overlay);
}

export function deriveAutonomousRunComplete(
  input: DeriveAutonomousRunPhaseInput,
): boolean {
  return deriveAutonomousPipelineComplete(input) && deriveAutonomousScoringReady(input);
}

export function deriveAutonomousRunPhase(
  input: DeriveAutonomousRunPhaseInput,
): AutonomousRunPhaseView {
  const achievements: AutonomousActivityEvent[] = [];

  for (const spec of ACTIVITY_SPECS) {
    if (!spec.isComplete(input)) continue;
    const achievementText = spec.achievement(input);
    if (achievementText) {
      achievements.push(specToEvent(spec, "achievement", achievementText, true));
    }
  }

  let activeSpec: ActivitySpec | null = null;
  const activeCandidates = ACTIVITY_SPECS.filter(
    (spec) => !spec.isComplete(input) && spec.isActive(input),
  );
  if (activeCandidates.length > 0) {
    activeSpec = activeCandidates.reduce((best, cur) =>
      cur.priority > best.priority ? cur : best,
    );
  }

  if (!activeSpec) {
    activeSpec = ACTIVITY_SPECS.find((spec) => !spec.isComplete(input)) ?? null;
  }

  let activeLive: AutonomousActivityEvent | null = null;

  if (deriveAutonomousRunComplete(input)) {
    activeLive = specToEvent(
      ACTIVITY_SPECS[ACTIVITY_SPECS.length - 1]!,
      "status",
      "Analiza zakończona.",
      true,
    );
  } else if (activeSpec) {
    const useFallback = (input.elapsedMs ?? 0) > 20_000
      && !ACTIVITY_SPECS.some((s) => s.isActive(input));
    const msg = useFallback
      ? AUTONOMOUS_FALLBACK_LIVE_MESSAGES[
        Math.floor((input.elapsedMs ?? 0) / 10_000) % AUTONOMOUS_FALLBACK_LIVE_MESSAGES.length
      ]!
      : activeSpec.liveMessage;
    activeLive = specToEvent(activeSpec, "live", msg, false);
  }

  const feed: AutonomousActivityEvent[] = [
    ...achievements,
    ...(activeLive ? [activeLive] : []),
  ].sort((a, b) => a.priority - b.priority);

  const pipelineComplete = deriveAutonomousPipelineComplete(input);
  const scoringReady = deriveAutonomousScoringReady(input);

  return {
    activePhaseId: deriveAutonomousRunComplete(input)
      ? "complete"
      : (activeSpec?.phaseId ?? "doc_fetch"),
    activeLive,
    feed,
    achievements,
    pipelineComplete,
    scoringReady,
    runComplete: pipelineComplete && scoringReady,
  };
}

const ETA_BASE_BY_STATE: Partial<Record<PipelineState, number>> = {
  [PipelineState.Notice]: 45,
  [PipelineState.Discovery]: 45,
  [PipelineState.External]: 60,
  [PipelineState.Heavy]: 35,
  [PipelineState.Pricing]: 15,
};

export function deriveAutonomousEtaSeconds(opts: {
  pipelineState: PipelineState;
  elapsedMs: number;
  rowCount?: number;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
}): number {
  const { pipelineState, elapsedMs, rowCount = 0 } = opts;
  const elapsedSec = Math.floor(elapsedMs / 1000);

  let base = ETA_BASE_BY_STATE[pipelineState] ?? 10;
  if (pipelineState === PipelineState.Heavy) {
    base += Math.min(30, Math.floor(rowCount / 20));
  }
  if (opts.autoRunning && pipelineState === PipelineState.Idle) {
    base = Math.max(base, 45);
  }
  if (opts.dossierBuilding) {
    base = Math.max(base, 35 + Math.min(30, Math.floor(rowCount / 20)));
  }

  const remaining = base - elapsedSec;
  return Math.max(
    AUTONOMOUS_ETA_MIN_SECONDS,
    Math.min(AUTONOMOUS_ETA_MAX_SECONDS, remaining),
  );
}

/** Rejestr speców — rozszerzenie o nowych agentów (future slices). */
export function listAutonomousActivitySpecs(): ReadonlyArray<{
  id: string;
  agentId: AutonomousAiAgentId;
  phaseId: AutonomousRunPhaseId;
}> {
  return ACTIVITY_SPECS.map((s) => ({
    id: s.id,
    agentId: s.agentId,
    phaseId: s.phaseId,
  }));
}
