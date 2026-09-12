/**
 * LABOR_ONLY_AUTO_BOM_V1 — generic evidence-driven LABOR_ONLY technology/BOM authority.
 *
 * Closes LABOR_ONLY_CONTRACT_GAP: valid HARD labor + explicit NO_MATERIAL_NORM
 * may produce AUTO_BOM mode LABOR_ONLY without Owner allowlist expansion and
 * without inventing materials / TechnologyPack recipes.
 *
 * Reuses: kw-knr-discovery-evidence · resolveLaborOnlyBomForWork · AUTO_BOM LABOR_ONLY.
 * NOT a second Decision Tree / Orchestra / Catalog / Research Engine.
 * Fail-closed · deterministic · ownerRuntimeDependency = 0.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import {
  lookupKnrDiscoveryEvidence,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-lookup";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import {
  isMaterialsRequiredWork,
} from "@/lib/tender-position-cost/labor-only-classification";
import { unitsCompatible as unitsCompatiblePm } from "@/lib/price-intelligence/market-material-research-provider";

export const LABOR_ONLY_AUTO_BOM_V1_DECISION_ID = "LABOR_ONLY_AUTO_BOM_V1" as const;
export const LABOR_ONLY_AUTO_BOM_V1_RULE_ID = "labor_only_auto_bom_v1" as const;
export const LABOR_ONLY_AUTO_BOM_V1_POLICY_VERSION = "LABOR_ONLY_AUTO_BOM_V1" as const;
/** AUTO_BOM provenance ruleId — evidence path (≠ owner allowlist). */
export const AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1 =
  "auto_bom.labor_only_auto_bom_v1" as const;

export type LaborOnlyAutoBomV1Decision =
  | "LABOR_ONLY_AUTO_BOM_ACCEPT"
  | "LABOR_ONLY_AUTO_BOM_EXCEPTION";

export type LaborOnlyAutoBomV1Reason =
  | "NO_WORK_ID"
  | "NO_UNIT"
  | "INVALID_UNIT"
  | "AMBIGUOUS_IDENTITY"
  | "NO_DISCOVERY_STORE"
  | "NO_EVIDENCE"
  | "SOFT_ONLY"
  | "MISSING_LABOR_NORM"
  | "MISSING_NO_MATERIAL_NORM"
  | "MATERIALS_PRESENT"
  | "MATERIALS_REQUIRED_WORK"
  | "CONFLICTING_EVIDENCE"
  | "STALE_OR_INACTIVE"
  | "MISSING_PROVENANCE"
  | "UNIT_MISMATCH"
  | "INVENT_FORBIDDEN";

export type LaborOnlyAutoBomV1Result = {
  decisionId: typeof LABOR_ONLY_AUTO_BOM_V1_DECISION_ID;
  ruleId: typeof LABOR_ONLY_AUTO_BOM_V1_RULE_ID;
  policyVersion: typeof LABOR_ONLY_AUTO_BOM_V1_POLICY_VERSION;
  decision: LaborOnlyAutoBomV1Decision;
  reasons: LaborOnlyAutoBomV1Reason[];
  evaluatedAtIso: string;
  workId: string | null;
  unit: string | null;
  evidenceKeyV1: string | null;
  laborNorm: {
    quantity: number;
    unit: string;
    code: string;
    description: string;
  } | null;
  /** Explicit NO_MATERIAL_NORM attestation present. */
  noMaterialNorm: boolean;
  materialsEmpty: boolean;
  auditWhy: string[];
  ownerRuntimeDependency: 0;
  invent: false;
};

function isoNow(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function foldUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/m\^?2\b/g, "m2")
    .replace(/\s+/g, "");
}

function unitsOk(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (unitsCompatiblePm(a, b)) return true;
  const fa = foldUnit(a);
  const fb = foldUnit(b);
  return Boolean(fa && fb && fa === fb);
}

/** Marker hash written by Owner HARD NO_MATERIAL_NORM ingest (batch-8 semantics). */
export function buildNoMaterialNormQueryHash(evidenceKeyV1: string): string {
  return fnv1aHex(`NO_MATERIAL_NORM|${String(evidenceKeyV1 || "").trim()}`);
}

export function buildWorkIdDiscoveryQueryHash(workId: string): string {
  return fnv1aHex(String(workId || "").trim());
}

/**
 * Parse ACLC workId → evidenceKeyV1 hint (KNR|family|code).
 * Supports codes with optional trailing segment (e.g. 1205-05-00 → 1205-05).
 */
