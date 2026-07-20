/**
 * TEST-HARNESS-01 H4 — Cloud Production Sandbox (KV-only)
 *
 * DF: nested psb-* on kw-tenders-pipeline via kv-client + H1 tender-helpers.
 * Reuse buildSandboxTenderItem / seedSandboxTender / cleanupSandboxTender / fetchSandboxTender.
 * Telemetry = soft WARNING only (no Playwright / no __wgdomSyncMetrics required for PASS).
 * D5 ZERO Core — no cloud-sync / Edge / Payroll / Theme.
 */
import { makePsbId, isPsbId } from "../markers.mjs";
import { loadAllowlist } from "../allowlist.mjs";
import { SessionEntityRegistry, createMutateGuard } from "../mutate-guard.mjs";
import { CleanupTracker, PSB_001_CLEANUP_GUARANTEE } from "../cleanup.mjs";
import {
  createKvClient,
  PIPELINE_KEY,
  DELETED_IDS_KEY,
  asTenderList,
} from "../kv-client.mjs";
import {
  buildSandboxTenderItem,
  seedSandboxTender,
  cleanupSandboxTender,
  fetchSandboxTender,
} from "../tender-helpers.mjs";
import {
  assertH4KeysWritable,
  wrapKvWithH4ForbiddenGate,
  H4ForbiddenKeyError,
  H4_FORBIDDEN_WRITE_KEYS,
} from "../forbidden-keys.mjs";

/** Soft metrics principle — never FAIL on retries=0 */
export const H4_SOFT_METRICS = "H4-SOFT-METRICS";

/**
 * @typedef {{ name: string, status: "PASS"|"FAIL"|"WARNING", detail: string }} StepResult
 */

/**
 * @param {unknown[]} list
 */
function countNonPsb(list) {
  return list.filter(
    (x) => x && typeof x === "object" && !isPsbId(/** @type {{id?:string}} */ (x).id),
  ).length;
}

/**
 * @param {{
 *   allowProd: boolean,
 *   dryRun: boolean,
 *   root: string,
 * }} ctx
 */
