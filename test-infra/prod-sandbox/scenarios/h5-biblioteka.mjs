/**
 * TEST-HARNESS-01 H5 — Biblioteka Production Sandbox (KV-only)
 *
 * Write-surface: kw-wgdom-work-catalog · cost-catalog REJECT
 * Create → keyword → edit → delete → PSB-001 cleanup
 * D5 ZERO Core — no cloud-sync / Edge / Payroll / Theme
 */
import { makePsbId } from "../markers.mjs";
import { loadAllowlist } from "../allowlist.mjs";
import { SessionEntityRegistry, createMutateGuard } from "../mutate-guard.mjs";
import { CleanupTracker, PSB_001_CLEANUP_GUARANTEE } from "../cleanup.mjs";
import { createKvClient } from "../kv-client.mjs";
import {
  assertH5KeysWritable,
  wrapKvWithH5ForbiddenGate,
  H5ForbiddenKeyError,
  H5_FORBIDDEN_WRITE_KEYS,
  WORK_CATALOG_KEY,
} from "../forbidden-keys.mjs";
import {
  coerceWorkCatalogStore,
  buildSandboxCatalogWork,
  resolveRegion,
  upsertPsbWork,
  editPsbWork,
  removePsbWork,
  findWorkById,
  countNonPsbBothRegions,
  nonPsbKeywordsFingerprint,
  workStillPresent,
} from "../catalog-helpers.mjs";

/**
 * @typedef {{ name: string, status: "PASS"|"FAIL"|"WARNING", detail: string }} StepResult
 */

/**
 * @param {{
 *   allowProd: boolean,
 *   dryRun: boolean,
 *   root: string,
 * }} ctx
 */
