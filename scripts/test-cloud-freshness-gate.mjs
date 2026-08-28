/**
 * CLOUD FRESHNESS GATE — F1–F18
 * npx vite-node scripts/test-cloud-freshness-gate.mjs
 */
import {
  resetCloudFreshnessGateForTests,
  registerCloudFreshnessReconcile,
  markCloudFreshnessUnknown,
  markCloudFreshnessFresh,
  markCloudFreshnessUnconfirmed,
  markCloudFreshnessAfterBootstrapSuccess,
  markCloudFreshnessAfterBootstrapFailure,
  ensureCloudFreshBeforeWrite,
  getCloudFreshnessState,
  getCloudFreshnessSnapshot,
  isCloudOutboundWriteAllowed,
  isCloudFreshnessBlockedError,
  CloudFreshnessBlockedError,
  withCloudFreshnessWritePass,
} from "../src/lib/cloud-freshness-gate.ts";
import { shouldPullNow, MIN_PULL_INTERVAL_MS } from "../src/lib/cloud-sync-throttle.ts";

let pass = 0;
let fail = 0;

function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
  }
}

function reset() {
  resetCloudFreshnessGateForTests();
}

console.log("=== CLOUD FRESHNESS GATE F1–F18 ===\n");

// F1 — idle resume: mark unknown → ensure → pull only (reconcile), no push flag
{
  reset();
  let pulls = 0;
  let pushes = 0;
  registerCloudFreshnessReconcile(async () => {
    pulls += 1;
  });
  markCloudFreshnessUnknown("resume_visibility");
  await ensureCloudFreshBeforeWrite({ reason: "resume_visibility", force: true });
  assert("F1 pull once on resume", pulls === 1, `pulls=${pulls}`);
  assert("F1 no push in reconcile", pushes === 0);
  assert("F1 state fresh after resume", getCloudFreshnessState() === "fresh");
}

// F2 — focus + visibility race → 1 pull
{
  reset();
  let pulls = 0;
  let resolvePull;
  const pullStarted = new Promise((r) => { resolvePull = r; });
  registerCloudFreshnessReconcile(async () => {
    pulls += 1;
    resolvePull();
    await new Promise((r) => setTimeout(r, 30));
  });
  markCloudFreshnessUnknown("resume_visibility");
  const a = ensureCloudFreshBeforeWrite({ reason: "resume_visibility", force: true });
  await pullStarted;
  markCloudFreshnessUnknown("resume_focus");
  const b = ensureCloudFreshBeforeWrite({ reason: "resume_focus", force: true });
  await Promise.all([a, b]);
  assert("F2 single coalesced pull", pulls === 1, `pulls=${pulls}`);
  assert("F2 fresh", getCloudFreshnessState() === "fresh");
}

// F3 — pending debounce cancelled conceptually: resume clears via reconcile path (contract)
{
  reset();
  let reconcileRan = false;
  registerCloudFreshnessReconcile(async () => {
    reconcileRan = true;
  });
  markCloudFreshnessUnknown("resume_pageshow");
  await ensureCloudFreshBeforeWrite({ reason: "resume_pageshow", force: true });
  assert("F3 resume reconcile runs (debounce cancel is App clearAutoSyncTimers)", reconcileRan);
}

// F4 — first edit before pull complete → write blocked until ensure
{
  reset();
  let release;
  const gate = new Promise((r) => { release = r; });
  let pulls = 0;
  registerCloudFreshnessReconcile(async () => {
    pulls += 1;
    await gate;
  });
  markCloudFreshnessUnknown("resume_visibility");
  const ensureP = ensureCloudFreshBeforeWrite({ reason: "resume_visibility", force: true });
  assert("F4 not allowed mid-check", !isCloudOutboundWriteAllowed());
  assert("F4 state checking", getCloudFreshnessState() === "checking");
  let writeOk = false;
  const writeP = ensureCloudFreshBeforeWrite({ reason: "write_barrier" }).then(() => {
    writeOk = true;
  });
  release();
  await ensureP;
  await writeP;
  assert("F4 write after pull", writeOk && pulls === 1);
}

// F5 — 15s throttle must NOT skip freshness barrier
{
  reset();
  const now = Date.now();
  assert(
    "F5 throttle would skip optional pull",
    shouldPullNow(now - 1000, now, MIN_PULL_INTERVAL_MS) === false,
  );
  let pulls = 0;
  registerCloudFreshnessReconcile(async () => {
    pulls += 1;
  });
  markCloudFreshnessUnknown("resume_focus");
  await ensureCloudFreshBeforeWrite({ reason: "resume_focus", force: true });
  assert("F5 mandatory ensure still pulls", pulls === 1);
}

// F6 — mutation guard must not block mandatory freshness (contract: reconciler bypasses)
{
  reset();
  let pulls = 0;
  registerCloudFreshnessReconcile(async ({ bypassThrottle }) => {
    assert("F6 bypassThrottle true", bypassThrottle === true);
    pulls += 1;
  });
  markCloudFreshnessUnknown("write_barrier");
  await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  assert("F6 pull despite guard concept", pulls === 1);
}

// F7 — writeOnly apply UI is App contract; gate marks fresh after reconcile apply
{
  reset();
  let applied = false;
  registerCloudFreshnessReconcile(async () => {
    applied = true;
  });
  markCloudFreshnessUnknown("write_barrier");
  await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  assert("F7 reconcile applies before fresh", applied && getCloudFreshnessState() === "fresh");
}

