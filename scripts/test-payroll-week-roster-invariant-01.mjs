/**
 * PAYROLL-WEEK-ROSTER-INVARIANT-01 — D-F3 fence (+ GO6 amend) + D-F4 intentional clear
 * Run: npx vite-node scripts/test-payroll-week-roster-invariant-01.mjs
 *
 * GO6: archive identity overlap alone ≠ BLOCK.
 * BLOCK = historical fingerprint clone and/or tombstone recreate.
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { mergeWeekEmployeesList } from "../src/lib/payroll-week-employee-merge.ts";
import { weekEmployeeMergeKey } from "../src/lib/payroll-week-employee-merge.ts";
import {
  liveRosterHasPositiveHours,
  liveRosterTotalHours,
  mayPersistPayrollRosterUnderWeekKeys,
  rosterOverlapsArchivedHistorical,
  payrollRosterFingerprint,
  BLOCK_HISTORICAL_CLONE,
  BLOCK_TOMBSTONE_RECREATE,
  OK_CLOUD_MEMBERSHIP_UPDATE,
  PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON,
} from "../src/lib/payroll-week-roster-binding.ts";
import {
  assertSettlementIntentsPresentInRoster,
} from "../src/lib/payroll-settlement-cloud-ack.ts";
import { buildPayrollSettlement } from "../src/lib/payroll-settlement.ts";
import { getPayrollWeekRange } from "../src/lib/payroll-cycle.ts";
import {
  bootstrapPayrollPushAllowed,
} from "../src/lib/payroll-bootstrap-resurrection-fence.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function makeEmp(id, withHours = true, extras = {}) {
  return {
    id,
    directoryId: `dir-${id}`,
    name: `Worker ${id}`,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate: "50",
    days: Object.fromEntries(
      DAYS.map((k) => [
        k,
        k === "So" || !withHours
          ? defaultDay()
          : { ...defaultDay(), active: true, from: "07:00", to: "16:00" },
      ]),
    ),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
    ...extras,
  };
}

/** Day-activity pattern only (fingerprint SSOT uses active bits). */
function withActiveDays(emp, activeKeys) {
  const set = new Set(activeKeys);
  return {
    ...emp,
    days: Object.fromEntries(
      DAYS.map((k) => [
        k,
        set.has(k)
          ? { ...defaultDay(), active: true, from: "07:00", to: "16:00" }
          : defaultDay(),
      ]),
    ),
  };
}

/** Pure D-F4 Edge semantics: intentional clear skips union. */
function applyCasWrite(prev, next, intentionalHoursClear) {
  if (intentionalHoursClear === true) return next;
  return mergeWeekEmployeesList(prev, next, (a, b) => b ?? a);
}

const now = new Date("2026-08-24T10:00:00");
const current = getPayrollWeekRange(now);
const prev = { from: "2026-08-17", to: "2026-08-22" };
const prev2 = { from: "2026-08-10", to: "2026-08-15" };

function gate(roster, archive, cloudRoster, tombs) {
  return mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: current.from,
    weekTo: current.to,
    roster,
    archive,
    currentFrom: current.from,
    currentTo: current.to,
    cloudRoster,
    tombstonedMergeKeys: tombs,
  });
}

// Hours SSOT
{
  const rich = [makeEmp("h1", true)];
  const zero = [makeEmp("z1", false)];
  assert("hours rich > 0", liveRosterHasPositiveHours(rich));
  assert("hours zero == 0", !liveRosterHasPositiveHours(zero));
  assert("totalHours rich ~9*", liveRosterTotalHours(rich) >= 40);
}

// T-FENCE (GO6) — exact historical fingerprint clone + empty cloud → BLOCK
{
  const archived = Array.from({ length: 13 }, (_, i) => makeEmp(`a-${i}`, true));
  const live = archived.map((e) => ({ ...e }));
  const archive = [
    {
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: archived,
    },
  ];
  assert(
    "overlap still detects historical identity",
    rosterOverlapsArchivedHistorical(live, archive, current.from, current.to),
  );
  assert(
    "fingerprint matches historical",
    payrollRosterFingerprint(live) === payrollRosterFingerprint(archived),
  );
  const g = gate(live, archive, []);
  assert("T-FENCE exact clone + empty cloud mayPersist false", g.allow === false);
  assert("T-FENCE reason historical_clone", g.reason === BLOCK_HISTORICAL_CLONE);
  assert(
    "T-FENCE reason prefix",
    String(g.reason).startsWith(PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON),
  );
}

