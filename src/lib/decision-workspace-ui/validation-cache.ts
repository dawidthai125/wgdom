/**
 * DECISION-WORKSPACE-01 — Validation cache RO.
 * analyzeValidationFromDossier ≤1× na cacheKey = caseId|finishedAt.
 * Zero mutacji wyniku · zero Session BC.
 */

import type { ChiefDecydentDossier } from "@/lib/chief-orchestrator";
import {
  analyzeValidationFromDossier,
  type ValidationExpertAnalysisResult,
} from "@/lib/validation-expert";

const cache = new Map<string, ValidationExpertAnalysisResult>();
let analyzeCallCount = 0;

export function buildValidationCacheKey(
  caseId: string,
  finishedAt: string,
): string {
  return `${caseId}|${finishedAt}`;
}

export function resetValidationCacheForTests(): void {
  cache.clear();
  analyzeCallCount = 0;
}

export function getValidationAnalyzeCallCountForTests(): number {
  return analyzeCallCount;
}

export function clearValidationCache(): void {
  cache.clear();
}

/** Drop entries for case (np. zmiana tender). */
export function dropValidationCacheForCase(caseId: string): void {
  const prefix = `${caseId}|`;
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix) || key === caseId) cache.delete(key);
  }
}

export function resolveValidationForDossier(
  dossier: ChiefDecydentDossier | null,
): {
  validation: ValidationExpertAnalysisResult | null;
  validationFailed: boolean;
} {
  if (!dossier) {
    return { validation: null, validationFailed: false };
  }
  const key = buildValidationCacheKey(dossier.caseId, dossier.finishedAt);
  const hit = cache.get(key);
  if (hit) {
    return { validation: hit, validationFailed: false };
  }
  try {
    analyzeCallCount += 1;
    const result = analyzeValidationFromDossier(dossier);
    cache.set(key, result);
    return { validation: result, validationFailed: false };
  } catch {
    return { validation: null, validationFailed: true };
  }
}
