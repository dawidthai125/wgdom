/**
 * NG11-A2 — session-only artifact cache for dossier heavy parse (cost + full phases).
 * Key: tenderId + normalized fingerprint + CURRENT_PARSER_VERSION + phase.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderDossier } from "@/lib/tenders-bzp-brief";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderDossierParseSession } from "@/lib/tender-document-resolver";
import { buildHeavyParseDocumentFingerprint } from "@/lib/tender-pipeline/unified-attachment-gate";
import {
  CURRENT_PARSER_VERSION,
  isDossierParserStale,
} from "@/lib/tender-dossier-parser-version";
import { isPipelinePerfArtifactCacheEnabled } from "@/lib/app-settings";

/** Frozen NG11-A2 — max LRU entries (cost + full share one pool). */
export const DOSSIER_ARTIFACT_CACHE_MAX = 12;

export type DossierArtifactCachePhase = "cost" | "full";

export interface DossierArtifactCacheCostSnapshot {
  phase: "cost";
  tenderDossier: TenderDossier;
  swzAnalysis: TenderSwzAnalysis | null;
  ourEstimatePln: number | null;
  parseSession: TenderDossierParseSession;
}

export interface DossierArtifactCacheFullSnapshot {
  phase: "full";
  tenderDossier: TenderDossier;
  swzAnalysis: TenderSwzAnalysis | null;
  ourEstimatePln: number | null;
}

export type DossierArtifactCacheSnapshot =
  | DossierArtifactCacheCostSnapshot
  | DossierArtifactCacheFullSnapshot;

interface CacheRecord {
  snapshot: DossierArtifactCacheSnapshot;
  lastAccessAt: number;
}

const store = new Map<string, CacheRecord>();

let testForceFlag: boolean | null = null;
let lastHitPhase: DossierArtifactCachePhase | null = null;
let lastHitItemId: string | null = null;

/** Test-only — override feature flag read. */
export function forcePipelineArtifactCacheForTests(value: boolean | null): void {
  testForceFlag = value;
}

/** NG11-A2 — artifact cache (default OFF). */
export function isPipelineArtifactCacheEnabled(): boolean {
  if (testForceFlag !== null) return testForceFlag;
  return isPipelinePerfArtifactCacheEnabled();
}

/** Normalize fingerprint — parserVersion segment always CURRENT (A2-R5). */
export function normalizeHeavyParseFingerprint(item: TenderPipelineItem): string {
  const raw = buildHeavyParseDocumentFingerprint(item);
  const parts = raw.split(";");
  if (parts.length >= 4) {
    parts[parts.length - 1] = String(CURRENT_PARSER_VERSION);
  }
  return parts.join(";");
}

export function buildArtifactCacheKey(
  item: TenderPipelineItem,
  phase: DossierArtifactCachePhase,
): string {
  const tenderId = item.tenderId ?? item.id;
  const fp = normalizeHeavyParseFingerprint(item);
  return `${tenderId}:${fp}:${CURRENT_PARSER_VERSION}:${phase}`;
}

/** Force miss when existing dossier is parser-stale (A2-R6). */
export function shouldForceArtifactCacheMiss(
  existingDossier: TenderDossier | null | undefined,
): boolean {
  return isDossierParserStale(existingDossier);
}

function touchLru(key: string, record: CacheRecord): void {
  store.delete(key);
  store.set(key, { ...record, lastAccessAt: Date.now() });
}

function evictIfNeeded(): void {
  while (store.size > DOSSIER_ARTIFACT_CACHE_MAX) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of store) {
      if (v.lastAccessAt < oldestAt) {
        oldestAt = v.lastAccessAt;
        oldestKey = k;
      }
    }
    if (oldestKey == null) break;
    store.delete(oldestKey);
  }
}

function cloneSnapshot<T>(value: T): T {
  return structuredClone(value);
}

export function getDossierArtifactCached(
  item: TenderPipelineItem,
  phase: DossierArtifactCachePhase,
  existingDossier?: TenderDossier | null,
): DossierArtifactCacheSnapshot | null {
  if (!isPipelineArtifactCacheEnabled()) return null;
  if (shouldForceArtifactCacheMiss(existingDossier)) return null;

  const key = buildArtifactCacheKey(item, phase);
  const record = store.get(key);
  if (!record) return null;

  touchLru(key, record);
  lastHitPhase = phase;
  lastHitItemId = item.id;
  return cloneSnapshot(record.snapshot);
}

export function setDossierArtifactCached(
  item: TenderPipelineItem,
  snapshot: DossierArtifactCacheSnapshot,
): void {
  if (!isPipelineArtifactCacheEnabled()) return;

  const key = buildArtifactCacheKey(item, snapshot.phase);
  const immutable = cloneSnapshot(snapshot);
  store.set(key, { snapshot: immutable, lastAccessAt: Date.now() });
  evictIfNeeded();
}

/** Test-only — clear session store. */
export function clearDossierArtifactCacheForTests(): void {
  store.clear();
  lastHitPhase = null;
  lastHitItemId = null;
}

/** Test-only — current store size. */
export function dossierArtifactCacheSizeForTests(): number {
  return store.size;
}

/** Telemetry — last cache hit phase for item (session). */
export function getDossierArtifactHitPhaseForItem(itemId: string): DossierArtifactCachePhase | null {
  if (lastHitItemId !== itemId) return null;
  return lastHitPhase;
}

/** Telemetry — consume last hit signal (read-once). */
export function consumeDossierArtifactHitTelemetry(): {
  itemId: string | null;
  phase: DossierArtifactCachePhase | null;
} {
  const out = { itemId: lastHitItemId, phase: lastHitPhase };
  lastHitPhase = null;
  lastHitItemId = null;
  return out;
}

/** Test-only — reset hit telemetry without clearing store. */
export function resetDossierArtifactHitTelemetryForTests(): void {
  lastHitPhase = null;
  lastHitItemId = null;
}