// GO6 — identity overlap alone (live ≠ archive fingerprint) + no cloud → ALLOW
{
  const archived = Array.from({ length: 5 }, (_, i) => makeEmp(`ov-${i}`, true));
  const live = [...archived.map((e) => ({ ...e })), makeEmp("ov-extra", true)];
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: archived }];
  assert(
    "GO6 weak overlap still true",
    rosterOverlapsArchivedHistorical(live, archive, current.from, current.to),
  );
  assert(
    "GO6 fingerprints differ",
    payrollRosterFingerprint(live) !== payrollRosterFingerprint(archived),
  );
  const g = gate(live, archive, undefined);
  assert("GO6 overlap alone mayPersist true", g.allow === true);
}

// Zero-hours seed under current → allow (ALIGN-legal)
{
  const archived = Array.from({ length: 3 }, (_, i) => makeEmp(`zarch-${i}`, true));
  const live0 = archived.map((e) => ({
    ...e,
    days: Object.fromEntries(DAYS.map((k) => [k, defaultDay()])),
  }));
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: archived }];
  const g = gate(live0, archive, []);
  assert("zero-hours seed mayPersist true", g.allow === true);
  assert(
    "zero-hours no overlap fence",
    !rosterOverlapsArchivedHistorical(live0, archive, current.from, current.to),
  );
}

// Legal current-week edits (no archive) → allow
{
  const fresh = [makeEmp("fresh-1", true)];
  const g = gate(fresh, [], undefined);
  assert("legal current hours mayPersist true", g.allow === true);
}

// ─── GO6 F1–F15 ───────────────────────────────────────────────

const krzysztofCloud = [
  makeEmp("krzysztof", true, {
    name: "Krzysztof",
    directoryId: "dir-krzysztof",
    settled: false,
  }),
];
const krzysztofArchive = [
  {
    weekFrom: prev.from,
    weekTo: prev.to,
    weekEmployees: [
      makeEmp("krzysztof", true, {
        name: "Krzysztof",
        directoryId: "dir-krzysztof",
      }),
    ],
  },
  {
    weekFrom: prev2.from,
    weekTo: prev2.to,
    weekEmployees: [
      makeEmp("krzysztof", true, {
        name: "Krzysztof",
        directoryId: "dir-krzysztof",
      }),
      makeEmp("other", true),
    ],
  },
];
const settleMeta = buildPayrollSettlement({
  settledByUserId: "admin-dawid",
  settledByName: "Dawid",
  paymentMethod: "transfer",
  amount: 1874.88,
  settledAt: "2026-08-29T14:22:19.000Z",
});
const krzysztofOutgoing = [
  {
    ...krzysztofCloud[0],
    settled: true,
    settledUpdatedAt: settleMeta.settledAt,
    payrollSettlement: settleMeta,
  },
];

// F1 legal settlement existing → ALLOW
{
  const g = gate(krzysztofOutgoing, krzysztofArchive, krzysztofCloud);
  assert("F1 settlement existing ALLOW", g.allow === true);
  assert("F1 reason cloud membership", g.reason === OK_CLOUD_MEMBERSHIP_UPDATE);
}

// F2 legal unsettle existing → ALLOW
{
  const settledCloud = [
    {
      ...krzysztofCloud[0],
      settled: true,
      settledUpdatedAt: settleMeta.settledAt,
      payrollSettlement: settleMeta,
    },
  ];
  const unsettle = [{ ...settledCloud[0], settled: false, settledUpdatedAt: "2026-08-29T15:00:00.000Z", payrollSettlement: undefined }];
  const g = gate(unsettle, krzysztofArchive, settledCloud);
  assert("F2 unsettle existing ALLOW", g.allow === true);
}

// F3 legal hours update existing → ALLOW
{
  const hoursOut = [
    {
      ...krzysztofCloud[0],
      days: {
        ...krzysztofCloud[0].days,
        Pn: { ...defaultDay(), active: true, from: "08:00", to: "17:00" },
      },
    },
  ];
  const g = gate(hoursOut, krzysztofArchive, krzysztofCloud);
  assert("F3 hours update existing ALLOW", g.allow === true);
}

// F4 legal rate update existing → ALLOW
{
  const rateOut = [{ ...krzysztofCloud[0], rate: "55" }];
  const g = gate(rateOut, krzysztofArchive, krzysztofCloud);
  assert("F4 rate update existing ALLOW", g.allow === true);
}

// F5 true resurrection after delete/tombstone → BLOCK
{
  const tombs = new Set([weekEmployeeMergeKey(krzysztofCloud[0])]);
  const g = gate(krzysztofOutgoing, krzysztofArchive, [], tombs);
  assert("F5 tombstone recreate BLOCK", g.allow === false);
  assert("F5 reason tombstone", g.reason === BLOCK_TOMBSTONE_RECREATE);
}

