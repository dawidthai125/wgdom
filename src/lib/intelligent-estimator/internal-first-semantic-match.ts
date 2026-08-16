/**
 * P5.25-FIX — INTERNAL-FIRST semantic catalog match (domain → unit → context → similarity).
 *
 * Does NOT increase aggressiveness.
 * Match score without domain compatibility = INVALID.
 *
 * Pure · ZERO HTTP · ZERO Accept · ZERO invent.
 */

import {
  domainToLayerLabel,
  domainsCompatibleForFinalPriceReuse,
  internalFirstSearchLayers,
  normalizeInternalFirstDomain,
  type InternalFirstPriceDomain,
} from "./internal-first-domain";
import { hostObjectSafetyGate } from "./internal-first-host-safety";
import {
  actionContextCompatible,
  mapInternalFirstUnit,
  softInternalFirstText,
  tokensInternalFirst,
  unitsCompatibleInternalFirst,
} from "./internal-first-text";

export type InternalFirstMatchConfidence = "HIGH" | "MEDIUM" | "LOW";

export type InternalFirstCatalogRow = {
  id: string;
  namePl: string;
  unit: string;
  /** Classified domain of catalog row */
  classHint: InternalFirstPriceDomain | string;
  base: number | null;
  baseKind?: string | null;
  keywords?: string[];
  descriptionPl?: string;
  /** Raw work for legacy host checks */
  work?: { id?: string; namePl?: string; keywords?: string[]; descriptionPl?: string };
};

export type SemanticScoreResult = {
  score: number;
  overlap: string[];
  confidence: InternalFirstMatchConfidence;
  catClass: InternalFirstPriceDomain;
  reject?: string;
};

export type InternalFirstLookupResult = {
  outcome: "INTERNAL_EXACT_HIT" | "INTERNAL_SEMANTIC_HIT" | "NO_INTERNAL_MATCH";
  confidence: InternalFirstMatchConfidence;
  match: InternalFirstCatalogRow | null;
  scored: SemanticScoreResult | null;
  layer: "MATERIAL" | "LABOR" | "PACKAGE" | null;
  note: string;
};

function soft(s: unknown): string {
  return softInternalFirstText(s);
}

/**
 * Score after domain + unit + action gates.
 * Domain incompatibility → score 0 + reject (INVALID regardless of token overlap).
 */
