/**
 * EDGE-OPT-A · A1 — czysty rdzeń order-preserving batch fetch (SSOT).
 * Bez zależności Deno/jsr → importowalny zarówno przez kv_store.tsx (Edge/Deno),
 * jak i przez testy (vite-node). Zero Duplicate Logic: kv.mget deleguje tutaj.
 *
 * Kontrakt (DESIGN FREEZE §4):
 *  - values.length === keys.length
 *  - values[i] odpowiada keys[i] (mapowanie pozycyjne, kolejność wejścia)
 *  - null dla klucza nieobecnego w wyniku
 *  - duplikaty kluczy obsłużone (keys=[k,k] → [v,v])
 *  - keys=[] → [] BEZ zapytania (guard w mgetWith)
 *  - błąd zapytania propaguje się (throw) — realizuje fetchRows
 */

export type KvRow = { key: string; value: unknown };

/** Ułóż wartości wierszy w kolejności `keys`, null dla braków, duplikaty OK. */
export function orderValuesByKeys(keys: string[], rows: KvRow[]): unknown[] {
  const byKey = new Map<string, unknown>();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r && typeof r === "object" && "key" in r) {
      byKey.set((r as KvRow).key, (r as KvRow).value);
    }
  }
  return keys.map((k) => (byKey.has(k) ? byKey.get(k) : null));
}

/**
 * Order-preserving batch read z wstrzykiwanym pobraniem wierszy (testowalne).
 * Pusta lista → [] bez wywołania fetchRows (zero zapytań do DB).
 */
export async function mgetWith(
  keys: string[],
  fetchRows: (keys: string[]) => Promise<KvRow[]>,
): Promise<unknown[]> {
  if (!Array.isArray(keys) || keys.length === 0) return [];
  const rows = await fetchRows(keys);
  return orderValuesByKeys(keys, rows);
}
