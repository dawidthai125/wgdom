/**
 * Payroll P1 — workEntries union merge (mergeWorkEntriesById in mergeJobsById).
 * npx vite-node scripts/test-payroll-work-entry-merge-fidelity.mjs
 */
import { mergeJobsById, mergeWorkEntriesById, mergeIncomingWithStored } from "../src/lib/cloud-sync.ts";
import {
  removeWorkEntryFromJobs,
  removeWorkEntriesMatchingFromJobs,
  updateWorkEntryHoursInJobs,
  moveWorkEntryToJob,
  addWorkEntryForEmployee,
} from "../src/lib/payroll-job-assignments.ts";
import { fixJobsForConsistencyAlert } from "../src/app/app-domain.ts";

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

// T4 — duplicate id bez parent updatedAt → bogatszy wygrywa
console.log("\nT4 duplicate id — richer wins (no parent ts)");
{
  const sparse = { ...entryA, hours: 0, notes: "" };
  const rich = { ...entryA, hours: 8, notes: "Prace na kuchni i łazience" };
  const merged = mergeWorkEntriesById([sparse], [rich]);
  assert("T4 single", merged.length === 1);
  assert("T4 hours", merged[0].hours === 8);
  assert("T4 notes", merged[0].notes.includes("kuchni"));
}

// T10 — P0: nowszy job.updatedAt (lokal) wygrywa nad bogatszą chmurą
console.log("\nT10 newer local job — lower hours beat richer cloud");
{
  const local = [{
    ...baseJob,
    updatedAt: "2026-06-23T10:00:00.000Z",
    workEntries: [{ ...entryA, hours: 4 }],
  }];
  const cloud = [{
    ...baseJob,
    updatedAt: "2026-06-22T10:00:00.000Z",
    workEntries: [{ ...entryA, hours: 8, notes: "stara chmura" }],
  }];
  const [merged] = mergeJobsById(local, cloud);
  const row = (merged.workEntries || []).find((e) => e.id === "we-a");
  assert("T10 single", (merged.workEntries || []).length === 1);
  assert("T10 local hours", row?.hours === 4);
}