export function scoreInternalFirstSemantic(args: {
  queryDesc: string;
  candidate: InternalFirstCatalogRow;
  sourceDomain: InternalFirstPriceDomain | string;
}): SemanticScoreResult {
  const sourceDomain = normalizeInternalFirstDomain(args.sourceDomain);
  const catClass = normalizeInternalFirstDomain(args.candidate.classHint);
  const work = args.candidate.work || args.candidate;
  const namePl = String(work.namePl || args.candidate.namePl || "");
  const qTok = tokensInternalFirst(args.queryDesc);
  const wTok = tokensInternalFirst(
    `${namePl} ${(work.keywords || args.candidate.keywords || []).join(" ")} ${
      work.descriptionPl || args.candidate.descriptionPl || ""
    }`,
  );
  const overlap =
    qTok.length && wTok.length
      ? qTok.filter(
          (t) =>
            wTok.includes(t) ||
            wTok.some((w) => w.startsWith(t) || t.startsWith(w)),
        )
      : [];

  const domainGate = domainsCompatibleForFinalPriceReuse(sourceDomain, catClass);
  if (!domainGate.compatible) {
    return {
      score: 0,
      overlap,
      confidence: "LOW",
      catClass,
      reject: domainGate.reasonCode,
    };
  }

  const actionGate = actionContextCompatible(args.queryDesc, namePl, sourceDomain);
  if (!actionGate.ok) {
    return {
      score: 0,
      overlap,
      confidence: "LOW",
      catClass,
      reject: actionGate.reasonCode,
    };
  }

  const workId = String(work.id || args.candidate.id || "");
  // P5.26-E — host object / paint-type safety (QUALITY > COVERAGE)
  const hostGate = hostObjectSafetyGate({
    queryDesc: args.queryDesc,
    candidateId: workId,
    candidateName: namePl,
  });
  if (!hostGate.ok) {
    return {
      score: 0,
      overlap,
      confidence: "LOW",
      catClass,
      reject: hostGate.reasonCode || "HOST_OBJECT_UNSAFE",
    };
  }

  // P5.26-E: emulsja stem alignment (emulsja ↔ emulsyjnymi) — only after host gate OK
  const qSoftFull = soft(args.queryDesc);
  const nSoftFull = soft(namePl);
  let overlapEff = overlap;
  if (qSoftFull.includes("emuls") && nSoftFull.includes("emuls") && !overlap.some((t) => t.startsWith("emuls"))) {
    overlapEff = [...overlap, "emuls"];
  }

  if (!qTok.length || !wTok.length) {
    return { score: 0, overlap: overlapEff, confidence: "LOW", catClass, reject: "NO_TOKENS" };
  }

  const ratio = overlapEff.length / Math.min(qTok.length, 8);

  // Reject generic legacy category hosts as semantic matches
  if (
    /^legacy-/.test(workId) ||
    (/\([a-z0-9]+\)$/i.test(namePl) &&
      /elektryka|hydraulika|roboty|malowanie|glazura/i.test(namePl) &&
      namePl.length < 40)
  ) {
    if (overlapEff.length < 3) {
      return {
        score: 0,
        overlap: overlapEff,
        confidence: "LOW",
        catClass,
        reject: "legacy-category-host",
      };
    }
  }

  // Same-domain bonus only (no PACKAGE↔LABOR bonus)
  let domainBonus = 0;
  if (sourceDomain === catClass) domainBonus = 0.15;

  const score = ratio + domainBonus + (overlapEff.length >= 2 ? 0.1 : 0);
  let confidence: InternalFirstMatchConfidence = "LOW";
  if (score >= 0.72 && overlapEff.length >= 2) confidence = "HIGH";
  else if (score >= 0.45 && overlapEff.length >= 2) confidence = "MEDIUM";
  return { score, overlap: overlapEff, confidence, catClass };
}

/** Owner Knowledge MEDIUM whitelist — equivalence confirmed (not auto-price invent). */
function mediumOwnerKnowledgeOk(queryDesc: string, candidateName: string): boolean {
  const q = soft(queryDesc);
  const n = soft(candidateName);
  // P5.26-E: do not treat bare «malowanie» as Owner Knowledge for emulsja hosts
  const malowanieOk =
    /malowan/.test(q) &&
    /malowan/.test(n) &&
    (!/emuls/.test(n) || /emuls/.test(q)) &&
    !/wapienn|wapno|klejow|olejn|lakier|stolark|elewacyjn/.test(q);
  // P5.26-E: montaż grzejnika ≠ głowica/termostat
  const grzejnikOk =
    /montaz grzejnik/.test(q) &&
    /montaz grzejnik/.test(n) &&
    !/glowic|termostat|zawor termostat|regulator/.test(q);
  return (
    (/podejsc/.test(q) && /podejsc/.test(n)) ||
    (/bateri/.test(q) && /bateri/.test(n) && /wymiana|montaz/.test(q) && /wymiana|montaz/.test(n)) ||
    malowanieOk ||
    (/wykucie bruzd/.test(q) && /wykucie bruzd/.test(n)) ||
    (/gniazd/.test(q) && /gniazd/.test(n) && /montaz/.test(q) && /montaz/.test(n)) ||
    (/montaz gniazd/.test(q) && /montaz gniazd/.test(n)) ||
    (/wymiana ustep|ustepu/.test(q) && /ustep/.test(n)) ||
    (/izolac.*otulin|otulinami/.test(q) && /otulin|izolac/.test(n)) ||
    grzejnikOk ||
    (/rurociag|rurociąg/.test(q) && /rurociag|pcw|pcv/.test(n) && /montaz/.test(q))
  );
}

