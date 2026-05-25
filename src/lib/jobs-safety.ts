/** Lokalne kopie zapasowe listy robót (przed sync do chmury). */
const LOCAL_SNAPS_KEY = "kw-jobs-local-snaps";
const LAST_GOOD_KEY = "kw-jobs-last-good";
const MAX_SNAPS = 12;

export interface JobsLocalSnap {
  at: string;
  jobs: unknown[];
}

export function saveLocalJobsSnapshot(jobs: unknown[]): void {
  if (!jobs.length) return;
  try {
    localStorage.setItem(LAST_GOOD_KEY, JSON.stringify(jobs));
    const snaps: JobsLocalSnap[] = JSON.parse(localStorage.getItem(LOCAL_SNAPS_KEY) || "[]");
    const last = snaps[0];
    if (last && last.jobs.length === jobs.length) {
      const sameIds =
        JSON.stringify((last.jobs as { id?: string }[]).map((j) => j.id).sort()) ===
        JSON.stringify((jobs as { id?: string }[]).map((j) => j.id).sort());
      if (sameIds) return;
    }
    snaps.unshift({ at: new Date().toISOString(), jobs });
    localStorage.setItem(LOCAL_SNAPS_KEY, JSON.stringify(snaps.slice(0, MAX_SNAPS)));
  } catch {
    /* ignore quota */
  }
}

export function listLocalJobsSnapshots(): JobsLocalSnap[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SNAPS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function restoreLocalJobsSnapshot(index = 0): unknown[] | null {
  const snaps = listLocalJobsSnapshots();
  const snap = snaps[index];
  if (!snap?.jobs?.length) return null;
  try {
    localStorage.setItem("kw-jobs", JSON.stringify(snap.jobs));
  } catch {
    return null;
  }
  return snap.jobs;
}

export function restoreLastGoodJobs(): unknown[] | null {
  try {
    const raw = localStorage.getItem(LAST_GOOD_KEY);
    if (!raw) return null;
    const jobs = JSON.parse(raw);
    if (!Array.isArray(jobs) || jobs.length === 0) return null;
    localStorage.setItem("kw-jobs", raw);
    return jobs;
  } catch {
    return null;
  }
}
