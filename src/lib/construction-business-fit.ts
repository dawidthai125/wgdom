/**
 * P2.1 Business Fit Engine — dopasowanie zakresu robót do profilu WGDOM.
 * Warstwa danych (bez UI). Wejście: ConstructionScopeAnalysis z P2.
 */

import type { ConstructionScopeAnalysis } from "@/lib/construction-scope-analysis";
import type { ConstructionCategoryId } from "@/lib/construction-keywords";
import { foldConstructionText } from "@/lib/construction-keywords";

export type BusinessFitLabel = "Idealny" | "Dobry" | "Średni" | "Słaby";

export interface BusinessFitResult {
  fitScore: number;
  fitLabel: BusinessFitLabel;
  reasons: string[];
}

export interface BusinessFitInput {
  scope: ConstructionScopeAnalysis;
  /** Dodatkowe teksty (opisy pozycji, SWZ) — uzupełnienie matchedKeywords. */
  extraTexts?: string[];
}

export const BUSINESS_FIT_LABEL_THRESHOLDS: {
  min: number;
  label: BusinessFitLabel;
}[] = [
  { min: 80, label: "Idealny" },
  { min: 60, label: "Dobry" },
  { min: 40, label: "Średni" },
  { min: 0, label: "Słaby" },
];

const CATEGORY_BONUS: Partial<Record<ConstructionCategoryId, number>> = {
  "wykończeniowe": 40,
  sanitarne: 5,
  elektryczne: 5,
  drogowe: -25,
};

const KEYWORD_BONUSES: { pattern: RegExp; points: number; reason: string }[] = [
  { pattern: /\bmalowanie\b/, points: 15, reason: "+15 malowanie" },
  { pattern: /\bgładzie\b|\bgladzie\b/, points: 15, reason: "+15 gładzie" },
  { pattern: /\bpłytki\b|\bplytki\b|\bgres\b|\bglazura\b/, points: 10, reason: "+10 płytki" },
  {
    pattern: /\bgk\b|\bgipsowo.kartonow|\bkarton.gips|\bplyty gk\b|\bpłyty gk\b/i,
    points: 10,
    reason: "+10 GK",
  },
];

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pctForCategory(scope: ConstructionScopeAnalysis, id: ConstructionCategoryId): number {
  return scope.categoryBreakdown.find((r) => r.categoryId === id)?.percentage ?? 0;
}

function collectHaystack(input: BusinessFitInput): string {
  const parts = [
    ...input.scope.matchedKeywords,
    input.scope.primaryCategory,
    ...input.scope.secondaryCategories,
    ...input.scope.categoryBreakdown.map((r) => r.category),
    ...(input.extraTexts ?? []),
  ];
  return foldConstructionText(parts.join("\n"));
}

function resolveFitLabel(score: number): BusinessFitLabel {
  for (const row of BUSINESS_FIT_LABEL_THRESHOLDS) {
    if (score >= row.min) return row.label;
  }
  return "Słaby";
}

/** Wylicza FIT przetargu dla profilu WGDOM (reguły startowe P2.1). */
export function evaluateBusinessFit(input: BusinessFitInput): BusinessFitResult {
  const { scope } = input;
  let score = 0;
  const reasons: string[] = [];

  const wykoPct = pctForCategory(scope, "wykończeniowe");
  if (scope.primaryCategoryId === "wykończeniowe" || wykoPct >= 40) {
    score += 40;
    reasons.push(`+40 roboty wykończeniowe (${wykoPct || 100}% zakresu)`);
  } else if (wykoPct > 0) {
    const partial = Math.round((wykoPct / 100) * 40);
    score += partial;
    reasons.push(`+${partial} roboty wykończeniowe (udział ${wykoPct}%)`);
  }

  const drogPct = pctForCategory(scope, "drogowe");
  if (scope.primaryCategoryId === "drogowe" || drogPct >= 15) {
    score += CATEGORY_BONUS.drogowe ?? -25;
    reasons.push(`−25 roboty drogowe (${drogPct || 100}% zakresu)`);
  } else if (drogPct > 0) {
    const penalty = Math.round((drogPct / 100) * 25);
    score -= penalty;
    reasons.push(`−${penalty} udział robót drogowych (${drogPct}%)`);
  }

  const sanPct = pctForCategory(scope, "sanitarne");
  if (sanPct >= 5 || scope.primaryCategoryId === "sanitarne") {
    score += CATEGORY_BONUS.sanitarne ?? 5;
    reasons.push(`+5 instalacje sanitarne`);
  }

  const elPct = pctForCategory(scope, "elektryczne");
  if (elPct >= 5 || scope.primaryCategoryId === "elektryczne") {
    score += CATEGORY_BONUS.elektryczne ?? 5;
    reasons.push(`+5 instalacje elektryczne`);
  }

  const hay = collectHaystack(input);
  for (const rule of KEYWORD_BONUSES) {
    if (rule.pattern.test(hay)) {
      score += rule.points;
      reasons.push(rule.reason);
    }
  }

  if (scope.confidence < 0.4 && scope.matchedKeywords.length === 0) {
    score = Math.min(score, 35);
    reasons.push("− niska pewność zakresu robót");
  }

  const fitScore = clampScore(score);
  const fitLabel = resolveFitLabel(fitScore);

  if (reasons.length === 0) {
    reasons.push("Brak dopasowania do profilu WGDOM (remonty / wykończenia WM)");
  }

  return { fitScore, fitLabel, reasons };
}

/** Liczba gwiazdek 1–5 pod przyszły KPI. */
export function businessFitStarCount(fitScore: number): number {
  if (fitScore >= 80) return 5;
  if (fitScore >= 60) return 4;
  if (fitScore >= 40) return 3;
  if (fitScore >= 20) return 2;
  return 1;
}

export interface BusinessFitKpiDisplay {
  title: string;
  stars: string;
  starCount: number;
  percentage: number;
  /** Np. „★★★★★ 94%” */
  line: string;
  fitLabel: BusinessFitLabel;
}

/** Format pod przyszły KPI „FIT WGDOM ★★★★★ 94%”. */
export function formatBusinessFitKpi(fit: BusinessFitResult): BusinessFitKpiDisplay {
  const starCount = businessFitStarCount(fit.fitScore);
  const stars = "★".repeat(starCount) + "☆".repeat(5 - starCount);
  return {
    title: "FIT WGDOM",
    stars,
    starCount,
    percentage: fit.fitScore,
    line: `${stars} ${fit.fitScore}%`,
    fitLabel: fit.fitLabel,
  };
}

/** Skrót: scope P2 → business fit w jednym kroku. */
export function evaluateBusinessFitFromScope(
  scope: ConstructionScopeAnalysis,
  extraTexts?: string[],
): BusinessFitResult {
  return evaluateBusinessFit({ scope, extraTexts });
}
