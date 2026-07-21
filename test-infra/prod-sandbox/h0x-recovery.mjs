/**
 * TEST-HARNESS-01 H0.x — Cross-process recovery + optional KV scan
 * Order: lock (caller) → ledger recover → optional scan (D-H0X-10)
 */
import { isPsbId } from "./markers.mjs";
import {
  ledgerListRecoverable,
  ledgerSetStatus,
  ledgerPrune,
  ledgerCloseAndPrune,
} from "./persist-ledger.mjs";
import {
  runCleaner,
  inferKindFromId,
  H0X_SCAN_KEYS,
  defaultKvKeyForKind,
} from "./cleaner-registry.mjs";
import { PIPELINE_KEY, asTenderList } from "./kv-client.mjs";
import { JOBS_KEY, asJobList } from "./job-helpers.mjs";
import {
  WORK_CATALOG_KEY,
  coerceWorkCatalogStore,
  listWorks,
} from "./catalog-helpers.mjs";

/**
 * @param {{
 *   kv: { batchGet: Function, batchSet: Function },
 *   dryRun?: boolean,
 *   allowProd?: boolean,
 *   scan?: boolean,
 *   assertWritable?: (e: { id: string, kind?: string }) => unknown,
 * }} opts
 */
export async function recoverOpenEntities(opts) {
  const dryRun = !!opts.dryRun;
  const allowProd = !!opts.allowProd;
  const scan = !!opts.scan;
  const assertWritable =
    opts.assertWritable ||
    ((e) => {
      if (!isPsbId(e.id)) throw new Error(`PSB_MUTATE_DENIED: ${e.id}`);
    });

  /** @type {{ id: string, kind: string, detail: string, status: string }[]} */
  const recovered = [];
  /** @type {{ id: string, kind: string, detail: string }[]} */
  const leftovers = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const prunedPending = [];

  const list = await ledgerListRecoverable();

  for (const ent of list) {
    const kind = ent.kind || inferKindFromId(ent.id) || "other";
    const kvKey = ent.kvKey || defaultKvKeyForKind(kind);

    if (dryRun || !allowProd) {
      recovered.push({
        id: ent.id,
        kind,
        detail: "dry-run/plan — skip KV cleanup",
        status: ent.status,
      });
      continue;
    }

    if (ent.status === "pending") {
      // May never have landed in KV — verify absent then prune
      const present = await entityPresent(opts.kv, kind, ent.id, kvKey);
      if (!present) {
        await ledgerPrune(ent.id);
        prunedPending.push(ent.id);
        recovered.push({
          id: ent.id,
          kind,
          detail: "pending+absent pruned",
          status: "pending",
        });
        continue;
      }
    }

    try {
      await ledgerSetStatus(ent.id, "cleaning");
    } catch {
      /* best-effort */
    }

    let cleanResult;
    try {
      cleanResult = await runCleaner({
        kind,
        id: ent.id,
        kvKey,
        kv: opts.kv,
        dryRun: false,
        assertWritable,
        meta: ent.meta,
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      leftovers.push({ id: ent.id, kind, detail });
      continue;
    }

    const still = await entityPresent(opts.kv, kind, ent.id, kvKey);
    if (cleanResult?.ok && !still) {
      await ledgerCloseAndPrune(ent.id);
      recovered.push({
        id: ent.id,
        kind,
        detail: cleanResult.detail || "cleaned",
        status: ent.status,
      });
    } else {
      leftovers.push({
        id: ent.id,
        kind,
        detail:
          cleanResult?.detail ||
          (still ? "still present after cleaner" : "cleaner ok:false"),
      });
    }
  }

  let scanRemoved = 0;
  if (scan && allowProd && !dryRun) {
    const discovered = await discoverScanOrphans(opts.kv);
    for (const d of discovered) {
      // Skip if still in leftovers handling
      if (leftovers.some((L) => L.id === d.id)) continue;
      if (list.some((e) => e.id === d.id && leftovers.some((L) => L.id === e.id))) {
        continue;
      }
      try {
        const r = await runCleaner({
          kind: d.kind,
          id: d.id,
          kvKey: d.kvKey,
          kv: opts.kv,
          dryRun: false,
          assertWritable,
        });
        const still = await entityPresent(opts.kv, d.kind, d.id, d.kvKey);
        if (r.ok && !still) {
          scanRemoved += 1;
          await ledgerPrune(d.id);
        } else {
          warnings.push(`scan leftover ${d.id}: ${r.detail || "present"}`);
        }
      } catch (e) {
        warnings.push(
          `scan skip ${d.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  } else if (scan && (dryRun || !allowProd)) {
    warnings.push("scan planned but skipped (need --allow-prod)");
  }

  const status = leftovers.length > 0 ? "FAIL" : "PASS";
  return {
    status,
    recovered,
    leftovers,
    prunedPending,
    scanRemoved,
    warnings,
    scanned: scan,
  };
}

/**
 * @param {any} kv
 * @param {string} kind
 * @param {string} id
 * @param {string} kvKey
 */
async function entityPresent(kv, kind, id, kvKey) {
  try {
    if (kind === "tender" || kind === "cloud") {
      const map = await kv.batchGet([PIPELINE_KEY]);
      return asTenderList(map[PIPELINE_KEY]).some((x) => x && x.id === id);
    }
    if (kind === "job") {
      const map = await kv.batchGet([JOBS_KEY]);
      return asJobList(map[JOBS_KEY]).some((x) => x && x.id === id);
    }
    if (kind === "catalog") {
      const map = await kv.batchGet([WORK_CATALOG_KEY]);
      const store = coerceWorkCatalogStore(map[WORK_CATALOG_KEY]);
      for (const region of ["wroclaw", "dolnyslask"]) {
        if (listWorks(store, region).some((w) => w && w.id === id)) return true;
      }
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * @param {any} kv
 */
async function discoverScanOrphans(kv) {
  /** @type {{ id: string, kind: string, kvKey: string }[]} */
  const out = [];
  try {
    const map = await kv.batchGet(H0X_SCAN_KEYS);
    const tenders = asTenderList(map[PIPELINE_KEY]);
    for (const t of tenders) {
      if (!t?.id || !isPsbId(t.id)) continue;
      const kind = inferKindFromId(t.id);
      if (!kind || (kind !== "tender" && kind !== "cloud")) {
        // unmappable → skip (WARNING at caller if needed)
        continue;
      }
      out.push({ id: t.id, kind, kvKey: PIPELINE_KEY });
    }
    const jobs = asJobList(map[JOBS_KEY]);
    for (const j of jobs) {
      if (!j?.id || !isPsbId(j.id)) continue;
      if (!String(j.id).startsWith("psb-job-")) continue;
      out.push({ id: j.id, kind: "job", kvKey: JOBS_KEY });
    }
    const store = coerceWorkCatalogStore(map[WORK_CATALOG_KEY]);
    for (const region of ["wroclaw", "dolnyslask"]) {
      for (const w of listWorks(store, region)) {
        if (!w?.id || !isPsbId(w.id)) continue;
        out.push({ id: w.id, kind: "catalog", kvKey: WORK_CATALOG_KEY });
      }
    }
  } catch (e) {
    /* scan best-effort */
  }
  // dedupe by id
  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
}
