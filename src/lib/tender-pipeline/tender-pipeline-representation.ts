/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — NEW-08 (Design Freeze v1.1 §A.5.1).
 *
 * Leaf module: ZERO value-imports. Semantic boundary FULL vs INDEX for
 * `kw-tenders-pipeline` representations (PIPELINE-INDEX-01 / PIPELINE-NO-CONVERSION-01).
 *
 * INDEX is identified exclusively by the `_lsIndex` marker on items. FULL here means
 * shape only — provenance (RAM / IDB VALID / validated external) is added by the caller.
 * Never infer FULL from `Array.isArray(items)` or from presence of individual fields.
 */

export type PipelineRepresentation = "FULL" | "INDEX" | "INDEX_INVALID" | "EMPTY" | "NOT_ARRAY";

export const PIPELINE_LS_INDEX_MARKER = "_lsIndex" as const;

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** O(n) top-level scan: ∃ item that is an object and carries `_lsIndex`. */
export function hasLsIndexMarker(items: unknown): boolean {
  if (!Array.isArray(items)) return false;
  for (const item of items) {
    if (isObjectLike(item) && PIPELINE_LS_INDEX_MARKER in item) return true;
  }
  return false;
}

/**
 * Collection-level classification (§A.4 rule iv — class is a property of the collection):
 * NOT_ARRAY · EMPTY · INDEX (∀ items `_lsIndex.v === 1`, single `seq`) ·
 * INDEX_INVALID (mixed marker, differing seq, item without id) · FULL (∀ items without `_lsIndex`).
 */
export function classifyPipelineRepresentation(items: unknown): PipelineRepresentation {
  if (!Array.isArray(items)) return "NOT_ARRAY";
  if (items.length === 0) return "EMPTY";

  let marked = 0;
  let seq: unknown = undefined;
  let seqConsistent = true;
  let markerValid = true;

  for (const item of items) {
    if (!isObjectLike(item)) {
      markerValid = false;
      continue;
    }
    if (!(PIPELINE_LS_INDEX_MARKER in item)) continue;
    marked += 1;
    const marker = item[PIPELINE_LS_INDEX_MARKER];
    if (!isObjectLike(marker) || marker.v !== 1) markerValid = false;
    if (typeof item.id !== "string" || item.id === "") markerValid = false;
    if (isObjectLike(marker)) {
      if (seq === undefined) seq = marker.seq;
      else if (marker.seq !== seq) seqConsistent = false;
    }
  }

  if (marked === 0) return "FULL";
  if (marked !== items.length || !markerValid || !seqConsistent) return "INDEX_INVALID";
  return "INDEX";
}

/**
 * Phase 11 — capability opisująca, czy build rozumie granicę INDEX (marker `_lsIndex.v`)
 * oraz schemat envelope IDB. Wersje muszą odpowiadać `PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION`
 * (cold.ts) i `v` markera budowanego przez `buildTenderPipelineLsIndex` — parity pilnuje test.
 */
export interface PipelineIndexCapability {
  indexMarkerVersion: number;
  idbEnvelopeSchemaVersion: number;
}

/** Co rozumie TEN build (statyczne; bumpowane razem ze schematami). */
export const PIPELINE_INDEX_CLIENT_CAPABILITY: PipelineIndexCapability = {
  indexMarkerVersion: 1,
  idbEnvelopeSchemaVersion: 1,
};

/** Czego wymaga produkcja INDEX wg kontraktu (DF §1.1 envelope v1, §2.3 marker v1). */
export const PIPELINE_INDEX_REQUIRED_CAPABILITY: PipelineIndexCapability = {
  indexMarkerVersion: 1,
  idbEnvelopeSchemaVersion: 1,
};

/** Fail-closed: brak / niepełna capability ⇒ false. */
export function isPipelineIndexCapabilitySatisfied(
  client: Partial<PipelineIndexCapability> | null | undefined,
  required: PipelineIndexCapability = PIPELINE_INDEX_REQUIRED_CAPABILITY,
): boolean {
  if (client == null) return false;
  const marker = client.indexMarkerVersion;
  const envelope = client.idbEnvelopeSchemaVersion;
  if (typeof marker !== "number" || typeof envelope !== "number") return false;
  return marker === required.indexMarkerVersion && envelope === required.idbEnvelopeSchemaVersion;
}

export class PipelineIndexNotFullError extends Error {
  readonly code = "PIPELINE_INDEX_NOT_FULL" as const;
  readonly context: string;

  constructor(context: string) {
    super(`PIPELINE_INDEX_NOT_FULL: INDEX representation used where FULL is required (${context})`);
    this.name = "PipelineIndexNotFullError";
    this.context = context;
  }
}

export type PipelineFullAvailability = "UNKNOWN" | "FULL" | "DEGRADED_INDEX" | "EMPTY";

let fullAvailability: PipelineFullAvailability = "UNKNOWN";
let fullAvailabilityReason = "";

/** RAM, sync. */
export function getPipelineFullAvailability(): PipelineFullAvailability {
  return fullAvailability;
}

export function getPipelineFullAvailabilityReason(): string {
  return fullAvailabilityReason;
}

/** Callers per §A.5.1: cold.ts (hydrate/write), tenders-bzp.ts (loadTendersPipeline, writer), recovery §A.5.3. */
export function setPipelineFullAvailability(next: PipelineFullAvailability, reason: string): void {
  fullAvailability = next;
  fullAvailabilityReason = reason;
}
