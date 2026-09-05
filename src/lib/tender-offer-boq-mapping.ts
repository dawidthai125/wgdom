/**
 * AI-COST-01 / COST-S2 — OfferBoq Mapping Engine (pure).
 * Semantyczne dopasowanie pozycji przedmiaru → Work Catalog — bez wyceny.
 */

import {
  classifyAthLineCategory,
  foldPolishText,
} from "@/lib/wgdom-ath-classifier";
import {
  defaultWgdomCostCatalog,
  findCategoryDef,
  normalizeWgdomCostUnit,
  type WgdomCostCatalog,
  type WgdomCostCategoryId,
} from "@/lib/wgdom-cost-catalog";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { TRADE_LABELS_PL, type TradeId, isTradeId } from "@/lib/work-catalog/trades";
import { listTradeIdsForLegacyCategory } from "@/lib/work-catalog/work-catalog-engine-adapter";
import {
  computeOfferBoqRecomputeToken,
  type OfferBoqConfidence,
  type OfferBoqDocument,
  type OfferBoqLine,
  type OfferBoqMatchCandidate,
  type OfferBoqMatchCandidateRole,
  type OfferBoqMatchedBy,
  type OfferBoqMatchMethod,
  type OfferBoqMappingStats,
} from "@/lib/tender-offer-boq";
import { prepareOfferBoqLineForMapping } from "@/lib/catalog-coverage/noise-filter";
import { normalizeOfferBoqDescription } from "@/lib/catalog-coverage/normalize-description";
import { resolveCatalogCoverageAlias } from "@/lib/catalog-coverage/alias-resolver";
import {
  isCatalogWave2OutBizHay,
  isCatalogWave2ProductId,
} from "@/lib/catalog-coverage/alias-pack-wave2";
import { decideCatalogCoverageBindProductId } from "@/lib/catalog-coverage/negation-guard";
import { isInvoicePurchaseCatalogWorkId } from "@/lib/price-intelligence/invoice-purchase-host";
import { preserveOfferBoqLineIfTrusted } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";
import { areOfferBoqUnitFamiliesCompatible } from "@/lib/tender-offer-boq-unit-family";
import { areOfferBoqObjectsCompatible } from "@/lib/tender-offer-boq-object-consistency";
import { filterOfferBoqLtuAdmission } from "@/lib/tender-offer-boq-ltu-admission";

const CANDIDATE_LIMIT = 4;

/** Re-export P1 / P2 / L+T+U admission gates for focused tests / REUSE. */
export { areOfferBoqUnitFamiliesCompatible } from "@/lib/tender-offer-boq-unit-family";
export { areOfferBoqObjectsCompatible } from "@/lib/tender-offer-boq-object-consistency";
export {
  filterOfferBoqLtuAdmission,
  offerBoqHasSemanticSignal,
  offerBoqIsStructuralLtuOnly,
} from "@/lib/tender-offer-boq-ltu-admission";
export type { OfferBoqLtuScoreSignals } from "@/lib/tender-offer-boq-ltu-admission";


export interface OfferBoqMappingContext {
  /** Aktywne roboty z Work Catalog (region). */
  works: CatalogWork[];
  /** Legacy catalog pod classifyAthLineCategory (keywords). */
  costCatalog?: WgdomCostCatalog;
  /** Kontekst dokumentu (np. nazwa pliku) — do rationale. */
  documentContext?: string | null;
  mappedAt?: string;
  /**
   * CENY-MATERIAŁÓW-01 · CM-1 — uplift aliasów (stolarka / oddymianie / SSP).
   * Tylko za Feature Flag; OFF ⇒ scorowanie tip-parity.
   */
  cenyMaterialowUplift?: boolean;
}

/** Alias boosts — wyłącznie gdy `cenyMaterialowUplift` (CM-1). */
const CM01_ALIAS_RULES: ReadonlyArray<{
  lineRe: RegExp;
  workRe: RegExp;
  boost: number;
  label: string;
}> = [
  {
    lineRe: /drzwi|stolark|osciez|przeciwpozar|ei\s*\d{2,3}/,
    workRe: /drzwi|stolark|przeciwpo|ei\d|montaz.*drzwi/,
    boost: 28,
    label: "stolarka/drzwi",
  },
  {
    lineRe: /oddym|klap.*dym|przycisk.*oddym|system.*oddym/,
    workRe: /oddym|dymow|klap|wentyl|oddymian/,
    boost: 28,
    label: "oddymianie",
  },
  {
    lineRe: /czujk|ssp|sygnalizac.*pozar|centrala.*pozar|hydrant/,
    workRe: /czujk|ssp|pozar|sygnaliz|hydrant|ppoz/,
    boost: 24,
    label: "SSP/ppoz",
  },
  {
    lineRe: /okn|stolark.*okien|witryn/,
    workRe: /okn|stolark|witryn|fasad/,
    boost: 22,
    label: "stolarka/okna",
  },
];

