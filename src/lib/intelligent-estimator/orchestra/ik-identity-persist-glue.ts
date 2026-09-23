/**
 * W2 — gated identity persistence (REUSE attachOfferBoqToDwelling · no new KV).
 *
 * CLOUD PERSISTENCE LOSS FIX (+ C/D):
 * - Batch attaches: local-only (suspend fire-and-forget).
 * - Exactly ONE final flush after attaches.
 * - SUCCESS only after await flush + CLOUD readback per target lineId (C+D).
 * - Sync runGatedIdentityPersist never reports success while flush pending.
 */

import { MULTI_DWELLING_PACKAGE_LS_KEY, normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import { dwellingHasValidDocumentMapping } from "@/lib/multi-dwelling/package-gate";
import {
  assertMultiDwellingLiveCloudWriteAllowed,
  isMultiDwellingCloudPushSoftDisabled,
} from "@/lib/multi-dwelling/cloud-push-safety";
import {
  attachOfferBoqToDwelling,
  flushMultiDwellingPackageStoreToCloud,
  getTenderPackage,
  loadMultiDwellingPackageStore,
  normalizeMultiDwellingPackageStore,
  runWithMultiDwellingCloudPushSuspended,
  type MultiDwellingCloudFlushResult,
} from "@/lib/multi-dwelling/store";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import type { IkIdentityPersistPlan } from "./ik-identity-phase";

export type IkIdentityPersistSkip = {
  dwellingId: string;
  reason: string;
};

export type IkIdentityPersistWrite = {
  dwellingId: string;
  identityHash: string;
};

export type IkIdentityCloudFlushStatus =
  | "none"
  | "pending"
  | "completed"
  | "failed"
  | "skipped_no_supabase";

export type IkIdentityCloudReadbackStatus = "none" | "pass" | "fail";

/** Terminal gate status — SUCCESS only after flush + cloud readback. */
export type IkIdentityPersistGateStatus = "incomplete" | "success" | "fail";

export type IkIdentityCloudReadbackLine = {
  lineId: string;
  dwellingId: string | null;
  ok: boolean;
  catalogWorkId: string | null;
  expectedWorkId: string | null;
  matchMethod: string | null;
  mappingIdPresent: boolean;
  attestationPresent: boolean;
  qtyUnchanged: boolean;
  unitUnchanged: boolean;
  descUnchanged: boolean;
  priceUnchanged: boolean;
  reason?: string;
};

export type IkIdentityPersistOutcome = {
  writes: IkIdentityPersistWrite[];
  skips: IkIdentityPersistSkip[];
  planCount: number;
  writeCount: number;
  writesMatchPlans: boolean;
  /** planned | written tracked via planCount/writeCount */
  cloudFlush: IkIdentityCloudFlushStatus;
  cloudFlushError?: string;
  cloudReadback: IkIdentityCloudReadbackStatus;
  cloudReadbackOkCount: number;
  cloudReadbackTargetCount: number;
  cloudReadbackLines: IkIdentityCloudReadbackLine[];
  cloudReadbackError?: string;
  /** incomplete while pending; success only after flush+readback; fail on flush/readback error */
  gateStatus: IkIdentityPersistGateStatus;
  /** Alias: gateStatus === "success" */
  success: boolean;
  /**
   * Only on sync path with writes — MUST be awaited via
   * runGatedIdentityPersistAwaitCloud / settleGatedIdentityPersistCloud.
   * Presence of promise ≠ SUCCESS.
   */
  cloudFlushPromise?: Promise<MultiDwellingCloudFlushResult>;
};

export type IkIdentityPersistSessionGate = Map<string, string>;

/** Soft failures — allow useEffect to retry when package/mapping appears later. */
export const IDENTITY_PERSIST_RETRYABLE_SKIP_REASONS = new Set<string>([
  "PACKAGE_NOT_FOUND",
  "DOCUMENT_MAPPING_REQUIRED",
  "STORAGE_UNAVAILABLE",
  "DWELLING_NOT_FOUND",
  "MISSING_TENDER_ID",
]);

/**
 * Latch only on terminal gateStatus (success|fail) or terminal no-write skips.
 * NEVER latch while cloudFlush=pending / gateStatus=incomplete with writes.
 */
export function shouldLatchIdentityPersistAttempt(
  outcome: IkIdentityPersistOutcome,
): boolean {
  if (outcome.gateStatus === "success" || outcome.gateStatus === "fail") {
    return true;
  }
  // incomplete — never latch if flush still pending or writes awaiting settle
  if (outcome.cloudFlush === "pending") return false;
  if (outcome.writeCount > 0) return false;
  if (outcome.skips.length === 0) return false;
  return !outcome.skips.some((s) =>
    IDENTITY_PERSIST_RETRYABLE_SKIP_REASONS.has(s.reason),
  );
}

/** Hard SUCCESS — flush + cloud readback complete. */
export function isGatedIdentityPersistSuccess(
  outcome: IkIdentityPersistOutcome,
): boolean {
  return (
    outcome.success === true &&
    outcome.gateStatus === "success" &&
    outcome.cloudFlush !== "pending" &&
    (outcome.writeCount === 0 || outcome.cloudReadback === "pass")
  );
}

function foldHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableCandidateKey(
  c: OfferBoqLine["candidateMatches"][number],
): string {
  return [
    c.catalogWorkId,
    c.matchedBy,
    c.matchConfidence,
    c.role,
  ].join("|");
}

export function computeOfferBoqIdentityPayloadHash(
  lines: readonly OfferBoqLine[],
): string {
  const payload = [...lines]
    .map((line) => ({
      lineId: line.lineId,
      catalogWorkId: line.catalogWorkId ?? null,
      matchMethod: line.matchMethod,
      matchConfidence: line.matchConfidence,
      isNoise: line.isNoise === true,
      noiseKind: line.noiseKind ?? null,
      candidates: [...(line.candidateMatches ?? [])]
        .map(stableCandidateKey)
        .sort(),
    }))
    .sort((a, b) => a.lineId.localeCompare(b.lineId));
  return `ik-id-${foldHash(JSON.stringify(payload)).toString(16)}`;
}

function hashExistingOfferBoq(doc: OfferBoqDocument | null | undefined): string | null {
  if (!doc?.lines?.length) return null;
  return computeOfferBoqIdentityPayloadHash(doc.lines);
}

function sessionKey(tenderId: string, dwellingId: string): string {
  return `${tenderId}|${normalizeDwellingId(dwellingId)}`;
}

function baseOutcomeFields(
  plans: readonly IkIdentityPersistPlan[],
  writes: IkIdentityPersistWrite[],
  skips: IkIdentityPersistSkip[],
): Pick<
  IkIdentityPersistOutcome,
  | "writes"
  | "skips"
  | "planCount"
  | "writeCount"
  | "writesMatchPlans"
  | "cloudReadback"
  | "cloudReadbackOkCount"
  | "cloudReadbackTargetCount"
  | "cloudReadbackLines"
> {
  return {
    writes,
    skips,
    planCount: plans.length,
    writeCount: writes.length,
    writesMatchPlans: writes.length === plans.length,
    cloudReadback: "none",
    cloudReadbackOkCount: 0,
    cloudReadbackTargetCount: 0,
    cloudReadbackLines: [],
  };
}

function emptyOutcome(
  plans: readonly IkIdentityPersistPlan[],
  skips: IkIdentityPersistSkip[],
): IkIdentityPersistOutcome {
  const identicalOnly =
    skips.length > 0 &&
    skips.every(
      (s) =>
        s.reason === "IDENTICAL_PAYLOAD" || s.reason === "ALREADY_WRITTEN_SESSION",
    );
  const retryable = skips.some((s) =>
    IDENTITY_PERSIST_RETRYABLE_SKIP_REASONS.has(s.reason),
  );
  const gateStatus: IkIdentityPersistGateStatus = identicalOnly
    ? "success"
    : retryable
      ? "incomplete"
      : skips.length > 0
        ? "fail"
        : "success";
  return {
    ...baseOutcomeFields(plans, [], skips),
    cloudFlush: "none",
    gateStatus,
    success: gateStatus === "success",
  };
}

export function readbackGatedIdentityLocalLines(opts: {
  tenderId: string;
  lineIds: readonly string[];
}): Array<{
  lineId: string;
  dwellingId: string | null;
  catalogWorkId: string | null;
  matchMethod: string | null;
}> {
  const tid = String(opts.tenderId ?? "").trim();
  const pkg = tid ? getTenderPackage(tid) : null;
  const want = new Set(opts.lineIds.map((id) => String(id || "").trim()).filter(Boolean));
  const out: Array<{
    lineId: string;
    dwellingId: string | null;
    catalogWorkId: string | null;
    matchMethod: string | null;
  }> = [];
  for (const id of want) {
    let hit: {
      lineId: string;
      dwellingId: string | null;
      catalogWorkId: string | null;
      matchMethod: string | null;
    } | null = null;
    for (const d of pkg?.dwellings ?? []) {
      for (const line of d.offerBoq?.lines ?? []) {
        if (String(line.lineId || "").trim() !== id) continue;
        hit = {
          lineId: id,
          dwellingId: d.dwellingId,
          catalogWorkId: line.catalogWorkId ?? null,
          matchMethod: line.matchMethod ?? null,
        };
        break;
      }
      if (hit) break;
    }
    out.push(
      hit ?? {
        lineId: id,
        dwellingId: null,
        catalogWorkId: null,
        matchMethod: null,
      },
    );
  }
  return out;
}

/** Injectable cloud package reader (tests) — SSOT production uses fetchKeysFromCloud. */
export type GatedIdentityCloudPackageReader = (
  tenderId: string,
) => Promise<TenderPackage | null>;

let cloudPackageReaderForTests: GatedIdentityCloudPackageReader | null = null;

export function setGatedIdentityCloudPackageReaderForTests(
  reader: GatedIdentityCloudPackageReader | null,
): void {
  cloudPackageReaderForTests = reader;
}

async function readCloudTenderPackage(tenderId: string): Promise<TenderPackage | null> {
  if (cloudPackageReaderForTests) {
    return cloudPackageReaderForTests(tenderId);
  }
  if (isMultiDwellingCloudPushSoftDisabled()) {
    // Soft-disable: mirror local store as durable stand-in (no live network).
    return getTenderPackage(tenderId);
  }
  assertMultiDwellingLiveCloudWriteAllowed("readCloudTenderPackage");
  const { fetchKeysFromCloud } = await import("@/lib/cloud-sync");
  const [raw] = await fetchKeysFromCloud([MULTI_DWELLING_PACKAGE_LS_KEY]);
  const store = normalizeMultiDwellingPackageStore(raw);
  return store.byTenderId[tenderId] ?? null;
}

function extractMappingId(rationale: string): string | null {
  const m = /mappingId=([a-z0-9][a-z0-9\-_]*)/i.exec(rationale);
  return m?.[1] ?? null;
}

function hasClassOrAttestation(rationale: string): {
  mappingIdPresent: boolean;
  attestationPresent: boolean;
} {
  return {
    mappingIdPresent: /mappingId=/i.test(rationale),
    attestationPresent:
      /OWNER_RC1_|COMPOUND_LEAF_REBIND|CANONICAL_LEAF_REBIND|EXACT_IDENTITY_ATTESTED|RECLASS_STOLARKA|VERIFY_CONNECT|CREATE_CANDIDATE/i.test(
        rationale,
      ),
  };
}

/**
 * Verify cloud package against planned OfferBoq for written dwellings.
 * Target lines = all lines in plans for dwellings that were written.
 */
export function verifyGatedIdentityCloudReadback(opts: {
  cloudPkg: TenderPackage | null;
  plans: readonly IkIdentityPersistPlan[];
  writes: readonly IkIdentityPersistWrite[];
}): {
  ok: boolean;
  okCount: number;
  targetCount: number;
  lines: IkIdentityCloudReadbackLine[];
  error?: string;
} {
  if (!opts.cloudPkg) {
    return {
      ok: false,
      okCount: 0,
      targetCount: 0,
      lines: [],
      error: "CLOUD_PACKAGE_MISSING",
    };
  }
  const writeIds = new Set(
    opts.writes.map((w) => normalizeDwellingId(w.dwellingId)),
  );
  const cloudByDwelling = new Map(
    (opts.cloudPkg.dwellings || []).map((d) => [
      normalizeDwellingId(d.dwellingId),
      d,
    ]),
  );
  const lines: IkIdentityCloudReadbackLine[] = [];
  for (const plan of opts.plans) {
    const did = normalizeDwellingId(plan.dwellingId);
    if (!writeIds.has(did)) continue;
    const cloudUnit = cloudByDwelling.get(did);
    const cloudByLine = new Map(
      (cloudUnit?.offerBoq?.lines || []).map((l) => [
        String(l.lineId || "").trim(),
        l,
      ]),
    );
    for (const expected of plan.offerBoq?.lines || []) {
      const lineId = String(expected.lineId || "").trim();
      if (!lineId) continue;
      const cloudLine = cloudByLine.get(lineId);
      const rat = String(cloudLine?.aiRationale || "");
      const expRat = String(expected.aiRationale || "");
      const { mappingIdPresent, attestationPresent } = hasClassOrAttestation(rat);
      const expTokens = hasClassOrAttestation(expRat);
      const expectedWorkId = expected.catalogWorkId ?? null;
      const catalogWorkId = cloudLine?.catalogWorkId ?? null;
      const qtyUnchanged = cloudLine?.quantity === expected.quantity;
      const unitUnchanged =
        String(cloudLine?.unit || "") === String(expected.unit || "");
      const descUnchanged =
        String(cloudLine?.description || "") === String(expected.description || "");
      const priceUnchanged =
        cloudLine?.lineTotalPln === expected.lineTotalPln;
      let reason: string | undefined;
      if (!cloudLine) reason = "LINE_MISSING_IN_CLOUD";
      else if (catalogWorkId !== expectedWorkId) reason = "WORK_ID_MISMATCH";
      else if (String(cloudLine.matchMethod) !== String(expected.matchMethod)) {
        reason = "MATCH_METHOD_MISMATCH";
      } else if (!qtyUnchanged || !unitUnchanged || !descUnchanged || !priceUnchanged) {
        reason = "PROTECTED_FIELD_DRIFT";
      } else if (expTokens.mappingIdPresent && !mappingIdPresent) {
        reason = "MAPPING_ID_MISSING";
      } else if (expTokens.attestationPresent && !attestationPresent) {
        reason = "ATTESTATION_MISSING";
      }
      // mappingId equality when both present
      if (!reason && expTokens.mappingIdPresent) {
        const expMap = extractMappingId(expRat);
        const gotMap = extractMappingId(rat);
        if (expMap && gotMap && expMap !== gotMap) {
          reason = "MAPPING_ID_MISMATCH";
        }
      }
      const ok = !reason;
      lines.push({
        lineId,
        dwellingId: did,
        ok,
        catalogWorkId,
        expectedWorkId,
        matchMethod: cloudLine?.matchMethod ?? null,
        mappingIdPresent,
        attestationPresent,
        qtyUnchanged,
        unitUnchanged,
        descUnchanged,
        priceUnchanged,
        reason,
      });
    }
  }
  const targetCount = lines.length;
  const okCount = lines.filter((l) => l.ok).length;
  return {
    ok: targetCount > 0 && okCount === targetCount,
    okCount,
    targetCount,
    lines,
    error:
      targetCount === 0
        ? "NO_READBACK_TARGETS"
        : okCount < targetCount
          ? "CLOUD_READBACK_PARTIAL"
          : undefined,
  };
}

/**
 * Sync local attaches only. When writes>0 returns gateStatus=incomplete + pending promise.
 * NEVER success while cloudFlush=pending.
 */
export function runGatedIdentityPersist(opts: {
  tenderId: string;
  package?: TenderPackage | null;
  plans: readonly IkIdentityPersistPlan[];
  sessionGate?: IkIdentityPersistSessionGate;
}): IkIdentityPersistOutcome {
  const tid = String(opts.tenderId ?? "").trim();
  const plans = opts.plans;
  const gate = opts.sessionGate ?? new Map<string, string>();

  if (!tid) {
    return emptyOutcome(
      plans,
      plans.map((p) => ({
        dwellingId: p.dwellingId,
        reason: "MISSING_TENDER_ID",
      })),
    );
  }

  const pkg = opts.package ?? getTenderPackage(tid);
  if (!pkg) {
    return emptyOutcome(
      plans,
      plans.map((p) => ({
        dwellingId: p.dwellingId,
        reason: "PACKAGE_NOT_FOUND",
      })),
    );
  }

  const { writes, skips } = runWithMultiDwellingCloudPushSuspended(() => {
    const writesInner: IkIdentityPersistWrite[] = [];
    const skipsInner: IkIdentityPersistSkip[] = [];

    for (const plan of plans) {
      const dwellingId = normalizeDwellingId(plan.dwellingId);
      const sk = sessionKey(tid, dwellingId);
      const livePkg = getTenderPackage(tid) ?? pkg;

      if (livePkg.mode === "multi") {
        const unit = livePkg.dwellings.find(
          (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
        );
        if (!unit || !dwellingHasValidDocumentMapping(livePkg, unit)) {
          skipsInner.push({
            dwellingId,
            reason: "DOCUMENT_MAPPING_REQUIRED",
          });
          continue;
        }
      }

      const existingUnit = livePkg.dwellings.find(
        (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
      );
      const existingHash = hashExistingOfferBoq(existingUnit?.offerBoq ?? null);
      if (existingHash != null && existingHash === plan.identityHash) {
        skipsInner.push({ dwellingId, reason: "IDENTICAL_PAYLOAD" });
        gate.set(sk, plan.identityHash);
        continue;
      }

      if (gate.get(sk) === plan.identityHash) {
        skipsInner.push({ dwellingId, reason: "ALREADY_WRITTEN_SESSION" });
        continue;
      }

      const attached = attachOfferBoqToDwelling({
        tenderId: tid,
        dwellingId,
        offerBoq: plan.offerBoq,
        cloud: false,
      });

      if (!attached.ok) {
        skipsInner.push({ dwellingId, reason: attached.reason });
        continue;
      }

      gate.set(sk, plan.identityHash);
      writesInner.push({ dwellingId, identityHash: plan.identityHash });
    }

    return { writes: writesInner, skips: skipsInner };
  });

  if (writes.length === 0) {
    return emptyOutcome(plans, skips);
  }

  // Fail-closed: partial local writes (writes !== plans) → incomplete until settle;
  // settle path will mark fail if still mismatched.
  const finalStore = loadMultiDwellingPackageStore();
  const cloudFlushPromise = flushMultiDwellingPackageStoreToCloud(finalStore);

  return {
    ...baseOutcomeFields(plans, writes, skips),
    cloudFlush: "pending",
    gateStatus: "incomplete",
    success: false,
    cloudFlushPromise,
  };
}

/**
 * Await flush + CLOUD readback. Sole path to gateStatus=success after writes.
 */
export async function settleGatedIdentityPersistCloud(
  outcome: IkIdentityPersistOutcome,
  opts: {
    tenderId: string;
    plans: readonly IkIdentityPersistPlan[];
  },
): Promise<IkIdentityPersistOutcome> {
  if (outcome.writeCount === 0) {
    return outcome;
  }
  if (!outcome.cloudFlushPromise) {
    return {
      ...outcome,
      gateStatus: "fail",
      success: false,
      cloudFlush: "failed",
      cloudFlushError: "MISSING_CLOUD_FLUSH_PROMISE",
    };
  }

  const flush = await outcome.cloudFlushPromise;
  if (!flush.ok) {
    return {
      ...outcome,
      cloudFlush: "failed",
      cloudFlushError: flush.error,
      gateStatus: "fail",
      success: false,
      cloudFlushPromise: undefined,
    };
  }

  const cloudFlush: IkIdentityCloudFlushStatus = flush.skipped
    ? "skipped_no_supabase"
    : "completed";

  // Strict writes===plans for success when we intended a batch write
  if (!outcome.writesMatchPlans) {
    return {
      ...outcome,
      cloudFlush,
      cloudFlushPromise: undefined,
      gateStatus: "fail",
      success: false,
      cloudReadback: "fail",
      cloudReadbackError: "WRITES_NE_PLANS",
    };
  }

  let cloudPkg: TenderPackage | null = null;
  try {
    cloudPkg = await readCloudTenderPackage(opts.tenderId);
  } catch (e) {
    return {
      ...outcome,
      cloudFlush,
      cloudFlushPromise: undefined,
      gateStatus: "fail",
      success: false,
      cloudReadback: "fail",
      cloudReadbackError: String((e as Error)?.message ?? e),
    };
  }

  const rb = verifyGatedIdentityCloudReadback({
    cloudPkg,
    plans: opts.plans,
    writes: outcome.writes,
  });

  if (!rb.ok) {
    return {
      ...outcome,
      cloudFlush,
      cloudFlushPromise: undefined,
      cloudReadback: "fail",
      cloudReadbackOkCount: rb.okCount,
      cloudReadbackTargetCount: rb.targetCount,
      cloudReadbackLines: rb.lines,
      cloudReadbackError: rb.error,
      gateStatus: "fail",
      success: false,
    };
  }

  return {
    ...outcome,
    cloudFlush,
    cloudFlushPromise: undefined,
    cloudReadback: "pass",
    cloudReadbackOkCount: rb.okCount,
    cloudReadbackTargetCount: rb.targetCount,
    cloudReadbackLines: rb.lines,
    gateStatus: "success",
    success: true,
  };
}

export async function runGatedIdentityPersistAwaitCloud(opts: {
  tenderId: string;
  package?: TenderPackage | null;
  plans: readonly IkIdentityPersistPlan[];
  sessionGate?: IkIdentityPersistSessionGate;
}): Promise<IkIdentityPersistOutcome> {
  const outcome = runGatedIdentityPersist(opts);
  return settleGatedIdentityPersistCloud(outcome, {
    tenderId: opts.tenderId,
    plans: opts.plans,
  });
}
