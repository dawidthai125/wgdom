/**
 * LOCALSTORAGE-ARCH-02 E — audit log ring w IndexedDB (+ mem), bez pełnego LS.
 * cloud-sync merge NIE zmieniany — domain writers czyścia LS po zapisie.
 */

import { idbGet, idbSet } from "@/lib/storage/storage-idb";
import { estimateJsonBytes } from "@/lib/storage/storage-budget";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

const caches = new Map<string, unknown[]>();
const migrated = new Set<string>();

export function readAuditRingLocal<T>(lsKey: string, idbKey: string, normalize: (raw: unknown) => T[]): T[] {
  migrateAuditRingSync(lsKey, idbKey, normalize);
  const mem = caches.get(idbKey);
  if (Array.isArray(mem)) return normalize(mem);
  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return [];
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

function migrateAuditRingSync<T>(
  lsKey: string,
  idbKey: string,
  normalize: (raw: unknown) => T[],
): void {
  if (migrated.has(idbKey)) return;
  migrated.add(idbKey);
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      const list = normalize(JSON.parse(raw));
      caches.set(idbKey, list as unknown[]);
      void idbSet(idbKey, list);
      localStorage.removeItem(lsKey);
      recordStorageWrite({
        key: idbKey,
        bytes: estimateJsonBytes(list),
        writer: "audit-ring.migrate",
        ok: true,
        tier: 2,
        note: `from ${lsKey}`,
      });
    }
  } catch {
    /* ignore */
  }
  void idbGet<unknown[]>(idbKey).then((v) => {
    if (Array.isArray(v) && !caches.has(idbKey)) caches.set(idbKey, v);
  });
}

export function writeAuditRingLocal<T>(
  lsKey: string,
  idbKey: string,
  entries: T[],
  writer: string,
): void {
  caches.set(idbKey, entries as unknown[]);
  const bytes = estimateJsonBytes(entries);
  void idbSet(idbKey, entries).then((ok) => {
    recordStorageWrite({
      key: idbKey,
      bytes,
      writer,
      ok,
      tier: 2,
    });
  });
  try {
    localStorage.removeItem(lsKey);
  } catch {
    /* ignore */
  }
}