// T10b — touchJobAt on hours edit
console.log("\nT10b updateWorkEntryHoursInJobs bumps job.updatedAt");
{
  const oldAt = "2026-06-20T08:00:00.000Z";
  const job = { ...baseJob, updatedAt: oldAt, workEntries: [entryA] };
  const [next] = updateWorkEntryHoursInJobs([job], "job-1", "we-a", 3);
  assert("T10b hours", next.workEntries[0].hours === 3);
  assert("T10b updatedAt newer", String(next.updatedAt || "") > oldAt);
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

// T7 — local delete + tombstone — cloud entry suppressed after merge
console.log("\nT7 local delete + tombstone — cloud entry suppressed");
{
  const deletedAt = "2026-06-22T14:00:00.000Z";
  const local = [{
    ...baseJob,
    updatedAt: deletedAt,
    workEntries: [],
    deletedWorkEntryTombstones: [{ id: "we-a", at: deletedAt }],
  }];
  const cloud = [{
    ...baseJob,
    updatedAt: "2026-06-22T10:00:00.000Z",
    workEntries: [entryA],
  }];
  const [merged] = mergeJobsById(local, cloud);
  assert("T7 entry removed", !(merged.workEntries || []).some((e) => e.id === "we-a"));
  assert("T7 tombstone kept", (merged.deletedWorkEntryTombstones || []).some((t) => t.id === "we-a"));
}

// T7b — removeWorkEntryFromJobs writes tombstone
console.log("\nT7b removeWorkEntryFromJobs — tombstone on delete");
{
  const job = {
    ...baseJob,
    workEntries: [entryA, entryB],
  };
  const [next] = removeWorkEntryFromJobs([job], "job-1", "we-a");
  assert("T7b entry gone", !(next.workEntries || []).some((e) => e.id === "we-a"));
  assert("T7b other kept", (next.workEntries || []).some((e) => e.id === "we-b"));
  assert("T7b tombstone", (next.deletedWorkEntryTombstones || []).some((t) => t.id === "we-a"));
  const merged = mergeWorkEntriesById(next.workEntries, [entryA], next.deletedWorkEntryTombstones);
  assert("T7b merge respects tombstone", !merged.some((e) => e.id === "we-a"));
}

// T8 — JobsView delete path (removeWorkEntryFromJobs) — cloud entry not restored
console.log("\nT8 JobsView delete — local tombstone vs cloud entry");
{
  const deletedAt = "2026-06-22T15:00:00.000Z";
  const [localJob] = removeWorkEntryFromJobs(
    [{ ...baseJob, updatedAt: deletedAt, workEntries: [entryA] }],
    "job-1",
    "we-a",
  );
  const local = [localJob];
  const cloud = [{
    ...baseJob,
    updatedAt: "2026-06-22T10:00:00.000Z",
    workEntries: [entryA],
  }];
  const [merged] = mergeJobsById(local, cloud);
  assert("T8 entry not restored", !(merged.workEntries || []).some((e) => e.id === "we-a"));
  assert("T8 tombstone on merged job", (merged.deletedWorkEntryTombstones || []).some((t) => t.id === "we-a"));
}

// T9 — fixJobsForConsistencyAlert bulk delete — entries stay deleted after merge
console.log("\nT9 fixJobsForConsistencyAlert bulk delete + merge");
{
  const weekFrom = "2026-06-09";
  const weekTo = "2026-06-14";
  const dateIso = "2026-06-10";
  const directory = [{
    id: "d1",
    name: "Jan Kowalski",
    phone: "+48123456789",
    position: "Murarz",
    defaultRate: "50",
    active: true,
  }];
  const weekEmp = {
    id: "we1",
    directoryId: "d1",
    name: "Jan Kowalski",
    phone: "",
    position: "Murarz",
    rate: "50",
    days: {
      Pn: { active: false, from: "", to: "", zaliczka: "" },
      Wt: { active: false, from: "", to: "", zaliczka: "" },
      Sr: { active: false, from: "", to: "", zaliczka: "" },
      Cz: { active: false, from: "", to: "", zaliczka: "" },
      Pt: { active: false, from: "", to: "", zaliczka: "" },
      So: { active: false, from: "", to: "", zaliczka: "" },
    },
    settled: false,
  };
  const alert = {
    name: "Jan Kowalski",
    dayLabel: "Wt (10.06)",
    dayKey: "Wt",
    dateIso,
    payrollHours: 0,
    jobHours: 9,
    kind: "job_only",
  };
  const jobsBefore = [{
    ...baseJob,
    updatedAt: "2026-06-22T16:00:00.000Z",
    workEntries: [{
      id: "we-a",
      directoryId: "d1",
      employeeName: "Jan Kowalski",
      date: dateIso,
      hours: 9,
      rate: 50,
      notes: "",
    }],
  }];
  const fixed = fixJobsForConsistencyAlert(
    jobsBefore,
    alert,
    [weekEmp],
    weekFrom,
    weekTo,
    directory,
    "Dawid",
  );
  assert("T9 fixed job empty", (fixed[0].workEntries || []).length === 0);
  assert("T9 fixed tombstone", (fixed[0].deletedWorkEntryTombstones || []).some((t) => t.id === "we-a"));
  const cloud = [{
    ...baseJob,
    updatedAt: "2026-06-22T10:00:00.000Z",
    workEntries: [{
      id: "we-a",
      directoryId: "d1",
      employeeName: "Jan Kowalski",
      date: dateIso,
      hours: 9,
      rate: 50,
      notes: "",
    }],
  }];
  const [merged] = mergeJobsById(fixed, cloud);
  assert("T9 merge no entry restore", !(merged.workEntries || []).some((e) => e.id === "we-a"));
}

// T9b — removeWorkEntriesMatchingFromJobs direct
console.log("\nT9b removeWorkEntriesMatchingFromJobs — multi entry tombstones");
{
  const job = {
    ...baseJob,
    workEntries: [entryA, entryB],
  };
  const next = removeWorkEntriesMatchingFromJobs([job], (_j, we) => we.id === "we-a" || we.id === "we-b");
  assert("T9b all removed", (next[0].workEntries || []).length === 0);
  assert("T9b both tombstones", (next[0].deletedWorkEntryTombstones || []).length === 2);
}

const weekEmpForAssign = {
  id: "we-emp-1",
  directoryId: "dir-1",
  name: "Jan Kowalski",
  phone: "",
  position: "Murarz",
  rate: "50",
  days: {
    Pn: { active: false, from: "", to: "", zaliczka: "" },
    Wt: { active: false, from: "", to: "", zaliczka: "" },
    Sr: { active: false, from: "", to: "", zaliczka: "" },
    Cz: { active: false, from: "", to: "", zaliczka: "" },
    Pt: { active: false, from: "", to: "", zaliczka: "" },
    So: { active: false, from: "", to: "", zaliczka: "" },
  },
  settled: false,
};

const jobA = {
  ...baseJob,
  id: "job-a",
  updatedAt: "2026-06-22T10:00:00.000Z",
  workEntries: [],
};

const jobB = {
  ...baseJob,
  id: "job-b",
  address: "Inna 2",
  updatedAt: "2026-06-22T10:00:00.000Z",
  workEntries: [],
};

// T11 — moveWorkEntryToJob + stale cloud merge
console.log("\nT11 moveWorkEntryToJob — stale cloud does not restore on source job");
{
  const withEntry = [{
    ...jobA,
    workEntries: [entryA],
  }, { ...jobB }];
  const afterMove = moveWorkEntryToJob(withEntry, "job-a", "we-a", "job-b", 8);
  const staleCloud = [{
    ...jobA,
    updatedAt: "2026-06-22T09:00:00.000Z",
    workEntries: [entryA],
  }, { ...jobB }];
  const merged = mergeJobsById(afterMove, staleCloud);
  const jobAMerged = merged.find((j) => j.id === "job-a");
  const jobBMerged = merged.find((j) => j.id === "job-b");
  const onB = (jobBMerged?.workEntries || []).find((e) => e.directoryId === "dir-1");
  assert("T11 entry on job B", onB != null && onB.hours === 8);
  assert("T11 entry not on job A", !(jobAMerged?.workEntries || []).some((e) => e.id === "we-a"));
  assert("T11 tombstone on A", (jobAMerged?.deletedWorkEntryTombstones || []).some((t) => t.id === "we-a"));
}

// T12 — debounce race: stale React + fresh LS → V2 wins
console.log("\nT12 stale React V1 + LS V2 + stale cloud V0");
{
  const dateIso = "2026-06-23";
  const v0Cloud = [{ ...jobA }, { ...jobB }];
  const v1React = addWorkEntryForEmployee(v0Cloud, "job-a", weekEmpForAssign, dateIso, 4);
  const v2Local = moveWorkEntryToJob(v1React, "job-a", v1React[0].workEntries[0].id, "job-b", 4);
  const preparedJobs = mergeIncomingWithStored("kw-jobs", v2Local, v1React);
  const merged = mergeJobsById(preparedJobs, v0Cloud);
  const jobBMerged = merged.find((j) => j.id === "job-b");
  const onB = (jobBMerged?.workEntries || []).find((e) => e.directoryId === "dir-1");
  assert("T12 assignment on target job B", onB != null && onB.hours === 4);
  const jobAMerged = merged.find((j) => j.id === "job-a");
  assert("T12 no live entry on job A", (jobAMerged?.workEntries || []).length === 0);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
