/**
 * IK-ANALYSIS-OBSERVABILITY-PROJECTION-01 — Phase 1–2
 * Pure read-only projection: IkOrchestraSnapshot → AnalysisObservation.
 *
 * HARD: no Host wiring · no ETA · no final · no conversationHints · no writes.
 * DF: docs/architecture/IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md
 * ARCH REVIEW B conditions C1–C7 absorbed.
 */

import type { IkDocumentExpertStatus } from "@/lib/intelligent-estimator/ik-document-expert";
import type { IkKnrExpertStatus } from "@/lib/intelligent-estimator/ik-knr-expert";
import type { IkNg02IngestPhase } from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";
import type { IkP7PositionCostBidStatus } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import type { IkP8RiskDecisionStatus } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import type { IkOrchestraSnapshot } from "@/lib/intelligent-estimator/orchestra/orchestra-types";

// ─── Canonical contract (DF §5) ─────────────────────────────────────────────

export const OBSERVATION_STAGE_IDS = [
  "documents",
  "boq",
  "knr",
  "identity",
  "classification",
  "labor",
  "material",
  "composite",
  "pricing",
  "risk",
  "complete",
] as const;

export type ObservationStageId = (typeof OBSERVATION_STAGE_IDS)[number];

export type ObservationStageStatus =
  | "pending"
  | "running"
  | "done"
  | "partial"
  | "blocked"
  | "hold"
  | "failed";

export type ObservationActor =
  | "Chief"
  | "Document"
  | "Knr"
  | "Labor"
  | "Material"
  | "Pricing"
  | "Risk"
  | "Control";

export interface AnalysisStageObservation {
  stageId: ObservationStageId;
  status: ObservationStageStatus;
  actor: ObservationActor;
  labelPl: string;
  /** Phase 1–2: never set (timing deferred). */
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  /** Only keys present on source reports — never invent 0. */
  counts?: Record<string, number>;
  findings?: Array<{
    code: string;
    messagePl: string;
    severity: "info" | "warn" | "hold" | "block";
  }>;
  sourceRef?: unknown | null;
}

export interface AnalysisProgress {
  percent: number;
  completedWeight: number;
  totalWeight: number;
  runningStageId?: ObservationStageId;
  blocked: boolean;
}

export interface AnalysisEta {
  estimatedRemainingMs: number;
  estimatedFinishAt: string;
  confidence: "low" | "medium" | "high";
  basis: "stage_stamps" | "rolling_avg" | "insufficient";
}

/** Contract only — Phase 1–2 always leaves `final = null`. */
export interface FinalTeamWrapUp {
  completedAt: string;
  durationMs?: number;
  lines: Array<{
    actor: ObservationActor;
    messagePl: string;
    sourceRef?: unknown | null;
  }>;
  aggregates: {
    positions?: number;
    holds?: number;
    gaps?: number;
    blocked?: number;
    knrMiss?: number;
    researchMiss?: number;
    validationFindings?: number;
  };
  priceDrivers: unknown;
  difficulty: unknown;
}

export interface AnalysisObservation {
  tenderId: string;
  caseKey: string;
  updatedAt: string;
  overallStatus: ObservationStageStatus;
  stages: AnalysisStageObservation[];
  conversationHints: [];
  progress: AnalysisProgress;
  eta: null;
  final: null;
}

export type BuildAnalysisObservationOpts = {
  /** Injected clock for tests; default "" keeps adapter pure/deterministic. */
  nowIso?: string;
};

/** Work stages that carry progress weight (complete is derived, weight 0). */
export type ObservationWeightedStageId = Exclude<ObservationStageId, "complete">;

export const OBSERVATION_STAGE_WEIGHTS: Record<ObservationWeightedStageId, number> = {
  documents: 10,
  boq: 10,
  knr: 15,
  identity: 5,
  classification: 5,
  labor: 15,
  material: 15,
  composite: 10,
  pricing: 10,
  risk: 5,
};

const STAGE_LABEL_PL: Record<ObservationStageId, string> = {
  documents: "Dokumenty",
  boq: "Zakres / BOQ",
  knr: "KNR",
  identity: "Identity",
  classification: "Klasyfikacja",
  labor: "Robocizna",
  material: "Materiały",
  composite: "Kalkulacja złożona",
  pricing: "Kalkulacja / Bid",
  risk: "Ryzyko / walidacja",
  complete: "Gotowe",
};