/**
 * INTERNAL-FIRST lookup: exact → semantic (same domain only) → NO_INTERNAL_MATCH.
 * No MATERIAL fallthrough for PACKAGE. No LABOR fallthrough for PACKAGE.
 */
export function lookupInternalFirst(args: {
  description: string;
  unit: string;
  sourceDomain: InternalFirstPriceDomain | string;
  index: InternalFirstCatalogRow[];
}): InternalFirstLookupResult {
  const domain = normalizeInternalFirstDomain(args.sourceDomain);
  const unit = mapInternalFirstUnit(args.unit);
  const desc = args.description || "";
  const softDesc = soft(desc);

  if (domain === "NON_COST" || domain === "UNKNOWN") {
    return {
      outcome: "NO_INTERNAL_MATCH",
      confidence: "LOW",
      match: null,
      scored: null,
      layer: null,
      note: domain === "NON_COST" ? "NON_COST" : "UNKNOWN_DOMAIN",
    };
  }

  const exactCandidates = args.index.filter((row) => {
    if (!unitsCompatibleInternalFirst(unit, row.unit)) return false;
    if (!domainsCompatibleForFinalPriceReuse(domain, row.classHint).compatible) return false;
    const softName = soft(row.namePl);
    return softName === softDesc || (softName.includes(softDesc.slice(0, 40)) && softDesc.length > 20);
  });

  for (const row of exactCandidates) {
    if (row.base != null && row.base > 0 && soft(row.namePl) === softDesc) {
      return {
        outcome: "INTERNAL_EXACT_HIT",
        confidence: "HIGH",
        match: row,
        scored: null,
        layer: domainToLayerLabel(normalizeInternalFirstDomain(row.classHint)),
        note: "exact name+unit+domain",
      };
    }
  }

  const layers = internalFirstSearchLayers(domain);
  let best: { row: InternalFirstCatalogRow; scored: SemanticScoreResult } | null = null;

  for (const layerDomain of layers) {
    for (const row of args.index) {
      if (!unitsCompatibleInternalFirst(unit, row.unit)) continue;
      if (row.base == null || !(row.base > 0)) continue;
      if (normalizeInternalFirstDomain(row.classHint) !== layerDomain) continue;

      const scored = scoreInternalFirstSemantic({
        queryDesc: desc,
        candidate: row,
        sourceDomain: domain,
      });
      if (scored.reject) continue;
      if (!best || scored.score > best.scored.score) best = { row, scored };
    }
    if (best && best.scored.confidence === "HIGH") break;
  }

  if (!best || best.scored.confidence === "LOW") {
    return {
      outcome: "NO_INTERNAL_MATCH",
      confidence: best?.scored?.confidence || "LOW",
      match: best?.row || null,
      scored: best?.scored || null,
      layer: null,
      note: best?.scored?.reject || "no HIGH/MEDIUM semantic with price",
    };
  }

  if (best.scored.confidence === "MEDIUM") {
    if (!mediumOwnerKnowledgeOk(desc, best.row.namePl)) {
      return {
        outcome: "NO_INTERNAL_MATCH",
        confidence: "MEDIUM",
        match: best.row,
        scored: best.scored,
        layer: domainToLayerLabel(normalizeInternalFirstDomain(best.row.classHint)),
        note: "MEDIUM without Owner Knowledge — external eligible",
      };
    }
  }

  return {
    outcome: "INTERNAL_SEMANTIC_HIT",
    confidence: best.scored.confidence,
    match: best.row,
    scored: best.scored,
    layer: domainToLayerLabel(normalizeInternalFirstDomain(best.row.classHint)),
    note: `semantic ${domainToLayerLabel(normalizeInternalFirstDomain(best.row.classHint))} overlap=${(best.scored.overlap || []).join(",")}`,
  };
}

/** Convenience for false-positive regression: domain gate only. */
export function wouldRejectCrossDomainPriceReuse(
  sourceDomain: string,
  candidateDomain: string,
): boolean {
  return !domainsCompatibleForFinalPriceReuse(sourceDomain, candidateDomain).compatible;
}