export async function runH5Biblioteka(ctx) {
  /** @type {StepResult[]} */
  const steps = [];
  const session = new SessionEntityRegistry();
  const cleanup = new CleanupTracker();
  const allowlist = loadAllowlist();
  const guard = createMutateGuard({
    allowlist,
    session,
    dryRun: ctx.dryRun,
  });

  /** @type {Record<string, unknown>} */
  const meta = {
    mode: "kv-only",
    writeKey: WORK_CATALOG_KEY,
    costCatalog: "REJECT",
  };

  function pass(name, detail) {
    steps.push({ name, status: "PASS", detail });
  }
  function fail(name, detail) {
    steps.push({ name, status: "FAIL", detail });
  }
  function warn(name, detail) {
    steps.push({ name, status: "WARNING", detail });
  }

  pass("h5.principle", "D-H5 work-catalog · KV-only · cost-catalog REJECT · RMW");

  if (!ctx.allowProd && !ctx.dryRun) {
    throw new Error("PSB_PRECONDITION: H5 requires --allow-prod (or --dry-run)");
  }

  // --- H5.1 FORBIDDEN gate self-check ---
  try {
    assertH5KeysWritable([WORK_CATALOG_KEY]);
    pass("h5.forbidden-allow", `${WORK_CATALOG_KEY} writable`);
  } catch (e) {
    fail("h5.forbidden-allow", e instanceof Error ? e.message : String(e));
  }

  try {
    assertH5KeysWritable(["kw-week-employees"]);
    fail("h5.forbidden-deny-payroll", "expected H5_FORBIDDEN_KEY for kw-week-employees");
  } catch (e) {
    if (e instanceof H5ForbiddenKeyError) {
      pass("h5.forbidden-deny-payroll", e.message);
    } else {
      fail("h5.forbidden-deny-payroll", String(e));
    }
  }

  try {
    assertH5KeysWritable(["kw-wgdom-cost-catalog"]);
    fail("h5.forbidden-deny-cost", "expected H5_FORBIDDEN_KEY for kw-wgdom-cost-catalog");
  } catch (e) {
    if (e instanceof H5ForbiddenKeyError) {
      pass("h5.forbidden-deny-cost", e.message);
    } else {
      fail("h5.forbidden-deny-cost", String(e));
    }
  }

  meta.forbiddenKeyCount = H5_FORBIDDEN_WRITE_KEYS.size;

  const catalogId = makePsbId("catalog");
  session.registerCreated(catalogId, "catalog");

  const rawKv = createKvClient(ctx.root);
  const kv = wrapKvWithH5ForbiddenGate(rawKv);

  /**
   * Cleanup: remove psb id from both regions via RMW.
   * @returns {Promise<{ ok: boolean, detail?: string }>}
   */
  async function cleanupCatalogWork() {
    if (ctx.dryRun) return { ok: true, detail: "dry-run" };
    guard.assertWritable({ id: catalogId, kind: "catalog" });
    const map = await kv.batchGet([WORK_CATALOG_KEY]);
    let store = coerceWorkCatalogStore(map[WORK_CATALOG_KEY]);
    if (!workStillPresent(store, catalogId)) {
      return { ok: true, detail: "already-absent" };
    }
    store = removePsbWork(store, catalogId);
    const res = await kv.batchSet([WORK_CATALOG_KEY], [store]);
    if (res && res.ok === false) {
      return {
        ok: false,
        detail: `batch-set failed: ${JSON.stringify(res).slice(0, 120)}`,
      };
    }
    return { ok: true, detail: "removed" };
  }

  cleanup.track({
    id: catalogId,
    kind: "catalog",
    cleanup: cleanupCatalogWork,
  });

  let scenarioStatus = /** @type {"PASS"|"FAIL"} */ ("PASS");
  let wrote = false;
  let region = /** @type {string} */ ("wroclaw");

  try {
    if (steps.some((s) => s.status === "FAIL")) {
      scenarioStatus = "FAIL";
      cleanup.untrack(catalogId);
      fail("h5.aborted", "preflight FORBIDDEN gate failed — skip write");
    } else if (ctx.dryRun) {
      pass(
        "h5.dry-run",
        `plan: get ${WORK_CATALOG_KEY} → create ${catalogId} → edit kw → delete → cleanup (writes=0)`,
      );
      pass("h5.create", `dry-run skip create ${catalogId}`);
      pass("h5.edit", "dry-run skip edit");
      pass("h5.delete", "dry-run skip delete");
      pass("h5.preservation", "dry-run skip preservation");
      warn("h5.ui", "KV-only — Playwright / Biblioteka UI not required for PASS");
      meta.region = null;
      meta.preservation = {
        nonPsbBefore: null,
        nonPsbAfter: null,
        nonPsbKeywordsUnchanged: null,
      };
      meta.mutatedIds = [];
    } else {
      const baselineMap = await kv.batchGet([WORK_CATALOG_KEY]);
      let store = coerceWorkCatalogStore(baselineMap[WORK_CATALOG_KEY]);
      region = resolveRegion(store);
      const nonPsbBefore = countNonPsbBothRegions(store);
      const kwFpBefore = nonPsbKeywordsFingerprint(store);
      pass(
        "h5.batch-get",
        `region=${region} nonPsbBoth=${nonPsbBefore} schema=${store.schemaVersion}`,
      );
      meta.region = region;

      guard.assertWritable({ id: catalogId, kind: "catalog" });
      const work = buildSandboxCatalogWork(catalogId);
      store = upsertPsbWork(store, /** @type {"wroclaw"|"dolnyslask"} */ (region), work);
      let setRes = await kv.batchSet([WORK_CATALOG_KEY], [store]);
      if (setRes && setRes.ok === false) {
        throw new Error(`PSB_KV_BATCH_SET_FAILED: create ${JSON.stringify(setRes).slice(0, 120)}`);
      }
      wrote = true;
      pass(
        "h5.create",
        `upserted id=${catalogId} keywords=${JSON.stringify(work.keywords)}`,
      );

      let afterMap = await kv.batchGet([WORK_CATALOG_KEY]);
      store = coerceWorkCatalogStore(afterMap[WORK_CATALOG_KEY]);
      let found = findWorkById(store, catalogId);
      if (!found) {
        fail("h5.create-parity", `sandbox id not found after create: ${catalogId}`);
        scenarioStatus = "FAIL";
      } else {
        const kws = Array.isArray(found.work.keywords)
          ? found.work.keywords.map(String)
          : [];
        if (!kws.includes("psb-h5-kw")) {
          fail("h5.create-parity", `keywords missing psb-h5-kw: ${JSON.stringify(kws)}`);
          scenarioStatus = "FAIL";
        } else {
          pass("h5.create-parity", `found keywords=${JSON.stringify(kws)}`);
        }
      }

      let nonPsbMid = countNonPsbBothRegions(store);
      if (nonPsbMid < nonPsbBefore) {
        fail("h5.preservation-create", `non-psb dropped ${nonPsbBefore} → ${nonPsbMid}`);
        scenarioStatus = "FAIL";
      } else {
        pass("h5.preservation-create", `nonPsb ${nonPsbBefore} → ${nonPsbMid}`);
      }

      // --- H5.3 Edit ---
      if (scenarioStatus === "PASS") {
        store = editPsbWork(store, catalogId, { keywords: ["psb-h5-kw-edited"] });
        setRes = await kv.batchSet([WORK_CATALOG_KEY], [store]);
        if (setRes && setRes.ok === false) {
          throw new Error(`PSB_KV_BATCH_SET_FAILED: edit ${JSON.stringify(setRes).slice(0, 120)}`);
        }
        afterMap = await kv.batchGet([WORK_CATALOG_KEY]);
        store = coerceWorkCatalogStore(afterMap[WORK_CATALOG_KEY]);
        found = findWorkById(store, catalogId);
        const kws = found && Array.isArray(found.work.keywords)
          ? found.work.keywords.map(String)
          : [];
        if (!kws.includes("psb-h5-kw-edited")) {
          fail("h5.edit", `edit keywords fail: ${JSON.stringify(kws)}`);
          scenarioStatus = "FAIL";
        } else {
          pass("h5.edit", `keywords=${JSON.stringify(kws)}`);
        }

        const kwFpAfterEdit = nonPsbKeywordsFingerprint(store);
        if (kwFpAfterEdit !== kwFpBefore) {
          fail(
            "h5.preservation-keywords",
            "non-psb keywords changed after edit (contamination)",
          );
          scenarioStatus = "FAIL";
        } else {
          pass("h5.preservation-keywords", "non-psb keywords unchanged");
        }

        nonPsbMid = countNonPsbBothRegions(store);
        if (nonPsbMid < nonPsbBefore) {
          fail("h5.preservation-edit", `non-psb dropped ${nonPsbBefore} → ${nonPsbMid}`);
          scenarioStatus = "FAIL";
        }
      }

      // --- H5.4 Delete ---
      if (scenarioStatus === "PASS") {
        store = removePsbWork(store, catalogId);
        setRes = await kv.batchSet([WORK_CATALOG_KEY], [store]);
        if (setRes && setRes.ok === false) {
          throw new Error(`PSB_KV_BATCH_SET_FAILED: delete ${JSON.stringify(setRes).slice(0, 120)}`);
        }
        afterMap = await kv.batchGet([WORK_CATALOG_KEY]);
        store = coerceWorkCatalogStore(afterMap[WORK_CATALOG_KEY]);
        if (workStillPresent(store, catalogId)) {
          fail("h5.delete", `id still present after delete: ${catalogId}`);
          scenarioStatus = "FAIL";
        } else {
          pass("h5.delete", `removed ${catalogId}`);
        }

        const nonPsbAfter = countNonPsbBothRegions(store);
        if (nonPsbAfter < nonPsbBefore) {
          fail("h5.preservation", `non-psb dropped ${nonPsbBefore} → ${nonPsbAfter}`);
          scenarioStatus = "FAIL";
        } else {
          pass("h5.preservation", `nonPsb before=${nonPsbBefore} after=${nonPsbAfter}`);
        }

        meta.preservation = {
          nonPsbBefore,
          nonPsbAfter,
          nonPsbKeywordsUnchanged: true,
        };
        meta.mutatedIds = [catalogId];
      } else {
        meta.preservation = {
          nonPsbBefore,
          nonPsbAfter: countNonPsbBothRegions(store),
          nonPsbKeywordsUnchanged: false,
        };
        meta.mutatedIds = [catalogId];
      }

      warn("h5.ui", "KV-only — Playwright / Biblioteka UI not required for PASS");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("H5_FORBIDDEN_KEY") || e instanceof H5ForbiddenKeyError) {
      fail("h5.forbidden-runtime", msg);
    } else if (msg.startsWith("PSB_MUTATE_DENIED") || msg.startsWith("PSB_KV_")) {
      fail("h5.write", msg);
    } else {
      fail("h5.error", msg);
    }
    scenarioStatus = "FAIL";
    if (!wrote && !ctx.dryRun) {
      cleanup.untrack(catalogId);
    }
  }

  const cleanupResult = await cleanup.runAll();

  // Dual-region leftover verify after cleanup (allow-prod path that wrote)
  if (!ctx.dryRun && wrote && cleanupResult.status === "PASS") {
    try {
      const verifyMap = await kv.batchGet([WORK_CATALOG_KEY]);
      const verifyStore = coerceWorkCatalogStore(verifyMap[WORK_CATALOG_KEY]);
      if (workStillPresent(verifyStore, catalogId)) {
        cleanupResult.status = "FAIL";
        cleanupResult.leftovers.push({
          id: catalogId,
          kind: "catalog",
          detail: "still present in kw-wgdom-work-catalog after cleanup",
        });
      }
    } catch (e) {
      cleanupResult.status = "FAIL";
      cleanupResult.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (cleanupResult.status === "PASS" && cleanupResult.code === PSB_001_CLEANUP_GUARANTEE) {
    pass(
      "h5.cleanup",
      `cleaned=${cleanupResult.cleaned.join(",") || "(none)"} (${PSB_001_CLEANUP_GUARANTEE})`,
    );
  } else {
    fail(
      "h5.cleanup",
      `leftovers=${JSON.stringify(cleanupResult.leftovers)} errors=${(cleanupResult.errors || []).join(";")}`,
    );
  }

  if (steps.some((s) => s.status === "FAIL")) {
    scenarioStatus = "FAIL";
  }

  return {
    scenarioStatus,
    steps,
    cleanupResult,
    allowlistSummary: {
      jobs: allowlist.jobIds.length,
      tenders: allowlist.tenderIds.length,
      catalog: allowlist.catalogRowIds.length,
      sources: allowlist.sources,
    },
    sessionRemaining: session
      .listCreated()
      .filter((x) => cleanup.listTracked().every((t) => t.id !== x.id)),
    meta,
  };
}
