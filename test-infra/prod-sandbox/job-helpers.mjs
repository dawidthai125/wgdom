/**
 * TEST-HARNESS-01 H2 — job seed / cleanup helpers (KV merge-append + tombstone)
 */
import { isPsbId } from "./markers.mjs";
import { asDeletedIds } from "./kv-client.mjs";

export const JOBS_KEY = "kw-jobs";
export const JOBS_DELETED_IDS_KEY = "kw-jobs-deleted-ids";

const DOC_TYPES = [
  "zlecenie",
  "zakres",
  "kosztorys",
  "kominiarz",
  "pomiary",
  "oswiadczenia",
  "gwarancje",
  "rysunek",
  "zdjecia",
];

/**
 * @param {unknown} raw
 */
export function asJobList(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === "object" && Array.isArray(/** @type {any} */ (raw).items)) {
    return /** @type {any} */ (raw).items;
  }
  return [];
}

/**
 * Minimal Job for UI list + photos tab (always-create sandbox).
 * @param {string} id
 * @param {{ address?: string }} [opts]
 */
export function buildSandboxJob(id, opts = {}) {
  const now = new Date().toISOString();
  const address = opts.address || `PSB H2 ${id}`;
  return {
    id,
    address,
    flatNumber: "H2",
    client: "PSB Sandbox Harness",
    startDate: now.slice(0, 10),
    endDate: "",
    status: "in_progress",
    keysHandedOver: false,
    notes: "TEST-HARNESS-01 H2 sandbox — safe to delete",
    documents: Object.fromEntries(DOC_TYPES.map((d) => [d, false])),
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    deletedPhotoTombstones: [],
    workerReports: [],
    activityLog: [],
    updatedAt: now,
    /** Required by validateJobAssignedInspectorForSave (JobsView.updateJob) — delete path uses updateJob */
    assignedInspectorId: "szymon",
    meta: { harnessSandbox: true, program: "TEST-HARNESS-01", slice: "H2" },
  };
}

/**
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 * @param {object} job
 * @param {{ dryRun?: boolean, assertWritable: (e: {id:string,kind?:string}) => unknown }} opts
 */
export async function seedSandboxJob(kv, job, opts) {
  if (!isPsbId(job.id)) {
    throw new Error(`H2_SEED_DENIED: id must be psb-* (got ${job.id})`);
  }
  opts.assertWritable({ id: job.id, kind: "job" });
  if (opts.dryRun) {
    return { dryRun: true, seeded: false };
  }
  const map = await kv.batchGet([JOBS_KEY]);
  const list = asJobList(map[JOBS_KEY]);
  const idx = list.findIndex((x) => x && x.id === job.id);
  let next;
  if (idx >= 0) {
    next = list.map((x, i) => (i === idx ? { ...x, ...job, id: job.id } : x));
  } else {
    next = [...list, job];
  }
  await kv.batchSet([JOBS_KEY], [next]);
  return { dryRun: false, seeded: true, jobsLen: next.length, upsert: idx >= 0 };
}

/**
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 * @param {string} jobId
 * @param {{ dryRun?: boolean, assertWritable: (e: {id:string,kind?:string}) => unknown }} opts
 */
export async function cleanupSandboxJob(kv, jobId, opts) {
  if (!isPsbId(jobId)) {
    return { ok: false, detail: `not psb-* id: ${jobId}` };
  }
  try {
    opts.assertWritable({ id: jobId, kind: "job" });
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
  if (opts.dryRun) {
    return { ok: true, detail: "dry-run skip" };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastDetail = "";

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const map = await kv.batchGet([JOBS_KEY, JOBS_DELETED_IDS_KEY]);
      const list = asJobList(map[JOBS_KEY]);
      const deleted = asDeletedIds(map[JOBS_DELETED_IDS_KEY]);
      const nextList = list.filter((x) => !(x && x.id === jobId));
      const nextDeleted = deleted.includes(jobId) ? deleted : [...deleted, jobId];
      await kv.batchSet([JOBS_KEY, JOBS_DELETED_IDS_KEY], [nextList, nextDeleted]);
      await sleep(800 * attempt);

      const verify = await kv.batchGet([JOBS_KEY, JOBS_DELETED_IDS_KEY]);
      const vList = asJobList(verify[JOBS_KEY]);
      const vDel = asDeletedIds(verify[JOBS_DELETED_IDS_KEY]);
      if (vList.some((x) => x && x.id === jobId)) {
        lastDetail = `still present after attempt ${attempt}`;
        continue;
      }
      if (!vDel.includes(jobId)) {
        lastDetail = `missing tombstone after attempt ${attempt}`;
        continue;
      }
      return { ok: true, detail: `jobs+tombstone OK (attempt ${attempt})` };
    } catch (e) {
      lastDetail = e instanceof Error ? e.message : String(e);
      await sleep(500);
    }
  }
  return { ok: false, detail: lastDetail || "cleanup retries exhausted" };
}

/**
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 * @param {string} jobId
 */
export async function fetchSandboxJob(kv, jobId) {
  const map = await kv.batchGet([JOBS_KEY]);
  const list = asJobList(map[JOBS_KEY]);
  return list.find((x) => x && x.id === jobId) || null;
}
