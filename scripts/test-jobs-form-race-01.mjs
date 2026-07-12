/**
 * JOBS-FORM-RACE-01 — functional merge w updateJob + delta-only form payloads
 * Run: npx vite-node scripts/test-jobs-form-race-01.mjs
 */
import { defaultJob, applyWriteTimestamps } from "../src/app/app-domain.ts";
import { mergeJobsById } from "../src/lib/cloud-sync.ts";
import { validateJobAssignedInspectorForSave } from "../src/lib/inspector-job-assignment.ts";
import { startJobExecution } from "../src/lib/job-wm.ts";

const JOB_ID = "job-form-race-01";
const INSPECTOR_ID = "szymon";
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function makeJob(overrides = {}) {
  const base = defaultJob();
  return {
    ...base,
    id: JOB_ID,
    address: "",
    flatNumber: "",
    client: "Wrocławskie Mieszkania",
    assignedInspectorId: INSPECTOR_ID,
    updatedAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

/** SSOT merge — mirrors JobsView updateJob functional updater (pre-pipeline). */
function applyJobFormDelta(jobs, delta) {
  return jobs.map((j) => {
    if (j.id !== delta.id) return j;
    return { ...j, ...delta };
  });
}

/** Stary antywzorzec: snapshot z closure nadpisuje prev. */
function applyJobSnapshotOverwrite(jobs, staleSnapshot) {
  return jobs.map((j) => (j.id === staleSnapshot.id ? staleSnapshot : j));
}

console.log("JF-T01 — 20 szybkich patchy adresu — końcowy = ostatni");
{
  let jobs = [makeJob({ address: "" })];
  for (let i = 1; i <= 20; i++) {
    jobs = applyJobFormDelta(jobs, { id: JOB_ID, address: `Obornicka-${i}` });
  }
  assert(jobs[0].address === "Obornicka-20", "ostatni patch adresu wygrywa");
}

console.log("\nJF-T02 — patch adresu + równoległy patch client — adres zachowany");
{
  let jobs = [makeJob({ address: "Obornicka", client: "Stary klient" })];
  jobs = applyJobFormDelta(jobs, { id: JOB_ID, client: "Nowy klient" });
  assert(jobs[0].address === "Obornicka", "adres nie cofnięty przez patch client");
  assert(jobs[0].client === "Nowy klient", "client zaktualizowany");
}

console.log("\nJF-T03 — out-of-order: functional merge dłuższy wygrywa nad snapshotem");
{
  const prev = [makeJob({ address: "Obornicka" })];
  const staleRender = { ...prev[0], address: "Oborn" };
  const afterNew = applyJobFormDelta(prev, { id: JOB_ID, address: "Obornicka" });
  const afterStale = applyJobSnapshotOverwrite(afterNew, {
    ...staleRender,
    address: "Obornic",
  });
  assert(afterStale[0].address === "Obornic", "stary snapshot overwrite — regresja (Obornic)");

  const afterNewFixed = applyJobFormDelta(prev, { id: JOB_ID, address: "Obornicka" });
  const afterStaleFixed = applyJobFormDelta(afterNewFixed, { id: JOB_ID, address: "Obornic" });
  assert(afterStaleFixed[0].address === "Obornic", "functional merge — ostatni patch wygrywa");

  const preserved = applyJobFormDelta(afterNewFixed, { id: JOB_ID, client: "WM" });
  assert(preserved[0].address === "Obornicka", "delta client nie cofa adresu");
}

console.log("\nJF-T04 — delta tylko flatNumber — reszta z prev");
{
  const prev = [makeJob({ address: "ul. Testowa 1", flatNumber: "", client: "WM" })];
  const next = applyJobFormDelta(prev, { id: JOB_ID, flatNumber: "5A" });
  assert(next[0].flatNumber === "5A", "flatNumber zaktualizowany");
  assert(next[0].address === "ul. Testowa 1", "address z prev");
  assert(next[0].client === "WM", "client z prev");
}

console.log("\nJF-T05 — startJobExecution merge — bez utraty address");
{
  const prev = makeJob({
    address: "ul. Obornicka 12",
    client: "Wrocławskie Mieszkania",
    jobPhase: "planned",
  });
  const delta = startJobExecution(prev, "Administrator");
  const merged = { ...prev, ...delta };
  assert(merged.address === "ul. Obornicka 12", "address zachowany po startJobExecution");
  assert(merged.jobPhase === "in_progress", "jobPhase z domain transform");
}

console.log("\nJF-T06 — walidacja inspektora na merged job");
{
  const prev = makeJob({ assignedInspectorId: undefined, address: "ul. X" });
  const merged = { ...prev, address: "ul. Nowa" };
  const validation = validateJobAssignedInspectorForSave(merged);
  assert(!validation.ok && validation.reason === "missing", "brak inspektora — blokada zapisu");

  const withInspector = { ...prev, assignedInspectorId: INSPECTOR_ID, address: "ul. Y" };
  const ok = validateJobAssignedInspectorForSave(withInspector);
  assert(ok.ok, "inspektor przypisany — walidacja OK na merged");
}

console.log("\nJF-T07 — regresja mergeJobsById (JA01 import smoke)");
{
  const local = [makeJob({ address: "ul. Lokalna", updatedAt: "2026-07-12T10:00:05.000Z" })];
  const cloud = [makeJob({ address: "", updatedAt: "2026-07-12T10:00:10.000Z" })];
  const merged = mergeJobsById(local, cloud, []);
  const j = merged.find((x) => x.id === JOB_ID);
  assert(j?.address === "ul. Lokalna", "mergeJobsById non-empty address wins");
}

console.log("\nJF-T08 — applyWriteTimestamps bump bez truncate");
{
  const prev = [makeJob({ address: "ul. Krótka", updatedAt: "2026-07-12T09:00:00.000Z" })];
  const next = [makeJob({ address: "ul. Obornicka 99", updatedAt: "2026-07-12T09:00:00.000Z" })];
  const stamped = applyWriteTimestamps("kw-jobs", prev, next);
  const j = stamped[0];
  assert(j.address === "ul. Obornicka 99", "adres bez skrócenia");
  assert(j.updatedAt !== prev[0].updatedAt, "updatedAt podbity przy zmianie");
}

console.log(`\n${"=".repeat(40)}`);
console.log(`JOBS-FORM-RACE-01: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