// F6 archived employee recreated after deletion → BLOCK
{
  const archivedOnly = makeEmp("gone", true, { name: "Gone", directoryId: "dir-gone" });
  const tombs = new Set([weekEmployeeMergeKey(archivedOnly)]);
  const archive = [
    { weekFrom: prev.from, weekTo: prev.to, weekEmployees: [archivedOnly] },
  ];
  const g = gate([archivedOnly], archive, [], tombs);
  assert("F6 archived recreate after delete BLOCK", g.allow === false);
  assert("F6 reason tombstone", g.reason === BLOCK_TOMBSTONE_RECREATE);
}

// F7 employee in archive but existing current → ALLOW
{
  const g = gate(krzysztofCloud, krzysztofArchive, krzysztofCloud);
  assert("F7 archive + existing current ALLOW", g.allow === true);
}

// F8 same employee in many historical weeks → ALLOW
{
  const g = gate(krzysztofOutgoing, krzysztofArchive, krzysztofCloud);
  assert("F8 many archive weeks ALLOW", g.allow === true);
}

// F9 historical roster restored under current keys → BLOCK
{
  const hist = Array.from({ length: 4 }, (_, i) => makeEmp(`clone-${i}`, true));
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  const cloudOther = [makeEmp("only-cloud", true)];
  const g = gate(hist.map((e) => ({ ...e })), archive, cloudOther);
  assert("F9 historical roster under current BLOCK", g.allow === false);
  assert("F9 reason clone", g.reason === BLOCK_HISTORICAL_CLONE);
}

// F10 current employee + archive overlap → ALLOW (Krzysztof-like)
{
  assert(
    "F10 overlap true",
    rosterOverlapsArchivedHistorical(
      krzysztofOutgoing,
      krzysztofArchive,
      current.from,
      current.to,
    ),
  );
  const g = gate(krzysztofOutgoing, krzysztofArchive, krzysztofCloud);
  assert("F10 Krzysztof existing + archive overlap ALLOW", g.allow === true);
  assert("F10 no fence blocked reason", g.reason !== PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON);
  assert(
    "F10 reason not blocked prefix",
    !String(g.reason).startsWith(PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON),
  );
}

// F11 settlementCloudAck path semantics: fence ALLOW for existing (ack is caller concern)
{
  const g = gate(krzysztofOutgoing, krzysztofArchive, krzysztofCloud);
  assert("F11 fence ALLOW with settlement outgoing", g.allow === true);
  const before = [{ ...krzysztofCloud[0] }];
  const after = [{ ...krzysztofOutgoing[0] }];
  const asserted = assertSettlementIntentsPresentInRoster({
    intentBefore: before,
    intentAfter: after,
    outgoingRoster: after,
  });
  assert("F11 GO4 assertion present", asserted.ok === true && asserted.checked >= 1);
}

// F12 GO4 outgoing assertion unchanged — mismatch still fails
{
  const before = [{ ...krzysztofCloud[0] }];
  const after = [{ ...krzysztofOutgoing[0] }];
  const mismatch = assertSettlementIntentsPresentInRoster({
    intentBefore: before,
    intentAfter: after,
    outgoingRoster: [{ ...krzysztofCloud[0] }], // still unsettled — stale/no-op
  });
  assert("F12 GO4 mismatch not ok", mismatch.ok === false);
  assert(
    "F12 GO4 reason",
    mismatch.ok === false && typeof mismatch.reason === "string",
  );
}

// F13 payroll guard failure remains BLOCK — fence does not invent guard bypass;
// empty cloud + clone still blocked (guard is separate layer; this asserts fence stay closed).
{
  const hist = [makeEmp("guard-clone", true)];
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  const g = gate(hist, archive, []);
  assert("F13 empty-cloud residual still BLOCK", g.allow === false);
}

// F14 CAS conflict remains CAS path — D-F4 union still applies without intentional clear
{
  const prevRoster = [makeEmp("cas1", true)];
  const nextRoster = [makeEmp("cas2", true)];
  const unioned = applyCasWrite(prevRoster, nextRoster, false);
  assert("F14 CAS union keeps both", unioned.length === 2);
}

