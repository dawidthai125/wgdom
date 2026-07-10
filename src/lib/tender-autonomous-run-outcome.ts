/**
 * NG-10 — Outcome Screen copy (S2): pozytywne uzasadnienia i watchouts (pure lib).
 */

import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import { daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import {
  AUTONOMOUS_OUTCOME_POSITIVES_MAX,
  AUTONOMOUS_OUTCOME_WATCHOUTS_MAX,
} from "@/lib/tender-autonomous-run-ux";

const POSITIVE_REASON_DENYLIST = new Set([
  "termin OK",
  "wadium OK",
  "referencje OK",
  "referencje częściowo",
]);

function uniqueNonEmpty(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function deriveAutonomousOutcomePositives(
  ctx: TenderIntelligenceContext,
): string[] {
  const { item, overlay, finance } = ctx;
  const candidates: string[] = [];

  const docCount = countTenderAttachments(item);
  if (docCount > 0 && isDocumentDiscoverySettled(item)) {
    candidates.push("Dokumentacja kompletna");
  }

  const fitScore = item.tenderFit?.fitScore;
  if (overlay.allBlocks.length === 0 && fitScore != null && fitScore >= 65) {
    candidates.push("Ryzyko niskie");
  }

  if (finance.marginPct != null && finance.marginPct >= 15) {
    candidates.push("Szacowana marża wysoka");
  }

  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  if (days != null && days >= 7) {
    candidates.push("Termin realny");
  }

  if (overlay.confidence === "high") {
    candidates.push("Wysoka pewność analizy");
  }

  const fromOverlay = overlay.reasons.filter(
    (r) => !POSITIVE_REASON_DENYLIST.has(r.trim())
      && !r.trim().startsWith("−")
      && !r.trim().startsWith("-"),
  );

  return uniqueNonEmpty([...candidates, ...fromOverlay]).slice(0, AUTONOMOUS_OUTCOME_POSITIVES_MAX);
}

export function deriveAutonomousOutcomeWatchouts(
  ctx: TenderIntelligenceContext,
  ownerFinanceWarnings?: string[] | null,
): string[] {
  const lines: string[] = [];

  for (const block of ctx.overlay.allBlocks) {
    lines.push(block.message);
  }
  for (const block of ctx.overlay.heroBlocks) {
    lines.push(block.message);
  }

  if (ctx.bidPrepChecks) {
    for (const check of ctx.bidPrepChecks) {
      if (check.status !== "ok") {
        lines.push(check.hint ?? check.display ?? check.label);
      }
    }
  }

  const warnings = ownerFinanceWarnings ?? [];
  for (const w of warnings) {
    if (w.trim()) lines.push(w.trim());
  }

  if (ctx.overlay.helperMessage) {
    lines.push(ctx.overlay.helperMessage);
  }

  return uniqueNonEmpty(lines).slice(0, AUTONOMOUS_OUTCOME_WATCHOUTS_MAX);
}
