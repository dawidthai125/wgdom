/**
 * Full Tender Walk scheduler — line-first · fail-open across lines.
 * LINE HOLD ≠ TENDER STOP.
 */

import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import { projectLineWalkState } from "./line-state-project";
import { scheduleLineResearch } from "./research-schedule";
import { upsertTenderWalkLedger } from "./ledger-store";
import type {
  IkFullWalkLineLedgerEntry,
  IkFullWalkTenderLedger,
  IkTenderWalkStatus,
} from "./types";

export type WalkBoqLineRef = {
  lineId: string;
  lp?: string | null;
  description?: string | null;
};

export type RunFullTenderWalkInput = {
  tenderId: string;
  lines: readonly WalkBoqLineRef[];
  labor: IkLaborExpertReport | null;
  material: IkMaterialExpertReport | null;
  /** isIkP5LaborExecuteResearchActive */
  executeResearchPermission: boolean;
  walkId?: string;
  nowIso?: string;
  persist?: boolean;
  positionCompleteByLineId?: Record<string, boolean>;
  /**
   * IK-CLOSURE-WAVE1 — Owner-approved lineIds (ownerApproved===true only).
   * Maps to OWNER_EXCEPTION + EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE · ≠ POSITION_COMPLETE.
   */
  ownerExcludedLineIds?: ReadonlySet<string> | readonly string[] | null;
};

export type RunFullTenderWalkResult = {
  ledger: IkFullWalkTenderLedger;
  linesVisited: number;
  silentSkips: number;
  researchShouldExecuteLineIds: string[];
};

function recomputeCounts(lines: IkFullWalkLineLedgerEntry[]): IkFullWalkTenderLedger["counts"] {
  return {
    total: lines.length,
    visited: lines.filter((l) => l.status !== "NOT_STARTED").length,
    complete: lines.filter((l) => l.status === "POSITION_COMPLETE").length,
    hold: lines.filter((l) => l.status === "IDENTITY_HOLD").length,
    researchBlocked: lines.filter(
      (l) => l.researchOutcome === "RESEARCH_BLOCKED_BY_IDENTITY",
    ).length,
    dataBlock: lines.filter((l) => l.status === "DATA_BLOCK").length,
    ownerException: lines.filter((l) => l.status === "OWNER_EXCEPTION").length,
    conflict: lines.filter((l) => l.status === "CONFLICT").length,
  };
}

function deriveTenderStatus(counts: IkFullWalkTenderLedger["counts"]): IkTenderWalkStatus {
  if (counts.total <= 0) return "TENDER_ANALYSIS_PENDING";
  if (counts.visited < counts.total) return "TENDER_ANALYSIS_RUNNING";
  if (counts.complete < counts.total) return "TENDER_PARTIAL";
  return "TENDER_PARTIAL";
}

/**
 * Visits EVERY line. One IDENTITY_HOLD / DATA_BLOCK never aborts the loop.
 */
export function runFullTenderWalk(input: RunFullTenderWalkInput): RunFullTenderWalkResult {
  const now = input.nowIso ?? new Date().toISOString();
  const walkId = input.walkId ?? `walk-${input.tenderId}-${now}`;
  const laborById = new Map(
    (input.labor?.lines ?? []).map((l) => [l.lineId, l] as const),
  );
  const materialById = new Map(
    (input.material?.lines ?? []).map((l) => [l.lineId, l] as const),
  );

  const outLines: IkFullWalkLineLedgerEntry[] = [];
  const researchShouldExecuteLineIds: string[] = [];
  let silentSkips = 0;

  const excludedSet = (() => {
    const raw = input.ownerExcludedLineIds;
    if (!raw) return new Set<string>();
    if (raw instanceof Set) return raw;
    return new Set([...raw].map((id) => String(id || "").trim()).filter(Boolean));
  })();

  for (const ref of input.lines) {
    const labor = laborById.get(ref.lineId) ?? null;
    const material = materialById.get(ref.lineId) ?? null;
    const ownerExcluded = excludedSet.has(String(ref.lineId || "").trim());
    const sched = scheduleLineResearch({
      labor,
      executeResearchPermission: input.executeResearchPermission,
      identityAllowsResearch: labor?.classify?.allowLaborResearch,
      researchAlreadyExecuted: labor?.candidate != null || (labor?.researchKey != null && labor.rateStatus === "RESEARCH_PENDING"),
    });
    if (sched.shouldExecuteResearch && !ownerExcluded) {
      researchShouldExecuteLineIds.push(ref.lineId);
    }
    const projected = projectLineWalkState({
      lineId: ref.lineId,
      labor,
      material,
      allowLaborResearch: labor?.classify?.allowLaborResearch,
      positionComplete: ownerExcluded
        ? false
        : input.positionCompleteByLineId?.[ref.lineId],
      researchExecuted: sched.outcome === "RESEARCH_EXECUTED",
      researchFailed: sched.outcome === "RESEARCH_FAILED",
      ownerExcludedFromBillableScope: ownerExcluded,
    });
    // Force research outcome from scheduler (authoritative for observability)
    const researchOutcome = ownerExcluded
      ? "RESEARCH_NOT_REQUIRED"
      : sched.outcome;
    const status = ownerExcluded
      ? "OWNER_EXCEPTION"
      : researchOutcome === "RESEARCH_BLOCKED_BY_IDENTITY"
        ? "IDENTITY_HOLD"
        : projected.status;

    outLines.push({
      tenderId: input.tenderId,
      lineId: ref.lineId,
      lp: ref.lp ?? null,
      stage: projected.stage,
      status,
      startedAt: now,
      completedAt:
        status === "POSITION_COMPLETE"
        || status === "IDENTITY_HOLD"
        || status === "DATA_BLOCK"
        || status === "OWNER_EXCEPTION"
        || status === "CONFLICT"
          ? now
          : null,
      updatedAt: now,
      inputFingerprint: `${ref.lineId}|${labor?.catalogWorkId ?? ""}|${labor?.unit ?? ""}`,
      outputFingerprint: `${status}|${researchOutcome}`,
      evidenceRefs: labor?.candidate
        ? [`candidate:${labor.researchKey ?? labor.lineId}`]
        : [],
      blocker: projected.blocker,
      nextAction: projected.nextAction,
      researchOutcome,
      descriptionSnippet: ref.description ? String(ref.description).slice(0, 80) : null,
    });
  }

  // Fail-open invariant: every input line has an entry
  if (outLines.length !== input.lines.length) {
    silentSkips = Math.abs(input.lines.length - outLines.length);
  }

  const counts = recomputeCounts(outLines);
  const ledger: IkFullWalkTenderLedger = {
    tenderId: input.tenderId,
    walkId,
    startedAt: now,
    updatedAt: now,
    tenderStatus: deriveTenderStatus(counts),
    lines: outLines,
    counts,
  };

  if (input.persist !== false) {
    upsertTenderWalkLedger(ledger);
  }

  return {
    ledger,
    linesVisited: counts.visited,
    silentSkips,
    researchShouldExecuteLineIds,
  };
}