function applyCm01AliasBoost(opts: {
  hay: string;
  work: CatalogWork;
  score: number;
  hitPhrases: string[];
}): { score: number; hitPhrases: string[]; aliasHit: boolean } {
  const workHay = foldPolishText(
    [opts.work.namePl, opts.work.descriptionPl ?? "", ...(opts.work.keywords ?? [])].join(" "),
  );
  let score = opts.score;
  const hitPhrases = [...opts.hitPhrases];
  let aliasHit = false;
  for (const rule of CM01_ALIAS_RULES) {
    if (!rule.lineRe.test(opts.hay)) continue;
    if (!rule.workRe.test(workHay)) continue;
    score += rule.boost;
    aliasHit = true;
    if (hitPhrases.length < 6) hitPhrases.push(rule.label);
  }
  return { score, hitPhrases, aliasHit };
}

interface ScoredWork {
  work: CatalogWork;
  score: number;
  hitPhrases: string[];
  knrHit: boolean;
  unitHit: boolean;
  categoryHit: boolean;
  /** Trade match vs line category (+12) — structural T leg of L+T+U. */
  tradeHit: boolean;
  /** Keyword phrase hit (+12) — semantic V1. */
  keywordHit: boolean;
  /** Name token hit (+8) — semantic V1. */
  nameHit: boolean;
  /** Description token hit (+4) — semantic V1 (must be explicit; not in hitPhrases). */
  descHit: boolean;
  /** CM-1 alias hit (tylko przy uplift). */
  aliasHit?: boolean;
}

function normalizeKnrKey(raw: string | null | undefined): string {
  if (!raw) return "";
  return foldPolishText(raw).replace(/[^a-z0-9]/g, "");
}

function categoryLabelPl(
  categoryId: WgdomCostCategoryId,
  catalog: WgdomCostCatalog,
): string {
  if (categoryId === "UNKNOWN") return "Nieznana / do weryfikacji";
  return findCategoryDef(catalog, categoryId)?.labelPl ?? categoryId;
}

function tradeLabel(tradeId: string | null | undefined): string | null {
  if (!tradeId || !isTradeId(tradeId)) return null;
  return TRADE_LABELS_PL[tradeId as TradeId];
}

function workCategoryLabel(work: CatalogWork, catalog: WgdomCostCatalog): string {
  return (
    tradeLabel(work.tradeId) ??
    (work.legacyCategoryId
      ? categoryLabelPl(work.legacyCategoryId, catalog)
      : "Pozostałe")
  );
}