// F15 stale baseline: field intent no-op → GO4 must not report false success
{
  const before = [{ ...krzysztofCloud[0] }];
  const after = [{ ...krzysztofOutgoing[0] }];
  const staleAssert = assertSettlementIntentsPresentInRoster({
    intentBefore: before,
    intentAfter: after,
    outgoingRoster: [{ ...krzysztofCloud[0], settled: false }],
  });
  assert("F15 stale outgoing GO4 not success", staleAssert.ok === false);
}

// Case A — empty Cloud + exact historical residual → BLOCK
{
  const hist = Array.from({ length: 6 }, (_, i) => makeEmp(`caseA-${i}`, true));
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  const g = gate(hist.map((e) => ({ ...e })), archive, []);
  assert("CaseA empty cloud residual BLOCK", g.allow === false);
}

// Case B — cloud missing outgoing set + fingerprint ≈ archive → BLOCK
{
  const hist = Array.from({ length: 3 }, (_, i) => makeEmp(`caseB-${i}`, true));
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  const cloudPartial = [makeEmp("caseB-0", true)]; // subset / different set
  const g = gate(hist.map((e) => ({ ...e })), archive, cloudPartial);
  assert("CaseB cloud missing set + clone BLOCK", g.allow === false);
}

// Case C — tombstone recreate → BLOCK
{
  const e = makeEmp("caseC", true);
  const tombs = new Set([weekEmployeeMergeKey(e)]);
  const g = gate([e], [], [], tombs);
  assert("CaseC tombstone recreate BLOCK", g.allow === false);
}

// ─── GO6.1 R1–R12 ─────────────────────────────────────────────
const histDays = ["Pn", "Wt", "Sr", "Cz", "Pt"];
const cloudDaysDiff = ["Pn", "Wt", "Sr"]; // identity same, fingerprint ≠ live/archive

// R1: same identities, live==archive fp, cloud fp ≠ live → BLOCK (O2 before O1)
{
  const ids = ["r1a", "r1b"];
  const hist = ids.map((id) => withActiveDays(makeEmp(id, false), histDays));
  const live = hist.map((e) => ({ ...e }));
  const cloud = ids.map((id) => withActiveDays(makeEmp(id, false), cloudDaysDiff));
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  assert("R1 identity sets equal", payrollRosterFingerprint(live).split("|").map((x) => x.split(":")[0]).join() ===
    payrollRosterFingerprint(cloud).split("|").map((x) => x.split(":")[0]).join());
  assert("R1 live fp == archive", payrollRosterFingerprint(live) === payrollRosterFingerprint(hist));
  assert("R1 cloud fp != live", payrollRosterFingerprint(cloud) !== payrollRosterFingerprint(live));
  const g = gate(live, archive, cloud);
  assert("R1 residual same-ids BLOCK", g.allow === false);
  assert("R1 reason historical_clone", g.reason === BLOCK_HISTORICAL_CLONE);
}

// R2: same ids, archive overlap only, live ≠ clone → ALLOW O1
{
  const cloud = [makeEmp("r2", true)];
  const live = [{ ...cloud[0], rate: "60" }];
  const archive = [
    {
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: [withActiveDays(makeEmp("r2", false), cloudDaysDiff)],
    },
  ];
  assert(
    "R2 live != hist clone",
    payrollRosterFingerprint(live) !== payrollRosterFingerprint(archive[0].weekEmployees),
  );
  const g = gate(live, archive, cloud);
  assert("R2 overlap-only ALLOW", g.allow === true);
  assert("R2 reason membership", g.reason === OK_CLOUD_MEMBERSHIP_UPDATE);
}

// R3 settlement + archive overlap → ALLOW
{
  const g = gate(krzysztofOutgoing, krzysztofArchive, krzysztofCloud);
  assert("R3 settlement ALLOW", g.allow === true && g.reason === OK_CLOUD_MEMBERSHIP_UPDATE);
  const go4 = assertSettlementIntentsPresentInRoster({
    intentBefore: [{ ...krzysztofCloud[0] }],
    intentAfter: [{ ...krzysztofOutgoing[0] }],
    outgoingRoster: [{ ...krzysztofOutgoing[0] }],
  });
  assert("R3 GO4 path ok", go4.ok === true && go4.checked >= 1);
}

// R4 hours update + archive overlap → ALLOW
{
  const hoursOut = [
    {
      ...krzysztofCloud[0],
      days: {
        ...krzysztofCloud[0].days,
        Pn: { ...defaultDay(), active: true, from: "08:00", to: "17:00" },
      },
    },
  ];
  const g = gate(hoursOut, krzysztofArchive, krzysztofCloud);
  assert("R4 hours ALLOW", g.allow === true);
}

