/** Lokalne kopie zapasowe przed synchronizacją z chmurą (to urządzenie). */

import { DATA_KEYS, OPERATIONAL_NOTES_BACKUP_AUX_KEYS, type DataKey } from "@/lib/cloud-sync";

const SNAPSHOT_KEY = "kw-local-snapshot-bundle";
const SNAPSHOT_PREV_KEY = "kw-local-snapshot-bundle-prev";

export interface LocalDataSnapshot {
  at: string;
  data: Partial<Record<DataKey, unknown>> & Record<string, unknown>;
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

/** Rotacja: bieżący → prev, nowy zapis. Wywołuj przed push do chmury. */
export function saveLocalDataSnapshot(): void {
  try {
    const current = localStorage.getItem(SNAPSHOT_KEY);
    if (current) localStorage.setItem(SNAPSHOT_PREV_KEY, current);
    const snap: LocalDataSnapshot = {
      at: new Date().toISOString(),
      data: readLocalDataBundle(),
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function listLocalDataSnapshots(): { label: string; at: string; usePrev: boolean }[] {
  const out: { label: string; at: string; usePrev: boolean }[] = [];
  try {
    const cur = localStorage.getItem(SNAPSHOT_KEY);
    if (cur) {
      const s = JSON.parse(cur) as LocalDataSnapshot;
      out.push({ label: "Ostatnia kopia lokalna", at: s.at, usePrev: false });
    }
    const prev = localStorage.getItem(SNAPSHOT_PREV_KEY);
    if (prev) {
      const s = JSON.parse(prev) as LocalDataSnapshot;
      out.push({ label: "Poprzednia kopia lokalna", at: s.at, usePrev: true });
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function restoreLocalDataSnapshot(usePrev = false): LocalDataSnapshot | null {
  try {
    const raw = localStorage.getItem(usePrev ? SNAPSHOT_PREV_KEY : SNAPSHOT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as LocalDataSnapshot;
    for (const [key, val] of Object.entries(snap.data)) {
      if (val != null) localStorage.setItem(key, JSON.stringify(val));
    }
    return snap;
  } catch {
    return null;
  }
}
