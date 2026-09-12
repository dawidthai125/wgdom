/**
 * Autonomous Identity Discovery Adapter (AIDISC-v1)
 *
 * Thin evidence provider for CIE → CIV → AIR-v2.
 * NOT a second Identity Engine / AIR / Orchestra / Catalog.
 *
 * Emits leaf candidates with provenance from existing sources:
 *   - Identity Bridge similarWorks (elevated only under gates)
 *   - Work Catalog semantic scan (unit + description compatibility)
 *   - Optional historical validated index (when caller supplies)
 *
 * NEVER: invent workId · Accept · persist · OUR RATE · BOM · PM · Owner stop
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { KnrCatalogStore } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";
import {
  buildKnrWcIdentityProposals,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge";
import { OWNER_KNR_MAPPINGS } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { isForbiddenLegacyBucketWorkId } from "@/lib/work-catalog/work-rate-identity-mapping";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import type { ValidatedEvidenceRecord } from "@/lib/work-catalog/compound-identity-candidate-validation";
import type { HistoricalExecutedIndex } from "@/lib/intelligent-estimator/historical-executed/historical-executed-types";
import { lookupHistoricalExecuted } from "@/lib/intelligent-estimator/historical-executed/historical-executed-lookup";

export const AUTONOMOUS_IDENTITY_DISCOVERY_VERSION = "AIDISC-v1" as const;
export const AUTONOMOUS_IDENTITY_DISCOVERY_KIND = "AUTONOMOUS_IDENTITY_DISCOVERY" as const;

const BRIDGE_SCORE_MIN = 0.45;
const BRIDGE_MARGIN_MIN = 0.12;
const SEMANTIC_SCORE_MIN = 0.4;
const MAX_CANDIDATES = 8;

export type IdentityDiscoveryCandidate = {
  workId: string;
  source:
    | "KNR_WC_BRIDGE_SIMILAR"
    | "CATALOG_SEMANTIC"
    | "HISTORICAL_VALIDATED"
    | "OWNER_KNR_MAPPING"
    /** ACLC-v1 canonical leaf id matching family+code+unit — not mere name similarity. */
    | "ACLC_CANONICAL";
  score: number;
  unitCompatible: boolean;
  classificationCompatible: boolean;
  descriptionCompatible: boolean;
  evidenceStrength: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  provenance: string;
  rationale: string;
  mayContributeToTrusted: boolean;
};

export type DiscoverIdentityLeafCandidatesInput = {
  parentWorkId: string;
  store?: WorkCatalogStore | null;
  descriptions?: string[];
  unit?: string;
  knrCatalogStore?: KnrCatalogStore | null;
  nowIso?: string;
  /** Optional — when absent, historical path is skipped (no invent). */
  historicalIndex?: HistoricalExecutedIndex | null;
  lineId?: string;
};

export type DiscoverIdentityLeafCandidatesResult = {
  version: typeof AUTONOMOUS_IDENTITY_DISCOVERY_VERSION;
  discoveryKind: typeof AUTONOMOUS_IDENTITY_DISCOVERY_KIND;
  discoveryRan: true;
  parentWorkId: string;
  knrTokens: string[];
  candidates: IdentityDiscoveryCandidate[];
  rankedWorkIds: string[];
  clearWinnerWorkId: string | null;
  nearTie: boolean;
  evidenceRecords: ValidatedEvidenceRecord[];
  providersAttempted: string[];
  inventUsed: false;
  productionMutation: false;
};

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Parse ACLC deterministic id: cw.knr.{familySlug}.{tableCode}.{unit} */
export function parseAutonomousCanonicalKnrWorkId(workId: string): {
  familySlug: string;
  tableCode: string;
  unit: string;
} | null {
  const m = /^cw\.knr\.([a-z0-9-]+)\.(\d{3,4}-\d{2})\.([a-z0-9]+)$/i.exec(
    String(workId || "").trim(),
  );
  if (!m) return null;
  return {
    familySlug: m[1]!.toLowerCase(),
    tableCode: m[2]!.toLowerCase(),
    unit: m[3]!.toLowerCase(),
  };
}

