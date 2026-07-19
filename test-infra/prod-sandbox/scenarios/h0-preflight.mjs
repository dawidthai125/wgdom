/**
 * TEST-HARNESS-01 H0 — h0-preflight scenario
 *
 * Local / node only — no Protected Core, no Cloud Sync, no live prod mutations.
 * Verifies: markers, allowlist, mutate-guard, PSB-001 Cleanup Guarantee, dry-run, version pin (optional).
 */
import { loadAllowlist, isAllowlisted } from "../allowlist.mjs";
import { makePsbId, isPsbId, isSandboxMarkedEntity, PSB_PREFIX } from "../markers.mjs";
import { SessionEntityRegistry, createMutateGuard, PsbMutateDeniedError } from "../mutate-guard.mjs";
import { CleanupTracker, PSB_001_CLEANUP_GUARANTEE } from "../cleanup.mjs";

/**
 * @typedef {{ name: string, status: "PASS"|"FAIL"|"WARNING", detail: string }} StepResult
 */

/**
 * @param {{
 *   allowProd: boolean,
 *   dryRun: boolean,
 *   root: string,
 *   expectVersion?: string | null,
 *   baseUrl?: string,
 * }} ctx
 */
export async function runH0Preflight(ctx) {
  /** @type {StepResult[]} */
  const steps = [];
  const session = new SessionEntityRegistry();
  const cleanup = new CleanupTracker();
  const allowlist = loadAllowlist();
  const guard = createMutateGuard({ allowlist, session, dryRun: ctx.dryRun });

  function pass(name, detail) {
    steps.push({ name, status: "PASS", detail });
  }
  function fail(name, detail) {
    steps.push({ name, status: "FAIL", detail });
  }
  function warn(name, detail) {
    steps.push({ name, status: "WARNING", detail });
  }

  // --- markers ---
  const id1 = makePsbId("job");
  if (!isPsbId(id1) || !id1.startsWith(PSB_PREFIX)) {
    fail("markers.makePsbId", `invalid id ${id1}`);
  } else {
    pass("markers.makePsbId", id1);
  }
  if (!isSandboxMarkedEntity({ id: id1, title: "x" })) {
    fail("markers.isSandboxMarkedEntity", "psb id not recognized");
  } else {
    pass("markers.isSandboxMarkedEntity", "psb id OK");
  }
  if (isSandboxMarkedEntity({ id: "real-job-001", title: "Obornicka" })) {
    fail("markers.reject-real", "real entity incorrectly marked sandbox");
  } else {
    pass("markers.reject-real", "real entity rejected");
  }

  // --- allowlist ---
  pass(
    "allowlist.load",
    `jobs=${allowlist.jobIds.length} tenders=${allowlist.tenderIds.length} catalog=${allowlist.catalogRowIds.length} sources=${allowlist.sources.join("|")}`,
  );
  // empty allowlist OK for H0 (scenarios create psb-* + cleanup)
  if (allowlist.jobIds.length === 0) {
    pass("allowlist.empty-ok-h0", "empty allowlist accepted for create+cleanup scenarios");
  }

  // --- mutate guard ---
  try {
    guard.assertWritable({ id: "prod-real-job", kind: "job" });
    fail("mutate-guard.deny-real", "expected PSB_MUTATE_DENIED");
  } catch (e) {
    if (e instanceof PsbMutateDeniedError) {
      pass("mutate-guard.deny-real", e.message);
    } else {
      fail("mutate-guard.deny-real", String(e));
    }
  }

  session.registerCreated(id1, "job");
  try {
    const r = guard.assertWritable({ id: id1, kind: "job" });
    pass("mutate-guard.allow-session-psb", `reason=${r.reason}`);
  } catch (e) {
    fail("mutate-guard.allow-session-psb", String(e));
  }

  // allowlist synthetic (env may inject) — if example IDs not loaded, skip
  const sampleAllow = allowlist.jobIds[0];
  if (sampleAllow) {
    try {
      guard.assertWritable({ id: sampleAllow, kind: "job" });
      pass("mutate-guard.allow-allowlist", sampleAllow);
    } catch (e) {
      fail("mutate-guard.allow-allowlist", String(e));
    }
  } else {
    pass("mutate-guard.allow-allowlist", "skipped (no allowlist jobs)");
  }

  // --- PSB-001 Cleanup Guarantee: happy path ---
  const mem = new Set();
  const happyId = makePsbId("catalog");
  session.registerCreated(happyId, "catalog");
  mem.add(happyId);
  cleanup.track({
    id: happyId,
    kind: "catalog",
    cleanup: () => {
      mem.delete(happyId);
      return { ok: true };
    },
  });

  // --- PSB-001: leftover path (isolated tracker) ---
  const failTracker = new CleanupTracker();
  const leakId = makePsbId("leak");
  failTracker.track({
    id: leakId,
    kind: "other",
    cleanup: () => ({ ok: false, detail: "simulated cleanup failure" }),
  });
  const leakResult = await failTracker.runAll();
  if (
    leakResult.status === "FAIL" &&
    leakResult.code === PSB_001_CLEANUP_GUARANTEE &&
    leakResult.leftovers.some((l) => l.id === leakId)
  ) {
    pass(
      "cleanup.guarantee-fail-loud",
      `leftovers=${leakResult.leftovers.map((l) => l.id).join(",")}`,
    );
  } else {
    fail("cleanup.guarantee-fail-loud", JSON.stringify(leakResult));
  }

  // --- dry-run: plan only, no mutate of mem for second entity ---
  if (ctx.dryRun) {
    pass("dry-run.flag", "dry-run active — H0 self-tests remain in-memory only");
  } else {
    pass("dry-run.flag", "dry-run off — H0 still performs zero prod I/O");
  }

  // --- optional version pin (read-only) ---
  const expectVersion = ctx.expectVersion || process.env.PSB_EXPECT_VERSION || "";
  const baseUrl = ctx.baseUrl || process.env.PSB_BASE_URL || "https://www.wgdom.fun";
  if (expectVersion) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/version.json`, {
        headers: { Accept: "application/json" },
      });
      const body = await res.json();
      if (String(body.version) === String(expectVersion)) {
        pass("version.pin", `${body.version} @ ${body.commit || "?"}`);
      } else {
        fail("version.pin", `expected ${expectVersion} got ${body.version}`);
      }
    } catch (e) {
      fail("version.pin", String(e));
    }
  } else {
    pass("version.pin", "skipped (PSB_EXPECT_VERSION unset)");
  }

  // note allow-prod: H0 must not require it
  if (ctx.allowProd) {
    warn("allow-prod", "--allow-prod set but H0 performs no prod writes");
  } else {
    pass("allow-prod", "H0 runs without --allow-prod (write gate N/A)");
  }

  // --- run main cleanup (must clear happyId) ---
  const cleanupResult = await cleanup.runAll();
  session.unregister(happyId);
  if (cleanupResult.status === "PASS" && mem.size === 0) {
    pass("cleanup.guarantee-pass", `cleaned=${cleanupResult.cleaned.join(",")}`);
  } else {
    fail(
      "cleanup.guarantee-pass",
      `status=${cleanupResult.status} leftovers=${JSON.stringify(cleanupResult.leftovers)} mem=${[...mem]}`,
    );
  }

  // session should only have id1 left (not cleanup-tracked — intentional for assert)
  // unregister test session leftovers that are harness-local only
  for (const row of session.listCreated()) {
    session.unregister(row.id);
  }

  const failed = steps.filter((s) => s.status === "FAIL");
  const warnings = steps.filter((s) => s.status === "WARNING");
  let scenarioStatus = "PASS";
  if (failed.length) scenarioStatus = "FAIL";
  else if (warnings.length) scenarioStatus = "WARNING";

  return {
    scenarioStatus,
    steps,
    allowlistSummary: {
      jobIds: allowlist.jobIds.length,
      tenderIds: allowlist.tenderIds.length,
      catalogRowIds: allowlist.catalogRowIds.length,
      payrollWeekId: allowlist.payrollWeekId,
      sources: allowlist.sources,
    },
    cleanupResult,
    sessionRemaining: session.listCreated(),
    isAllowlistedSample: sampleAllow ? isAllowlisted(allowlist, sampleAllow, "job") : null,
  };
}
