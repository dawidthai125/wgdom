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

const CANDIDATE_LIMIT = 4;

export interface OfferBoqMappingContext {
  /** Aktywne roboty z Work Catalog (region). */
  works: CatalogWork[];
  /** Legacy catalog pod classifyAthLineCategory (keywords). */
  costCatalog?: WgdomCostCatalog;
  /** Kontekst dokumentu (np. nazwa pliku) — do rationale. */
  documentContext?: string | null;
  mappedAt?: string;
}

interface ScoredWork {
  work: CatalogWork;
  score: number;
  hitPhrases: string[];
  knrHit: boolean;
  unitHit: boolean;
  categoryHit: boolean;
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
}): ScoredWork {
  const { hay, unitNorm, knrKey, categoryId, work } = opts;
  let score = 0;
  const hitPhrases: string[] = [];
  let knrHit = false;
  let unitHit = false;
  let categoryHit = false;

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
      if (hitPhrases.length < 6) hitPhrases.push(kw.trim());
    }
  }

  const nameFold = foldPolishText(work.namePl);
  for (const token of nameFold.split(/\s+/)) {
    if (token.length < 4) continue;
    if (hay.includes(token)) {
      score += 8;
      if (hitPhrases.length < 6) hitPhrases.push(token);
    }
  }

  const descFold = foldPolishText(work.descriptionPl ?? "");
  if (descFold) {
    for (const token of descFold.split(/\s+/)) {
      if (token.length < 5) continue;
      if (hay.includes(token)) score += 4;
    }
  }

  return { work, score, hitPhrases, knrHit, unitHit, categoryHit };
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
 */
export function mapOfferBoqLine(
  line: OfferBoqLine,
  ctx: OfferBoqMappingContext,
): OfferBoqLine {
  const catalog = ctx.costCatalog ?? defaultWgdomCostCatalog();
  const hay = foldPolishText(line.description || "");
  const unitNorm = normalizeWgdomCostUnit(line.unit) ?? "";
  const knrKey = normalizeKnrKey(line.knrHint);
  const categoryId = classifyAthLineCategory(line.description, line.unit, catalog);
  const categoryLabel = categoryLabelPl(categoryId, catalog);

  const active = (ctx.works ?? []).filter((w) => w.active);
  const scored = active
    .map((work) =>
      scoreWorkAgainstLine({ hay, unitNorm, knrKey, categoryId, work }),
    )
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.work.id.localeCompare(b.work.id, "pl"));

  const top = scored.slice(0, CANDIDATE_LIMIT);
  // Primary wymaga sygnału semantycznego (KNR / frazy / kategoria+jm) — samo jm nie wystarczy.
  const primary =
    top[0] &&
    (top[0].knrHit ||
      top[0].hitPhrases.some((p) => !p.startsWith("jm ")) ||
      (top[0].categoryHit && top[0].unitHit) ||
      top[0].score >= 40)
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
