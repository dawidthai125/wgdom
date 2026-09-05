/**
 * PAYROLL — fresh hours-intent ledger hardening (persist · coalesce · TTL).
 * Run: npx vite-node scripts/test-payroll-fresh-hours-down-intent.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-fresh-hours-down";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-fresh-hours-down";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const WF = "2026-08-24";
const WT = "2026-08-29";
const WF2 = "2026-08-31";
const WT2 = "2026-09-05";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

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

function defaultDay(active = true, to = "17:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

function makeEmp(id, name, soTo = "17:00") {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate: "100",
    rateUpdatedAt: "2026-08-20T10:00:00.000Z",
    days: Object.fromEntries(
      DAYS.map((d) => [
        d,
        { ...defaultDay(true, d === "So" ? soTo : "16:00"), updatedAt: "2026-08-20T10:00:00.000Z" },
      ]),
    ),
    prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    extraCosts: [],
    settled: false,
    dataUpdatedAt: "2026-08-20T10:00:00.000Z",
  };
}

function slotH(emp, slot = "So") {
  const d = emp.days?.[slot];
  if (!d?.active) return 0;
  const [fh, fm] = String(d.from || "0:0").split(":").map(Number);
  const [th, tm] = String(d.to || "0:0").split(":").map(Number);
  return +(((th * 60 + tm - (fh * 60 + fm)) / 60).toFixed(2));
}

function soIntent(fromH, toH, empId = "k1", weekFrom = WF, weekTo = WT, slot = "So") {
  return {
    weekFrom,
    weekTo,
    employeeId: empId,
    directoryId: `dir-${empId}`,
    slot,
    fromHours: fromH,
    toHours: toH,
  };
}

const {
  deriveHoursIntentsFromLocalEdit,
  listUnauthorizedHoursDownSlots,
  isHoursDownFullyAuthorized,
  sanitizeRosterHoursToAuthorizedIntents,
} = await import("../src/lib/payroll-hours-intent.ts");
const {
  registerPayrollHoursIntents,
  peekPayrollHoursIntentLedger,
  mergePayrollHoursIntentsWithLedger,
  ackPayrollHoursIntentsAgainstCloud,
  resetPayrollHoursIntentLedgerForTests,
  rehydratePayrollHoursIntentLedgerForTests,
  PAYROLL_HOURS_INTENT_LEDGER_LS_KEY,
  PAYROLL_HOURS_INTENT_LEDGER_SCHEMA,
  PAYROLL_HOURS_INTENT_LEDGER_TTL_MS,
} = await import("../src/lib/payroll-hours-intent-ledger.ts");
const { rebuildPayrollOutgoingAfterFreshness } = await import("../src/lib/cloud-sync.ts");
const { applyPayrollFieldIntentsOntoCanonical } = await import("../src/lib/payroll-field-intent.ts");
const {
  schedulePayrollDomainPush,
  flushPayrollDomainPush,
  bindPayrollDomainPushHandler,
  unbindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
} = await import("../src/lib/payroll-domain-sync.ts");

const appSrc = readFileSync(resolve("src/app/App.tsx"), "utf8");
const settleIdx = appSrc.indexOf("const confirmSettle = useCallback");
const settleBlock = settleIdx >= 0 ? appSrc.slice(settleIdx, settleIdx + 2200) : "";
const cloudSyncSrc = readFileSync(resolve("src/lib/cloud-sync.ts"), "utf8");
const ackCallIdx = cloudSyncSrc.indexOf("ackPayrollHoursIntentsAgainstCloud(ackCloud");

console.log("=== Fresh hours-intent ledger hardening (T1–T20) ===\n");

resetPayrollHoursIntentLedgerForTests();
cancelPayrollDomainPush();

// T1 — 10→9 intent persisted
{
  resetPayrollHoursIntentLedgerForTests();
  const before = [makeEmp("k1", "Krzysztof", "17:00")];
  const after = [makeEmp("k1", "Krzysztof", "16:00")];
  const intents = deriveHoursIntentsFromLocalEdit(before, after, WF, WT);
  registerPayrollHoursIntents(intents);
  const peek = peekPayrollHoursIntentLedger();
  assert("T1 intent persisted in memory", peek.some((i) => i.fromHours === 10 && i.toHours === 9));
  const raw = localStorage.getItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY);
  assert("T1 LS key written", typeof raw === "string" && raw.includes('"toHours":9'));
  assert("T1 LS schema", raw.includes(`"schema":${PAYROLL_HOURS_INTENT_LEDGER_SCHEMA}`));
}

// T2 — reload → intent restored
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  rehydratePayrollHoursIntentLedgerForTests();
  const peek = peekPayrollHoursIntentLedger();
  assert(
    "T2 reload restores 10→9",
    peek.length === 1 && peek[0].fromHours === 10 && peek[0].toHours === 9,
  );
}

// T3 — reload + Cloud still 10 → 9 accepted
{
  resetPayrollHoursIntentLedgerForTests();
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const at9 = [makeEmp("k1", "Krzysztof", "16:00")];
  registerPayrollHoursIntents(deriveHoursIntentsFromLocalEdit(
    [makeEmp("k1", "Krzysztof", "17:00")],
    at9,
    WF,
    WT,
  ));
  rehydratePayrollHoursIntentLedgerForTests();
  const intents = peekPayrollHoursIntentLedger();
  assert("T3 authorized after reload", isHoursDownFullyAuthorized(cloud, at9, intents, WF, WT));
  const field = applyPayrollFieldIntentsOntoCanonical(cloud, at9, at9, intents, WF, WT);
  assert("T3 outgoing So stays 9", slotH(field.roster[0], "So") === 9);
}

// T4 — reload + Cloud independently changed → cannot blindly overwrite
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  rehydratePayrollHoursIntentLedgerForTests();
  const cloud8 = [makeEmp("k1", "Krzysztof", "15:00")]; // 8h
  assert("T4 cloud baseline 8", slotH(cloud8[0], "So") === 8);
  const at9 = [makeEmp("k1", "Krzysztof", "16:00")];
  const intents = peekPayrollHoursIntentLedger();
  // Field apply: fromHours(10) ≠ cloud(8) → keep Cloud 8 (no blind overwrite).
  const field = applyPayrollFieldIntentsOntoCanonical(cloud8, at9, at9, intents, WF, WT);
  assert("T4 field apply keeps cloud 8", slotH(field.roster[0], "So") === 8);
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud8,
    intentAfter: at9,
    intentBefore: at9,
    hoursIntents: intents,
    weekFrom: WF,
    weekTo: WT,
  });
  assert("T4 freshness rebase keeps cloud 8", slotH(rebuilt.roster[0], "So") === 8);
  // Hours-down vs new baseline with mismatched intent still blocked.
  const at7 = [makeEmp("k1", "Krzysztof", "14:00")];
  assert(
    "T4 mismatched intent cannot authorize 8→7",
    !isHoursDownFullyAuthorized(cloud8, at7, intents, WF, WT),
  );
}

// T5 — 10→9→8 before ACK → effective 10→8
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  registerPayrollHoursIntents([soIntent(9, 8)]);
  const peek = peekPayrollHoursIntentLedger();
  assert(
    "T5 coalesce 10→8",
    peek.length === 1 && peek[0].fromHours === 10 && peek[0].toHours === 8,
    JSON.stringify(peek),
  );
}

// T6 — 10→9→8→7 before ACK → effective 10→7
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  registerPayrollHoursIntents([soIntent(9, 8)]);
  registerPayrollHoursIntents([soIntent(8, 7)]);
  const peek = peekPayrollHoursIntentLedger();
  assert(
    "T6 coalesce 10→7",
    peek.length === 1 && peek[0].fromHours === 10 && peek[0].toHours === 7,
    JSON.stringify(peek),
  );
}

// T7 — ACK then 9→8 → NEW intent 9→8
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  ackPayrollHoursIntentsAgainstCloud([makeEmp("k1", "Krzysztof", "16:00")], WF, WT);
  assert("T7 ack clears", peekPayrollHoursIntentLedger().length === 0);
  registerPayrollHoursIntents([soIntent(9, 8)]);
  const peek = peekPayrollHoursIntentLedger();
  assert(
    "T7 new intent 9→8",
    peek.length === 1 && peek[0].fromHours === 9 && peek[0].toHours === 8,
    JSON.stringify(peek),
  );
}

// T8 — 10→9→10 → no stale 10→9
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  registerPayrollHoursIntents([soIntent(9, 10)]);
  assert("T8 net-zero removed", peekPayrollHoursIntentLedger().length === 0);
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const at9 = [makeEmp("k1", "Krzysztof", "16:00")];
  assert(
    "T8 cannot authorize unrelated 9",
    !isHoursDownFullyAuthorized(cloud, at9, peekPayrollHoursIntentLedger(), WF, WT),
  );
}

// T9 — intentional OFF 10→0 still accepted
{
  resetPayrollHoursIntentLedgerForTests();
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const before = [makeEmp("k1", "Krzysztof", "17:00")];
  const after = [{
    ...before[0],
    days: {
      ...before[0].days,
      So: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    },
  }];
  const intents = deriveHoursIntentsFromLocalEdit(before, after, WF, WT);
  registerPayrollHoursIntents(intents);
  assert("T9 OFF intent", peekPayrollHoursIntentLedger().some((i) => i.slot === "So" && i.toHours === 0));
  assert("T9 OFF authorized", isHoursDownFullyAuthorized(cloud, after, peekPayrollHoursIntentLedger(), WF, WT));
  const field = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    before,
    after,
    peekPayrollHoursIntentLedger(),
    WF,
    WT,
  );
  assert("T9 OFF kept", slotH(field.roster[0], "So") === 0);
}

// T10 — fresh 10→9 + settlement → both survive
{
  resetPayrollHoursIntentLedgerForTests();
  cancelPayrollDomainPush();
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const at9 = [makeEmp("k1", "Krzysztof", "16:00")];
  registerPayrollHoursIntents(deriveHoursIntentsFromLocalEdit(
    [makeEmp("k1", "Krzysztof", "17:00")],
    at9,
    WF,
    WT,
  ));
  let flushedOpts = null;
  bindPayrollDomainPushHandler((_roster, options) => {
    flushedOpts = options;
  });
  const settled = [{ ...at9[0], settled: true, settledUpdatedAt: "2026-08-29T12:00:00.000Z" }];
  schedulePayrollDomainPush(
    settled,
    { settlementCloudAck: true, settlementIntent: true, settlementIdempotencyKey: "k-test" },
    at9,
  );
  flushPayrollDomainPush();
  unbindPayrollDomainPushHandler();
  const merged = mergePayrollHoursIntentsWithLedger(flushedOpts?.hoursIntents);
  assert("T10 hours intent survives settlement schedule", merged.some((i) => i.toHours === 9));
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: settled,
    intentBefore: at9,
    hoursIntents: merged,
    weekFrom: WF,
    weekTo: WT,
  });
  assert("T10 So stays 9", slotH(rebuilt.roster[0], "So") === 9);
  assert("T10 settled flag kept", rebuilt.roster[0].settled === true);
  assert(
    "T10 App flush-before-freshness",
    settleBlock.includes("cancelPayrollDomainPushPreservingSettlement()")
      && settleBlock.indexOf("cancelPayrollDomainPushPreservingSettlement()")
        < settleBlock.indexOf("ensureCloudFreshBeforeWrite"),
  );
}

// T11 — freshness pull → intent survives
{
  resetPayrollHoursIntentLedgerForTests();
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const at9 = [makeEmp("k1", "Krzysztof", "16:00")];
  registerPayrollHoursIntents(deriveHoursIntentsFromLocalEdit(
    [makeEmp("k1", "Krzysztof", "17:00")],
    at9,
    WF,
    WT,
  ));
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: at9,
    intentBefore: [makeEmp("k1", "Krzysztof", "17:00")],
    hoursIntents: mergePayrollHoursIntentsWithLedger([]),
    weekFrom: WF,
    weekTo: WT,
  });
  assert("T11 freshness keeps 9", slotH(rebuilt.roster[0], "So") === 9);
  assert("T11 ledger still has intent", peekPayrollHoursIntentLedger().some((i) => i.toHours === 9));
}

// T12 — CAS 409 rebase path → intent survives / apply keeps 9
{
  resetPayrollHoursIntentLedgerForTests();
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const before = [makeEmp("k1", "Krzysztof", "17:00")];
  const after = [makeEmp("k1", "Krzysztof", "16:00")];
  registerPayrollHoursIntents(deriveHoursIntentsFromLocalEdit(before, after, WF, WT));
  const field = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    before,
    after,
    mergePayrollHoursIntentsWithLedger([]),
    WF,
    WT,
  );
  assert("T12 rebase keeps 9", slotH(field.roster[0], "So") === 9);
  assert("T12 ledger intact", peekPayrollHoursIntentLedger().some((i) => i.fromHours === 10 && i.toHours === 9));
}

// T13 — offline 10→9 → intent persists (LS)
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  const raw = localStorage.getItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY);
  assert("T13 offline persist", !!raw && raw.includes('"fromHours":10') && raw.includes('"toHours":9'));
}

// T14 — offline + reload within TTL → persists
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9)]);
  rehydratePayrollHoursIntentLedgerForTests();
  assert("T14 within TTL restored", peekPayrollHoursIntentLedger().length === 1);
}

// T15 — expired intent → removed → stale write blocked
{
  resetPayrollHoursIntentLedgerForTests();
  const expiredAt = Date.now() - PAYROLL_HOURS_INTENT_LEDGER_TTL_MS - 60_000;
  localStorage.setItem(
    PAYROLL_HOURS_INTENT_LEDGER_LS_KEY,
    JSON.stringify({
      schema: PAYROLL_HOURS_INTENT_LEDGER_SCHEMA,
      entries: [{
        ...soIntent(10, 9),
        createdAt: expiredAt,
        updatedAt: expiredAt,
      }],
    }),
  );
  rehydratePayrollHoursIntentLedgerForTests();
  assert("T15 expired removed", peekPayrollHoursIntentLedger().length === 0);
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const stale = [makeEmp("k1", "Krzysztof", "16:00")];
  assert(
    "T15 stale blocked after expiry",
    !isHoursDownFullyAuthorized(cloud, stale, peekPayrollHoursIntentLedger(), WF, WT),
  );
}

// T16 — corrupted ledger → Payroll still loads
{
  resetPayrollHoursIntentLedgerForTests();
  localStorage.setItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY, "{not-json!!!");
  rehydratePayrollHoursIntentLedgerForTests();
  assert("T16 corrupt → empty ledger", peekPayrollHoursIntentLedger().length === 0);
  registerPayrollHoursIntents([soIntent(10, 9)]);
  assert("T16 register after corrupt works", peekPayrollHoursIntentLedger().length === 1);
  localStorage.setItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY, JSON.stringify({ schema: 999, entries: [] }));
  rehydratePayrollHoursIntentLedgerForTests();
  assert("T16 bad schema discarded", peekPayrollHoursIntentLedger().length === 0);
}

// T17 — cross-employee scope isolation
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9, "k1")]);
  const cloud = [makeEmp("k1", "Krzysztof", "17:00"), makeEmp("k2", "Adam", "17:00")];
  const mixed = [makeEmp("k1", "Krzysztof", "16:00"), makeEmp("k2", "Adam", "16:00")];
  const intents = peekPayrollHoursIntentLedger();
  assert("T17 k1 authorized", isHoursDownFullyAuthorized(
    [cloud[0]],
    [mixed[0]],
    intents,
    WF,
    WT,
  ));
  assert(
    "T17 k2 blocked without own intent",
    !isHoursDownFullyAuthorized([cloud[1]], [mixed[1]], intents, WF, WT),
  );
}

// T18 — cross-week scope isolation
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9, "k1", WF, WT)]);
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const at9 = [makeEmp("k1", "Krzysztof", "16:00")];
  assert(
    "T18 other week not authorized by this intent",
    !isHoursDownFullyAuthorized(cloud, at9, peekPayrollHoursIntentLedger(), WF2, WT2),
  );
  assert(
    "T18 same week authorized",
    isHoursDownFullyAuthorized(cloud, at9, peekPayrollHoursIntentLedger(), WF, WT),
  );
}

// T19 — cross-day scope isolation
{
  resetPayrollHoursIntentLedgerForTests();
  registerPayrollHoursIntents([soIntent(10, 9, "k1", WF, WT, "So")]);
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  // Pt still 9h baseline from makeEmp (07–16); force Pt down without intent
  const atPtDown = [{
    ...cloud[0],
    days: {
      ...cloud[0].days,
      Pt: { ...cloud[0].days.Pt, to: "15:00" },
    },
  }];
  assert("T19 Pt down unauthorized", listUnauthorizedHoursDownSlots(
    cloud,
    atPtDown,
    peekPayrollHoursIntentLedger(),
    WF,
    WT,
  ).some((s) => s.slot === "Pt"));
  const at9So = [makeEmp("k1", "Krzysztof", "16:00")];
  assert(
    "T19 So authorized",
    isHoursDownFullyAuthorized(cloud, at9So, peekPayrollHoursIntentLedger(), WF, WT),
  );
}

// T20 — tombstone preservation unchanged + ACK only on success path + stale no-intent
{
  const ledgerSrc = readFileSync(resolve("src/lib/payroll-hours-intent-ledger.ts"), "utf8");
  const domainSrc = readFileSync(resolve("src/lib/payroll-domain-sync.ts"), "utf8");
  assert("T20 ledger no tombs", !ledgerSrc.includes("deleted-ids") && !/tombstone/i.test(ledgerSrc));
  assert("T20 domain still merges ledger", domainSrc.includes("mergePayrollHoursIntentsWithLedger"));
  assert("T20 ACK call after pushKeysToCloud", ackCallIdx > 0);
  const beforeAck = cloudSyncSrc.slice(Math.max(0, ackCallIdx - 2500), ackCallIdx);
  const afterAck = cloudSyncSrc.slice(ackCallIdx, ackCallIdx + 400);
  assert("T20 ACK after pushKeysToCloud in try", beforeAck.includes("await pushKeysToCloud"));
  assert(
    "T20 failed push restores in catch after ACK site",
    afterAck.includes("} catch (e)")
      && afterAck.includes("restoreKwWeekEmployeesLsAfterFailedPush"),
  );
  resetPayrollHoursIntentLedgerForTests();
  const cloud = [makeEmp("k1", "Krzysztof", "17:00")];
  const stale = [makeEmp("k1", "Krzysztof", "16:00")];
  assert("T20 stale no-intent BLOCK", !isHoursDownFullyAuthorized(cloud, stale, [], WF, WT));
  const san = sanitizeRosterHoursToAuthorizedIntents(cloud, stale, [], WF, WT);
  assert("T20 sanitize restores 10", slotH(san.sanitized[0], "So") === 10);
  assert("T20 TTL is 7d", PAYROLL_HOURS_INTENT_LEDGER_TTL_MS === 7 * 24 * 60 * 60 * 1000);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
