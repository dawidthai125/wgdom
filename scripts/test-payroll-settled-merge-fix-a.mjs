/**
 * FIX A — Edge settled merge parity with client (pickSettledByTimestamps).
 * Run: npx vite-node scripts/test-payroll-settled-merge-fix-a.mjs
 */
import { mergeWeekEmployeeRecord } from "../src/lib/cloud-sync.ts";

/** Mirror Edge mergeWeekEmployeeRecordByTimestamps settled fields (must match index.tsx). */
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

function edgeMergeSettled(prev, next) {
  const l = prev;
  const c = next;
  const settled = pickSettledByTimestamps(l, c);
  return {
    settled,
    settledUpdatedAt: pickSettledUpdatedAtForMerge(l, c, settled),
  };
}

function mergeWeekEmployeesUnionEdge(prev, next) {
  const map = new Map();
  const ingest = (list) => {
    for (const item of list) {
      if (!item?.id) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        continue;
      }
      const settledFields = edgeMergeSettled(existing, item);
      map.set(item.id, { ...existing, ...item, ...settledFields });
    }
  };
  ingest(prev);
  ingest(next);
  return [...map.values()];
}

function assertSettledParity(label, local, cloud) {
  const client = mergeWeekEmployeeRecord(local, cloud);
  const edge = edgeMergeSettled(local, cloud);
  const ok =
    Boolean(client.settled) === Boolean(edge.settled) &&
    (client.settledUpdatedAt ?? null) === (edge.settledUpdatedAt ?? null);
  if (!ok) {
    console.error(label, { client: { settled: client.settled, at: client.settledUpdatedAt }, edge });
    return false;
  }
  return true;
}

const scenarios = [
  {
    name: "cloud rozliczony, local false bez settledUpdatedAt, nowsze godziny local",
    local: {
      id: "e1",
      settled: false,
      dataUpdatedAt: "2026-06-03T19:59:36.158Z",
      days: { Pn: { active: true, from: "07:00", to: "15:00" } },
    },
    cloud: {
      id: "e1",
      settled: true,
      settledUpdatedAt: "2026-06-03T15:40:36.039Z",
      dataUpdatedAt: "2026-06-03T15:34:00.000Z",
      days: { Pn: { active: true, from: "07:00", to: "14:00" } },
    },
    expectSettled: true,
  },
  {
    name: "incoming false spurious (c), local true — isLikelySpuriousUnsettle chroni rozliczenie",
    local: {
      id: "e2",
      settled: true,
      settledUpdatedAt: "2026-06-03T15:40:36.039Z",
      dataUpdatedAt: "2026-06-03T15:00:00.000Z",
      days: { Pn: { active: true, from: "07:00", to: "14:00" } },
    },
    cloud: {
      id: "e2",
      settled: false,
      settledUpdatedAt: "2026-06-03T19:59:36.158Z",
      dataUpdatedAt: "2026-06-03T19:59:36.158Z",
      days: { Pn: { active: true, from: "07:00", to: "16:00" } },
    },
    expectSettled: true,
  },
  {
    name: "local cofnięcie rozliczenia — nowszy settledUpdatedAt false",
    local: {
      id: "e3",
      settled: false,
      settledUpdatedAt: "2026-06-03T20:00:00.000Z",
      dataUpdatedAt: "2026-06-03T20:00:00.000Z",
      days: { Pn: { active: true, from: "07:00", to: "14:00" } },
    },
    cloud: {
      id: "e3",
      settled: true,
      settledUpdatedAt: "2026-06-03T15:40:00.000Z",
      dataUpdatedAt: "2026-06-03T15:00:00.000Z",
      days: { Pn: { active: true, from: "07:00", to: "14:00" } },
    },
    expectSettled: false,
  },
  {
    name: "legacy bez settledUpdatedAt — OR rozliczeń",
    local: { id: "e4", settled: false, days: {} },
    cloud: { id: "e4", settled: true, days: {} },
    expectSettled: true,
  },
];

let pass = true;
for (const s of scenarios) {
  const edge = edgeMergeSettled(s.local, s.cloud);
  const parity = assertSettledParity(s.name, s.local, s.cloud);
  const expectOk = Boolean(edge.settled) === s.expectSettled;
  if (!parity || !expectOk) {
    pass = false;
    console.error("FAIL", s.name, { edge, expectSettled: s.expectSettled });
  }
}

const richCloud = {
  id: "u1",
  settled: true,
  settledUpdatedAt: "2026-06-03T15:40:00.000Z",
  dataUpdatedAt: "2026-06-03T15:00:00.000Z",
  days: { Pn: { active: true, from: "07:00", to: "14:00" } },
};
const richLocal = {
  id: "u1",
  settled: false,
  dataUpdatedAt: "2026-06-03T19:59:00.000Z",
  days: {
    Pn: { active: true, from: "07:00", to: "16:00", extraHours: [{ from: "16:00", to: "17:00" }] },
    Wt: { active: true, from: "07:00", to: "15:00" },
  },
};
const union = mergeWeekEmployeesUnionEdge([richCloud], [richLocal]);
const unionOk = union.length === 1 && union[0].settled === true;
if (!unionOk) {
  pass = false;
  console.error("FAIL union richness — settled lost", union[0]);
}

console.log(
  JSON.stringify(
    {
      test: "payroll-settled-merge-fix-a",
      scenarios: scenarios.length,
      unionRichnessKeepsSettled: unionOk,
      pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
