/**
 * AI-COST-02-B — Impact-first review queue (pure).
 * REUSE S7 issues + lineDirect tie-break.
 * ZERO DUPLICATE: nie zmienia formuły impactScore w tender-offer-boq-validation.
 */

import type { OfferBoqExplainLineCard } from "@/lib/tender-offer-boq-explainability";
import type {
  OfferBoqValidationIssue,
  OfferBoqValidationSeverity,
} from "@/lib/tender-offer-boq-validation";

export type OfferBoq02bQueueSeverity = OfferBoqValidationSeverity;

export interface OfferBoq02bQueueItem {
  lineId: string;
  lp: string;
  description: string;
  lineDirectPln: number;
  maxSeverity: OfferBoq02bQueueSeverity;
  issueCount: number;
  titlePl: string;
  stillNeedsReview: boolean;
}

export interface OfferBoq02bQueueView {
  items: OfferBoq02bQueueItem[];
  /** Pozycje kolejki nadal wymagające weryfikacji. */
  remainingCount: number;
  /** Unikalne linie w kolejce (z issues). */
  totalReviewLines: number;
  resolvedCount: number;
}

function severityRank(s: OfferBoqValidationSeverity): number {
  if (s === "critical") return 0;
  if (s === "warning") return 1;
  return 2;
}

function worseSeverity(
  a: OfferBoqValidationSeverity,
  b: OfferBoqValidationSeverity,
): OfferBoqValidationSeverity {
  return severityRank(a) <= severityRank(b) ? a : b;
}

/**
 * Buduje kolejkę: severity S7 ↓, tie-break lineDirect ↓.
 * Counter: remaining = linie z stillNeedsReview (requiresUserReview z Explain).
 */
export function buildOfferBoq02bQueue(opts: {
  issues: OfferBoqValidationIssue[];
  lines: OfferBoqExplainLineCard[];
}): OfferBoq02bQueueView {
  const lineById = new Map(opts.lines.map((l) => [l.lineId, l]));
  type Acc = {
    maxSeverity: OfferBoqValidationSeverity;
    issueCount: number;
    titlePl: string;
  };
  const byLine = new Map<string, Acc>();

  for (const issue of opts.issues) {
    if (!issue.lineId) continue;
    const prev = byLine.get(issue.lineId);
    if (!prev) {
      byLine.set(issue.lineId, {
        maxSeverity: issue.severity,
        issueCount: 1,
        titlePl: issue.titlePl,
      });
      continue;
    }
    const nextSev = worseSeverity(prev.maxSeverity, issue.severity);
    byLine.set(issue.lineId, {
      maxSeverity: nextSev,
      issueCount: prev.issueCount + 1,
      titlePl: severityRank(issue.severity) < severityRank(prev.maxSeverity) ? issue.titlePl : prev.titlePl,
    });
  }

  const items: OfferBoq02bQueueItem[] = [];
  for (const [lineId, acc] of byLine) {
    const line = lineById.get(lineId);
    if (!line) continue;
    items.push({
      lineId,
      lp: line.lp,
      description: line.description,
      lineDirectPln: line.lineDirectPln ?? 0,
      maxSeverity: acc.maxSeverity,
      issueCount: acc.issueCount,
      titlePl: acc.titlePl,
      stillNeedsReview: line.requiresUserReview,
    });
  }

  items.sort((a, b) => {
    const sev = severityRank(a.maxSeverity) - severityRank(b.maxSeverity);
    if (sev !== 0) return sev;
    return (b.lineDirectPln || 0) - (a.lineDirectPln || 0);
  });

  const remainingCount = items.filter((i) => i.stillNeedsReview).length;
  const totalReviewLines = items.length;
  const resolvedCount = Math.max(0, totalReviewLines - remainingCount);

  return {
    items,
    remainingCount,
    totalReviewLines,
    resolvedCount,
  };
}
