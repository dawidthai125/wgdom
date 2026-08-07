/**
 * Validation Expert — build / classify / dedup Findings.
 */

import type {
  ValidationFinding,
  ValidationFindingCategory,
  ValidationFindingCode,
  ValidationFindingEvidence,
  ValidationFindingSeverity,
  ValidationFindingSource,
} from "./types";

export function buildFinding(opts: {
  code: ValidationFindingCode;
  severity: ValidationFindingSeverity;
  category: ValidationFindingCategory;
  source: ValidationFindingSource;
  messagePl: string;
  recommendationPl: string;
  evidence: ValidationFindingEvidence;
  ordinal?: number;
}): ValidationFinding {
  const ordinal = opts.ordinal ?? 0;
  const id = `${opts.code}:${opts.source}:${ordinal}`;
  return {
    id,
    severity: opts.severity,
    category: opts.category,
    source: opts.source,
    code: opts.code,
    messagePl: opts.messagePl,
    evidence: opts.evidence,
    recommendationPl: opts.recommendationPl,
  };
}

/** Dedup po (code, source, evidence.path). */
export function dedupeFindings(findings: ValidationFinding[]): ValidationFinding[] {
  const seen = new Set<string>();
  const out: ValidationFinding[] = [];
  for (const f of findings) {
    const key = `${f.code}|${f.source}|${f.evidence.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function filterHard(findings: ValidationFinding[]): ValidationFinding[] {
  return findings.filter((f) => f.severity === "hard");
}

export function filterSoft(findings: ValidationFinding[]): ValidationFinding[] {
  return findings.filter((f) => f.severity === "soft");
}

/** Hard first, then soft; within group by code. */
export function sortFindings(findings: ValidationFinding[]): ValidationFinding[] {
  return [...findings].sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "hard" ? -1 : 1;
    }
    return a.code.localeCompare(b.code) || a.id.localeCompare(b.id);
  });
}

export function mergeChecksRun(...lists: ValidationFindingCode[][]): ValidationFindingCode[] {
  const seen = new Set<ValidationFindingCode>();
  const out: ValidationFindingCode[] = [];
  for (const list of lists) {
    for (const c of list) {
      if (seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}
