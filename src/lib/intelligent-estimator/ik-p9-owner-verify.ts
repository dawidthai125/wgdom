/**
 * IK-MIGRATION-01 P9 — Owner Verify live tender (Gate A → Gate B → Owner Verify).
 *
 * REUSE Truth Gates semantics (docs/architecture/IK-MIGRATION-01-E2E-TRUTH-GATES.md).
 * NOT a Gate V2 engine · NOT a new expert · NO ikP9* lever.
 *
 * HARD LOCK: RESEARCH=0 · HTTP=0 · ACCEPT=0 · CREATE=0 · BIND=0 · WRITE=0
 * D / expertAiDecydentEnabled MUST NOT mutate across the verify session.
 */

import { loadAppSettingsLocal } from "@/lib/app-settings";
import type { AdminRole } from "@/lib/admin-auth";
import { adminCanViewTendersTab } from "@/lib/admin-auth";

/** Parent DF / P0 DF / Truth Gates — reference live tender (identity only). */
export const IK_P9_TARGET_TENDER_ID =
  "08def45d-ead6-5db8-962b-120001d33d37" as const;

export const IK_P9_OWNER_VERIFY_SCHEMA_VERSION = 1 as const;

/** Gate A / B / Owner statuses — aligned with Truth Gates language (no invent). */
export type IkP9GateStatus = "pass" | "fail" | "no_go" | "review" | "blocked";

export type IkP9OwnerJudgment = "pass" | "fail" | "review";

export type IkP9DSnapshot = {
  /** Dual Outcome master (D) — AppSettings.expertAiDecydentEnabled */
  expertAiDecydentEnabled: boolean;
  capturedAt: string;
};

export type IkP9GateAEvidence = {
  tenderId: string;
  /** BUILD step from Truth Gates procedure. */
  buildPass: boolean;
  routingOk: boolean;
  detailPageOk: boolean;
  hubOk: boolean;
  /** When ikEntryEnabled=false, NG-10 first screen still works. */
  ikEntryOffNg10Ok: boolean;
  /** Explicit: D / Dual Outcome / Offer PLN not changed by this session prep. */
  dualOutcomeUnchanged: boolean;
  payrollCloudSyncUntouched: boolean;
  whiteScreen: boolean;
};

export type IkP9GateBEvidence = {
  tenderId: string;
  /** Truth Gates: localhost-only = FAIL. */
  isLiveProduction: boolean;
  /** EC / pipeline facts carry sourceRef where status=done. */
  hasSourceRefEvidence: boolean;
  /** Honest GAP/HOLD/PARTIAL allowed — must not invent PASS. */
  claimsInventedPassWithoutEvidence: boolean;
  /** Bid.ok used as materials-done lie — forbidden. */
  bidOkUsedAsMaterialsDone: boolean;
};

export type IkP9OwnerVerifyReport = {
  schemaVersion: typeof IK_P9_OWNER_VERIFY_SCHEMA_VERSION;
  targetTenderId: typeof IK_P9_TARGET_TENDER_ID;
  tenderId: string;
  identityOk: boolean;
  gateAStatus: IkP9GateStatus;
  gateBStatus: IkP9GateStatus;
  ownerVerifyStatus: IkP9GateStatus;
  ownerJudgment: IkP9OwnerJudgment | null;
  dBefore: IkP9DSnapshot;
  dAfter: IkP9DSnapshot;
  dDiff: 0 | 1;
  dMutated: boolean;
  /** Always false — P9 hard lock. */
  researchExecuted: false;
  httpCalls: 0;
  acceptExecuted: false;
  createExecuted: false;
  bindExecuted: false;
  catalogWorkWrite: false;
  priceMemoryWrite: false;
  reasonsPl: string[];
  provenance: {
    sourceRefKind: "evidence" | "hold";
    gateOrder: ["gate_a", "gate_b", "owner_verify"];
    truthGatesSsot: "IK-MIGRATION-01-E2E-TRUTH-GATES";
  };
};

export function isIkP9TargetTender(
  tenderId: string | null | undefined,
): boolean {
  return String(tenderId ?? "").trim() === IK_P9_TARGET_TENDER_ID;
}

/** Snapshot Dual Outcome master (D) — READ AppSettings only. */
export function snapshotIkP9DState(opts?: {
  expertAiDecydentEnabled?: boolean;
  nowMs?: number;
}): IkP9DSnapshot {
  const enabled =
    opts?.expertAiDecydentEnabled != null
      ? opts.expertAiDecydentEnabled === true
      : loadAppSettingsLocal().expertAiDecydentEnabled === true;
  return {
    expertAiDecydentEnabled: enabled,
    capturedAt: new Date(opts?.nowMs ?? Date.now()).toISOString(),
  };
}

