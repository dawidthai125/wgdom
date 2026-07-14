/**
 * LOCALSTORAGE-ARCH-02 B — lokalne snapshoty jobs → IndexedDB (nie LS).
 */

import { idbGet, idbSet } from "@/lib/storage/storage-idb";
import { estimateJsonBytes } from "@/lib/storage/storage-budget";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

const LOCAL_SNAPS_KEY = "kw-jobs-local-snaps";
const LAST_GOOD_KEY = "kw-jobs-last-good";
const MAX_SNAPS = 12;
const IDB_SNAPS = "jobs-local-snaps";
const IDB_LAST_GOOD = "jobs-last-good";

export interface JobsLocalSnap {
  at: string;
  jobs: unknown[];
}

let memSnaps: JobsLocalSnap[] = [];
let memLastGood: unknown[] | null = null;
let migrated = false;

function clearLegacyLs(): void {
  try {
    localStorage.removeItem(LOCAL_SNAPS_KEY);
    localStorage.removeItem(LAST_GOOD_KEY);
  } catch {
    /* ignore */
  }
}

function migrateLegacyLsSync(): void {
  if (migrated) return;
  migrated = true;
  try {
    const snapsRaw = localStorage.getItem(LOCAL_SNAPS_KEY);
    if (snapsRaw) {
      const parsed = JSON.parse(snapsRaw);
      if (Array.isArray(parsed)) {
        memSnaps = parsed as JobsLocalSnap[];
        void idbSet(IDB_SNAPS, memSnaps);
      }
    }
    const lastRaw = localStorage.getItem(LAST_GOOD_KEY);
    if (lastRaw) {
      const jobs = JSON.parse(lastRaw);
      if (Array.isArray(jobs)) {
        memLastGood = jobs;
        void idbSet(IDB_LAST_GOOD, jobs);
      }
    }
  } catch {
    /* ignore */
  }
  clearLegacyLs();
  void hydrateFromIdb();
}

async function hydrateFromIdb(): Promise<void> {
  if (memSnaps.length === 0) {
    const snaps = await idbGet<JobsLocalSnap[]>(IDB_SNAPS);
    if (Array.isArray(snaps)) memSnaps = snaps;
  }
  if (!memLastGood) {
    const jobs = await idbGet<unknown[]>(IDB_LAST_GOOD);
    if (Array.isArray(jobs)) memLastGood = jobs;
  }
}

export function saveLocalJobsSnapshot(jobs: unknown[]): void {
  if (!jobs.length) return;
  migrateLegacyLsSync();
  memLastGood = jobs;
  void idbSet(IDB_LAST_GOOD, jobs).then((ok) => {
    recordStorageWrite({
      key: IDB_LAST_GOOD,
      bytes: estimateJsonBytes(jobs),
      writer: "jobs-safety.saveLastGood",
      ok,
      tier: 2,
    });
  });

  const last = memSnaps[0];
  if (last && last.jobs.length === jobs.length) {
    const sameIds =
      JSON.stringify((last.jobs as { id?: string }[]).map((j) => j.id).sort()) ===
      JSON.stringify((jobs as { id?: string }[]).map((j) => j.id).sort());
    if (sameIds) {
      clearLegacyLs();
      return;
    }
  }
  memSnaps = [{ at: new Date().toISOString(), jobs }, ...memSnaps].slice(0, MAX_SNAPS);
  void idbSet(IDB_SNAPS, memSnaps).then((ok) => {
    recordStorageWrite({
      key: IDB_SNAPS,
      bytes: estimateJsonBytes(memSnaps),
      writer: "jobs-safety.saveSnaps",
      ok,
      tier: 2,
    });
  });
  clearLegacyLs();
}

export function listLocalJobsSnapshots(): JobsLocalSnap[] {
  migrateLegacyLsSync();
  return memSnaps.slice();
}

export function restoreLocalJobsSnapshot(index = 0): unknown[] | null {
  migrateLegacyLsSync();
  const snap = memSnaps[index];
  if (!snap?.jobs?.length) return null;
  try {
    localStorage.setItem("kw-jobs", JSON.stringify(snap.jobs));
  } catch {
    return null;
  }
  return snap.jobs;
}

export function restoreLastGoodJobs(): unknown[] | null {
  migrateLegacyLsSync();
  if (!Array.isArray(memLastGood) || memLastGood.length === 0) return null;
  try {
    localStorage.setItem("kw-jobs", JSON.stringify(memLastGood));
    return memLastGood;
  } catch {
    return null;
  }
}
