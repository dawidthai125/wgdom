/**
 * TEST-HARNESS-01 H1 — tender seed / cleanup helpers (KV merge-append + tombstone)
 */
import { isPsbId } from "./markers.mjs";
import {
  PIPELINE_KEY,
  DELETED_IDS_KEY,
  asTenderList,
  asDeletedIds,
} from "./kv-client.mjs";

/**
 * @param {string} id
 * @param {string} [title]
 */
export function buildSandboxTenderItem(id, title) {
  const now = new Date().toISOString();
  const t = title || id;
  return {
    id,
    bzpNumber: `PSB-${id.slice(0, 24)}`,
    noticeNumber: `PSB-NOTICE-${id.slice(0, 16)}`,
    title: t,
    organizationName: "PSB Sandbox Harness",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45310000-3",
    publicationDate: now.slice(0, 10),
    submittingOffersDate: null,
    orderType: "services",
    tenderId: id,
    moIdentifier: "",
    status: "new",
    notes: "TEST-HARNESS-01 H1 sandbox — safe to delete",
    relevanceScore: 0,
    matchedKeywords: ["psb"],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: now,
    updatedAt: now,
    ezamowieniaUrl: "",
    uploadedFile: null,
    ourEstimatePln: null,
    linkedJobId: null,
    tenderState: null,
    tenderDossier: null,
    swzAnalysis: null,
  };
}

/**
 * @param {import("./kv-client.mjs").createKvClient extends Function ? any : never} kv
 * @param {object} item
 * @param {{ dryRun?: boolean, assertWritable: (e: {id:string,kind?:string}) => unknown }} opts
 */
export async function seedSandboxTender(kv, item, opts) {
  if (!isPsbId(item.id)) {
    throw new Error(`H1_SEED_DENIED: id must be psb-* (got ${item.id})`);
  }
  opts.assertWritable({ id: item.id, kind: "tender" });
  if (opts.dryRun) {
    return { dryRun: true, seeded: false };
  }
  const map = await kv.batchGet([PIPELINE_KEY]);
  const list = asTenderList(map[PIPELINE_KEY]);
  const idx = list.findIndex((x) => x && x.id === item.id);
  let next;
  if (idx >= 0) {
    // Idempotent re-seed of same psb-* id only
    next = list.map((x, i) => (i === idx ? { ...x, ...item, id: item.id } : x));
  } else {
    next = [...list, item];
  }
  await kv.batchSet([PIPELINE_KEY], [next]);
  return { dryRun: false, seeded: true, pipelineLen: next.length, upsert: idx >= 0 };
}

/**
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 * @param {string} tenderId
 * @param {{ dryRun?: boolean, assertWritable: (e: {id:string,kind?:string}) => unknown }} opts
 */
export async function cleanupSandboxTender(kv, tenderId, opts) {
  if (!isPsbId(tenderId)) {
    return { ok: false, detail: `not psb-* id: ${tenderId}` };
  }
  try {
    opts.assertWritable({ id: tenderId, kind: "tender" });
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
  if (opts.dryRun) {
    return { ok: true, detail: "dry-run skip" };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastDetail = "";

  // Retry: late browser batch-set can resurrect the item after filter write
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const map = await kv.batchGet([PIPELINE_KEY, DELETED_IDS_KEY]);
      const list = asTenderList(map[PIPELINE_KEY]);
      const deleted = asDeletedIds(map[DELETED_IDS_KEY]);
      const nextList = list.filter((x) => !(x && x.id === tenderId));
      const nextDeleted = deleted.includes(tenderId) ? deleted : [...deleted, tenderId];
      await kv.batchSet([PIPELINE_KEY, DELETED_IDS_KEY], [nextList, nextDeleted]);
      await sleep(800 * attempt);

      const verify = await kv.batchGet([PIPELINE_KEY, DELETED_IDS_KEY]);
      const vList = asTenderList(verify[PIPELINE_KEY]);
      const vDel = asDeletedIds(verify[DELETED_IDS_KEY]);
      if (vList.some((x) => x && x.id === tenderId)) {
        lastDetail = `still present after attempt ${attempt}`;
        continue;
      }
      if (!vDel.includes(tenderId)) {
        lastDetail = `missing tombstone after attempt ${attempt}`;
        continue;
      }
      return { ok: true, detail: `pipeline+tombstone OK (attempt ${attempt})` };
    } catch (e) {
      lastDetail = e instanceof Error ? e.message : String(e);
      await sleep(500);
    }
  }
  return { ok: false, detail: lastDetail || "cleanup retries exhausted" };
}

/**
 * Find sandbox item after mutations.
 * @param {ReturnType<import("./kv-client.mjs").createKvClient>} kv
 * @param {string} tenderId
 */
export async function fetchSandboxTender(kv, tenderId) {
  const map = await kv.batchGet([PIPELINE_KEY]);
  const list = asTenderList(map[PIPELINE_KEY]);
  return list.find((x) => x && x.id === tenderId) || null;
}
