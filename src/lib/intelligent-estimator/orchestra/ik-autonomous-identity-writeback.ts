/**
 * GO-AUTO-IDENTITY-01 — AID/AIR trusted → OfferBoq durable writeback.
 *
 * REUSE: runGatedIdentityPersist · attachOfferBoqToDwelling · AUTO_G1 provenance.
 * ZERO invent workId · ZERO silent bind · CONFLICT → OWNER_EXCEPTION (no write).
 */

import type { OfferBoqDocument, OfferBoqLine, OfferBoqMatchCandidate } from "@/lib/tender-offer-boq";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import { AUTO_G1_MATCH_METHOD } from "./auto-g1-accept-contract";
import {
  computeOfferBoqIdentityPayloadHash,
  runGatedIdentityPersist,
  type IkIdentityPersistOutcome,
} from "./ik-identity-persist-glue";
import type { IkIdentityPersistPlan } from "./ik-identity-phase";
import type { IkCompoundIdentityPhaseResult } from "./ik-compound-identity-phase";
import { resolveWorkIdentityFromOfferBoqLine } from "@/lib/tender-position-cost/boq-shadow-adapter";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { hasCompleteTrustedIdentityTuple } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";

export const IK_AUTONOMOUS_IDENTITY_WRITEBACK_VERSION = "GO-AUTO-IDENTITY-01" as const;

export type IdentityAutonomyState =
  | "IDENTITY_HOLD"
  | "EVIDENCE_READY"
  | "CONTRACT_PASS"
  | "IDENTITY_PERSISTED"
  | "TRUSTED_IDENTITY"
  | "DOWNSTREAM_RELEASE"
  | "OWNER_EXCEPTION"
  | "TRUE_UNRESOLVED";

export type AutonomousIdentityLineWriteback = {
  dwellingId: string;
  lineId: string;
  parentWorkId: string;
  leafWorkId: string | null;
  state: IdentityAutonomyState;
  reasons: string[];
  patched: boolean;
};

export type AutonomousIdentityWritebackResult = {
  version: typeof IK_AUTONOMOUS_IDENTITY_WRITEBACK_VERSION;
  lineResults: AutonomousIdentityLineWriteback[];
  persistOutcome: IkIdentityPersistOutcome | null;
  /** True only when gated persist wrote ≥1 dwelling. */
  canonicalMutationPersisted: boolean;
  /** Lines that need research continuation (NEED_RESEARCH / deepen). */
  researchContinuationLineIds: string[];
  ownerExceptionLineIds: string[];
  trueUnresolvedLineIds: string[];
  productionMutation: boolean;
};