function extractKnrLikeTokens(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text || "").matchAll(/\b(\d{3,4}-\d{2})\b/g)) out.add(m[1]!.toLowerCase());
  for (const m of String(text || "").matchAll(/\b(55-01|G177)\b/gi)) {
    out.add(m[1]!.toUpperCase());
  }
  return [...out];
}

function tokenize(text: string): Set<string> {
  return new Set(
    soft(text)
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length >= 4),
  );
}

function isRejectLeafTarget(workId: string, parentWorkId: string): boolean {
  const id = String(workId || "").trim();
  if (!id) return true;
  if (id === "0" || id === "null" || id === "undefined") return true;
  if (/^\d+$/.test(id) && id.length < 3) return true;
  if (id === parentWorkId) return true;
  if (id.startsWith("legacy-")) return true;
  if (id.startsWith("cw.inv.")) return true;
  if (id.startsWith("cw.product.")) return true;
  if (id.startsWith("proposal:")) return true;
  if (isForbiddenLegacyBucketWorkId(id)) return true;
  return false;
}

function unitOk(candidateUnit: string, lineUnit: string): boolean {
  const a = normalizeWorkRateUnitToken(candidateUnit);
  const b = normalizeWorkRateUnitToken(lineUnit);
  return Boolean(a) && Boolean(b) && a === b;
}

function semanticScore(descTokens: Set<string>, workId: string, namePl: string): number {
  if (descTokens.size === 0) return 0;
  const hay = tokenize(`${workId} ${namePl}`);
  if (hay.size === 0) return 0;
  let hit = 0;
  for (const t of descTokens) {
    let matched = false;
    for (const h of hay) {
      if (h === t || (t.length >= 5 && h.includes(t)) || (h.length >= 5 && t.includes(h))) {
        matched = true;
        break;
      }
      // light stem: shared prefix ≥5 (gladzie/gladzenie, gipsowe/gipsowych)
      if (t.length >= 5 && h.length >= 5 && t.slice(0, 5) === h.slice(0, 5)) {
        matched = true;
        break;
      }
    }
    if (matched) hit += 1;
  }
  return hit / descTokens.size;
}

function rankAndPick(cands: IdentityDiscoveryCandidate[]): {
  ranked: IdentityDiscoveryCandidate[];
  clearWinner: IdentityDiscoveryCandidate | null;
  nearTie: boolean;
} {
  const byId = new Map<string, IdentityDiscoveryCandidate>();
  for (const c of cands) {
    const prev = byId.get(c.workId);
    if (!prev) {
      byId.set(c.workId, c);
      continue;
    }
    // Prefer ACLC canonical bind over bridge/semantic for same workId (authority of encoded KNR id).
    if (c.source === "ACLC_CANONICAL" && prev.source !== "ACLC_CANONICAL") {
      byId.set(c.workId, c);
      continue;
    }
    if (prev.source === "ACLC_CANONICAL" && c.source !== "ACLC_CANONICAL") continue;
    if (c.score > prev.score) byId.set(c.workId, c);
  }
  const ranked = [...byId.values()]
    .filter((c) => c.unitCompatible)
    .sort((a, b) => b.score - a.score || a.workId.localeCompare(b.workId))
    .slice(0, MAX_CANDIDATES);

  if (ranked.length === 0) return { ranked, clearWinner: null, nearTie: false };
  if (ranked.length === 1) return { ranked, clearWinner: ranked[0]!, nearTie: false };
  const a = ranked[0]!;
  const b = ranked[1]!;
  if (a.score - b.score >= BRIDGE_MARGIN_MIN && a.score >= SEMANTIC_SCORE_MIN) {
    return { ranked, clearWinner: a, nearTie: false };
  }
  return { ranked, clearWinner: null, nearTie: true };
}

/**
 * Discover identity leaf candidates from existing RO sources.
 */