// R5 rate update + archive overlap → ALLOW
{
  const g = gate([{ ...krzysztofCloud[0], rate: "70" }], krzysztofArchive, krzysztofCloud);
  assert("R5 rate ALLOW", g.allow === true);
}

// R6 extraCosts update + archive overlap → ALLOW
{
  const g = gate(
    [{ ...krzysztofCloud[0], extraCosts: [{ id: "x1", label: "bonus", amount: 100 }] }],
    krzysztofArchive,
    krzysztofCloud,
  );
  assert("R6 extraCosts ALLOW", g.allow === true);
}

// R7 PUSH path semantics: tombstone recreate → BLOCK
{
  const e = makeEmp("r7", true);
  const tombs = new Set([weekEmployeeMergeKey(e)]);
  const g = gate([e], [], [], tombs);
  assert("R7 push tombstone BLOCK", g.allow === false && g.reason === BLOCK_TOMBSTONE_RECREATE);
}

// R8 BOOTSTRAP fence receives tombs → BLOCK recreate
{
  const e = makeEmp("r8", true);
  const tombs = new Set([weekEmployeeMergeKey(e)]);
  const boot = bootstrapPayrollPushAllowed({
    key: "kw-week-employees",
    mergedValue: [e],
    cloudValue: [],
    fence: {
      preferCloudEmptyRoster: false,
      stripLocalOnlyCurrentArchive: false,
      blockBootstrapPushWeekEmployees: false,
      blockBootstrapPushArchive: false,
      reason: "no_fence",
    },
    weekBinding: {
      weekFrom: current.from,
      weekTo: current.to,
      archive: [],
      currentFrom: current.from,
      currentTo: current.to,
      tombstonedMergeKeys: tombs,
    },
  });
  assert("R8 bootstrap tombstone BLOCK", boot.allow === false);
  assert(
    "R8 bootstrap reason tombstone",
    String(boot.reason).includes("tombstone_recreate"),
  );
}

// R9 Cloud empty + historical clone → BLOCK
{
  const hist = [makeEmp("r9a", true), makeEmp("r9b", true)];
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  const g = gate(hist.map((e) => ({ ...e })), archive, []);
  assert("R9 empty cloud clone BLOCK", g.allow === false && g.reason === BLOCK_HISTORICAL_CLONE);
}

// R10 Cloud subset + live historical clone → BLOCK
{
  const hist = ["r10a", "r10b", "r10c"].map((id) =>
    withActiveDays(makeEmp(id, false), histDays),
  );
  const live = hist.map((e) => ({ ...e }));
  const cloud = [withActiveDays(makeEmp("r10a", false), histDays)];
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: hist }];
  const g = gate(live, archive, cloud);
  assert("R10 subset + clone BLOCK", g.allow === false && g.reason === BLOCK_HISTORICAL_CLONE);
}

// R11 Cloud superset / outgoing subset, not a clone → ALLOW
{
  const cloud = [makeEmp("r11a", true), makeEmp("r11b", true), makeEmp("r11c", true)];
  const live = [{ ...cloud[0], rate: "55" }, { ...cloud[1] }];
  const archive = [
    {
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: [withActiveDays(makeEmp("r11a", false), cloudDaysDiff)],
    },
  ];
  const g = gate(live, archive, cloud);
  assert("R11 subset of cloud no-clone ALLOW", g.allow === true);
  assert("R11 membership", g.reason === OK_CLOUD_MEMBERSHIP_UPDATE);
}

// R12 many archive weeks, legitimate current (matches cloud fp) → ALLOW
{
  const g = gate(krzysztofCloud, krzysztofArchive, krzysztofCloud);
  assert("R12 many weeks legitimate ALLOW", g.allow === true);
}

// D-F4 — intentional clear: empty next replaces prev (no union)
{
  const prevRoster = [makeEmp("p1", true), makeEmp("p2", true)];
  const empty = [];
  const withUnion = applyCasWrite(prevRoster, empty, false);
  const withClear = applyCasWrite(prevRoster, empty, true);
  assert("without flag union keeps prev", withUnion.length === 2);
  assert("D-F4 intentional clear → empty Cloud", withClear.length === 0);
}

// D-F4 — intentional clear must NOT apply to non-empty next (union still for normal CAS)
{
  const prevRoster = [makeEmp("p1", true)];
  const nextRoster = [makeEmp("p1", true), makeEmp("p2", true)];
  const replaced = applyCasWrite(prevRoster, nextRoster, true);
  assert("intentional+nonEmpty replaces with next", replaced.length === 2);
}

console.log(`\nPAYROLL-WEEK-ROSTER-INVARIANT-01: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
