/**
 * Payroll P1 — workEntries union merge (mergeWorkEntriesById in mergeJobsById).
 * npx vite-node scripts/test-payroll-work-entry-merge-fidelity.mjs
 */
import { mergeJobsById, mergeWorkEntriesById } from "../src/lib/cloud-sync.ts";

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

const baseJob = {
  id: "job-1",
  address: "Testowa 1",
  flatNumber: "2",
  client: "WM",
  status: "in_progress",
  startDate: "2026-06-01",
  documents: {},
  activityLog: [],
};

const entryA = {
  id: "we-a",
  directoryId: "dir-1",
  employeeName: "Jan Kowalski",
  date: "2026-06-23",
  hours: 8,
  rate: 50,
  notes: "",
};

const entryB = {
  id: "we-b",
  directoryId: "dir-2",
  employeeName: "Anna Nowak",
  date: "2026-06-23",
  hours: 6,
  rate: 45,
  notes: "",
};

console.log("=== PAYROLL WORK ENTRY MERGE FIDELITY ===\n");

// T1 — local entry, cloud empty → entry preserved
console.log("T1 local entry, cloud empty");
{
  const local = [{ ...baseJob, updatedAt: "2026-06-22T10:00:00.000Z", workEntries: [entryA] }];
  const cloud = [{ ...baseJob, updatedAt: "2026-06-22T10:00:00.000Z", workEntries: [] }];
  const [merged] = mergeJobsById(local, cloud);
  assert("T1 has entry", (merged.workEntries || []).some((e) => e.id === "we-a"));
  assert("T1 hours", (merged.workEntries || []).find((e) => e.id === "we-a")?.hours === 8);
}

// T2 — cloud entry, local empty → entry preserved
console.log("\nT2 cloud entry, local empty");
{
  const local = [{ ...baseJob, updatedAt: "2026-06-22T10:00:00.000Z", workEntries: [] }];
  const cloud = [{ ...baseJob, updatedAt: "2026-06-22T12:00:00.000Z", workEntries: [entryA] }];
  const [merged] = mergeJobsById(local, cloud);
  assert("T2 has entry", (merged.workEntries || []).some((e) => e.id === "we-a"));
}

// T3 — different entries → union
console.log("\nT3 different entries — union");
{
  const merged = mergeWorkEntriesById([entryA], [entryB]);
  assert("T3 count", merged.length === 2);
  assert("T3 has A", merged.some((e) => e.id === "we-a"));
  assert("T3 has B", merged.some((e) => e.id === "we-b"));
}

// T4 — duplicate id → richer wins (hours > 0, longer notes)
console.log("\nT4 duplicate id — richer wins");
{
  const sparse = { ...entryA, hours: 0, notes: "" };
  const rich = { ...entryA, hours: 8, notes: "Prace na kuchni i łazience" };
  const merged = mergeWorkEntriesById([sparse], [rich]);
  assert("T4 single", merged.length === 1);
  assert("T4 hours", merged[0].hours === 8);
  assert("T4 notes", merged[0].notes.includes("kuchni"));
}

// T5 — real case: cloud wins job timestamp but local-only new entry survives
console.log("\nT5 stale snapshot — cloud newer job, local new entry kept");
{
  const localOnly = {
    id: "we-new-payroll",
    directoryId: "dir-1",
    employeeName: "Jan Kowalski",
    date: "2026-06-23",
    hours: 8,
    rate: 50,
    notes: "",
  };
  const local = [{
    ...baseJob,
    updatedAt: "2026-06-22T10:00:00.000Z",
    workEntries: [localOnly],
  }];
  const cloud = [{
    ...baseJob,
    updatedAt: "2026-06-22T14:00:00.000Z",
    workEntries: [],
    activityLog: [{ id: "ev-1", at: "2026-06-22T14:00:00.000Z", type: "note", text: "sync" }],
  }];
  const [merged] = mergeJobsById(local, cloud);
  assert("T5 entry kept", (merged.workEntries || []).some((e) => e.id === "we-new-payroll"));
  assert("T5 hours kept", (merged.workEntries || []).find((e) => e.id === "we-new-payroll")?.hours === 8);
}

// T6 — multiple employees — no data loss
console.log("\nT6 multiple employees — union");
{
  const local = [{
    ...baseJob,
    updatedAt: "2026-06-22T11:00:00.000Z",
    workEntries: [entryA, { ...entryB, id: "we-b-local", hours: 4 }],
  }];
  const cloud = [{
    ...baseJob,
    updatedAt: "2026-06-22T12:00:00.000Z",
    workEntries: [
      entryB,
      {
        id: "we-c",
        directoryId: "dir-3",
        employeeName: "Piotr Wiśniewski",
        date: "2026-06-24",
        hours: 7,
        rate: 48,
        notes: "",
      },
    ],
  }];
  const [merged] = mergeJobsById(local, cloud);
  const ids = new Set((merged.workEntries || []).map((e) => e.id));
  assert("T6 count >= 4", (merged.workEntries || []).length >= 4);
  assert("T6 has we-a", ids.has("we-a"));
  assert("T6 has we-b", ids.has("we-b"));
  assert("T6 has we-b-local", ids.has("we-b-local"));
  assert("T6 has we-c", ids.has("we-c"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