function confidenceFromScore(score: number, knrHit: boolean): OfferBoqConfidence {
  if (knrHit && score >= 90) return "high";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function scoreWorkAgainstLine(opts: {
  hay: string;
  unitNorm: string;
  knrKey: string;
  categoryId: WgdomCostCategoryId;
  work: CatalogWork;
  cenyMaterialowUplift?: boolean;
}): ScoredWork {
  const { hay, unitNorm, knrKey, categoryId, work } = opts;
  let score = 0;
  const hitPhrases: string[] = [];
  let knrHit = false;
  let unitHit = false;
  let categoryHit = false;
  let tradeHit = false;
  let keywordHit = false;
  let nameHit = false;
  let descHit = false;
  let aliasHit = false;

  if (knrKey) {
    const idKey = normalizeKnrKey(work.id);
    const nameKey = normalizeKnrKey(work.namePl);
    const kwHit = work.keywords.some((k) => normalizeKnrKey(k).includes(knrKey) || knrKey.includes(normalizeKnrKey(k)));
    if (
      (idKey && (idKey.includes(knrKey) || knrKey.includes(idKey))) ||
      (nameKey && nameKey.includes(knrKey)) ||
      kwHit
    ) {
      score += 100;
      knrHit = true;
      hitPhrases.push("KNR/katalog");
    }
  }

  if (work.legacyCategoryId && work.legacyCategoryId === categoryId && categoryId !== "UNKNOWN") {
    score += 40;
    categoryHit = true;
  }

  const trades = listTradeIdsForLegacyCategory(categoryId);
  if (trades.includes(work.tradeId)) {
    score += 12;
    tradeHit = true;
  }

  const workUnit = normalizeWgdomCostUnit(work.unit);
  if (unitNorm && workUnit && unitNorm === workUnit) {
    score += 25;
    unitHit = true;
    hitPhrases.push(`jm ${work.unit}`);
  }

  for (const kw of work.keywords) {
    const k = foldPolishText(kw.trim());
    if (k.length < 3) continue;
    if (hay.includes(k)) {
      score += 12;
      keywordHit = true;
      if (hitPhrases.length < 6) hitPhrases.push(kw.trim());
    }
  }

  const nameFold = foldPolishText(work.namePl);
  for (const token of nameFold.split(/\s+/)) {
    if (token.length < 4) continue;
    if (hay.includes(token)) {
      score += 8;
      nameHit = true;
      if (hitPhrases.length < 6) hitPhrases.push(token);
    }
  }

  const descFold = foldPolishText(work.descriptionPl ?? "");
  if (descFold) {
    for (const token of descFold.split(/\s+/)) {
      if (token.length < 5) continue;
      if (hay.includes(token)) {
        score += 4;
        descHit = true;
      }
    }
  }

  if (opts.cenyMaterialowUplift) {
    const boosted = applyCm01AliasBoost({ hay, work, score, hitPhrases });
    score = boosted.score;
    hitPhrases.length = 0;
    hitPhrases.push(...boosted.hitPhrases);
    aliasHit = boosted.aliasHit;
    // Soft unit: gdy alias specialty trafił, drobne wsparcie mimo różnicy jm (m2 vs szt).
    if (aliasHit && unitNorm && !unitHit) {
      score += 10;
    }
  }

  return {
    work,
    score,
    hitPhrases,
    knrHit,
    unitHit,
    categoryHit,
    tradeHit,
    keywordHit,
    nameHit,
    descHit,
    aliasHit,
  };
}

function buildRationale(opts: {
  work: CatalogWork | null;
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  matchedBy: OfferBoqMatchedBy;
  hitPhrases: string[];
  unit: string;
  knrHint: string | null;
  documentContext?: string | null;
}): string {
  const { work, categoryId, categoryLabel, matchedBy, hitPhrases, unit, knrHint, documentContext } = opts;
  const ctx = documentContext?.trim()
    ? ` Kontekst dokumentu: ${documentContext.trim()}.`
    : "";

  if (!work) {
    if (categoryId !== "UNKNOWN") {
      return (
        `Rozpoznano kategorię „${categoryLabel}” na podstawie opisu` +
        (unit ? ` i jednostki ${unit}` : "") +
        `, ale nie znaleziono jednoznacznej roboty w Bibliotece Robót.` +
        ctx
      );
    }
    return (
      `Nie udało się dopasować pozycji do Biblioteki Robót — opis zbyt ogólny lub brak słów kluczowych.` +
      ctx
    );
  }

  const phrasePart = hitPhrases.length
    ? ` ponieważ opis zawiera m.in. ${hitPhrases
        .slice(0, 4)
        .map((p) => `„${p}”`)
        .join(", ")}`
    : "";
  const knrPart = knrHint ? ` Wykryto oznaczenie katalogowe ${knrHint}.` : "";
  const unitPart = unit ? ` Jednostka przedmiaru: ${unit}.` : "";
  const methodHint =
    matchedBy === "exact_knr"
      ? "Dopasowanie po kodzie KNR/katalogu"
      : matchedBy === "category_heuristic"
        ? "Dopasowanie po kategorii i podobieństwie opisu"
        : "Dopasowanie po frazach i wpisie katalogowym";

  return (
    `${methodHint} do „${work.namePl}”${phrasePart}.` +
    ` Kategoria: ${categoryLabel}.` +
    knrPart +
    unitPart +
    ctx
  ).replace(/\s+/g, " ").trim();
}

function toCandidate(
  scored: ScoredWork,
  role: OfferBoqMatchCandidateRole,
  catalog: WgdomCostCatalog,
): OfferBoqMatchCandidate {
  const matchedBy: OfferBoqMatchedBy = scored.knrHit
    ? "exact_knr"
    : scored.score >= 40
      ? "catalog_map"
      : "keyword";
  const conf = confidenceFromScore(scored.score, scored.knrHit);
  const workCategory = workCategoryLabel(scored.work, catalog);
  return {
    catalogWorkId: scored.work.id,
    workNamePl: scored.work.namePl,
    workCategory,
    tradeId: scored.work.tradeId,
    score: scored.score,
    role,
    matchedBy,
    matchConfidence: conf,
    rationale: buildRationale({
      work: scored.work,
      categoryId: scored.work.legacyCategoryId ?? "UNKNOWN",
      categoryLabel: workCategory,
      matchedBy,
      hitPhrases: scored.hitPhrases,
      unit: scored.work.unit,
      knrHint: null,
    }),
  };
}

/**
 * Mapuje pojedynczą linię OfferBoq (bez wyceny).
 * Nie mutuje input — zwraca nową linię.
 *
 * CATALOG-COVERAGE-01:
 *  P0a Noise Filter — skip Mapper dla niemateriałowych
 *  P0b Normalizer — wyłącznie eligible · forma only · Core bez zmian scoringu
 *  P0c Alias Resolver — Wave1→Wave2 · Alias→Product ID · przed Core (override gdy bind)
 *  P0d Negation Guard → Bind Decision → Alias | Core (D-P0d-16…18)
 * Product Mapper (= ten tor) pozostaje jedynym właścicielem `catalogWorkId`.
 */
export function mapOfferBoqLine(
  line: OfferBoqLine,
  ctx: OfferBoqMappingContext,
): OfferBoqLine {
  const prepared = prepareOfferBoqLineForMapping(line);
  if (prepared.skipMapper) {
    return {
      ...prepared.line,
      normalizedDescription: null,
      aliasRuleId: null,
    };
  }

  const trustedPreserved = preserveOfferBoqLineIfTrusted(prepared.line);
  if (trustedPreserved) {
    return trustedPreserved;
  }

  const norm = normalizeOfferBoqDescription(prepared.line.description);
  const normalizedText = norm.normalizedDescription || prepared.line.description;

  // P0c: po Normalizer · przed Core — eligible only (noise już odfiltrowany)
  const alias = resolveCatalogCoverageAlias({
    description: normalizedText,
    isNoise: false,
    works: ctx.works,
  });

  const foldedNorm = foldPolishText(normalizedText);
  const outBizHay = isCatalogWave2OutBizHay(foldedNorm);

  // P0d Bind Decision + Wave2 OUT-BIZ: Guard obowiązuje Alias
  let aliasBindId = decideCatalogCoverageBindProductId(
    normalizedText,
    alias.resolvedProductId,
  );
  if (aliasBindId && isCatalogWave2ProductId(aliasBindId) && outBizHay) {
    aliasBindId = null;
  }

  if (aliasBindId) {
    const active = (ctx.works ?? []).filter((w) => w.active);
    const work = active.find((w) => w.id === aliasBindId) ?? null;
    if (work) {
      const catalog = ctx.costCatalog ?? defaultWgdomCostCatalog();
      const categoryId = classifyAthLineCategory(line.description, line.unit, catalog);
      const workCategory = workCategoryLabel(work, catalog);
      return {
        ...prepared.line,
        description: line.description,
        unit: line.unit,
        knrHint: line.knrHint,
        isNoise: false,
        noiseKind: null,
        normalizedDescription: norm.normalizedDescription,
        aliasRuleId: alias.aliasRuleId,
        catalogWorkId: work.id,
        workCategory,
        categoryId,
        matchMethod: "alias",
        matchedBy: "alias",
        matchConfidence: "high",
        candidateMatches: [],
        aiConfidence: "high",
        aiRationale: `Alias Resolver: ${alias.labelPl ?? alias.aliasRuleId} → ${work.namePl}.`,
        costIntelligence: null,
        linePricing: null,
      };
    }
  }

  const forCore: OfferBoqLine = {
    ...prepared.line,
    description: normalizedText,
    knrHint: prepared.line.knrHint || norm.knrHint,
    unit: (prepared.line.unit || "").trim() || norm.unitHint || prepared.line.unit,
  };
  // P0d: Core nie widzi Product ID zabronionych przez Negation Guard
  // CATALOG-WAVE-2: cc-w2-* wyłącznie przez Alias (0 Core FP / OUT-BIZ)
  const worksForCore = (ctx.works ?? []).filter(
    (w) =>
      w?.active !== false &&
      !isCatalogWave2ProductId(w.id) &&
      decideCatalogCoverageBindProductId(normalizedText, w.id) === w.id,
  );
  const mapped = mapOfferBoqLineCore(forCore, { ...ctx, works: worksForCore });
  let coreBindId = decideCatalogCoverageBindProductId(
    normalizedText,
    mapped.catalogWorkId,
  );
  if (coreBindId && isCatalogWave2ProductId(coreBindId)) {
    coreBindId = null;
  }
  if (coreBindId && outBizHay && isCatalogWave2ProductId(coreBindId)) {
    coreBindId = null;
  }
  const guardedMapped =
    coreBindId === mapped.catalogWorkId
      ? mapped
      : {
          ...mapped,
          catalogWorkId: null,
          matchMethod: "unmatched" as const,
          matchedBy: "unmatched" as const,
          matchConfidence: "low" as const,
          aiRationale: mapped.aiRationale
            ? `${mapped.aiRationale} Negation Guard / Wave2 Alias-only odrzucił kandydat Core.`
            : "Negation Guard / Wave2 Alias-only odrzucił kandydat Core.",
        };
  return {
    ...guardedMapped,
    // SSOT wyświetlania / oryginału ATH — bez podmiany semantyki w UI
    description: line.description,
    unit: line.unit,
    knrHint: line.knrHint,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: norm.normalizedDescription,
    aliasRuleId: alias.matched && !outBizHay ? alias.aliasRuleId : null,
  };
}

/**
 * Rdzeń Product Mapper (AS-IS scorowanie) — bez Noise Filter.
 * Eksport testowy / REUSE; produkcyjny tor = `mapOfferBoqLine`.
 */
export function mapOfferBoqLineCore(
  line: OfferBoqLine,
  ctx: OfferBoqMappingContext,
): OfferBoqLine {
  const catalog = ctx.costCatalog ?? defaultWgdomCostCatalog();
  const hay = foldPolishText(line.description || "");
  const unitNorm = normalizeWgdomCostUnit(line.unit) ?? "";
  const knrKey = normalizeKnrKey(line.knrHint);
  const categoryId = classifyAthLineCategory(line.description, line.unit, catalog);
  const categoryLabel = categoryLabelPl(categoryId, catalog);

  const uplift = Boolean(ctx.cenyMaterialowUplift);
  // IK-P1: invoice purchase hosts (cw.inv.*) stay in CatalogWork / PM — never BOQ primary.
  const active = (ctx.works ?? []).filter(
    (w) => w.active && !isInvoicePurchaseCatalogWorkId(w.id),
  );
  const scored = active
    .map((work) =>
      scoreWorkAgainstLine({
        hay,
        unitNorm,
        knrKey,
        categoryId,
        work,
        cenyMaterialowUplift: uplift,
      }),
    )
    .filter((s) => s.score > 0)
    // P1: unit-family admission gate — reject only clear jm incompatibility
    // before top-N (does not change scores / F5 ≥2 / auto-pick).
    .filter((s) => areOfferBoqUnitFamiliesCompatible(line.unit, s.work.unit))
    // P2: object-consistency admission gate — reject only clear object contradiction
    // (does not auto-pick / change F5 ≥2 / suppress legacy generically).
    .filter((s) => areOfferBoqObjectsCompatible(line.description, s.work));

  // L+T+U structural-only peer suppression (Owner FREEZE) — after P1+P2, before sort/TOP-4.
  const admitted = filterOfferBoqLtuAdmission(scored).sort(
    (a, b) => b.score - a.score || a.work.id.localeCompare(b.work.id, "pl"),
  );

  const top = admitted.slice(0, CANDIDATE_LIMIT);
  // Primary wymaga sygnału semantycznego (KNR / frazy / kategoria+jm) — samo jm nie wystarczy.
  // CM-1: alias specialty + score≥28 wystarczy (bez obniżania progu tip gdy OFF).
  const primary =
    top[0] &&
    (top[0].knrHit ||
      top[0].hitPhrases.some((p) => !p.startsWith("jm ")) ||
      (top[0].categoryHit && top[0].unitHit) ||
      top[0].score >= 40 ||
      (uplift && top[0].aliasHit && top[0].score >= 28))
      ? top[0]
      : null;

  let matchMethod: OfferBoqMatchMethod;
  let matchedBy: OfferBoqMatchedBy;
  let matchConfidence: OfferBoqConfidence;
  let catalogWorkId: string | null = null;
  let workCategory: string | null = categoryId !== "UNKNOWN" ? categoryLabel : null;
  let aiRationale: string;

  if (primary) {
    catalogWorkId = primary.work.id;
    workCategory = workCategoryLabel(primary.work, catalog);
    matchConfidence = confidenceFromScore(primary.score, primary.knrHit);
    if (primary.knrHit) {
      matchMethod = "exact_knr";
      matchedBy = "exact_knr";
    } else if (primary.categoryHit || primary.score >= 40) {
      matchMethod = "catalog_map";
      matchedBy = primary.hitPhrases.length ? "catalog_map" : "keyword";
    } else {
      matchMethod = "category_heuristic";
      matchedBy = "keyword";
    }
    aiRationale = buildRationale({
      work: primary.work,
      categoryId,
      categoryLabel: workCategory,
      matchedBy,
      hitPhrases: primary.hitPhrases,
      unit: line.unit,
      knrHint: line.knrHint,
      documentContext: ctx.documentContext,
    });
  } else if (categoryId !== "UNKNOWN") {
    matchMethod = "category_heuristic";
    matchedBy = "category_heuristic";
    matchConfidence = "low";
    workCategory = categoryLabel;
    aiRationale = buildRationale({
      work: null,
      categoryId,
      categoryLabel,
      matchedBy,
      hitPhrases: [],
      unit: line.unit,
      knrHint: line.knrHint,
      documentContext: ctx.documentContext,
    });
  } else {
    matchMethod = "unmatched";
    matchedBy = "unmatched";
    matchConfidence = "low";
    workCategory = null;
    aiRationale = buildRationale({
      work: null,
      categoryId,
      categoryLabel,
      matchedBy,
      hitPhrases: [],
      unit: line.unit,
      knrHint: line.knrHint,
      documentContext: ctx.documentContext,
    });
  }

  const candidateMatches: OfferBoqMatchCandidate[] = top.map((s, i) =>
    toCandidate(s, i === 0 && primary ? "primary" : "candidate", catalog),
  );

  // Gdy primary odrzucony (score < 25), wszystkie candidates pozostają role=candidate
  if (!primary && candidateMatches.length > 0) {
    for (const c of candidateMatches) c.role = "candidate";
  }

  return {
    ...line,
    catalogWorkId,
    workCategory,
    categoryId,
    matchMethod,
    matchedBy,
    matchConfidence,
    candidateMatches,
    aiConfidence: matchConfidence,
    aiRationale,
    isNoise: false,
    noiseKind: null,
    // Wycena nadal OUT — nie tykać cen
  };
}

export function computeOfferBoqMappingStats(lines: OfferBoqLine[]): OfferBoqMappingStats {
  let matchedCount = 0;
  let unmatchedCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  for (const l of lines) {
    if (l.catalogWorkId) matchedCount += 1;
    else unmatchedCount += 1;
    if (l.matchConfidence === "high") highCount += 1;
    else if (l.matchConfidence === "medium") mediumCount += 1;
    else lowCount += 1;
  }
  return {
    lineCount: lines.length,
    matchedCount,
    unmatchedCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * Mapuje cały dokument OfferBoq. Nie wypełnia pól cenowych.
 */
export function mapOfferBoqDocument(
  doc: OfferBoqDocument,
  ctx: OfferBoqMappingContext,
): OfferBoqDocument {
  const mappedAt = ctx.mappedAt ?? new Date().toISOString();
  const mappingCtx: OfferBoqMappingContext = {
    ...ctx,
    documentContext:
      ctx.documentContext ??
      doc.parserSnapshotRef.sourceFilename ??
      null,
    mappedAt,
  };
  const lines = doc.lines.map((line) => mapOfferBoqLine(line, mappingCtx));
  const mappingStats = computeOfferBoqMappingStats(lines);
  const pricedLineCount = lines.filter((l) => l.lineTotalPln != null).length;
  let buildStatus: OfferBoqDocument["buildStatus"] = doc.buildStatus;
  if (lines.length === 0) buildStatus = "empty";
  else if (pricedLineCount > 0) buildStatus = "partially_priced";
  else buildStatus = "mapped";

  return {
    ...doc,
    lines,
    mappingStats,
    mappingAppliedAt: mappedAt,
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    buildStatus,
    version: doc.version + 1,
  };
}