export function evidenceKeyHintFromCanonicalWorkId(workId: string): string | null {
  const id = String(workId || "").trim().toLowerCase();
  const m = /^cw\.knr\.(knr(?:-w)?|knnr)-([0-9]+(?:-[0-9]+)?)\.([a-z0-9-]+)\.([a-z0-9]+)$/i.exec(
    id,
  );
  if (!m) return null;
  const prefix = m[1]!.toLowerCase().startsWith("knnr") ? "KNNR" : "KNR";
  const family = m[2]!;
  const codeRaw = m[3]!;
  const codeMatch = /^(\d{3,4}-\d{2})(?:-\d{2})?$/i.exec(codeRaw)
    || /(\d{3,4}-\d{2})/i.exec(codeRaw);
  if (!codeMatch) return null;
  return `${prefix}|${family}|${codeMatch[1]}`;
}

function hasExplicitNoMaterialNorm(rec: KnrDiscoveryEvidenceRecord): boolean {
  const marker = buildNoMaterialNormQueryHash(rec.evidenceKeyV1);
  if (rec.queryHashes?.includes(marker)) return true;
  for (const s of rec.sources || []) {
    const frag = String(s.fragment || "");
    if (/\bNO_MATERIAL_NORM\b/.test(frag)) return true;
  }
  return false;
}

function pickHardLaborNorm(rec: KnrDiscoveryEvidenceRecord): {
  ok: true;
  labor: {
    quantity: number;
    unit: string;
    code: string;
    description: string;
  };
} | { ok: false; conflict: boolean } {
  const lines = rec.norms?.laborNorms || [];
  const hard = lines.filter((l) => {
    if (!l || l.kind !== "R") return false;
    if (!Number.isFinite(l.quantity) || l.quantity <= 0) return false;
    const u = foldUnit(l.unit);
    if (!u) return false;
    return u === "r-g" || u === "rg" || u === "r.g" || u === "rob-g" || u.includes("r-g");
  });
  if (hard.length === 0) return { ok: false, conflict: false };
  const qtySet = new Set(hard.map((h) => h.quantity));
  if (qtySet.size > 1) return { ok: false, conflict: true };
  const h = [...hard].sort((a, b) => String(a.code).localeCompare(String(b.code)))[0]!;
  return {
    ok: true,
    labor: {
      quantity: h.quantity,
      unit: h.unit,
      code: h.code,
      description: h.description,
    },
  };
}

function exception(
  reasons: LaborOnlyAutoBomV1Reason[],
  nowMs: number,
  auditWhy: string[],
  extra?: Partial<LaborOnlyAutoBomV1Result>,
): LaborOnlyAutoBomV1Result {
  return {
    decisionId: LABOR_ONLY_AUTO_BOM_V1_DECISION_ID,
    ruleId: LABOR_ONLY_AUTO_BOM_V1_RULE_ID,
    policyVersion: LABOR_ONLY_AUTO_BOM_V1_POLICY_VERSION,
    decision: "LABOR_ONLY_AUTO_BOM_EXCEPTION",
    reasons: [...new Set(reasons)],
    evaluatedAtIso: isoNow(nowMs),
    workId: null,
    unit: null,
    evidenceKeyV1: null,
    laborNorm: null,
    noMaterialNorm: false,
    materialsEmpty: false,
    auditWhy,
    ownerRuntimeDependency: 0,
    invent: false,
    ...extra,
  };
}

/**
 * Resolve discovery evidence for a catalog workId (queryHash workId → evidenceKey).
 */
