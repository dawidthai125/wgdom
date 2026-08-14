/**
 * WR-SOURCE-EVIDENCE-DB-01 — host lock (reuse WORK_RATE_ALLOWED_HOSTS).
 */

import { isWorkRateSelectiveUrlAllowed } from "@/lib/work-catalog/work-rate-source-html-parse";
import type { WorkRateAuthorizedSourceId } from "@/lib/work-catalog/work-rate-legal";

const RUNTIME_SOURCE_IDS = new Set<string>([
  "kb_pl",
  "cennikremontow_pl",
  "sccot",
  "extradom",
]);

export function isLaborSourceEvidenceRuntimeSourceId(sourceId: string): boolean {
  return RUNTIME_SOURCE_IDS.has(String(sourceId || "").trim());
}

export function isLaborSourceEvidenceUrlAllowed(sourceUrl: string): boolean {
  return isWorkRateSelectiveUrlAllowed(sourceUrl);
}

export function assertLaborSourceEvidenceHostLock(input: {
  sourceId: string;
  sourceUrl: string;
}): { ok: true } | { ok: false; messagePl: string } {
  if (!isLaborSourceEvidenceRuntimeSourceId(input.sourceId)) {
    return {
      ok: false,
      messagePl: `Host/source lock: sourceId „${input.sourceId}” poza KEEP-4 runtime.`,
    };
  }
  if (!isLaborSourceEvidenceUrlAllowed(input.sourceUrl)) {
    return {
      ok: false,
      messagePl: "Host lock: URL poza allowlistą (ZERO arbitrary / client URL).",
    };
  }
  return { ok: true };
}

export function listLaborSourceEvidenceRuntimeSourceIds(): readonly WorkRateAuthorizedSourceId[] {
  return ["kb_pl", "cennikremontow_pl", "sccot", "extradom"] as const;
}
