/**
 * P2 Construction Knowledge Engine — analiza zakresu robót z wielu źródeł.
 */

import type { AthPreviewResult } from "@/lib/ath-parser";
import type { TenderCatalogQuantityLine, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import type { ExecutiveSummary } from "@/lib/tender-executive-summary";
import {
  CONSTRUCTION_CATEGORY_LABELS,
  CONSTRUCTION_CATEGORY_ORDER,
  type ConstructionCategoryId,
  matchConstructionKeywordsInText,
} from "@/lib/construction-keywords";

export type ConstructionScopeSource =
  | "ath"
  | "catalog_quantities"
  | "xlsx"
  | "executive_summary"
  | "pdf_text"
  | "swz";

/** Waga źródła — wyższa = większy wpływ na breakdown. */
const SOURCE_WEIGHT: Record<ConstructionScopeSource, number> = {
  ath: 5,
  catalog_quantities: 4,
  xlsx: 3,
  executive_summary: 2,
  pdf_text: 1.5,
  swz: 1,
};

export interface ConstructionCategoryBreakdown {
  categoryId: ConstructionCategoryId | "inne";
  category: string;
  percentage: number;
}

export interface ConstructionScopeAnalysis {
  primaryCategory: string;
  primaryCategoryId: ConstructionCategoryId | "inne";
  secondaryCategories: string[];
  categoryBreakdown: ConstructionCategoryBreakdown[];
  /** 0–1 */
  confidence: number;
  matchedKeywords: string[];
  /** Etykieta pod UI V4.2: „Dominujący zakres: …” */
  dominantScopeLabel: string;
  sourcesUsed: ConstructionScopeSource[];
}

export interface ConstructionScopeInput {
  athParseResult?: AthPreviewResult | null;
  kosztorysSnapshot?: TenderKosztorysSnapshot | null;
  catalogQuantities?: TenderCatalogQuantityLine[] | null;
  xlsxTexts?: string[] | null;
  executiveSummary?: ExecutiveSummary | null;
  executiveSummaryWorks?: string[] | null;
  pdfText?: string | null;
  swzText?: string | null;
  scopeDescription?: string | null;
}

interface WeightedChunk {
  text: string;
  source: ConstructionScopeSource;
  weight: number;
}

function pushTexts(chunks: WeightedChunk[], source: ConstructionScopeSource, texts: string[]): void {
  const weight = SOURCE_WEIGHT[source];
  for (const raw of texts) {
    const t = raw?.trim();
    if (!t || t.length < 3) continue;
    chunks.push({ text: t, source, weight });
  }
}

function textsFromAth(parse: AthPreviewResult): string[] {
  const out: string[] = [];
  for (const cat of parse.categories ?? []) {
    if (cat.name?.trim()) out.push(cat.name.trim());
  }
  for (const row of parse.rows ?? []) {
    const parts = [row.description, row.category, row.code].filter(Boolean).join(" ");
    if (parts.trim()) out.push(parts.trim());
  }
  if (parse.title?.trim()) out.push(parse.title.trim());
  return out;
}

function textsFromCatalog(lines: TenderCatalogQuantityLine[]): string[] {
  return lines
    .map((l) => [l.description, l.unit].filter(Boolean).join(" "))
    .filter((t) => t.trim().length >= 3);
}

function textsFromSnapshot(snapshot: TenderKosztorysSnapshot): string[] {
  const out: string[] = [];
  if (snapshot.title?.trim()) out.push(snapshot.title.trim());
  for (const cat of snapshot.categories ?? []) {
    if (cat.name?.trim()) out.push(cat.name.trim());
  }
  for (const row of snapshot.rows ?? []) {
    const d = row.description?.trim();
    if (d) out.push(d);
  }
  return out;
}

function collectWeightedChunks(input: ConstructionScopeInput): WeightedChunk[] {
  const chunks: WeightedChunk[] = [];
  const sourcesUsed = new Set<ConstructionScopeSource>();

  if (input.athParseResult) {
    const texts = textsFromAth(input.athParseResult);
    if (texts.length) {
      pushTexts(chunks, "ath", texts);
      sourcesUsed.add("ath");
    }
  }

  const catalog = input.catalogQuantities
    ?? input.kosztorysSnapshot?.catalogQuantities
    ?? null;
  if (catalog?.length) {
    pushTexts(chunks, "catalog_quantities", textsFromCatalog(catalog));
    sourcesUsed.add("catalog_quantities");
  }

  if (input.kosztorysSnapshot && !input.athParseResult) {
    const snapTexts = textsFromSnapshot(input.kosztorysSnapshot);
    if (snapTexts.length) {
      pushTexts(chunks, "ath", snapTexts);
      sourcesUsed.add("ath");
    }
  }

  if (input.xlsxTexts?.length) {
    pushTexts(chunks, "xlsx", input.xlsxTexts);
    sourcesUsed.add("xlsx");
  }

  const execWorks = input.executiveSummaryWorks
    ?? input.executiveSummary?.mainWorks
    ?? [];
  if (execWorks.length) {
    pushTexts(chunks, "executive_summary", execWorks);
    sourcesUsed.add("executive_summary");
  }

  if (input.pdfText?.trim()) {
    const lines = input.pdfText
      .split(/\n+/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l.length >= 4);
    pushTexts(chunks, "pdf_text", lines.length ? lines : [input.pdfText.trim()]);
    sourcesUsed.add("pdf_text");
  }

  const swzParts = [input.swzText, input.scopeDescription].filter(
    (t): t is string => Boolean(t?.trim()),
  );
  if (swzParts.length) {
    pushTexts(chunks, "swz", swzParts);
    sourcesUsed.add("swz");
  }

  return chunks;
}

function roundPercentages(values: number[]): number[] {
  if (!values.length) return [];
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => 0);

  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k += 1) {
    out[order[k].i] += 1;
    remainder -= 1;
  }
  return out;
}