export function discoverIdentityLeafCandidates(
  input: DiscoverIdentityLeafCandidatesInput,
): DiscoverIdentityLeafCandidatesResult {
  const parentWorkId = String(input.parentWorkId || "").trim();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const unit = String(input.unit || "m2").trim() || "m2";
  const descriptions = (input.descriptions || []).map((d) => String(d || "").trim()).filter(Boolean);
  const blob = descriptions.join(" ");
  const knrTokens = [...new Set(descriptions.flatMap(extractKnrLikeTokens))];
  const descTokens = tokenize(blob || parentWorkId);
  const providersAttempted: string[] = [];
  const raw: IdentityDiscoveryCandidate[] = [];

  let works: { id: string; namePl: string; unit: string; tradeId?: string; active: boolean }[] = [];
  if (input.store) {
    try {
      works = listActiveWorksForRegion(input.store, input.store.activeRegion)
        .filter((w) => w.active !== false)
        .map((w) => ({
          id: w.id,
          namePl: w.namePl,
          unit: String(w.unit),
          tradeId: w.tradeId,
          active: true,
        }));
    } catch {
      works = [];
    }
  }

  // --- OWNER_KNR_MAPPINGS (existing authority table — evidence only) ---
  providersAttempted.push("OWNER_KNR_MAPPINGS");
  for (const row of OWNER_KNR_MAPPINGS) {
    if (!row.active || !row.ownerApproval) continue;
    const key = soft(row.normalizedKey);
    const hit = knrTokens.some(
      (t) => key.includes(soft(t)) || soft(t).includes(key.split("|").pop() || ""),
    );
    if (!hit) continue;
    if (isRejectLeafTarget(row.workId, parentWorkId)) continue;
    if (!unitOk(row.catalogUnit, unit)) continue;
    raw.push({
      workId: row.workId,
      source: "OWNER_KNR_MAPPING",
      score: 0.95,
      unitCompatible: true,
      classificationCompatible: true,
      descriptionCompatible: true,
      evidenceStrength: "HIGH",
      provenance: `OWNER_KNR_MAPPINGS:${row.mappingId}`,
      rationale: `Owner KNR map ${row.normalizedKey} → ${row.workId}`,
      mayContributeToTrusted: false,
    });
  }

  // --- Identity Bridge similarWorks (existing bridge — elevate under gates) ---
  providersAttempted.push("KNR_WC_IDENTITY_BRIDGE");
  if (knrTokens.length > 0 && works.length > 0) {
    const keys = knrTokens.map((t) => ({
      normalizedKey: t.includes("|") ? t : `TENDER||${t}`,
      tableCode: t,
      unitRaw: unit,
      displayCode: t,
      officialNamePl: descriptions[0] || null,
      descriptionPl: blob.slice(0, 240) || null,
    }));
    const batch = buildKnrWcIdentityProposals({
      tenderId: `aidisc:${parentWorkId}`,
      keys,
      catalogStore: input.knrCatalogStore ?? null,
      works,
      ownerMappings: OWNER_KNR_MAPPINGS,
      featureEnabled: true,
    });
    for (const p of batch.proposals) {
      for (const s of p.similarWorks || []) {
        if (s.score < BRIDGE_SCORE_MIN) continue;
        if (isRejectLeafTarget(s.workId, parentWorkId)) continue;
        const uOk = unitOk(s.unit, unit);
        if (!uOk) continue;
        raw.push({
          workId: s.workId,
          source: "KNR_WC_BRIDGE_SIMILAR",
          score: s.score,
          unitCompatible: true,
          classificationCompatible: true,
          descriptionCompatible: s.score >= BRIDGE_SCORE_MIN,
          evidenceStrength: s.score >= 0.55 ? "MEDIUM" : "LOW",
          provenance: `knr-wc-bridge-similar:${p.normalizedKey}:${s.workId}`,
          rationale: `Bridge similarWorks ${p.displayCode} → ${s.workId} score=${s.score} (evidence; not authority alone)`,
          mayContributeToTrusted: false,
        });
      }
    }
  }

  // --- Catalog semantic scan (existing WC rows only) ---
  providersAttempted.push("WORK_CATALOG_SEMANTIC");
  for (const w of works) {
    if (isRejectLeafTarget(w.id, parentWorkId)) continue;
    if (!unitOk(w.unit, unit)) continue;
    const aclcParsed = parseAutonomousCanonicalKnrWorkId(w.id);
    const score = semanticScore(descTokens, w.id, w.namePl);

    // ACLC canonical leaf: id encodes family+code+unit — bind when KNR token matches.
    if (
      aclcParsed
      && knrTokens.some((t) => soft(t) === soft(aclcParsed.tableCode))
      && unitOk(aclcParsed.unit, unit)
    ) {
      const descBoost = score >= 0.25 ? score : 0.55;
      raw.push({
        workId: w.id,
        source: "ACLC_CANONICAL",
        score: Math.max(descBoost, 0.72),
        unitCompatible: true,
        classificationCompatible: true,
        descriptionCompatible: score >= 0.25 || descTokens.size === 0,
        evidenceStrength: score >= 0.45 ? "HIGH" : "MEDIUM",
        provenance: `aclc-canonical-leaf:${w.id}`,
        rationale: `ACLC canonical Work Catalog leaf ${w.id} matches KNR token ${aclcParsed.tableCode} + unit (not invent; not name-only)`,
        mayContributeToTrusted: true,
      });
      continue;
    }

    if (score < SEMANTIC_SCORE_MIN) continue;
    raw.push({
      workId: w.id,
      source: "CATALOG_SEMANTIC",
      score,
      unitCompatible: true,
      classificationCompatible: true,
      descriptionCompatible: score >= SEMANTIC_SCORE_MIN,
      evidenceStrength: score >= 0.6 ? "MEDIUM" : "LOW",
      provenance: `work-catalog-semantic:${w.id}`,
      rationale: `Catalog semantic overlap score=${Math.round(score * 1000) / 1000} for ${w.id}`,
      mayContributeToTrusted: false,
    });
  }

  // --- Historical validated (optional index) ---
  if (input.historicalIndex) {
    providersAttempted.push("HISTORICAL_VALIDATED_REUSE");
    const hist = lookupHistoricalExecuted(
      {
        lineId: input.lineId || parentWorkId,
        description: blob || null,
        identityKeyV2: null,
        catalogBasis: null,
      },
      input.historicalIndex,
    );
    if (
      hist.kind === "HISTORICAL_EXACT_RMS" ||
      hist.kind === "HISTORICAL_EXACT"
    ) {
      // Historical returns KNR/display evidence — not WC leaf id. Record as metadata cue only.
      // Leaf bind still requires catalog/bridge/alias — no invent from history alone.
    }
  }

  const { ranked, clearWinner, nearTie } = rankAndPick(
    raw.filter((c) => !isRejectLeafTarget(c.workId, parentWorkId)),
  );

  const evidenceRecords: ValidatedEvidenceRecord[] = [];

  // Discovery-ran marker (always) — proves provider executed beyond CIV deepen-only
  evidenceRecords.push({
    source: AUTONOMOUS_IDENTITY_DISCOVERY_VERSION,
    sourceType: "DESCRIPTION_TOKEN",
    provenance: `aidisc:${parentWorkId}`,
    identityMethod: "AUTONOMOUS_IDENTITY_DISCOVERY_RAN",
    evidenceStrength: "NONE",
    mayContributeToTrusted: false,
    trusted: false,
    workId: null,
    relation: "METADATA",
    rationale: `AIDISC-v1 ran providers=[${providersAttempted.join(",")}] candidates=${ranked.length} nearTie=${nearTie}`,
    observedAt: nowIso,
    freshness: "discovery",
  });

  if (nearTie) {
    evidenceRecords.push({
      source: AUTONOMOUS_IDENTITY_DISCOVERY_VERSION,
      sourceType: "WORK_CATALOG",
      provenance: `aidisc:near-tie:${parentWorkId}`,
      identityMethod: "DISCOVERY_NEAR_TIE",
      evidenceStrength: "LOW",
      mayContributeToTrusted: false,
      trusted: false,
      workId: null,
      relation: "METADATA",
      rationale: `Near-tie among ${ranked
        .slice(0, 3)
        .map((c) => `${c.workId}:${c.score}`)
        .join(",")} — MORE_RESEARCH / no arbitrary pick`,
      observedAt: nowIso,
      freshness: "NEAR_TIE",
    });
  }

  for (const c of ranked) {
    const isClear =
      clearWinner?.workId === c.workId &&
      (c.source === "KNR_WC_BRIDGE_SIMILAR" || c.source === "OWNER_KNR_MAPPING") &&
      knrTokens.length > 0 &&
      c.score >= BRIDGE_SCORE_MIN;

    if (c.source === "OWNER_KNR_MAPPING") {
      evidenceRecords.push({
        source: c.provenance,
        sourceType: "OWNER_KNR_MAPPING",
        provenance: c.provenance,
        identityMethod: "OWNER_APPROVED_KNR_LINE_MAP",
        evidenceStrength: c.evidenceStrength,
        mayContributeToTrusted: false,
        trusted: false,
        workId: c.workId,
        relation: "LEAF_CANDIDATE",
        rationale: c.rationale,
        observedAt: nowIso,
        freshness: "owner_table",
      });
      continue;
    }

    if (c.source === "KNR_WC_BRIDGE_SIMILAR") {
      // Elevate bridge similar → KNR_WC_BRIDGE leaf only for clear winner + KNR token
      evidenceRecords.push({
        source: c.provenance,
        sourceType: "KNR_WC_BRIDGE",
        provenance: c.provenance,
        identityMethod: isClear
          ? "BRIDGE_SIMILAR_CLEAR_WINNER"
          : "BRIDGE_SIMILAR_CANDIDATE",
        evidenceStrength: isClear ? "MEDIUM" : "LOW",
        mayContributeToTrusted: false,
        trusted: false,
        workId: isClear ? c.workId : nearTie ? null : c.workId,
        relation: isClear || (!nearTie && ranked.length === 1) ? "LEAF_CANDIDATE" : "METADATA",
        rationale: c.rationale,
        observedAt: nowIso,
        freshness: `bridge_score:${c.score}`,
      });
      continue;
    }

    if (c.source === "ACLC_CANONICAL") {
      const clearAclc =
        clearWinner?.workId === c.workId || (!nearTie && ranked.filter((x) => x.source === "ACLC_CANONICAL").length === 1);
      evidenceRecords.push({
        source: c.provenance,
        sourceType: "WORK_CATALOG",
        provenance: c.provenance,
        identityMethod: "ACLC_CANONICAL_LEAF_BIND",
        evidenceStrength: c.evidenceStrength,
        mayContributeToTrusted: true,
        trusted: false,
        workId: clearAclc ? c.workId : nearTie ? null : c.workId,
        relation: clearAclc || !nearTie ? "LEAF_CANDIDATE" : "METADATA",
        rationale: c.rationale,
        observedAt: nowIso,
        freshness: `aclc:${c.score}`,
      });
      continue;
    }

    // Catalog semantic — weak alone (name similarity ≠ authority). METADATA only.
    evidenceRecords.push({
      source: c.provenance,
      sourceType: "WORK_CATALOG",
      provenance: c.provenance,
      identityMethod: "CATALOG_SEMANTIC_DISCOVERY",
      evidenceStrength: c.evidenceStrength,
      mayContributeToTrusted: false,
      trusted: false,
      workId: null,
      relation: "METADATA",
      rationale: `${c.rationale} (semantic alone ≠ leaf authority; cross-source required)`,
      observedAt: nowIso,
      freshness: `semantic:${c.score}`,
    });
  }

  if (ranked.length === 0 && knrTokens.length > 0) {
    evidenceRecords.push({
      source: AUTONOMOUS_IDENTITY_DISCOVERY_VERSION,
      sourceType: "KNR_CATALOG",
      provenance: `aidisc:no-leaf:${knrTokens.join(",")}`,
      identityMethod: "KNR_TOKEN_NO_LEGAL_LEAF",
      evidenceStrength: "NONE",
      mayContributeToTrusted: false,
      trusted: false,
      workId: null,
      relation: "TOKEN",
      rationale: `KNR token(s) ${knrTokens.join(",")} present but no legal non-legacy catalog leaf after AIDISC (COVERAGE — not invent)`,
      observedAt: nowIso,
      freshness: "NO_LEAF",
    });
  }

  return {
    version: AUTONOMOUS_IDENTITY_DISCOVERY_VERSION,
    discoveryKind: AUTONOMOUS_IDENTITY_DISCOVERY_KIND,
    discoveryRan: true,
    parentWorkId,
    knrTokens,
    candidates: ranked,
    rankedWorkIds: ranked.map((c) => c.workId),
    clearWinnerWorkId: clearWinner?.workId ?? null,
    nearTie,
    evidenceRecords,
    providersAttempted,
    inventUsed: false,
    productionMutation: false,
  };
}
