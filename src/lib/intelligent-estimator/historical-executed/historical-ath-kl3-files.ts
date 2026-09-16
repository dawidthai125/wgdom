/**
 * IK-HISTORICAL-EXECUTED-ATH → KL-3 thin mapper (Owner GO: HISTORICAL ATH → KL3).
 *
 * `historicalIndex` (completed jobs *.ath, already hydrated) + existing session bytes cache
 * → `KnrKl3bAthFile[]` for `executeKl3KnowledgeLookup({ athFiles })`.
 *
 * AUXILIARY NORMATIVE SOURCE ONLY — never tender input, never price, never OUR RATE.
 * Fail-closed: 1 target → exactly 1 ATH source; >1 distinct source → MULTI_CANDIDATE (no pick).
 * ZERO fetch · ZERO storage · ZERO parser change · ZERO tender-package .ath.
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrKl3bAthFile } from "@/lib/intelligent-estimator/knr-knowledge/knr-research-kl3b";
import { resolveKnrHostMissDisplayCode } from "@/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter";
import { getHistoricalExecutedAthBytesCached } from "./historical-executed-host-hydrate";
import { normalizeHistoricalDisplayCode } from "./historical-executed-normalize";
import type {
  HistoricalExecutedIndex,
  HistoricalExecutedSourceRef,
} from "./historical-executed-types";

export const HISTORICAL_ATH_KL3_MAPPER_WIRED = true as const;

export type HistoricalAthKl3TargetStatus =
  | "EMITTED"
  | "NO_INDEX"
  | "NO_TARGET"
  | "NO_HISTORY"
  | "CONFLICT_TARGET"
  | "MULTI_CANDIDATE"
  | "INVALID_FILE"
  | "NO_BYTES";

export type HistoricalAthKl3TargetOutcome = {
  targetDisplayCode: string;
  status: HistoricalAthKl3TargetStatus;
  candidateCount: number;
  sourceFilename?: string;
  storagePath?: string;
  reason?: string;
};

export type HistoricalAthKl3BytesGetter = (
  source: Pick<HistoricalExecutedSourceRef, "storagePath" | "filename" | "contentSha256">,
) => Uint8Array | null;

export type BuildHistoricalAthKl3FilesResult = {
  athFiles: KnrKl3bAthFile[];
  outcomes: HistoricalAthKl3TargetOutcome[];
  emittedCount: number;
};

function isAthFilename(name: string): boolean {
  return /\.ath$/i.test(String(name || "").trim());
}

function sourceKey(src: HistoricalExecutedSourceRef): string {
  const sha = String(src.contentSha256 || "").trim();
  return sha ? `sha:${sha}` : `path:${String(src.storagePath || "").trim()}`;
}

/** Host-consistent target display codes for KNR lines (dedupe by fold, order preserved). */
export function collectKl3TargetDisplayCodes(
  lines: readonly { catalogBasis?: CatalogBasis | null }[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const dc = resolveKnrHostMissDisplayCode(line.catalogBasis ?? null);
    if (!dc) continue;
    const key = normalizeHistoricalDisplayCode(dc);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(dc.trim());
  }
  return out;
}

/**
 * Pure mapper. No fetch — bytes come only from the existing hydrate session cache
 * (or an injected getter in tests). Missing bytes → target skipped (fail-closed).
 */
export function buildKnrKl3bAthFilesFromHistoricalIndex(input: {
  historicalIndex: HistoricalExecutedIndex | null | undefined;
  targetDisplayCodes: readonly (string | null | undefined)[];
  getBytes?: HistoricalAthKl3BytesGetter;
}): BuildHistoricalAthKl3FilesResult {
  const getBytes: HistoricalAthKl3BytesGetter =
    input.getBytes ?? ((src) => getHistoricalExecutedAthBytesCached(src));
  const outcomes: HistoricalAthKl3TargetOutcome[] = [];
  const athFiles: KnrKl3bAthFile[] = [];
  const index = input.historicalIndex ?? null;
  const seen = new Set<string>();

  for (const raw of input.targetDisplayCodes) {
    const target = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!target) {
      outcomes.push({ targetDisplayCode: "", status: "NO_TARGET", candidateCount: 0 });
      continue;
    }
    const key = normalizeHistoricalDisplayCode(target);
    if (seen.has(key)) continue;
    seen.add(key);

    if (!index) {
      outcomes.push({ targetDisplayCode: target, status: "NO_INDEX", candidateCount: 0 });
      continue;
    }

    const conflict = index.conflictsByDisplayCode.get(key);
    if (conflict) {
      outcomes.push({
        targetDisplayCode: target,
        status: "CONFLICT_TARGET",
        candidateCount: (index.byDisplayCode.get(key) ?? []).length,
        reason: `${conflict.kind}:${conflict.reasonCodes.join(",")}`,
      });
      continue;
    }

    const rows = index.byDisplayCode.get(key) ?? [];
    if (rows.length === 0) {
      outcomes.push({ targetDisplayCode: target, status: "NO_HISTORY", candidateCount: 0 });
      continue;
    }

    const bySource = new Map<string, HistoricalExecutedSourceRef>();
    for (const occ of rows) {
      const k = sourceKey(occ.source);
      if (!bySource.has(k)) bySource.set(k, occ.source);
    }
    if (bySource.size !== 1) {
      outcomes.push({
        targetDisplayCode: target,
        status: "MULTI_CANDIDATE",
        candidateCount: bySource.size,
        reason: "MULTI_CANDIDATE",
      });
      continue;
    }

    const source = [...bySource.values()][0]!;
    const filename = String(source.filename || "").replace(/\\/g, "/").split("/").pop() || "";
    if (!isAthFilename(filename)) {
      outcomes.push({
        targetDisplayCode: target,
        status: "INVALID_FILE",
        candidateCount: 1,
        sourceFilename: filename,
        storagePath: source.storagePath,
        reason: "NOT_ATH",
      });
      continue;
    }

    const bytes = getBytes(source);
    if (!bytes || bytes.byteLength === 0) {
      outcomes.push({
        targetDisplayCode: target,
        status: "NO_BYTES",
        candidateCount: 1,
        sourceFilename: filename,
        storagePath: source.storagePath,
        reason: "BYTES_UNAVAILABLE",
      });
      continue;
    }

    athFiles.push({
      bytes,
      sourceFilename: filename,
      targetDisplayCode: target,
    });
    outcomes.push({
      targetDisplayCode: target,
      status: "EMITTED",
      candidateCount: 1,
      sourceFilename: filename,
      storagePath: source.storagePath,
    });
  }

  return { athFiles, outcomes, emittedCount: athFiles.length };
}

/** Stable, cheap fingerprint of the index for KL-3 memo keys (re-run once history is ready). */
export function historicalIndexKl3Signature(
  index: HistoricalExecutedIndex | null | undefined,
): string {
  if (!index) return "h0";
  return `h${index.sourceCount}:${index.occurrences.length}:${index.conflictsByDisplayCode.size}`;
}
