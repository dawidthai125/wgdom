/**
 * TEST-HARNESS-01 H0.x — Persist Ledger recovery proof scenario
 *
 * Dry-run: local ledger/lock/API checks (0 KV writes)
 * Allow-prod: kill-sim (create → leave ledger open → recover → absent)
 */
import { makePsbId } from "../markers.mjs";
import { loadAllowlist } from "../allowlist.mjs";
import { SessionEntityRegistry, createMutateGuard } from "../mutate-guard.mjs";
import { createKvClient, PIPELINE_KEY } from "../kv-client.mjs";
import {
  buildSandboxTenderItem,
  seedSandboxTender,
  cleanupSandboxTender,
  fetchSandboxTender,
} from "../tender-helpers.mjs";
import {
  loadLedger,
  ledgerUpsert,
  ledgerPrune,
  ledgerListRecoverable,
  getLedgerPath,
} from "../persist-ledger.mjs";
import {
  acquireH0xLock,
  releaseH0xLock,
  getLockPath,
  isPidAlive,
} from "../h0x-lock.mjs";
import { runCleaner } from "../cleaner-registry.mjs";
import { recoverOpenEntities } from "../h0x-recovery.mjs";
import { LedgerCleanupTracker, trackPending } from "../ledger-bridge.mjs";

/**
 * @param {{ allowProd?: boolean, dryRun?: boolean, root: string }} ctx
 */