export async function runH4Cloud(ctx) {
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
    pipelineKey: PIPELINE_KEY,
    deletedIdsKey: DELETED_IDS_KEY,
    softMetrics: H4_SOFT_METRICS,
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

  pass("h4.principle", "D-H4 nested psb-* · KV-only · reuse H1 tender-helpers");

  if (!ctx.allowProd && !ctx.dryRun) {
    throw new Error("PSB_PRECONDITION: H4 requires --allow-prod (or --dry-run)");
  }

  // --- H4.1 FORBIDDEN gate self-check ---
  try {
    assertH4KeysWritable([PIPELINE_KEY]);
    assertH4KeysWritable([PIPELINE_KEY, DELETED_IDS_KEY]);
    pass("h4.forbidden-allow", `${PIPELINE_KEY}+${DELETED_IDS_KEY} writable`);
  } catch (e) {
    fail("h4.forbidden-allow", e instanceof Error ? e.message : String(e));
  }

  try {
    assertH4KeysWritable(["kw-week-employees"]);
    fail("h4.forbidden-deny", "expected H4_FORBIDDEN_KEY for kw-week-employees");
  } catch (e) {
    if (e instanceof H4ForbiddenKeyError) {
      pass("h4.forbidden-deny", e.message);
    } else {
      fail("h4.forbidden-deny", String(e));
    }
  }

  meta.forbiddenKeyCount = H4_FORBIDDEN_WRITE_KEYS.size;

  const cloudId = makePsbId("cloud");
  const title = `${cloudId} H4 cloud round-trip`;
  session.registerCreated(cloudId, "cloud");

  const rawKv = createKvClient(ctx.root);
  const kv = wrapKvWithH4ForbiddenGate(rawKv);

  // Reuse H1 builder (ARCH REVIEW binding — no second builder)
  const item = {
    ...buildSandboxTenderItem(cloudId, title),
    notes: "TEST-HARNESS-01 H4 cloud sandbox — safe to delete",
  };

  cleanup.track({
    id: cloudId,
    kind: "cloud",
    cleanup: () =>
      cleanupSandboxTender(kv, cloudId, {
        dryRun: ctx.dryRun,
        assertWritable: (e) => guard.assertWritable(e),
      }),
  });

  let scenarioStatus = /** @type {"PASS"|"FAIL"} */ ("PASS");
  let nonPsbBefore = 0;
  let nonPsbAfter = 0;
  let seeded = false;

  try {
    if (steps.some((s) => s.status === "FAIL")) {
      scenarioStatus = "FAIL";
      cleanup.untrack(cloudId);
      fail("h4.aborted", "preflight FORBIDDEN gate failed — skip write");
    } else if (ctx.dryRun) {
      pass(
        "h4.dry-run",
        `plan: batch-get ${PIPELINE_KEY} → seed ${cloudId} → parity → cleanup (writes=0)`,
      );
      pass("h4.create", `dry-run skip seed ${cloudId}`);
      pass("h4.parity", "dry-run skip parity");
      pass("h4.preservation", "dry-run skip preservation");
      warn(
        "h4.metrics",
        `${H4_SOFT_METRICS}: KV-only — __wgdomSyncMetrics unavailable; batchSetRetries=0 ≠ FAIL`,
      );
      meta.metrics = { batchSetRetries: 0, warning: true, reason: "kv-only-no-page" };
      meta.preservation = { nonPsbBefore: null, nonPsbAfter: null };
      meta.mutatedIds = [];
    } else {
      const baselineMap = await kv.batchGet([PIPELINE_KEY]);
      const baselineList = asTenderList(baselineMap[PIPELINE_KEY]);
      nonPsbBefore = countNonPsb(baselineList);
      pass(
        "h4.batch-get",
        `baseline len=${baselineList.length} nonPsb=${nonPsbBefore}`,
      );

      guard.assertWritable({ id: cloudId, kind: "cloud" });
      const seedResult = await seedSandboxTender(kv, item, {
        dryRun: false,
        assertWritable: (e) => guard.assertWritable(e),
      });
      seeded = true;
      pass(
        "h4.create",
        `seeded=${seedResult.seeded} pipelineLen=${seedResult.pipelineLen} upsert=${!!seedResult.upsert}`,
      );

      const found = await fetchSandboxTender(kv, cloudId);
      if (!found || found.id !== cloudId) {
        fail("h4.parity", `sandbox id not found after batch-set: ${cloudId}`);
        scenarioStatus = "FAIL";
      } else {
        pass(
          "h4.parity",
          `found id=${cloudId} title=${String(found.title || "").slice(0, 48)}`,
        );
      }

      const afterMap = await kv.batchGet([PIPELINE_KEY]);
      const afterList = asTenderList(afterMap[PIPELINE_KEY]);
      nonPsbAfter = countNonPsb(afterList);
      if (nonPsbAfter < nonPsbBefore) {
        fail(
          "h4.preservation",
          `non-psb count dropped ${nonPsbBefore} → ${nonPsbAfter}`,
        );
        scenarioStatus = "FAIL";
      } else {
        pass(
          "h4.preservation",
          `nonPsb before=${nonPsbBefore} after=${nonPsbAfter}`,
        );
      }

      warn(
        "h4.metrics",
        `${H4_SOFT_METRICS}: KV-only — no Playwright; batchSetRetries=0 reported as WARNING only`,
      );
      meta.metrics = {
        batchSetRetries: 0,
        warning: true,
        reason: "kv-only-no-__wgdomSyncMetrics",
      };
      meta.preservation = { nonPsbBefore, nonPsbAfter };
      meta.mutatedIds = [cloudId];
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("H4_FORBIDDEN_KEY") || e instanceof H4ForbiddenKeyError) {
      fail("h4.forbidden-runtime", msg);
    } else if (msg.startsWith("PSB_MUTATE_DENIED") || msg.startsWith("PSB_KV_")) {
      fail("h4.write", msg);
    } else {
      fail("h4.error", msg);
    }
    scenarioStatus = "FAIL";
    if (!seeded && !ctx.dryRun) {
      cleanup.untrack(cloudId);
    }
  }

  const cleanupResult = await cleanup.runAll();
  if (cleanupResult.status === "PASS" && cleanupResult.code === PSB_001_CLEANUP_GUARANTEE) {
    pass(
      "h4.cleanup",
      `cleaned=${cleanupResult.cleaned.join(",") || cloudId} (${PSB_001_CLEANUP_GUARANTEE})`,
    );
  } else {
    fail(
      "h4.cleanup",
      `leftovers=${JSON.stringify(cleanupResult.leftovers)} errors=${cleanupResult.errors.join(";")}`,
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
      sources: allowlist.sources,
    },
    sessionRemaining: session
      .listCreated()
      .filter((x) => cleanup.listTracked().every((t) => t.id !== x.id)),
    meta,
  };
}