export function compareIkP9DSnapshots(
  before: IkP9DSnapshot,
  after: IkP9DSnapshot,
): { diff: 0 | 1; mutated: boolean } {
  const mutated = before.expertAiDecydentEnabled !== after.expertAiDecydentEnabled;
  return { diff: mutated ? 1 : 0, mutated };
}

/**
 * Permission for Owner Verify UI/session — REUSE tenders ACL.
 * Super Admin always; admin/moderator when AppSettings allow tenders tab.
 */
export function canRunIkP9OwnerVerify(opts: {
  role: AdminRole;
  tendersTabForStaffEnabled?: boolean;
}): boolean {
  return adminCanViewTendersTab(opts.role, {
    tendersTabForStaffEnabled: opts.tendersTabForStaffEnabled === true,
  });
}

/** Gate A — Truth Gates §1 (nie psuć WGDOM). */
export function evaluateIkP9GateA(
  ev: IkP9GateAEvidence,
): { status: IkP9GateStatus; reasonsPl: string[] } {
  const reasonsPl: string[] = [];
  if (!isIkP9TargetTender(ev.tenderId)) {
    return { status: "fail", reasonsPl: ["WRONG_TENDER — expected P9 target UUID"] };
  }
  if (ev.whiteScreen) {
    reasonsPl.push("WHITE_SCREEN");
    return { status: "no_go", reasonsPl };
  }
  if (!ev.buildPass) reasonsPl.push("BUILD_FAIL");
  if (!ev.routingOk) reasonsPl.push("ROUTING_FAIL");
  if (!ev.detailPageOk) reasonsPl.push("DETAIL_PAGE_FAIL");
  if (!ev.hubOk) reasonsPl.push("HUB_FAIL");
  if (!ev.ikEntryOffNg10Ok) reasonsPl.push("NG10_OFF_PATH_FAIL");
  if (!ev.dualOutcomeUnchanged) reasonsPl.push("DUAL_OUTCOME_CHANGED");
  if (!ev.payrollCloudSyncUntouched) reasonsPl.push("PAYROLL_OR_CLOUD_SYNC_TOUCHED");
  if (reasonsPl.length) return { status: "no_go", reasonsPl };
  return { status: "pass", reasonsPl: ["GATE_A_PASS"] };
}

/** Gate B — Truth Gates §2–§3 (IK truth on live tender). */
export function evaluateIkP9GateB(
  ev: IkP9GateBEvidence,
): { status: IkP9GateStatus; reasonsPl: string[] } {
  const reasonsPl: string[] = [];
  if (!isIkP9TargetTender(ev.tenderId)) {
    return { status: "fail", reasonsPl: ["WRONG_TENDER — expected P9 target UUID"] };
  }
  if (!ev.isLiveProduction) {
    return { status: "fail", reasonsPl: ["LOCALHOST_ONLY — Gate B requires live production"] };
  }
  if (ev.claimsInventedPassWithoutEvidence) {
    reasonsPl.push("INVENTED_PASS_WITHOUT_EVIDENCE");
  }
  if (ev.bidOkUsedAsMaterialsDone) {
    reasonsPl.push("BID_OK_USED_AS_MATERIALS_DONE");
  }
  if (!ev.hasSourceRefEvidence) {
    reasonsPl.push("MISSING_SOURCEREF_EVIDENCE");
  }
  if (reasonsPl.length) return { status: "fail", reasonsPl };
  return { status: "pass", reasonsPl: ["GATE_B_PASS"] };
}

function baseLocks() {
  return {
    researchExecuted: false as const,
    httpCalls: 0 as const,
    acceptExecuted: false as const,
    createExecuted: false as const,
    bindExecuted: false as const,
    catalogWorkWrite: false as const,
    priceMemoryWrite: false as const,
  };
}

/**
 * Ordered P9 session: Gate A → Gate B → Owner Verify.
 * Never runs research/Accept/writes. Fails loud on D mutation / wrong tender / lock violations.
 */