export async function runH0xRecover(ctx) {
  /** @type {{ name: string, status: string, detail: string }[]} */
  const steps = [];
  const pass = (name, detail) => steps.push({ name, status: "PASS", detail });
  const fail = (name, detail) => steps.push({ name, status: "FAIL", detail });
  const warn = (name, detail) => steps.push({ name, status: "WARNING", detail });

  const session = new SessionEntityRegistry();
  const allowlist = loadAllowlist();
  const guard = createMutateGuard({
    allowlist,
    session,
    dryRun: ctx.dryRun,
  });
  const cleanup = new LedgerCleanupTracker({
    scenario: "h0x-recover",
    enabled: !ctx.dryRun && !!ctx.allowProd,
  });

  let scenarioStatus = /** @type {"PASS"|"FAIL"} */ ("PASS");

  // --- Local API checks (always) ---
  try {
    const path = getLedgerPath();
    pass("h0x.ledger-path", path);

    await ledgerUpsert({
      id: "psb-h0x-selfcheck-pending",
      kind: "other",
      kvKey: "",
      scenario: "h0x-recover",
      status: "pending",
    });
    const list = await ledgerListRecoverable();
    if (!list.some((e) => e.id === "psb-h0x-selfcheck-pending")) {
      fail("h0x.ledger-upsert", "pending not listed");
      scenarioStatus = "FAIL";
    } else {
      pass("h0x.ledger-upsert", "pending visible in recoverable");
    }
    await ledgerPrune("psb-h0x-selfcheck-pending");
    const after = await ledgerListRecoverable();
    if (after.some((e) => e.id === "psb-h0x-selfcheck-pending")) {
      fail("h0x.ledger-prune", "still present");
      scenarioStatus = "FAIL";
    } else {
      pass("h0x.ledger-prune", "pending pruned");
    }

    // pending+absent semantics via recover (dry)
    await ledgerUpsert({
      id: "psb-h0x-pending-absent",
      kind: "other",
      kvKey: "",
      scenario: "h0x-recover",
      status: "pending",
    });
    pass("h0x.pending-absent-seed", "local pending seeded");

    // unknown kind FAIL loud
    try {
      await runCleaner({
        kind: "nope",
        id: "psb-h0x-unknown",
        kv: {
          batchGet: async () => ({}),
          batchSet: async () => ({ ok: true }),
        },
        dryRun: true,
        assertWritable: () => {},
      });
      fail("h0x.unknown-kind", "expected throw");
      scenarioStatus = "FAIL";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("PSB_H0X_UNKNOWN_KIND")) {
        pass("h0x.unknown-kind", msg);
      } else {
        fail("h0x.unknown-kind", msg);
        scenarioStatus = "FAIL";
      }
    }

    // lock acquire/release
    await acquireH0xLock({ pid: process.pid, scenario: "h0x-recover-self" });
    pass("h0x.lock-acquire", getLockPath());
    try {
      await acquireH0xLock({ pid: process.pid + 999999, scenario: "other" });
      // same machine: our pid holds lock; other pid should FAIL if we appear alive
      // Use a fake alive check — acquire with different pid while lock held by us
      fail("h0x.lock-held", "expected PSB_H0X_LOCK_HELD");
      scenarioStatus = "FAIL";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("PSB_H0X_LOCK_HELD")) {
        pass("h0x.lock-held", msg);
      } else {
        fail("h0x.lock-held", msg);
        scenarioStatus = "FAIL";
      }
    }
    await releaseH0xLock({ pid: process.pid });
    pass("h0x.lock-release", "released");

    if (!isPidAlive(process.pid)) {
      fail("h0x.pid-alive", "self pid reported dead");
      scenarioStatus = "FAIL";
    } else {
      pass("h0x.pid-alive", `pid=${process.pid}`);
    }
  } catch (e) {
    fail("h0x.local-api", e instanceof Error ? e.message : String(e));
    scenarioStatus = "FAIL";
  }

  if (ctx.dryRun) {
    const stubKv = {
      batchGet: async () => ({}),
      batchSet: async () => {
        throw new Error("PSB_H0X_DRY_RUN: unexpected batch-set");
      },
    };
    const plan = await recoverOpenEntities({
      kv: stubKv,
      dryRun: true,
      allowProd: false,
      scan: process.env.PSB_H0X_SCAN === "1",
      assertWritable: (e) => guard.assertWritable(e),
    });
    await ledgerPrune("psb-h0x-pending-absent");
    pass(
      "h0x.dry-run-recover",
      `planned=${plan.recovered.length} leftovers=${plan.leftovers.length}`,
    );
    pass("h0x.dry-run", "zero KV writes (ledger/lock local only)");

    const cleanupResult = await cleanup.runAll();
    return {
      scenarioStatus,
      steps,
      cleanupResult,
      allowlistSummary: allowlist,
      sessionRemaining: cleanup.listTracked(),
      meta: { mode: "dry-run", ledgerPath: getLedgerPath() },
    };
  }

  if (!ctx.allowProd) {
    fail("h0x.allow-prod", "require --allow-prod for kill-sim KV path");
    scenarioStatus = "FAIL";
    await ledgerPrune("psb-h0x-pending-absent");
    const cleanupResult = await cleanup.runAll();
    return {
      scenarioStatus,
      steps,
      cleanupResult,
      allowlistSummary: allowlist,
      sessionRemaining: cleanup.listTracked(),
      meta: { mode: "blocked" },
    };
  }

  // --- Kill simulation on real KV (tender) ---
  const kv = createKvClient(ctx.root);
  const tenderId = makePsbId("tender");
  session.registerCreated(tenderId, "tender");
  const item = buildSandboxTenderItem(tenderId, `H0x Recover ${tenderId}`);

  try {
    await trackPending(cleanup, {
      id: tenderId,
      kind: "tender",
      kvKey: PIPELINE_KEY,
      cleanup: () =>
        cleanupSandboxTender(kv, tenderId, {
          dryRun: false,
          assertWritable: (e) => guard.assertWritable(e),
        }),
    });

    guard.assertWritable({ id: tenderId, kind: "tender" });
    await seedSandboxTender(kv, item, {
      dryRun: false,
      assertWritable: (e) => guard.assertWritable(e),
    });
    await cleanup.markOpen(tenderId);
    pass("h0x.kill-sim-seed", `created ${tenderId} · ledger open`);

    // Simulate crash: drop in-memory track but KEEP ledger open
    cleanup.untrack(tenderId);
    const openRows = await ledgerListRecoverable();
    if (!openRows.some((e) => e.id === tenderId && e.status === "open")) {
      // markOpen wrote open — should be there
      fail("h0x.kill-sim-ledger", "expected open row after untrack");
      scenarioStatus = "FAIL";
    } else {
      pass("h0x.kill-sim-ledger", "in-memory cleared · ledger still open");
    }

    const presentBefore = await fetchSandboxTender(kv, tenderId);
    if (!presentBefore) {
      fail("h0x.kill-sim-kv", "entity missing before recover");
      scenarioStatus = "FAIL";
    } else {
      pass("h0x.kill-sim-kv", "entity present in pipeline");
    }

    const recovery = await recoverOpenEntities({
      kv,
      dryRun: false,
      allowProd: true,
      scan: process.env.PSB_H0X_SCAN === "1",
      assertWritable: (e) => guard.assertWritable(e),
    });

    if (recovery.status !== "PASS") {
      fail(
        "h0x.recover",
        `leftovers=${JSON.stringify(recovery.leftovers)}`,
      );
      scenarioStatus = "FAIL";
    } else {
      pass(
        "h0x.recover",
        `recovered=${recovery.recovered.length} scanRemoved=${recovery.scanRemoved}`,
      );
    }

    const presentAfter = await fetchSandboxTender(kv, tenderId);
    if (presentAfter) {
      fail("h0x.recover-verify", "still in KV after recover");
      scenarioStatus = "FAIL";
      // best-effort cleanup
      await cleanupSandboxTender(kv, tenderId, {
        dryRun: false,
        assertWritable: (e) => guard.assertWritable(e),
      });
      await ledgerPrune(tenderId);
    } else {
      pass("h0x.recover-verify", "absent from KV");
    }

    const ledgerLeft = (await ledgerListRecoverable()).filter(
      (e) => e.id === tenderId,
    );
    if (ledgerLeft.length) {
      fail("h0x.ledger-empty", JSON.stringify(ledgerLeft));
      scenarioStatus = "FAIL";
      await ledgerPrune(tenderId);
    } else {
      pass("h0x.ledger-empty", "no recoverable row for tenderId");
    }

    // pending+absent on allow-prod
    await ledgerUpsert({
      id: "psb-h0x-pending-absent",
      kind: "other",
      kvKey: "",
      scenario: "h0x-recover",
      status: "pending",
    });
    const pendingRec = await recoverOpenEntities({
      kv,
      dryRun: false,
      allowProd: true,
      scan: false,
      assertWritable: (e) => guard.assertWritable(e),
    });
    if (
      pendingRec.prunedPending.includes("psb-h0x-pending-absent") ||
      !(await ledgerListRecoverable()).some(
        (e) => e.id === "psb-h0x-pending-absent",
      )
    ) {
      pass("h0x.pending-absent", "pruned PASS");
    } else {
      fail("h0x.pending-absent", JSON.stringify(pendingRec));
      scenarioStatus = "FAIL";
      await ledgerPrune("psb-h0x-pending-absent");
    }

    for (const w of pendingRec.warnings || []) {
      warn("h0x.recover-warn", w);
    }
  } catch (e) {
    fail("h0x.allow-prod-path", e instanceof Error ? e.message : String(e));
    scenarioStatus = "FAIL";
    try {
      await cleanupSandboxTender(kv, tenderId, {
        dryRun: false,
        assertWritable: (e) => guard.assertWritable(e),
      });
    } catch {
      /* ignore */
    }
    await ledgerPrune(tenderId);
  }

  const cleanupResult = await cleanup.runAll();
  const doc = await loadLedger();

  return {
    scenarioStatus,
    steps,
    cleanupResult,
    allowlistSummary: allowlist,
    sessionRemaining: cleanup.listTracked(),
    meta: {
      mode: "allow-prod",
      ledgerEntities: doc.entities.length,
      tenderId,
    },
  };
}