function resolveConfidence(
  totalWeightedHits: number,
  primaryPct: number,
  categoryCount: number,
): number {
  if (totalWeightedHits <= 0) return 0.15;
  let score = 0.25;
  if (totalWeightedHits >= 3) score += 0.15;
  if (totalWeightedHits >= 8) score += 0.15;
  if (totalWeightedHits >= 15) score += 0.1;
  if (primaryPct >= 50) score += 0.15;
  if (primaryPct >= 70) score += 0.1;
  if (categoryCount >= 2 && primaryPct < 45) score -= 0.1;
  return Math.min(0.98, Math.max(0.1, score));
}

const OTHER_LABEL = "Inne";

/** Analiza zakresu robót — priorytet źródeł wg wag w SOURCE_WEIGHT. */
export function analyzeConstructionScope(
  input: ConstructionScopeInput,
): ConstructionScopeAnalysis {
  const chunks = collectWeightedChunks(input);
  const sourcesUsed = [...new Set(chunks.map((c) => c.source))];

  const weightedHits = new Map<ConstructionCategoryId, number>();
  let unclassifiedWeight = 0;
  const matchedKeywords = new Set<string>();

  for (const chunk of chunks) {
    const hits = matchConstructionKeywordsInText(chunk.text);
    if (hits.length === 0) {
      unclassifiedWeight += chunk.weight;
      continue;
    }
    const seenInLine = new Set<ConstructionCategoryId>();
    for (const hit of hits) {
      matchedKeywords.add(hit.keyword);
      if (seenInLine.has(hit.categoryId)) continue;
      seenInLine.add(hit.categoryId);
      const prev = weightedHits.get(hit.categoryId) ?? 0;
      weightedHits.set(hit.categoryId, prev + chunk.weight);
    }
  }

  const classifiedTotal = [...weightedHits.values()].reduce((s, v) => s + v, 0);
  const totalWeightedHits = classifiedTotal + unclassifiedWeight;
  const rawValues = CONSTRUCTION_CATEGORY_ORDER.map((id) => weightedHits.get(id) ?? 0);
  const withOther = unclassifiedWeight > 0
    ? [...rawValues, unclassifiedWeight]
    : rawValues;
  const percentages = roundPercentages(withOther);

  const categoryBreakdown: ConstructionCategoryBreakdown[] = CONSTRUCTION_CATEGORY_ORDER
    .map((id, idx) => ({
      categoryId: id,
      category: CONSTRUCTION_CATEGORY_LABELS[id],
      percentage: percentages[idx] ?? 0,
    }))
    .filter((row) => row.percentage > 0);

  if (unclassifiedWeight > 0) {
    const otherPct = percentages[percentages.length - 1] ?? 0;
    if (otherPct > 0) {
      categoryBreakdown.push({
        categoryId: "inne",
        category: OTHER_LABEL,
        percentage: otherPct,
      });
    }
  }

  categoryBreakdown.sort((a, b) => b.percentage - a.percentage);

  const primary = categoryBreakdown[0];
  const primaryCategoryId = primary?.categoryId ?? "inne";
  const primaryCategory = primary?.category ?? OTHER_LABEL;
  const primaryPct = primary?.percentage ?? 0;

  const secondaryCategories = categoryBreakdown
    .slice(1)
    .filter((r) => r.percentage >= 5 && r.categoryId !== "inne")
    .map((r) => r.category);

  const confidence = matchedKeywords.size === 0
    ? Math.min(0.35, resolveConfidence(
      totalWeightedHits,
      primaryPct,
      categoryBreakdown.filter((r) => r.categoryId !== "inne").length,
    ))
    : resolveConfidence(
      totalWeightedHits,
      primaryPct,
      categoryBreakdown.filter((r) => r.categoryId !== "inne").length,
    );

  return {
    primaryCategory,
    primaryCategoryId,
    secondaryCategories,
    categoryBreakdown,
    confidence,
    matchedKeywords: [...matchedKeywords].sort(),
    dominantScopeLabel: `Dominujący zakres: ${primaryCategory}`,
    sourcesUsed,
  };
}

/** Format pod przyszły ekran V4.2 „Zakres robót”. */
export function formatConstructionScopeForUi(analysis: ConstructionScopeAnalysis): {
  breakdownLines: { label: string; percentage: number }[];
  dominantLabel: string;
} {
  return {
    breakdownLines: analysis.categoryBreakdown.map((row) => ({
      label: row.category,
      percentage: row.percentage,
    })),
    dominantLabel: analysis.dominantScopeLabel,
  };
}

/** Teksty z ATH snapshot + parse do analyzeConstructionScope. */
export function buildConstructionScopeFromTenderDossier(opts: {
  kosztorys?: TenderKosztorysSnapshot | null;
  athParseResult?: AthPreviewResult | null;
  executiveSummary?: ExecutiveSummary | null;
  swzText?: string | null;
  scopeDescription?: string | null;
  pdfText?: string | null;
}): ConstructionScopeAnalysis {
  return analyzeConstructionScope({
    kosztorysSnapshot: opts.kosztorys ?? null,
    athParseResult: opts.athParseResult ?? null,
    catalogQuantities: opts.kosztorys?.catalogQuantities ?? null,
    executiveSummary: opts.executiveSummary ?? null,
    swzText: opts.swzText ?? null,
    scopeDescription: opts.scopeDescription ?? null,
    pdfText: opts.pdfText ?? null,
  });
}