export function lookupLaborOnlyAutoBomV1Evidence(
  workId: string,
  store: KnrDiscoveryEvidenceStore | null | undefined,
): {
  record: KnrDiscoveryEvidenceRecord | null;
  ambiguous: boolean;
  evidenceKeyV1: string | null;
  auditWhy: string[];
} {
  const auditWhy: string[] = [];
  if (!store) {
    return { record: null, ambiguous: false, evidenceKeyV1: null, auditWhy: ["no store"] };
  }
  const id = String(workId || "").trim();
  if (!id) {
    return { record: null, ambiguous: false, evidenceKeyV1: null, auditWhy: ["empty workId"] };
  }

  const qh = buildWorkIdDiscoveryQueryHash(id);
  const byWork = (store.byQueryHash[qh] || [])
    .map((ek) => store.entries[ek])
    .filter(Boolean) as KnrDiscoveryEvidenceRecord[];

  const hint = evidenceKeyHintFromCanonicalWorkId(id);
  const byKey = hint
    ? lookupKnrDiscoveryEvidence({ evidenceKeyV1: hint }, store)
    : null;

  const candidates = new Map<string, KnrDiscoveryEvidenceRecord>();
  for (const r of byWork) candidates.set(r.evidenceKeyV1, r);
  if (byKey) candidates.set(byKey.evidenceKeyV1, byKey);

  if (candidates.size === 0) {
    auditWhy.push(hint ? `no evidence for ${hint}` : "no evidenceKey hint / queryHash");
    return { record: null, ambiguous: false, evidenceKeyV1: hint, auditWhy };
  }
  if (candidates.size > 1) {
    // Prefer canonical evidenceKeyHint when present among candidates (fail-closed otherwise).
    if (hint && candidates.has(hint)) {
      auditWhy.push(`disambiguated via evidenceKeyHint=${hint} from ${candidates.size}`);
      return {
        record: candidates.get(hint)!,
        ambiguous: false,
        evidenceKeyV1: hint,
        auditWhy,
      };
    }
    auditWhy.push(`ambiguous evidence count=${candidates.size}`);
    return {
      record: null,
      ambiguous: true,
      evidenceKeyV1: hint,
      auditWhy,
    };
  }
  const record = [...candidates.values()][0]!;
  return {
    record,
    ambiguous: false,
    evidenceKeyV1: record.evidenceKeyV1,
    auditWhy,
  };
}

/**
 * Evaluate LABOR_ONLY_AUTO_BOM_V1 gates (A–M conceptual).
 * PASS ⇒ caller may AUTO_BOM_ACCEPT mode LABOR_ONLY + Position Cost LABOR_ONLY.
 */
