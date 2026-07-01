/**
 * PAYROLL-CLOUD-RECOVERY B6 — Edge kw-week-employees merge parity (directoryId SSOT).
 * Run: npx vite-node scripts/test-payroll-edge-parity-b6.mjs
 */
import {
  mergeWeekEmployeesList,
  weekEmployeeMergeKey,
  hasWeekEmployeesRosterExpansion,
} from "../src/lib/payroll-week-employee-merge.ts";
import { mergeWeekEmployees } from "../src/lib/cloud-sync.ts";

function parseRecordTs(v) {
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function isLikelySpuriousUnsettle(rec) {
  if (Boolean(rec.settled)) return false;
  const sAt = parseRecordTs(rec.settledUpdatedAt);
  const dAt = parseRecordTs(rec.dataUpdatedAt);
  if (sAt <= 0 || dAt <= 0) return false;
  return Math.abs(sAt - dAt) <= 1500;
}

function pickSettledUpdatedAtForMerge(l, c, settled) {
  const lAt = parseRecordTs(l.settledUpdatedAt);
  const cAt = parseRecordTs(c.settledUpdatedAt);
  const lSettled = Boolean(l.settled);
  const cSettled = Boolean(c.settled);
  if (settled) {
    if (lSettled && (!cSettled || lAt >= cAt)) return l.settledUpdatedAt;
    if (cSettled) return c.settledUpdatedAt;
  } else {
    if (!lSettled && (!cSettled || lAt >= cAt)) return l.settledUpdatedAt;
    if (!cSettled) return c.settledUpdatedAt;
  }
  return lAt >= cAt ? (l.settledUpdatedAt ?? c.settledUpdatedAt) : (c.settledUpdatedAt ?? l.settledUpdatedAt);
}

function pickSettledByTimestamps(l, c) {
  const lAt = parseRecordTs(l.settledUpdatedAt);
  const cAt = parseRecordTs(c.settledUpdatedAt);
  const lSettled = Boolean(l.settled);
  const cSettled = Boolean(c.settled);
  if (lAt > 0 || cAt > 0) {
    if (lAt > cAt) return lSettled;
    if (cAt > lAt) {
      if (!cSettled && lSettled && isLikelySpuriousUnsettle(c)) return true;
      if (!lSettled && cSettled && isLikelySpuriousUnsettle(l)) return false;
      return cSettled;
    }
    return lSettled || cSettled;
  }
  return lSettled || cSettled;
}

function pickRateByTimestamps(l, c) {
  const lAt = parseRecordTs(l.rateUpdatedAt);
  const cAt = parseRecordTs(c.rateUpdatedAt);
  if (lAt && cAt && lAt !== cAt) return lAt > cAt ? l.rate : c.rate;
  if (lAt && !cAt) return l.rate;
  if (cAt && !lAt) return c.rate;
  if (c.rate !== undefined && String(c.rate).trim() !== "") return c.rate;
  if (l.rate !== undefined && String(l.rate).trim() !== "") return l.rate;
  return c.rate;
}

/** Mirror Edge mergeWeekEmployeeRecordByTimestamps (index.tsx). */
function mergeWeekEmployeeRecordByTimestamps(a, b) {
  const l = a;
  const c = b;
  const lAt = parseRecordTs(l.dataUpdatedAt);
  const cAt = parseRecordTs(c.dataUpdatedAt);
  const lDays = l.days || {};
  const cDays = c.days || {};
  const days = lAt > cAt ? { ...cDays, ...lDays } : cAt > lAt ? { ...lDays, ...cDays } : { ...cDays, ...lDays };
  const rate = pickRateByTimestamps(l, c);
  const lRateAt = parseRecordTs(l.rateUpdatedAt);
  const cRateAt = parseRecordTs(c.rateUpdatedAt);
  const dataWinner = lAt >= cAt ? l : c;
  const settled = pickSettledByTimestamps(l, c);
  return {
    ...c,
    ...l,
    ...dataWinner,
    days,
    rate,
    rateUpdatedAt: lRateAt >= cRateAt ? l.rateUpdatedAt ?? c.rateUpdatedAt : c.rateUpdatedAt ?? l.rateUpdatedAt,
    dataUpdatedAt: lAt >= cAt ? l.dataUpdatedAt ?? c.dataUpdatedAt : c.dataUpdatedAt ?? l.dataUpdatedAt,
    settled,
    settledUpdatedAt: pickSettledUpdatedAtForMerge(l, c, settled),
  };
}

function mergeWeekEmployeesUnionEdge(prev, next) {
  return mergeWeekEmployeesList(prev, next, mergeWeekEmployeeRecordByTimestamps);
}

/** Simulates batch-set kw-week-employees merge guards (B6). */
function edgeBatchSetWeekEmployees(prev, next, { forceReplace = false } = {}) {
  if (prev == null) return next;
  if (forceReplace) return next;
  if (hasWeekEmployeesRosterExpansion(prev, next)) {
    return mergeWeekEmployeesUnionEdge(prev, next);
  }
  return next;
}

function mergeKeys(list) {
  return list.map((e) => weekEmployeeMergeKey(e)).sort();
}

function assert(label, ok) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS: ${label}`);
  return true;
}

function makeEmp({ id, directoryId, name, dataUpdatedAt }) {
  return {
    id,
    directoryId,
    name: name ?? "Jan Kowalski",
    rate: "50",
    days: { Pn: { active: true, hours: 8 } },
    ...(dataUpdatedAt ? { dataUpdatedAt } : {}),
  };
}

let passed = 0;
function check(label, ok) {
  if (assert(label, ok)) passed++;
}

// C1 — same directoryId, different UUID → 1 record
{
  const prev = [makeEmp({ id: "uuid-a", directoryId: "dir-X" })];
  const next = [makeEmp({ id: "uuid-b", directoryId: "dir-X", dataUpdatedAt: "2026-07-01T10:00:00.000Z" })];
  const edge = mergeWeekEmployeesUnionEdge(prev, next);
  check("C1 edge union → 1 record", edge.length === 1);
  check("C1 merge key dir:X", weekEmployeeMergeKey(edge[0]) === "dir:dir-X");
}

// C2 — worker add: new directoryId preserved (expansion path)
{
  const prev = [
    makeEmp({ id: "e1", directoryId: "dir-1", name: "A" }),
    makeEmp({ id: "e2", directoryId: "dir-2", name: "B" }),
  ];
  const next = [
    ...prev,
    makeEmp({ id: "e-new", directoryId: "dir-Y", name: "Nowy" }),
  ];
  check("C2 expansion detected by merge key", hasWeekEmployeesRosterExpansion(prev, next));
  const batch = edgeBatchSetWeekEmployees(prev, next);
  check("C2 batch-set preserves new dir:Y", batch.length === 3);
  check("C2 dir:Y present", mergeKeys(batch).includes("dir:dir-Y"));
}

// C3 — new merge key without new UUID collision semantics (same dir, new uuid — not expansion)
{
  const prev = [makeEmp({ id: "old-id", directoryId: "dir-Z" })];
  const next = [makeEmp({ id: "new-id", directoryId: "dir-Z" })];
  check("C3 same dir not expansion", !hasWeekEmployeesRosterExpansion(prev, next));
}

// C4 — restore-payroll-backup union
{
  const current = [makeEmp({ id: "c1", directoryId: "dir-A", name: "A" })];
  const backup = [makeEmp({ id: "b1", directoryId: "dir-A", name: "A backup" })];
  const merged = mergeWeekEmployeesUnionEdge(current, backup);
  check("C4 restore union → 1 per dir", merged.length === 1);
  check("C4 key dir:A", weekEmployeeMergeKey(merged[0]) === "dir:dir-A");
}

// C5 — legacy name fallback
{
  const prev = [makeEmp({ id: "id-1", name: "  Tomek   Test " })];
  delete prev[0].directoryId;
  const next = [makeEmp({ id: "id-2", name: "tomek test" })];
  delete next[0].directoryId;
  const edge = mergeWeekEmployeesUnionEdge(prev, next);
  check("C5 legacy name → 1 record", edge.length === 1);
}

// C6 — list kernel matches client mergeWeekEmployees keys (parity)
{
  const prev = [
    makeEmp({ id: "a", directoryId: "d1", name: "One" }),
    makeEmp({ id: "b", directoryId: "d2", name: "Two" }),
  ];
  const next = [
    makeEmp({ id: "c", directoryId: "d1", name: "One newer", dataUpdatedAt: "2026-07-01T12:00:00.000Z" }),
    makeEmp({ id: "d", directoryId: "d3", name: "Three" }),
  ];
  const clientKeys = mergeKeys(mergeWeekEmployees(prev, next));
  const edgeKeys = mergeKeys(mergeWeekEmployeesUnionEdge(prev, next));
  check("C6 client vs edge merge keys parity", JSON.stringify(clientKeys) === JSON.stringify(edgeKeys));
}

console.log(`\nB6 Edge parity: ${passed} PASS`);
if (process.exitCode) process.exit(process.exitCode);
