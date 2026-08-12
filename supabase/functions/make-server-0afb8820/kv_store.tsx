/* KV store — tabela kv_store_0afb8820 w Supabase */

/* Table schema:
CREATE TABLE kv_store_0afb8820 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
*/

// View at https://supabase.com/dashboard/project/kchwyjlnkdlymwvsnfiu/database/tables

// Prosty interfejs key-value dla danych aplikacji w Supabase (tabela kv_store_0afb8820).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.49.8";
import { mgetWith } from "./kv-batch-order.ts"; // EDGE-OPT-A · A1
import { planMsetChunks } from "./kv-mset-chunk.ts"; // EDGE-BATCH-SET-500-01

// EDGE-BATCH-SET-500-01 — singleton client (H2 / pool pressure mitigation).
let _singleton: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (_singleton) return _singleton;
  _singleton = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _singleton;
}

/** Test / diagnostics — reset singleton between isolated runs if needed. */
export function resetKvClientSingletonForTests(): void {
  _singleton = null;
}

async function upsertRows(
  rows: { key: string; value: unknown }[],
): Promise<void> {
  if (rows.length === 0) return;
  const supabase = client();
  const { error } = await supabase.from("kv_store_0afb8820").upsert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

function isTransientKvUpsertError(message: string): boolean {
  const t = String(message ?? "").toLowerCase();
  return (
    t.includes("timeout") ||
    t.includes("522") ||
    t.includes("fetch failed") ||
    t.includes("connection") ||
    t.includes("40p01") ||
    t.includes("deadlock")
  );
}

async function upsertRowsWithLightRetry(
  rows: { key: string; value: unknown }[],
): Promise<void> {
  try {
    await upsertRows(rows);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isTransientKvUpsertError(message)) throw e;
    await new Promise((r) => setTimeout(r, 300));
    await upsertRows(rows);
  }
}

// Set stores a key-value pair in the database.
export const set = async (key: string, value: any): Promise<void> => {
  await upsertRowsWithLightRetry([{ key, value }]);
};

// Get retrieves a key-value pair from the database.
export const get = async (key: string): Promise<any> => {
  const supabase = client();
  const { data, error } = await supabase.from("kv_store_0afb8820").select("value").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.value;
};

// Delete deletes a key-value pair from the database.
export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_0afb8820").delete().eq("key", key);
  if (error) {
    throw new Error(error.message);
  }
};

export type MsetMeta = {
  chunkCount: number;
  estimatedBytes: number;
  chunkMs: number[];
  soloOversizedKeys: string[];
};

/**
 * Sets multiple key-value pairs.
 * EDGE-BATCH-SET-500-01: chunked upserts by byte/key budget (API unchanged).
 * Fail-fast on first chunk error (throws) — caller maps to HTTP 500 + requestId.
 */
export const mset = async (
  keys: string[],
  values: any[],
  opts?: { onChunk?: (info: {
    index: number;
    total: number;
    keys: string[];
    estimatedBytes: number;
    soloOversized: boolean;
    ms: number;
  }) => void },
): Promise<MsetMeta> => {
  const chunks = planMsetChunks(keys, values);
  const chunkMs: number[] = [];
  const soloOversizedKeys: string[] = [];
  let estimatedBytes = 0;

  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i];
    estimatedBytes += ch.estimatedBytes;
    if (ch.soloOversized) soloOversizedKeys.push(...ch.keys);
    const t0 = Date.now();
    await upsertRowsWithLightRetry(ch.keys.map((k, j) => ({ key: k, value: ch.values[j] })));
    const ms = Date.now() - t0;
    chunkMs.push(ms);
    opts?.onChunk?.({
      index: i,
      total: chunks.length,
      keys: ch.keys,
      estimatedBytes: ch.estimatedBytes,
      soloOversized: ch.soloOversized,
      ms,
    });
  }

  return {
    chunkCount: chunks.length,
    estimatedBytes,
    chunkMs,
    soloOversizedKeys,
  };
};

// Gets multiple key-value pairs from the database.
// EDGE-OPT-A · A1 — order-preserving + null-fill (SELECT key, value → mgetWith).
// Kontrakt: values.length === keys.length, values[i] ↔ keys[i], null dla braków,
// duplikaty OK, keys=[] → [] bez zapytania. Rdzeń w ./kv-batch-order.ts.
export const mget = async (keys: string[]): Promise<any[]> => {
  return mgetWith(keys, async (ks) => {
    const supabase = client();
    const { data, error } = await supabase.from("kv_store_0afb8820").select("key, value").in("key", ks);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as { key: string; value: any }[];
  });
};

// Deletes multiple key-value pairs from the database.
export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_0afb8820").delete().in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
};

// Search for key-value pairs by prefix.
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase.from("kv_store_0afb8820").select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};
