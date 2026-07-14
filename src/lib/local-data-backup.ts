/**
 * LOCALSTORAGE-ARCH-02 A — lokalne snapshoty DATA_KEYS → IndexedDB (nie LS).
 */

import { DATA_KEYS, OPERATIONAL_NOTES_BACKUP_AUX_KEYS, type DataKey } from "@/lib/cloud-sync";
import { idbGet, idbSet } from "@/lib/storage/storage-idb";
import { estimateJsonBytes } from "@/lib/storage/storage-budget";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

const SNAPSHOT_KEY = "kw-local-snapshot-bundle";
const SNAPSHOT_PREV_KEY = "kw-local-snapshot-bundle-prev";
const IDB_CURRENT = "local-data-snapshot:current";
const IDB_PREV = "local-data-snapshot:prev";

export interface LocalDataSnapshot {
  at: string;
  data: Partial<Record<DataKey, unknown>> & Record<string, unknown>;
}

let memCurrent: LocalDataSnapshot | null = null;
let memPrev: LocalDataSnapshot | null = null;
let migrated = false;

function clearLegacyLs(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
    localStorage.removeItem(SNAPSHOT_PREV_KEY);
  } catch {
    /* ignore */
  }
}

function migrateLegacyLsSync(): void {
  if (migrated) return;
  migrated = true;
  try {
    const curRaw = localStorage.getItem(SNAPSHOT_KEY);
    if (curRaw) {
      memCurrent = JSON.parse(curRaw) as LocalDataSnapshot;
      void idbSet(IDB_CURRENT, memCurrent);
      recordStorageWrite({
        key: IDB_CURRENT,
        bytes: estimateJsonBytes(memCurrent),
        writer: "local-data-backup.migrate",
        ok: true,
        tier: 2,
        note: "migrate LS→IDB current",
      });
    }
    const prevRaw = localStorage.getItem(SNAPSHOT_PREV_KEY);
    if (prevRaw) {
      memPrev = JSON.parse(prevRaw) as LocalDataSnapshot;
      void idbSet(IDB_PREV, memPrev);
      recordStorageWrite({
        key: IDB_PREV,
        bytes: estimateJsonBytes(memPrev),
        writer: "local-data-backup.migrate",
        ok: true,
        tier: 2,
        note: "migrate LS→IDB prev",
      });
    }
  } catch {
    /* ignore */
  }
  clearLegacyLs();
  void hydrateFromIdb();
}

async function hydrateFromIdb(): Promise<void> {
  if (!memCurrent) {
    const cur = await idbGet<LocalDataSnapshot>(IDB_CURRENT);
    if (cur) memCurrent = cur;
  }
  if (!memPrev) {
    const prev = await idbGet<LocalDataSnapshot>(IDB_PREV);
    if (prev) memPrev = prev;
  }
}

export function readLocalDataBundle(): Partial<Record<DataKey, unknown>> & Record<string, unknown> {
  const bundle: Partial<Record<DataKey, unknown>> & Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) bundle[key] = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  for (const key of OPERATIONAL_NOTES_BACKUP_AUX_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) bundle[key] = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return bundle;
}

/** Rotacja: bieżący → prev, nowy zapis w IndexedDB. */
export function saveLocalDataSnapshot(): void {
  migrateLegacyLsSync();
  if (memCurrent) memPrev = memCurrent;
  memCurrent = {
    at: new Date().toISOString(),
    data: readLocalDataBundle(),
  };
  const bytes = estimateJsonBytes(memCurrent);
  void idbSet(IDB_CURRENT, memCurrent).then((ok) => {
    recordStorageWrite({
      key: IDB_CURRENT,
      bytes,
      writer: "local-data-backup.save",
      ok,
      tier: 2,
    });
  });
  if (memPrev) {
    void idbSet(IDB_PREV, memPrev);
  }
  clearLegacyLs();
}

export function listLocalDataSnapshots(): { label: string; at: string; usePrev: boolean }[] {
  migrateLegacyLsSync();
  const out: { label: string; at: string; usePrev: boolean }[] = [];
  if (memCurrent?.at) {
    out.push({ label: "Ostatnia kopia lokalna", at: memCurrent.at, usePrev: false });
  }
  if (memPrev?.at) {
    out.push({ label: "Poprzednia kopia lokalna", at: memPrev.at, usePrev: true });
  }
  return out;
}

export function restoreLocalDataSnapshot(usePrev = false): LocalDataSnapshot | null {
  migrateLegacyLsSync();
  const snap = usePrev ? memPrev : memCurrent;
  if (!snap?.data) return null;
  try {
    for (const [key, val] of Object.entries(snap.data)) {
      if (val != null) {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch {
          /* quota — partial restore */
        }
      }
    }
    return snap;
  } catch {
    return null;
  }
}
