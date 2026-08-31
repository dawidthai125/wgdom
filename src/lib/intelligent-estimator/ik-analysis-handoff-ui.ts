/**
 * IK-ANALYSIS-DECISION-BID-HANDOFF-01 — pure presentation view-model.
 *
 * REUSE ONLY: AnalysisObservation · Owner Action Queue · package blockers · bidUi.
 * ZERO persist · ZERO PLN invent · ZERO Phase 5 (final/eta stay null on Observation).
 * ZERO new SSOT store.
 */

import type { AnalysisObservation } from "@/lib/intelligent-estimator/analysis-observation";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { TenderBidUiResolution } from "@/lib/intelligent-estimator/resolve-tender-bid-proposal-ui";
import type {
  IkOwnerActionItem,
  IkOwnerActionQueueReport,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-action-queue";
import type { IkPackageBlockerReport } from "@/lib/intelligent-estimator/orchestra/ik-package-blocker-report";
import {
  resolveIkOwnerActionDeepLink,
  type IkOwnerActionDeepLinkContext,
} from "@/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink";

export type IkAnalysisHandoffBucket =
  | "completed"
  | "in_progress"
  | "hold"
  | "pending"
  | "requires_owner"
  | "ready_for_next";

export type IkAnalysisHandoffCtaKind =
  | "owner_action"
  | "decision"
  | "kosztorys_bid"
  | "none";

export type IkAnalysisHandoffStageCounts = {
  done: number;
  running: number;
  hold: number;
  pending: number;
  blocked: number;
  partial: number;
  failed: number;
};

export type IkAnalysisHandoffCta = {
  kind: IkAnalysisHandoffCtaKind;
  labelPl: string | null;
  navigationTab: TenderDetailV4TabId | null;
  ownerActionItem: IkOwnerActionItem | null;
};

export type IkAnalysisHandoffViewModel = {
  bucket: IkAnalysisHandoffBucket;
  titlePl: string;
  summaryPl: string;
  overallStatus: AnalysisObservation["overallStatus"];
  progressPercent: number;
  runningStageLabelPl: string | null;
  stageCounts: IkAnalysisHandoffStageCounts;
  ownerActionCount: number;
  packageGateBlockingCount: number;
  bidUiStatus: TenderBidUiResolution["uiStatus"] | null;
  bidGapNotePl: string | null;
  /** G3 Owner Final Bid status (≠ P7 recommended). */
  g3FinalBidNotePl: string | null;
  g3Persisted: boolean;
  cta: IkAnalysisHandoffCta;
  /** Design Freeze proof — derived from Observation contract, never invent. */
  observationFinalIsNull: true;
  observationEtaIsNull: true;
};

export type BuildIkAnalysisHandoffInput = {
  observation: AnalysisObservation;
  ownerActionQueue: IkOwnerActionQueueReport | null;
  packageBlockers: IkPackageBlockerReport | null;
  bidUi: TenderBidUiResolution | null;
  deepLinkContext?: IkOwnerActionDeepLinkContext;
  /** Optional read-only Decision/Chief phase (e.g. ready_for_decision). */
  decisionUiPhase?: string | null;
  chiefDossierAvailable?: boolean;
};

const TITLE_PL: Record<IkAnalysisHandoffBucket, string> = {
  completed: "Analiza zakończona",
  in_progress: "Analiza w toku",
  hold: "HOLD / blokada",
  pending: "Oczekuje",
  requires_owner: "Wymaga decyzji Ownera",
  ready_for_next: "Gotowe do następnego kroku",
};

const CTA_OWNER_PL = "Przejdź do wymaganej akcji";
const CTA_DECISION_PL = "Przejdź do Decyzji";
const CTA_KOSZTORYS_PL = "Przejdź do Wyceny / Kosztorysu";

function countStages(observation: AnalysisObservation): IkAnalysisHandoffStageCounts {
  const counts: IkAnalysisHandoffStageCounts = {
    done: 0,
    running: 0,
    hold: 0,
    pending: 0,
    blocked: 0,
    partial: 0,
    failed: 0,
  };
  for (const stage of observation.stages) {
    if (stage.stageId === "complete") continue;
    switch (stage.status) {
      case "done":
        counts.done += 1;
        break;
      case "running":
        counts.running += 1;
        break;
      case "hold":
        counts.hold += 1;
        break;
      case "pending":
        counts.pending += 1;
        break;
      case "blocked":
        counts.blocked += 1;
        break;
      case "partial":
        counts.partial += 1;
        break;
      case "failed":
        counts.failed += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

function isBidGapStatus(status: TenderBidUiResolution["uiStatus"] | null): boolean {
  return status === "gap" || status === "blocked" || status === "hold" || status === "pending";
}

function isBidReadyEnough(
  status: TenderBidUiResolution["uiStatus"] | null,
  g3Persisted: boolean,
): boolean {
  if (g3Persisted) return true;
  return status == null || status === "legacy" || status === "ready";
}

function isDecisionPhaseUseful(phase: string | null | undefined): boolean {
  if (!phase) return false;
  return (
    phase === "ready_for_decision"
    || phase === "decision_recorded"
    || phase === "process_blocked"
    || phase === "ready"
    || phase === "blocked"
  );
}

function pickFirstNavigableOwnerAction(
  queue: IkOwnerActionQueueReport | null,
  ctx: IkOwnerActionDeepLinkContext | undefined,
): { item: IkOwnerActionItem; tab: TenderDetailV4TabId } | null {
  if (!queue || queue.itemCount === 0) return null;
  for (const item of queue.items) {
    const resolution = resolveIkOwnerActionDeepLink(item, ctx);
    if (resolution.ok) {
      return { item, tab: resolution.navigationTab };
    }
  }
  return null;
}

function deriveBucket(input: {
  observation: AnalysisObservation;
  ownerActionCount: number;
  packageGateBlockingCount: number;
  bidUiStatus: TenderBidUiResolution["uiStatus"] | null;
  g3Persisted: boolean;
}): IkAnalysisHandoffBucket {
  const {
    observation,
    ownerActionCount,
    packageGateBlockingCount,
    bidUiStatus,
    g3Persisted,
  } = input;
  const overall = observation.overallStatus;
  const runningId = observation.progress.runningStageId;

  if (ownerActionCount > 0 || packageGateBlockingCount > 0) {
    return "requires_owner";
  }
  if (
    overall === "hold"
    || overall === "blocked"
    || observation.progress.blocked
  ) {
    return "hold";
  }
  if (overall === "running" || runningId != null) {
    return "in_progress";
  }
  if (overall === "pending" || overall === "partial") {
    return "pending";
  }

  const terminalDone = overall === "done";
  const ready =
    terminalDone
    && ownerActionCount === 0
    && packageGateBlockingCount === 0
    && isBidReadyEnough(bidUiStatus, g3Persisted);

  if (ready) return "ready_for_next";
  if (terminalDone) return "completed";
  if (!g3Persisted && isBidGapStatus(bidUiStatus)) return "pending";
  return "pending";
}

function buildSummaryPl(opts: {
  bucket: IkAnalysisHandoffBucket;
  stageCounts: IkAnalysisHandoffStageCounts;
  ownerActionCount: number;
  packageGateBlockingCount: number;
  progressPercent: number;
  runningStageLabelPl: string | null;
  bidGapNotePl: string | null;
}): string {
  const {
    bucket,
    stageCounts,
    ownerActionCount,
    packageGateBlockingCount,
    progressPercent,
    runningStageLabelPl,
    bidGapNotePl,
  } = opts;
  const stageLine = `Etapy: ${stageCounts.done} gotowe · ${stageCounts.running} w toku · ${stageCounts.hold + stageCounts.blocked} HOLD/blokada · ${stageCounts.pending + stageCounts.partial} oczekuje`;

  switch (bucket) {
    case "requires_owner":
      return `${ownerActionCount} akcji Ownera · ${packageGateBlockingCount} blokuje gate. ${stageLine}`;
    case "in_progress":
      return `${progressPercent}% · ${runningStageLabelPl ?? "trwa analiza"}. ${stageLine}`;
    case "hold":
      return `Analiza wstrzymana. ${stageLine}${bidGapNotePl ? ` · ${bidGapNotePl}` : ""}`;
    case "ready_for_next":
      return `Ustalenia stabilne — kontynuuj w Workspace. ${stageLine}`;
    case "completed":
      return `Analiza zakończona. ${stageLine}${bidGapNotePl ? ` · ${bidGapNotePl}` : ""}`;
    case "pending":
    default:
      return `${stageLine}${bidGapNotePl ? ` · ${bidGapNotePl}` : ""}`;
  }
}

function buildCta(input: {
  bucket: IkAnalysisHandoffBucket;
  queue: IkOwnerActionQueueReport | null;
  deepLinkContext?: IkOwnerActionDeepLinkContext;
  bidUi: TenderBidUiResolution | null;
  decisionUiPhase?: string | null;
  chiefDossierAvailable?: boolean;
}): IkAnalysisHandoffCta {
  const navigable = pickFirstNavigableOwnerAction(input.queue, input.deepLinkContext);
  if (navigable) {
    return {
      kind: "owner_action",
      labelPl: CTA_OWNER_PL,
      navigationTab: navigable.tab,
      ownerActionItem: navigable.item,
    };
  }

  const decisionOk =
    input.chiefDossierAvailable === true
    && isDecisionPhaseUseful(input.decisionUiPhase);
  if (decisionOk) {
    return {
      kind: "decision",
      labelPl: CTA_DECISION_PL,
      navigationTab: "decyzja",
      ownerActionItem: null,
    };
  }

  const g3Persisted = input.bidUi?.g3Persisted === true;
  const bidStatus = input.bidUi?.uiStatus ?? null;
  // G3 Final Bid settled — do not force Kosztorys solely for P7 prep gap.
  if (
    !g3Persisted
    && (isBidGapStatus(bidStatus) || input.bidUi?.pdfExportBlocked === true)
  ) {
    return {
      kind: "kosztorys_bid",
      labelPl: CTA_KOSZTORYS_PL,
      navigationTab: "kosztorys",
      ownerActionItem: null,
    };
  }

  if (input.bucket === "ready_for_next") {
    if (input.chiefDossierAvailable === true) {
      return {
        kind: "decision",
        labelPl: CTA_DECISION_PL,
        navigationTab: "decyzja",
        ownerActionItem: null,
      };
    }
    return {
      kind: "kosztorys_bid",
      labelPl: CTA_KOSZTORYS_PL,
      navigationTab: "kosztorys",
      ownerActionItem: null,
    };
  }

  return {
    kind: "none",
    labelPl: null,
    navigationTab: null,
    ownerActionItem: null,
  };
}

/**
 * Pure derive — no writes, no PLN invent, no Observation mutation.
 */
export function buildIkAnalysisHandoffViewModel(
  input: BuildIkAnalysisHandoffInput,
): IkAnalysisHandoffViewModel {
  const observation = input.observation;
  const queue = input.ownerActionQueue;
  const ownerActionCount = queue?.itemCount ?? 0;
  const packageGateBlockingCount =
    queue?.packageGateBlockingCount
    ?? (input.packageBlockers && input.packageBlockers.packageGatePass === false
      ? input.packageBlockers.blockers.length
      : 0);
  const bidUiStatus = input.bidUi?.uiStatus ?? null;
  const bidGapNotePl = input.bidUi?.gapNotePl ?? null;
  const g3FinalBidNotePl = input.bidUi?.g3NotePl ?? null;
  const g3Persisted = input.bidUi?.g3Persisted === true;
  const stageCounts = countStages(observation);
  const runningId = observation.progress.runningStageId;
  const runningStageLabelPl =
    runningId == null
      ? null
      : (observation.stages.find((s) => s.stageId === runningId)?.labelPl ?? null);

  const bucket = deriveBucket({
    observation,
    ownerActionCount,
    packageGateBlockingCount,
    bidUiStatus,
    g3Persisted,
  });

  const cta = buildCta({
    bucket,
    queue,
    deepLinkContext: input.deepLinkContext,
    bidUi: input.bidUi,
    decisionUiPhase: input.decisionUiPhase,
    chiefDossierAvailable: input.chiefDossierAvailable,
  });

  return {
    bucket,
    titlePl: TITLE_PL[bucket],
    summaryPl: buildSummaryPl({
      bucket,
      stageCounts,
      ownerActionCount,
      packageGateBlockingCount,
      progressPercent: observation.progress.percent,
      runningStageLabelPl,
      bidGapNotePl: g3Persisted ? null : bidGapNotePl,
    }),
    overallStatus: observation.overallStatus,
    progressPercent: observation.progress.percent,
    runningStageLabelPl,
    stageCounts,
    ownerActionCount,
    packageGateBlockingCount,
    bidUiStatus,
    bidGapNotePl,
    g3FinalBidNotePl,
    g3Persisted,
    cta,
    observationFinalIsNull: true,
    observationEtaIsNull: true,
  };
}

/** Stable fingerprint for memo deps (avoid object identity churn). */
export function fingerprintIkAnalysisHandoffInput(input: BuildIkAnalysisHandoffInput): string {
  const o = input.observation;
  const q = input.ownerActionQueue;
  const b = input.packageBlockers;
  const bid = input.bidUi;
  return [
    o.tenderId,
    o.overallStatus,
    o.progress.percent,
    o.progress.runningStageId ?? "",
    o.progress.blocked ? "1" : "0",
    o.stages.map((s) => `${s.stageId}:${s.status}`).join(","),
    String(q?.itemCount ?? 0),
    String(q?.packageGateBlockingCount ?? 0),
    q?.items.slice(0, 8).map((i) => `${i.domain}|${i.lineRef}|${i.blockerCode}`).join(";") ?? "",
    b ? `${b.packageGatePass ? "1" : "0"}:${b.blockers.length}` : "",
    bid?.uiStatus ?? "",
    bid?.gapNotePl ?? "",
    bid?.g3NotePl ?? "",
    bid?.g3Persisted ? "1" : "0",
    bid?.pdfExportBlocked ? "1" : "0",
    input.decisionUiPhase ?? "",
    input.chiefDossierAvailable ? "1" : "0",
    o.final === null ? "finalNull" : "finalSET",
    o.eta === null ? "etaNull" : "etaSET",
  ].join("|");
}