export function evaluateLaborOnlyAutoBomV1Contract(input: {
  workId: string;
  unit: string;
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
  nowMs?: number;
}): LaborOnlyAutoBomV1Result {
  const nowMs = input.nowMs ?? Date.now();
  const workId = String(input.workId || "").trim();
  const unit = String(input.unit || "").trim();

  if (!workId) {
    return exception(["NO_WORK_ID"], nowMs, ["missing workId"]);
  }
  if (!unit) {
    return exception(["NO_UNIT", "INVALID_UNIT"], nowMs, ["missing unit"], {
      workId,
    });
  }
  if (isMaterialsRequiredWork(workId)) {
    return exception(
      ["MATERIALS_REQUIRED_WORK"],
      nowMs,
      ["OWNER_MATERIALS_REQUIRED — not LABOR_ONLY"],
      { workId, unit },
    );
  }
  if (!input.discoveryStore) {
    return exception(["NO_DISCOVERY_STORE", "NO_EVIDENCE"], nowMs, ["discovery store absent"], {
      workId,
      unit,
    });
  }

  const looked = lookupLaborOnlyAutoBomV1Evidence(workId, input.discoveryStore);
  if (looked.ambiguous) {
    return exception(
      ["AMBIGUOUS_IDENTITY", "CONFLICTING_EVIDENCE"],
      nowMs,
      looked.auditWhy,
      { workId, unit, evidenceKeyV1: looked.evidenceKeyV1 },
    );
  }
  const rec = looked.record;
  if (!rec) {
    return exception(["NO_EVIDENCE"], nowMs, looked.auditWhy, {
      workId,
      unit,
      evidenceKeyV1: looked.evidenceKeyV1,
    });
  }

  if (rec.lifecycleState !== "ACTIVE") {
    return exception(
      ["STALE_OR_INACTIVE"],
      nowMs,
      [`lifecycle=${rec.lifecycleState}`],
      { workId, unit, evidenceKeyV1: rec.evidenceKeyV1 },
    );
  }
  if (rec.discoveryStatus === "CONFLICT") {
    return exception(
      ["CONFLICTING_EVIDENCE"],
      nowMs,
      ["discoveryStatus=CONFLICT"],
      { workId, unit, evidenceKeyV1: rec.evidenceKeyV1 },
    );
  }
  if (rec.discoveryStatus === "INCOMPLETE") {
    return exception(
      ["SOFT_ONLY", "MISSING_PROVENANCE"],
      nowMs,
      ["discoveryStatus=INCOMPLETE — not HARD labor-only authority"],
      { workId, unit, evidenceKeyV1: rec.evidenceKeyV1 },
    );
  }

  if (!rec.sources?.length) {
    return exception(
      ["MISSING_PROVENANCE", "SOFT_ONLY"],
      nowMs,
      ["no sources"],
      { workId, unit, evidenceKeyV1: rec.evidenceKeyV1 },
    );
  }

  const mats = rec.norms?.materialNorms || [];
  if (mats.length > 0) {
    return exception(
      ["MATERIALS_PRESENT"],
      nowMs,
      [`materialNorms=${mats.length} — not LABOR_ONLY`],
      {
        workId,
        unit,
        evidenceKeyV1: rec.evidenceKeyV1,
        materialsEmpty: false,
      },
    );
  }

  const noMat = hasExplicitNoMaterialNorm(rec);
  if (!noMat) {
    return exception(
      ["MISSING_NO_MATERIAL_NORM"],
      nowMs,
      ["empty materialNorms without explicit NO_MATERIAL_NORM attestation"],
      {
        workId,
        unit,
        evidenceKeyV1: rec.evidenceKeyV1,
        materialsEmpty: true,
        noMaterialNorm: false,
      },
    );
  }

  const laborPick = pickHardLaborNorm(rec);
  if (!laborPick.ok) {
    if (laborPick.conflict) {
      return exception(
        ["CONFLICTING_EVIDENCE", "MISSING_LABOR_NORM"],
        nowMs,
        ["multiple conflicting HARD laborNorm quantities"],
        {
          workId,
          unit,
          evidenceKeyV1: rec.evidenceKeyV1,
          materialsEmpty: true,
          noMaterialNorm: true,
        },
      );
    }
    const soft = (rec.norms?.laborNorms || []).length === 0;
    return exception(
      soft ? ["MISSING_LABOR_NORM", "SOFT_ONLY"] : ["MISSING_LABOR_NORM"],
      nowMs,
      soft
        ? ["no laborNorms"]
        : ["laborNorms present but not HARD R / r-g / qty>0"],
      {
        workId,
        unit,
        evidenceKeyV1: rec.evidenceKeyV1,
        materialsEmpty: true,
        noMaterialNorm: true,
      },
    );
  }
  const labor = laborPick.labor;

  if (rec.unit && !unitsOk(unit, rec.unit)) {
    return exception(
      ["UNIT_MISMATCH", "INVALID_UNIT"],
      nowMs,
      [`line unit=${unit} evidence unit=${rec.unit}`],
      {
        workId,
        unit,
        evidenceKeyV1: rec.evidenceKeyV1,
        laborNorm: labor,
        materialsEmpty: true,
        noMaterialNorm: true,
      },
    );
  }

  return {
    decisionId: LABOR_ONLY_AUTO_BOM_V1_DECISION_ID,
    ruleId: LABOR_ONLY_AUTO_BOM_V1_RULE_ID,
    policyVersion: LABOR_ONLY_AUTO_BOM_V1_POLICY_VERSION,
    decision: "LABOR_ONLY_AUTO_BOM_ACCEPT",
    reasons: [],
    evaluatedAtIso: isoNow(nowMs),
    workId,
    unit,
    evidenceKeyV1: rec.evidenceKeyV1,
    laborNorm: labor,
    noMaterialNorm: true,
    materialsEmpty: true,
    auditWhy: [
      "HARD laborNorm + explicit NO_MATERIAL_NORM + empty materialNorms",
      `evidenceKeyV1=${rec.evidenceKeyV1}`,
      `labor=${labor.quantity} ${labor.unit}`,
    ],
    ownerRuntimeDependency: 0,
    invent: false,
  };
}

/** Convenience predicate for Orchestra / Position Cost / ATESD. */
export function isLaborOnlyAutoBomV1Eligible(
  workId: string,
  opts?: {
    unit?: string;
    discoveryStore?: KnrDiscoveryEvidenceStore | null;
    nowMs?: number;
  },
): boolean {
  const unit = String(opts?.unit || "").trim();
  // Unit may be unknown at classify-only call sites — use evidence unit when absent.
  if (!opts?.discoveryStore) return false;
  if (!unit) {
    const looked = lookupLaborOnlyAutoBomV1Evidence(workId, opts.discoveryStore);
    if (!looked.record?.unit) return false;
    const r = evaluateLaborOnlyAutoBomV1Contract({
      workId,
      unit: looked.record.unit,
      discoveryStore: opts.discoveryStore,
      nowMs: opts.nowMs,
    });
    return r.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT";
  }
  return (
    evaluateLaborOnlyAutoBomV1Contract({
      workId,
      unit,
      discoveryStore: opts.discoveryStore,
      nowMs: opts.nowMs,
    }).decision === "LABOR_ONLY_AUTO_BOM_ACCEPT"
  );
}
