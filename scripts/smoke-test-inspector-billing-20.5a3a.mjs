/**
 * Sprint 20.5A.3A-lite — Inspektor × Do rozliczenia (read-only z kwotami)
 * Uruchom: npx vite-node scripts/smoke-test-inspector-billing-20.5a3a.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applySettlement,
  defaultRecoverableCharge,
  deriveChargeAmounts,
  fmtRecoverableAmount,
  getRecoverableChargeJobStats,
  getRecoverableChargesForJob,
  mergeRecoverableCharges,
  normalizeRecoverableCharges,
} from "../src/lib/recoverable-charges.ts";
import { inspectorRecoverableBadgeVisible } from "../src/app/JobRecoverableChargesPanel.tsx";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const JOB_A = "job-inspector-a";
const JOB_B = "job-inspector-b";
const DELETED_ID = "charge-tombstoned";

function charge(id, amount, extra = {}) {
  const c = defaultRecoverableCharge("Admin");
  c.id = id;
  c.amount = amount;
  c.createdAt = "2026-06-01T10:00:00.000Z";
  c.updatedAt = "2026-06-05T10:00:00.000Z";
  c.title = extra.title ?? `Pozycja ${id}`;
  c.description = extra.description ?? "Opis testowy";
  c.sourceType = "job";
  c.sourceJobId = extra.sourceJobId ?? JOB_A;
  c.clientName = extra.clientName ?? "WM Test";
  c.status = extra.status ?? "open";
  return c;
}

log("=== Sprint 20.5A.3A-lite — Inspector Billing Review smoke ===\n");

// T1 — Ładowanie charges dla job
{
  const open = charge("c-open", 1200, { sourceJobId: JOB_A });
  const partial = applySettlement(
    charge("c-partial", 800, { sourceJobId: JOB_A, title: "Częściowa" }),
    { amount: 300, settledBy: "Dawid", settledAt: "2026-06-03T10:00:00.000Z", targetJobId: JOB_B, targetJobLabel: "Robota B" },
  );
  const other = charge("c-other", 500, { sourceJobId: JOB_B });
  const all = [open, partial, other];
  const forA = getRecoverableChargesForJob(all, JOB_A);
  assert("T1 charges for job", forA.length === 2, `got ${forA.length}`);
}

// T2 — Badge unsettledCount
{
  const open = charge("b1", 1000, { sourceJobId: JOB_A });
  const settled = applySettlement(
    charge("b2", 400, { sourceJobId: JOB_A }),
    { amount: 400, settledBy: "Dawid", settledAt: "2026-06-04T10:00:00.000Z" },
  );
  const statsOpen = getRecoverableChargeJobStats([open], JOB_A);
  const statsMixed = getRecoverableChargeJobStats([open, settled], JOB_A);
  assert("T2 badge visible when unsettled", inspectorRecoverableBadgeVisible(statsOpen), `unsettled=${statsOpen.unsettledCount}`);
  assert("T2 badge hidden when all settled", !inspectorRecoverableBadgeVisible(getRecoverableChargeJobStats([settled], JOB_A)));
  assert("T2 unsettled count", statsMixed.unsettledCount === 1, String(statsMixed.unsettledCount));
}

// T3 — Kwoty widoczne (derive + format)
{
  const c = applySettlement(
    charge("amt1", 1500, { sourceJobId: JOB_A }),
    { amount: 600, settledBy: "Dawid", settledAt: "2026-06-02T10:00:00.000Z" },
  );
  const d = deriveChargeAmounts(c);
  assert("T3 amount original", c.amount === 1500);
  assert("T3 amount settled", d.amountSettled === 600);
  assert("T3 amount remaining", d.amountRemaining === 900);
  assert("T3 fmt amounts", fmtRecoverableAmount(d.amountRemaining).includes("900"));
  const stats = getRecoverableChargeJobStats([c], JOB_A);
  assert("T3 KPI to recover", stats.toRecoverAmount === 900);
  assert("T3 KPI recovered on job", stats.recoveredAmount === 0);
}

// T4 — Historia settlementów
{
  const c = charge("hist1", 2000, { sourceJobId: JOB_A });
  let cur = applySettlement(c, {
    amount: 500,
    settledBy: "Dawid",
    settledAt: "2026-06-01T10:00:00.000Z",
    onBehalfOf: "Szymon",
    recordedVia: "on_behalf_of_inspector",
    note: "Typ: Kolejna robota\nDoliczone na B",
  });
  cur = applySettlement(cur, {
    amount: 700,
    settledBy: "Dawid",
    settledAt: "2026-06-04T10:00:00.000Z",
    targetJobId: JOB_B,
  });
  const history = [...(cur.settlements ?? [])].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
  assert("T4 settlement count", history.length === 2);
  assert("T4 onBehalfOf", history.some((s) => s.onBehalfOf === "Szymon"));
  assert("T4 settlement amounts", history[0].amount === 700 && history[1].amount === 500);
}

// T5 — Brak create/edit/delete w wariancie inspektora (panel API)
{
  const panelSrc = readFileSync(resolve(root, "src/app/JobRecoverableChargesPanel.tsx"), "utf8");
  assert("T5 inspector variant exists", panelSrc.includes('variant === "inspector"'));
  assert("T5 no create when inspector", panelSrc.includes("!isInspector && onCreateCharge"));
  assert("T5 settlement history in inspector card", panelSrc.includes("Historia rozliczeń"));
  assert("T5 inspector KPI unsettled", panelSrc.includes('label="Nierozliczone"'));
}

// T6 — Brak push do kw-recoverable-charges z InspectorPanel
{
  const inspectorSrc = readFileSync(resolve(root, "src/app/InspectorPanel.tsx"), "utf8");
  assert("T6 no pushRecoverableChargesToCloud", !inspectorSrc.includes("pushRecoverableChargesToCloud"));
  assert("T6 no pushKeys for charges", !inspectorSrc.includes('pushKeysToCloudSafe(["kw-recoverable-charges"'));
  assert("T6 read merge only", inspectorSrc.includes("mergeRecoverableCharges"));
  assert("T6 inspector variant panel", inspectorSrc.includes('variant="inspector"'));
}

// T7 — Merge + tombstones
{
  const local = [charge(DELETED_ID, 100, { sourceJobId: JOB_A })];
  const cloud = [charge("c-cloud", 250, { sourceJobId: JOB_A })];
  const merged = mergeRecoverableCharges(local, cloud, [DELETED_ID]);
  assert("T7 tombstone removes deleted", !merged.some((c) => c.id === DELETED_ID));
  assert("T7 cloud charge kept", merged.some((c) => c.id === "c-cloud"));
  const normalized = normalizeRecoverableCharges(merged);
  assert("T7 normalize", normalized.length === 1);
}

// T8 — Regresja admin panelu (wariant domyślny)
{
  const panelSrc = readFileSync(resolve(root, "src/app/JobRecoverableChargesPanel.tsx"), "utf8");
  assert("T8 admin create button", panelSrc.includes("Dodaj do rozliczenia"));
  assert("T8 admin alerts KPI", panelSrc.includes('label="Alerty"'));
  assert("T8 default variant admin", panelSrc.includes('variant = "admin"'));
  assert("T8 admin onOpenCharge list", panelSrc.includes("onOpenCharge?.(charge.id)"));
}

log("\n--- Podsumowanie ---");
const failed = Object.entries(results).filter(([, v]) => v === "FAIL");
if (failed.length === 0) {
  log(`ALL PASS (${Object.keys(results).length}/${Object.keys(results).length})`);
} else {
  log(`FAIL: ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