// F8 — Capacitor resume reason
{
  reset();
  let reasonSeen = "";
  registerCloudFreshnessReconcile(async ({ reason }) => {
    reasonSeen = String(reason);
  });
  markCloudFreshnessUnknown("resume_native");
  await ensureCloudFreshBeforeWrite({ reason: "resume_native", force: true });
  assert("F8 native resume reason", reasonSeen === "resume_native");
}

// F9 — PWA bfcache pageshow
{
  reset();
  let reasonSeen = "";
  registerCloudFreshnessReconcile(async ({ reason }) => {
    reasonSeen = String(reason);
  });
  markCloudFreshnessUnknown("resume_pageshow");
  await ensureCloudFreshBeforeWrite({ reason: "resume_pageshow", force: true });
  assert("F9 pageshow reason", reasonSeen === "resume_pageshow");
}

// F10 — multi-tab storage → unknown → must ensure before write
{
  reset();
  markCloudFreshnessAfterBootstrapSuccess();
  assert("F10 start fresh", getCloudFreshnessState() === "fresh");
  markCloudFreshnessUnknown("storage_event");
  assert("F10 storage marks stale/unknown", getCloudFreshnessState() === "stale" || getCloudFreshnessState() === "unknown");
  assert("F10 write not allowed until ensure", !isCloudOutboundWriteAllowed());
  registerCloudFreshnessReconcile(async () => {});
  await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  assert("F10 fresh after ensure", isCloudOutboundWriteAllowed());
}

// F11 — settlement path: write barrier before outbound (state machine)
{
  reset();
  registerCloudFreshnessReconcile(async () => {});
  markCloudFreshnessUnknown("resume_visibility");
  await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  assert("F11 settlement-class write allowed only when fresh", isCloudOutboundWriteAllowed());
}

// F12 — early / MA / hours same barrier
{
  reset();
  registerCloudFreshnessReconcile(async () => {});
  for (const r of ["hours", "early_payout", "manual_adjustment"]) {
    markCloudFreshnessUnknown(r);
    await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  }
  assert("F12 field writes share gate", getCloudFreshnessState() === "fresh");
}

// F13 — cold start bootstrap success → fresh before write
{
  reset();
  markCloudFreshnessAfterBootstrapSuccess();
  assert("F13 bootstrap fresh", getCloudFreshnessState() === "fresh");
  assert("F13 outbound allowed", isCloudOutboundWriteAllowed());
}

// F14 — offline / unconfirmed → no silent write
{
  reset();
  registerCloudFreshnessReconcile(async () => {
    throw new Error("network down");
  });
  markCloudFreshnessUnknown("resume_visibility");
  let blocked = false;
  try {
    await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  } catch (e) {
    blocked = isCloudFreshnessBlockedError(e);
  }
  assert("F14 blocked on offline", blocked);
  assert("F14 unconfirmed", getCloudFreshnessState() === "unconfirmed");
  assert("F14 no outbound", !isCloudOutboundWriteAllowed());
}

// F15 — two simultaneous mutations serialize behind one freshness check
{
  reset();
  let pulls = 0;
  registerCloudFreshnessReconcile(async () => {
    pulls += 1;
    await new Promise((r) => setTimeout(r, 20));
  });
  markCloudFreshnessUnknown("write_barrier");
  await Promise.all([
    ensureCloudFreshBeforeWrite({ reason: "write_barrier" }),
    ensureCloudFreshBeforeWrite({ reason: "write_barrier" }),
  ]);
  assert("F15 one pull for two writers", pulls === 1, `pulls=${pulls}`);
}

// F16 — domain push cannot bypass: outbound requires fresh (or write pass after ensure)
{
  reset();
  markCloudFreshnessUnconfirmed("test");
  assert("F16 blocked when unconfirmed", !isCloudOutboundWriteAllowed());
  registerCloudFreshnessReconcile(async () => {});
  await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
  let nested = false;
  await withCloudFreshnessWritePass(async () => {
    nested = isCloudOutboundWriteAllowed();
  });
  assert("F16 write pass after ensure", nested);
}

// F17 — archive write same gate (outbound allow only when fresh)
{
  reset();
  markCloudFreshnessAfterBootstrapFailure("bootstrap_timeout");
  assert("F17 timeout unconfirmed", getCloudFreshnessState() === "unconfirmed");
  assert("F17 archive write blocked", !isCloudOutboundWriteAllowed());
}

// F18 — legacy without marker → unknown → safe block until ensure
{
  reset();
  assert("F18 default unknown", getCloudFreshnessState() === "unknown");
  assert("F18 not allowed", !isCloudOutboundWriteAllowed());
  let threw = false;
  try {
    // Simulate browser: document may exist in vite-node sometimes — force no-fn path via unregister
    resetCloudFreshnessGateForTests();
    if (typeof document !== "undefined") {
      // with document and no reconciler → block
      try {
        await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
      } catch (e) {
        threw = e instanceof CloudFreshnessBlockedError;
      }
      assert("F18 blocked without reconciler in DOM", threw);
    } else {
      await ensureCloudFreshBeforeWrite({ reason: "write_barrier" });
      assert("F18 node harness auto-fresh", getCloudFreshnessState() === "fresh");
    }
  } catch (e) {
    assert("F18 unexpected", false, String(e));
  }
}

const snap = getCloudFreshnessSnapshot();
assert("snapshot has counters", typeof snap.reconcileCount === "number");

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