const STAGE_ACTOR: Record<ObservationStageId, ObservationActor> = {
  documents: "Document",
  boq: "Document",
  knr: "Knr",
  identity: "Control",
  classification: "Control",
  labor: "Labor",
  material: "Material",
  composite: "Pricing",
  pricing: "Pricing",
  risk: "Risk",
  complete: "Chief",
};

const TERMINAL: ReadonlySet<ObservationStageStatus> = new Set([
  "done",
  "partial",
  "blocked",
  "hold",
  "failed",
]);

// ─── Exhaustive status mappers ──────────────────────────────────────────────

export function mapDocumentExpertStatus(
  status: IkDocumentExpertStatus,
): ObservationStageStatus {
  switch (status) {
    case "ready":
      return "done";
    case "partial":
      return "partial";
    case "hold":
      return "hold";
    case "gap":
      return "failed";
    case "pending":
      return "pending";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapKnrExpertStatus(status: IkKnrExpertStatus): ObservationStageStatus {
  switch (status) {
    case "NOT_STARTED":
      return "pending";
    case "ANALYZING":
      return "running";
    case "COMPLETED":
      return "done";
    case "BLOCKED":
      return "blocked";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapReadyBlockedPartial(
  status: "ready" | "blocked" | "partial",
): ObservationStageStatus {
  switch (status) {
    case "ready":
      return "done";
    case "blocked":
      return "blocked";
    case "partial":
      return "partial";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapCompositeReportStatus(
  status: "ready" | "partial" | "gap" | "hold" | "blocked",
): ObservationStageStatus {
  switch (status) {
    case "ready":
      return "done";
    case "partial":
      return "partial";
    case "gap":
      return "failed";
    case "hold":
      return "hold";
    case "blocked":
      return "blocked";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapP7Status(status: IkP7PositionCostBidStatus): ObservationStageStatus {
  switch (status) {
    case "ready":
      return "done";
    case "partial":
      return "partial";
    case "gap":
      return "failed";
    case "blocked":
      return "blocked";
    case "hold":
      return "hold";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapP8Status(status: IkP8RiskDecisionStatus): ObservationStageStatus {
  switch (status) {
    case "ready":
      return "done";
    case "partial":
      return "partial";
    case "gap":
      return "failed";
    case "blocked":
      return "blocked";
    case "hold":
      return "hold";
    case "needs_review":
      return "hold";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * P2 ingest phase → canonical status.
 * `bridgeBusy` may force `running` only as real Host busy signal.
 */
export function mapNg02IngestPhase(
  phase: IkNg02IngestPhase,
  bridgeBusy: boolean,
): ObservationStageStatus {
  if (bridgeBusy === true) return "running";
  switch (phase) {
    case "idle":
      return "pending";
    case "needs_docs":
      return "pending";
    case "started":
      return "running";
    case "completed":
      return "done";
    case "blocked":
      return "blocked";
    case "skipped_already_done":
      return "done";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function contributionFactor(status: ObservationStageStatus): number {
  switch (status) {
    case "done":
      return 1;
    case "partial":
      return 0.5;
    case "running":
      return 0.25;
    case "pending":
    case "blocked":
    case "hold":
    case "failed":
      return 0;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function computeAnalysisProgress(
  stages: readonly AnalysisStageObservation[],
): AnalysisProgress {
  let completedWeight = 0;
  let totalWeight = 0;
  let blocked = false;
  let runningStageId: ObservationStageId | undefined;

  for (const stage of stages) {
    if (stage.stageId === "complete") continue;
    const weight = OBSERVATION_STAGE_WEIGHTS[stage.stageId as ObservationWeightedStageId];
    if (typeof weight !== "number") continue;
    totalWeight += weight;
    completedWeight += weight * contributionFactor(stage.status);
    if (
      stage.status === "blocked"
      || stage.status === "hold"
      || stage.status === "failed"
    ) {
      blocked = true;
    }
    if (stage.status === "running" && runningStageId === undefined) {
      runningStageId = stage.stageId;
    }
  }

  const percent =
    totalWeight <= 0
      ? 0
      : Math.min(100, Math.max(0, Math.round((completedWeight / totalWeight) * 100)));

  return {
    percent,
    completedWeight,
    totalWeight,
    ...(runningStageId !== undefined ? { runningStageId } : {}),
    blocked,
  };
}

function pickNumberCounts(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): Record<string, number> | undefined {
  if (!source) return undefined;
  const out: Record<string, number> = {};
  for (const key of keys) {
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function stageBase(
  stageId: ObservationStageId,
  status: ObservationStageStatus,
  counts?: Record<string, number>,
): AnalysisStageObservation {
  return {
    stageId,
    status,
    actor: STAGE_ACTOR[stageId],
    labelPl: STAGE_LABEL_PL[stageId],
    ...(counts ? { counts } : {}),
  };
}

function deriveCompleteStatus(
  workStages: readonly AnalysisStageObservation[],
): ObservationStageStatus {
  if (workStages.length === 0) return "pending";
  for (const s of workStages) {
    if (!TERMINAL.has(s.status)) {
      if (s.status === "running") return "running";
      return "pending";
    }
  }
  if (workStages.some((s) => s.status === "blocked")) return "blocked";
  if (workStages.some((s) => s.status === "failed")) return "failed";
  if (workStages.some((s) => s.status === "hold")) return "hold";
  if (workStages.some((s) => s.status === "partial")) return "partial";
  return "done";
}

function deriveOverallStatus(
  workStages: readonly AnalysisStageObservation[],
  completeStatus: ObservationStageStatus,
): ObservationStageStatus {
  if (workStages.some((s) => s.status === "running")) return "running";
  if (workStages.some((s) => s.status === "pending")) return "pending";
  return completeStatus;
}

function resolveDocumentsStatus(snapshot: IkOrchestraSnapshot): ObservationStageStatus {
  const { bridgeBusy, ingest, report } = snapshot;
  if (bridgeBusy === true) return "running";
  if (ingest != null) {
    return mapNg02IngestPhase(ingest.phase, false);
  }
  return mapDocumentExpertStatus(report.status);
}

/**
 * Pure adapter — FULL IkOrchestraSnapshot only (ARCH C1).
 * Phase 1–2: eta=null · final=null · conversationHints=[] · no timestamps.
 */
export function buildAnalysisObservation(
  snapshot: IkOrchestraSnapshot,
  opts?: BuildAnalysisObservationOpts,
): AnalysisObservation {
  const flags = snapshot.flags;
  const tenderId =
    snapshot.effectiveItem.id
    || snapshot.effectiveItem.tenderId
    || snapshot.report.tenderId
    || "";
  const caseKey = tenderId;
  const updatedAt = opts?.nowIso ?? "";

  const workStages: AnalysisStageObservation[] = [];

  // documents — gated by P2 flag
  if (flags.p2DocumentsBoqOn === true) {
    workStages.push(
      stageBase(
        "documents",
        resolveDocumentsStatus(snapshot),
        pickNumberCounts(
          {
            documentsUsed: snapshot.ingest?.documentsUsed,
            artifactCount: snapshot.ingest?.artifactCount,
            extractedLineCount: snapshot.ingest?.extractedLineCount,
            documentCount: snapshot.report.documents?.length,
          },
          ["documentsUsed", "artifactCount", "extractedLineCount", "documentCount"],
        ),
      ),
    );
  }

  // boq — always (Document Master BOQ; no dedicated OFF flag)
  {
    const boqStatus = mapDocumentExpertStatus(snapshot.report.masterBoq.status);
    workStages.push(
      stageBase(
        "boq",
        boqStatus,
        pickNumberCounts(
          {
            lineCount: snapshot.report.masterBoq.lineCount,
            composedLineCount: snapshot.report.masterBoq.composedLineCount,
            sourceLineCount: snapshot.report.masterBoq.sourceLineCount,
            dwellingCount: snapshot.report.masterBoq.dwellingCount,
          },
          ["lineCount", "composedLineCount", "sourceLineCount", "dwellingCount"],
        ),
      ),
    );
  }

  // knr — always (no OFF flag in IkOrchestraFlags)
  workStages.push(
    stageBase(
      "knr",
      mapKnrExpertStatus(snapshot.knr.status),
      pickNumberCounts(
        snapshot.knr.counts as unknown as Record<string, unknown>,
        [
          "withBasis",
          "withoutBasis",
          "recognized",
          "candidate",
          "hold",
          "conflict",
          "none",
          "resolved",
          "historicalMiss",
        ],
      ),
    ),
  );

  // identity — always (identity phase always runs)
  {
    const ctx = snapshot.identityContext;
    const status = ctx
      ? mapReadyBlockedPartial(ctx.status)
      : "pending";
    workStages.push(
      stageBase(
        "identity",
        status,
        ctx
          ? pickNumberCounts(
            {
              lineCount: ctx.lineCount,
              trustedOkCount: ctx.trustedOkCount,
              ambiguousCount: ctx.ambiguousCount,
              noIdentityCount: ctx.noIdentityCount,
            },
            ["lineCount", "trustedOkCount", "ambiguousCount", "noIdentityCount"],
          )
          : undefined,
      ),
    );
  }

  // classification — always
  workStages.push(
    stageBase(
      "classification",
      mapReadyBlockedPartial(snapshot.classification.status),
      pickNumberCounts(
        {
          inputLineCount: snapshot.classification.inputLineCount,
          outputLineCount: snapshot.classification.outputLineCount,
          LABOR: snapshot.classification.counts.LABOR,
          MATERIAL: snapshot.classification.counts.MATERIAL,
          COMPOUND: snapshot.classification.counts.COMPOUND,
          UNKNOWN: snapshot.classification.counts.UNKNOWN,
        },
        [
          "inputLineCount",
          "outputLineCount",
          "LABOR",
          "MATERIAL",
          "COMPOUND",
          "UNKNOWN",
        ],
      ),
    ),
  );

  // labor — P5 flag
  if (flags.p5LaborOn === true) {
    const labor = snapshot.labor;
    const status =
      labor == null
        ? "pending"
        : mapReadyBlockedPartial(labor.status);
    workStages.push(
      stageBase(
        "labor",
        status,
        labor
          ? pickNumberCounts(
            labor.counts as unknown as Record<string, unknown>,
            [
              "inputLineCount",
              "outputLineCount",
              "workIdentityResolved",
              "ourRateMiss",
              "researchCalls",
              "currentOurRateHit",
            ],
          )
          : undefined,
      ),
    );
  }

  // material — P6 flag
  if (flags.p6MaterialOn === true) {
    const material = snapshot.material;
    const status =
      material == null
        ? "pending"
        : mapReadyBlockedPartial(material.status);
    workStages.push(
      stageBase(
        "material",
        status,
        material
          ? pickNumberCounts(
            material.counts as unknown as Record<string, unknown>,
            [
              "inputLineCount",
              "outputLineCount",
              "materialIdentityResolved",
              "priceMemoryHit",
              "researchCalls",
            ],
          )
          : undefined,
      ),
    );
  }

  // composite — requires both P5+P6 (engine gate)
  if (flags.p5LaborOn === true && flags.p6MaterialOn === true) {
    const composite = snapshot.composite;
    const status =
      composite == null
        ? "pending"
        : mapCompositeReportStatus(composite.status);
    workStages.push(
      stageBase(
        "composite",
        status,
        composite
          ? pickNumberCounts(
            {
              bothHoldLineCount: composite.bothHoldLineCount,
              completeLineCount: composite.completeLineCount,
              gapLineCount: composite.gapLineCount,
              skippedLineCount: composite.skippedLineCount,
            },
            [
              "bothHoldLineCount",
              "completeLineCount",
              "gapLineCount",
              "skippedLineCount",
            ],
          )
          : undefined,
      ),
    );
  }

  // pricing — P7
  if (flags.p7F5On === true) {
    const p7 = snapshot.positionCostBid;
    const status = p7 == null ? "pending" : mapP7Status(p7.status);
    workStages.push(
      stageBase(
        "pricing",
        status,
        p7
          ? pickNumberCounts(
            {
              billableLineCount: p7.billableLineCount,
              completeLineCount: p7.completeLineCount,
              gapLineCount: p7.gapLineCount,
            },
            ["billableLineCount", "completeLineCount", "gapLineCount"],
          )
          : undefined,
      ),
    );
  }

  // risk — P8
  if (flags.p8RiskOn === true) {
    const p8 = snapshot.riskDecision;
    const status = p8 == null ? "pending" : mapP8Status(p8.status);
    workStages.push(
      stageBase("risk", status),
    );
  }

  const completeStatus = deriveCompleteStatus(workStages);
  const completeStage = stageBase("complete", completeStatus);
  const stages = [...workStages, completeStage];
  const progress = computeAnalysisProgress(stages);
  const overallStatus = deriveOverallStatus(workStages, completeStatus);

  return {
    tenderId,
    caseKey,
    updatedAt,
    overallStatus,
    stages,
    conversationHints: [],
    progress,
    eta: null,
    final: null,
  };
}