export function runIkP9OwnerVerify(opts: {
  tenderId: string;
  dBefore: IkP9DSnapshot;
  dAfter: IkP9DSnapshot;
  gateA: IkP9GateAEvidence;
  gateB: IkP9GateBEvidence;
  /** Owner judgment — ignored (forced fail) if gates/locks fail. */
  ownerJudgment: IkP9OwnerJudgment;
  /** Must all be false for P9 session. */
  laborResearchEnabled?: boolean;
  materialResearchEnabled?: boolean;
  acceptAttempted?: boolean;
  createAttempted?: boolean;
  bindAttempted?: boolean;
  catalogWorkWriteAttempted?: boolean;
  priceMemoryWriteAttempted?: boolean;
}): IkP9OwnerVerifyReport {
  const tenderId = String(opts.tenderId || "").trim();
  const identityOk = isIkP9TargetTender(tenderId);
  const dCmp = compareIkP9DSnapshots(opts.dBefore, opts.dAfter);
  const reasonsPl: string[] = [];

  const locksViolated =
    opts.laborResearchEnabled === true
    || opts.materialResearchEnabled === true
    || opts.acceptAttempted === true
    || opts.createAttempted === true
    || opts.bindAttempted === true
    || opts.catalogWorkWriteAttempted === true
    || opts.priceMemoryWriteAttempted === true;

  if (!identityOk) reasonsPl.push("WRONG_TENDER");
  if (dCmp.mutated) reasonsPl.push("D_MUTATION — expertAiDecydentEnabled changed");
  if (opts.laborResearchEnabled === true) reasonsPl.push("LABOR_RESEARCH_FORBIDDEN");
  if (opts.materialResearchEnabled === true) reasonsPl.push("MATERIAL_RESEARCH_FORBIDDEN");
  if (opts.acceptAttempted === true) reasonsPl.push("ACCEPT_FORBIDDEN");
  if (opts.createAttempted === true) reasonsPl.push("CREATE_FORBIDDEN");
  if (opts.bindAttempted === true) reasonsPl.push("BIND_FORBIDDEN");
  if (opts.catalogWorkWriteAttempted === true) reasonsPl.push("CATALOGWORK_WRITE_FORBIDDEN");
  if (opts.priceMemoryWriteAttempted === true) reasonsPl.push("PRICE_MEMORY_WRITE_FORBIDDEN");

  // Order: Gate A first (force tenderId on evidence)
  const gateA = evaluateIkP9GateA({ ...opts.gateA, tenderId });
  const gateAStatus = gateA.status;
  reasonsPl.push(...gateA.reasonsPl.map((r) => `A:${r}`));

  // Gate B only meaningful after Gate A pass — still evaluate for evidence, but block Owner PASS
  const gateB = evaluateIkP9GateB({ ...opts.gateB, tenderId });
  let gateBStatus = gateB.status;
  if (gateAStatus !== "pass") {
    gateBStatus = gateBStatus === "pass" ? "blocked" : gateBStatus;
    reasonsPl.push("GATE_B_BLOCKED — Gate A not PASS");
  }
  reasonsPl.push(...gateB.reasonsPl.map((r) => `B:${r}`));

  let ownerVerifyStatus: IkP9GateStatus;
  let ownerJudgment: IkP9OwnerJudgment | null = opts.ownerJudgment;

  if (!identityOk || dCmp.mutated || locksViolated || gateAStatus !== "pass" || gateBStatus !== "pass") {
    ownerVerifyStatus =
      dCmp.mutated || locksViolated || !identityOk
        ? "fail"
        : gateAStatus === "no_go"
          ? "blocked"
          : "fail";
    if (opts.ownerJudgment === "pass") {
      reasonsPl.push("OWNER_PASS_REJECTED — gates/locks not clear");
      ownerJudgment = "fail";
    }
  } else if (opts.ownerJudgment === "pass") {
    ownerVerifyStatus = "pass";
    reasonsPl.push("OWNER_VERIFY_PASS");
  } else if (opts.ownerJudgment === "review") {
    ownerVerifyStatus = "review";
    reasonsPl.push("OWNER_VERIFY_REVIEW");
  } else {
    ownerVerifyStatus = "fail";
    reasonsPl.push("OWNER_VERIFY_FAIL");
  }

  const sourceRefKind: "evidence" | "hold" =
    ownerVerifyStatus === "pass" ? "evidence" : "hold";

  return {
    schemaVersion: IK_P9_OWNER_VERIFY_SCHEMA_VERSION,
    targetTenderId: IK_P9_TARGET_TENDER_ID,
    tenderId,
    identityOk,
    gateAStatus,
    gateBStatus,
    ownerVerifyStatus,
    ownerJudgment,
    dBefore: opts.dBefore,
    dAfter: opts.dAfter,
    dDiff: dCmp.diff,
    dMutated: dCmp.mutated,
    ...baseLocks(),
    reasonsPl,
    provenance: {
      sourceRefKind,
      gateOrder: ["gate_a", "gate_b", "owner_verify"],
      truthGatesSsot: "IK-MIGRATION-01-E2E-TRUTH-GATES",
    },
  };
}