function unitsCompatible(a: string, b: string): boolean {
  const x = normalizeWorkRateUnitToken(a);
  const y = normalizeWorkRateUnitToken(b);
  if (x && y) return x === y;
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function leafUnitFromCatalog(leafWorkId: string): string | null {
  const store = loadWorkCatalogStoreLocal();
  if (!store) return null;
  const works = listActiveWorksForRegion(store, "wroclaw");
  const hit = works.find((w) => w.id === leafWorkId);
  return hit?.unit ? String(hit.unit) : null;
}

/**
 * Pure patch — only when AID mayPersistTrustedIdentity + winner leaf.
 * Provenance = auto_contract (same family as AUTO G1 / CLLR).
 */
export function applyAutonomousIdentityLeafToLine(
  line: OfferBoqLine,
  input: {
    leafWorkId: string;
    parentWorkId: string;
    reasons: string[];
    matchConfidence?: OfferBoqLine["matchConfidence"];
  },
): OfferBoqLine {
  const leaf = String(input.leafWorkId || "").trim();
  const rationale = [
    `AUTONOMOUS_IDENTITY_WRITEBACK ${IK_AUTONOMOUS_IDENTITY_WRITEBACK_VERSION}`,
    ...input.reasons,
  ].join(" · ");
  const primary: OfferBoqMatchCandidate = {
    catalogWorkId: leaf,
    workNamePl: leaf,
    workCategory: "",
    tradeId: null,
    score: 0,
    role: "primary",
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: input.matchConfidence ?? "high",
    rationale,
  };
  const parentId = String(input.parentWorkId || "").trim();
  const rest = (line.candidateMatches ?? []).filter((c) => c.catalogWorkId !== leaf);
  if (parentId && parentId !== leaf && !rest.some((c) => c.catalogWorkId === parentId)) {
    rest.unshift({
      catalogWorkId: parentId,
      workNamePl: parentId,
      workCategory: "",
      tradeId: null,
      score: 0,
      role: "secondary",
      matchedBy: line.matchMethod || "catalog_map",
      matchConfidence: "medium",
      rationale: "prior_compound_parent",
    });
  }
  return {
    ...line,
    catalogWorkId: leaf,
    matchMethod: AUTO_G1_MATCH_METHOD,
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: input.matchConfidence ?? "high",
    aiConfidence: input.matchConfidence ?? "high",
    aiRationale: rationale,
    candidateMatches: [primary, ...rest],
  };
}

function classifyParentOutcome(
  parent: IkCompoundIdentityPhaseResult["parents"][number],
): {
  state: IdentityAutonomyState;
  leafWorkId: string | null;
  reasons: string[];
  mayWrite: boolean;
  leafUnit: string | null;
  parentUnit: string | null;
} {
  const aid = parent.autonomousIdentityDecision;
  const civ = parent.civ;
  const reasons: string[] = [...(aid?.reasons ?? []), ...(parent.airV2 ? [`air:${parent.airV2.nextStrategy}`] : [])];

  if (!aid) {
    return {
      state: "TRUE_UNRESOLVED",
      leafWorkId: null,
      reasons: ["NO_AID"],
      mayWrite: false,
      leafUnit: null,
      parentUnit: null,
    };
  }

  if (
    aid.action === "OWNER_EXCEPTION_CONFLICT"
    || aid.confidenceTier === "CONFLICT"
    || aid.relativeMargin === "NEAR_TIE"
  ) {
    return {
      state: "OWNER_EXCEPTION",
      leafWorkId: null,
      reasons: [...reasons, "CONFLICT_OR_NEAR_TIE"],
      mayWrite: false,
      leafUnit: null,
      parentUnit: null,
    };
  }

  if (aid.action === "OWNER_EXCEPTION_AMBIGUITY" || aid.action === "OWNER_EXCEPTION_NO_CANDIDATE") {
    return {
      state: "OWNER_EXCEPTION",
      leafWorkId: null,
      reasons,
      mayWrite: false,
      leafUnit: null,
      parentUnit: null,
    };
  }

  if (aid.action === "NEED_RESEARCH" || !aid.mayPersistTrustedIdentity) {
    return {
      state: "EVIDENCE_READY",
      leafWorkId: aid.winner?.leafWorkId ?? null,
      reasons: [...reasons, "NEED_RESEARCH_OR_CONTRACT_BLOCK"],
      mayWrite: false,
      leafUnit: null,
      parentUnit: String(parent.unit || "").trim() || null,
    };
  }

  const leaf = String(aid.winner?.leafWorkId || "").trim();
  if (!leaf || !parent.trusted || !civ.trusted) {
    return {
      state: "TRUE_UNRESOLVED",
      leafWorkId: leaf || null,
      reasons: [...reasons, "NO_TRUSTED_WINNER"],
      mayWrite: false,
      leafUnit: null,
      parentUnit: null,
    };
  }

  const leafUnit = leafUnitFromCatalog(leaf);
  const parentUnit = String(parent.unit || "").trim() || null;
  if (parentUnit && leafUnit && !unitsCompatible(parentUnit, leafUnit)) {
    return {
      state: "OWNER_EXCEPTION",
      leafWorkId: leaf,
      reasons: [...reasons, `UNIT_MISMATCH parent=${parentUnit} leaf=${leafUnit}`],
      mayWrite: false,
      leafUnit,
      parentUnit,
    };
  }

  return {
    state: "CONTRACT_PASS",
    leafWorkId: leaf,
    reasons: [
      ...reasons,
      "AID_MAY_PERSIST_TRUSTED",
      ...(leafUnit ? [`leafUnit=${leafUnit}`] : ["leafUnit=line_check"]),
    ],
    mayWrite: true,
    leafUnit,
    parentUnit,
  };
}

function findDwellingLines(
  pkg: TenderPackage,
  lineIds: readonly string[],
): Array<{ dwellingId: string; line: OfferBoqLine; doc: OfferBoqDocument }> {
  const want = new Set(lineIds.map((id) => String(id).trim()).filter(Boolean));
  const out: Array<{ dwellingId: string; line: OfferBoqLine; doc: OfferBoqDocument }> = [];
  for (const d of pkg.dwellings) {
    const doc = d.offerBoq;
    if (!doc?.lines?.length) continue;
    for (const line of doc.lines) {
      if (want.has(String(line.lineId || "").trim())) {
        out.push({ dwellingId: d.dwellingId, line, doc });
      }
    }
  }
  return out;
}

/**
 * Apply AID PASS patches → gated persist plans → runGatedIdentityPersist.
 * Idempotent when payload hash unchanged.
 */
export function runAutonomousIdentityWritebackFromCompoundPhase(input: {
  tenderId: string;
  package?: TenderPackage | null;
  compoundIdentity: IkCompoundIdentityPhaseResult | null;
  nowIso?: string;
}): AutonomousIdentityWritebackResult {
  const empty: AutonomousIdentityWritebackResult = {
    version: IK_AUTONOMOUS_IDENTITY_WRITEBACK_VERSION,
    lineResults: [],
    persistOutcome: null,
    canonicalMutationPersisted: false,
    researchContinuationLineIds: [],
    ownerExceptionLineIds: [],
    trueUnresolvedLineIds: [],
    productionMutation: false,
  };

  const compound = input.compoundIdentity;
  if (!compound || (compound.status !== "ready" && compound.status !== "partial")) {
    return empty;
  }

  const tid = String(input.tenderId || "").trim();
  if (!tid) return empty;

  const pkg = input.package ?? getTenderPackage(tid);
  if (!pkg) return empty;

  const lineResults: AutonomousIdentityLineWriteback[] = [];
  const researchContinuationLineIds: string[] = [];
  const ownerExceptionLineIds: string[] = [];
  const trueUnresolvedLineIds: string[] = [];

  /** dwellingId → patched lines map */
  const patchesByDwelling = new Map<string, Map<string, OfferBoqLine>>();

  for (const parent of compound.parents) {
    const classified = classifyParentOutcome(parent);
    for (const lineId of parent.lineIds) {
      const base: AutonomousIdentityLineWriteback = {
        dwellingId: "",
        lineId,
        parentWorkId: parent.parentWorkId,
        leafWorkId: classified.leafWorkId,
        state: classified.state,
        reasons: classified.reasons,
        patched: false,
      };

      if (classified.state === "OWNER_EXCEPTION") {
        ownerExceptionLineIds.push(lineId);
        lineResults.push(base);
        continue;
      }
      if (classified.state === "TRUE_UNRESOLVED") {
        trueUnresolvedLineIds.push(lineId);
        lineResults.push(base);
        continue;
      }
      if (classified.state === "EVIDENCE_READY" || !classified.mayWrite) {
        researchContinuationLineIds.push(lineId);
        lineResults.push({ ...base, state: "EVIDENCE_READY" });
        continue;
      }

      const refs = findDwellingLines(pkg, [lineId]);
      if (refs.length === 0) {
        trueUnresolvedLineIds.push(lineId);
        lineResults.push({
          ...base,
          state: "TRUE_UNRESOLVED",
          reasons: [...classified.reasons, "LINE_NOT_IN_PACKAGE"],
        });
        continue;
      }

      for (const ref of refs) {
        const lineUnit = String(ref.line.unit || "").trim();
        if (
          classified.parentUnit
          && lineUnit
          && !unitsCompatible(classified.parentUnit, lineUnit)
        ) {
          ownerExceptionLineIds.push(lineId);
          lineResults.push({
            ...base,
            dwellingId: ref.dwellingId,
            state: "OWNER_EXCEPTION",
            reasons: [
              ...classified.reasons,
              `UNIT_MISMATCH parent=${classified.parentUnit} line=${lineUnit}`,
            ],
            patched: false,
          });
          continue;
        }
        if (
          classified.leafUnit
          && lineUnit
          && !unitsCompatible(classified.leafUnit, lineUnit)
        ) {
          ownerExceptionLineIds.push(lineId);
          lineResults.push({
            ...base,
            dwellingId: ref.dwellingId,
            state: "OWNER_EXCEPTION",
            reasons: [
              ...classified.reasons,
              `UNIT_MISMATCH leaf=${classified.leafUnit} line=${lineUnit}`,
            ],
            patched: false,
          });
          continue;
        }

        if (hasCompleteTrustedIdentityTuple(ref.line) && ref.line.catalogWorkId === classified.leafWorkId) {
          lineResults.push({
            ...base,
            dwellingId: ref.dwellingId,
            state: "TRUSTED_IDENTITY",
            reasons: [...classified.reasons, "ALREADY_TRUSTED_IDEMPOTENT"],
            patched: false,
          });
          continue;
        }

        const patched = applyAutonomousIdentityLeafToLine(ref.line, {
          leafWorkId: classified.leafWorkId!,
          parentWorkId: parent.parentWorkId,
          reasons: classified.reasons,
        });
        const identity = resolveWorkIdentityFromOfferBoqLine(patched);
        if (identity.status !== "OK" || !identity.workId) {
          ownerExceptionLineIds.push(lineId);
          lineResults.push({
            ...base,
            dwellingId: ref.dwellingId,
            state: "OWNER_EXCEPTION",
            reasons: [...classified.reasons, `F5_AFTER_PATCH_${identity.status}`],
            patched: false,
          });
          continue;
        }

        const did = normalizeDwellingId(ref.dwellingId);
        let map = patchesByDwelling.get(did);
        if (!map) {
          map = new Map();
          patchesByDwelling.set(did, map);
        }
        map.set(String(lineId).trim(), patched);
        lineResults.push({
          ...base,
          dwellingId: did,
          state: "CONTRACT_PASS",
          reasons: classified.reasons,
          patched: true,
        });
      }
    }
  }

  if (patchesByDwelling.size === 0) {
    return {
      ...empty,
      lineResults,
      researchContinuationLineIds: [...new Set(researchContinuationLineIds)],
      ownerExceptionLineIds: [...new Set(ownerExceptionLineIds)],
      trueUnresolvedLineIds: [...new Set(trueUnresolvedLineIds)],
    };
  }

  const plans: IkIdentityPersistPlan[] = [];
  for (const d of pkg.dwellings) {
    const did = normalizeDwellingId(d.dwellingId);
    const map = patchesByDwelling.get(did);
    if (!map || !d.offerBoq?.lines?.length) continue;
    const nextLines = d.offerBoq.lines.map((ln) => {
      const patch = map.get(String(ln.lineId || "").trim());
      return patch ?? ln;
    });
    const offerBoq: OfferBoqDocument = {
      ...d.offerBoq,
      lines: nextLines,
      mappingAppliedAt: input.nowIso ?? new Date().toISOString(),
    };
    plans.push({
      dwellingId: did,
      identityHash: computeOfferBoqIdentityPayloadHash(nextLines),
      offerBoq,
    });
  }

  const persistOutcome = runGatedIdentityPersist({
    tenderId: tid,
    package: pkg,
    plans,
  });

  const wrote = persistOutcome.writes.length > 0;
  if (wrote) {
    for (const lr of lineResults) {
      if (lr.patched && lr.state === "CONTRACT_PASS") {
        lr.state = "IDENTITY_PERSISTED";
        lr.reasons = [...lr.reasons, "GATED_PERSIST_WRITE"];
      }
    }
    for (const lr of lineResults) {
      if (lr.state === "IDENTITY_PERSISTED") {
        lr.state = "TRUSTED_IDENTITY";
        lr.reasons = [...lr.reasons, "DOWNSTREAM_RELEASE"];
      }
    }
  }

  return {
    version: IK_AUTONOMOUS_IDENTITY_WRITEBACK_VERSION,
    lineResults,
    persistOutcome,
    canonicalMutationPersisted: wrote,
    researchContinuationLineIds: [...new Set(researchContinuationLineIds)],
    ownerExceptionLineIds: [...new Set(ownerExceptionLineIds)],
    trueUnresolvedLineIds: [...new Set(trueUnresolvedLineIds)],
    productionMutation: wrote,
  };
}
