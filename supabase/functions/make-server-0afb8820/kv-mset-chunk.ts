/**
 * EDGE-BATCH-SET-500-01 — pure chunk planner for kv.mset (testable without Deno).
 * Semantics: same key→value pairs; persist order = oversized solos first, then byte-budgeted chunks.
 */

/** Soft cap per PostgREST upsert statement (bytes of JSON-estimated values). */
export const MSET_CHUNK_MAX_BYTES = 450_000;

/** Max rows per chunk (in addition to byte budget). */
export const MSET_CHUNK_MAX_KEYS = 12;

export type MsetChunk = {
  keys: string[];
  values: unknown[];
  estimatedBytes: number;
  soloOversized: boolean;
};

export function estimateKvValueBytes(value: unknown): number {
  try {
    if (typeof value === "string") return value.length * 2;
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Plan upsert chunks. Oversized single keys (≥ max bytes) get a dedicated chunk first.
 * Remaining keys pack greedily under MSET_CHUNK_MAX_BYTES / MSET_CHUNK_MAX_KEYS.
 * Empty input → [].
 */
export function planMsetChunks(
  keys: string[],
  values: unknown[],
  opts?: { maxBytes?: number; maxKeys?: number },
): MsetChunk[] {
  const maxBytes = opts?.maxBytes ?? MSET_CHUNK_MAX_BYTES;
  const maxKeys = opts?.maxKeys ?? MSET_CHUNK_MAX_KEYS;
  if (!Array.isArray(keys) || keys.length === 0) return [];

  const n = Math.min(keys.length, Array.isArray(values) ? values.length : 0);
  const items: { key: string; value: unknown; bytes: number }[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i];
    items.push({
      key: String(keys[i]),
      value,
      bytes: estimateKvValueBytes(value),
    });
  }

  const solos: MsetChunk[] = [];
  const rest: typeof items = [];
  for (const it of items) {
    if (it.bytes >= maxBytes) {
      solos.push({
        keys: [it.key],
        values: [it.value],
        estimatedBytes: it.bytes,
        soloOversized: true,
      });
    } else {
      rest.push(it);
    }
  }

  const packed: MsetChunk[] = [];
  let curKeys: string[] = [];
  let curVals: unknown[] = [];
  let curBytes = 0;

  const flush = () => {
    if (curKeys.length === 0) return;
    packed.push({
      keys: curKeys,
      values: curVals,
      estimatedBytes: curBytes,
      soloOversized: false,
    });
    curKeys = [];
    curVals = [];
    curBytes = 0;
  };

  for (const it of rest) {
    const wouldKeys = curKeys.length + 1;
    const wouldBytes = curBytes + it.bytes;
    if (
      curKeys.length > 0 &&
      (wouldKeys > maxKeys || wouldBytes > maxBytes)
    ) {
      flush();
    }
    curKeys.push(it.key);
    curVals.push(it.value);
    curBytes += it.bytes;
  }
  flush();

  return [...solos, ...packed];
}

export function sumChunkEstimatedBytes(chunks: MsetChunk[]): number {
  return chunks.reduce((s, c) => s + c.estimatedBytes, 0);
}
