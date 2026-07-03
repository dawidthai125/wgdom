/**
 * PR-PAY-S7-4A — Cloud Sync Optimization (frequency) — unit test.
 *
 * Zakres: WYŁĄCZNIE czysta logika harmonogramu/transportu:
 *  - G1 debounce (stała AUTO_SYNC_DEBOUNCE_MS)
 *  - G2 minimum interval / G3+G4 focus+visibility = maks. 1 pull (shouldPullNow)
 *  - AC4 no-change=no-push (bundleFingerprint — poziom bundla, NIE delta push)
 *  - AC5 production metrics (recordBatchGet/recordBatchSet/getSyncMetrics)
 *
 * Bez zmian merge / LWW / Payroll / tombstones / Edge / kv.mset.
 *
 * Run: npx vite-node scripts/test-payroll-cloud-sync-frequency-s7-4.mjs
 */
import {
  AUTO_SYNC_DEBOUNCE_MS,
  MIN_PULL_INTERVAL_MS,
  shouldPullNow,
  bundleFingerprint,
  recordBatchGet,
  recordBatchSet,
  recordPushSkipped,
  getSyncMetrics,
  resetSyncMetrics,
} from "../src/lib/cloud-sync-throttle.ts";

let pass = true;
const results = [];
function assert(label, cond) {
  results.push({ label, ok: !!cond });
  if (!cond) {
    pass = false;
    console.error("FAIL:", label);
  }
}

// ── G1 debounce ──────────────────────────────────────────────────────────────
assert("AC1 debounce stała > 0", typeof AUTO_SYNC_DEBOUNCE_MS === "number" && AUTO_SYNC_DEBOUNCE_MS >= 1000);

// ── G2 minimum interval ──────────────────────────────────────────────────────
assert("AC2 pierwszy pull (brak historii) przechodzi", shouldPullNow(0, 1_000_000) === true);
assert("AC2 pull w oknie < min-interval odrzucony",
  shouldPullNow(1_000_000, 1_000_000 + MIN_PULL_INTERVAL_MS - 1) === false);
assert("AC2 pull po min-interval przechodzi",
  shouldPullNow(1_000_000, 1_000_000 + MIN_PULL_INTERVAL_MS) === true);

// ── G3+G4 focus + visibility = maks. 1 pull ──────────────────────────────────
// Symulacja: focus i visibilitychange odpalają blisko siebie; pierwszy ustawia lastPull.
{
  const now = 5_000_000;
  let lastPull = 0;
  let pulls = 0;
  const tryPull = (t) => {
    if (shouldPullNow(lastPull, t)) { lastPull = t; pulls += 1; }
  };
  tryPull(now);      // focus
  tryPull(now + 50); // visibilitychange (ten sam powrót do karty)
  assert("AC3 focus+visibility w tym samym oknie = 1 pull", pulls === 1);
  // kolejny powrót po min-interval → drugi pull
  tryPull(now + MIN_PULL_INTERVAL_MS + 1);
  assert("AC3 powrót po min-interval = kolejny pull", pulls === 2);
}

// ── AC4 no-change = no-push (bundleFingerprint) ───────────────────────────────
{
  const bundleA = [[{ id: "e1", settled: true }], ["2026-06-08"], { x: 1 }];
  const bundleAcopy = JSON.parse(JSON.stringify(bundleA));
  const bundleB = [[{ id: "e1", settled: false }], ["2026-06-08"], { x: 1 }];
  assert("AC4 fingerprint deterministyczny", bundleFingerprint(bundleA) === bundleFingerprint(bundleAcopy));
  assert("AC4 zmiana danych → inny fingerprint", bundleFingerprint(bundleA) !== bundleFingerprint(bundleB));

  // Symulacja skip-push: brak zmian → skip; zmiana → push
  let lastHash = "";
  const trySync = (bundle) => {
    const h = bundleFingerprint(bundle);
    if (h === lastHash) return "skip";
    lastHash = h;
    return "push";
  };
  assert("AC4 pierwszy sync = push", trySync(bundleA) === "push");
  assert("AC4 brak zmian = brak push (skip)", trySync(bundleAcopy) === "skip");
  assert("AC4 zmiana = push", trySync(bundleB) === "push");
  assert("AC4 powrót do poprzedniego stanu = push (hash inny niż ostatni)", trySync(bundleA) === "push");
}

// ── AC5 production metrics ────────────────────────────────────────────────────
{
  resetSyncMetrics();
  const m0 = getSyncMetrics();
  assert("AC5 reset zeruje liczniki", m0.batchGet === 0 && m0.batchSet === 0 && m0.pushSkipped === 0);
  recordBatchGet();
  recordBatchGet();
  recordBatchSet();
  recordPushSkipped();
  const m1 = getSyncMetrics();
  assert("AC5 batch-get liczony", m1.batchGet === 2);
  assert("AC5 batch-set liczony", m1.batchSet === 1);
  assert("AC5 push-skipped liczony", m1.pushSkipped === 1);
  assert("AC5 snapshot jest kopią (immutable)", getSyncMetrics() !== m1);
}

// ── Raport ────────────────────────────────────────────────────────────────────
const okCount = results.filter((r) => r.ok).length;
console.log(`\nPR-PAY-S7-4A frequency: ${okCount}/${results.length} PASS`);
for (const r of results) console.log(`  ${r.ok ? "✓" : "✗"} ${r.label}`);
if (!pass) process.exit(1);
console.log("\nALL PASS — PR-PAY-S7-4A (G1–G4 + AC4/AC5) logika czysta OK");
