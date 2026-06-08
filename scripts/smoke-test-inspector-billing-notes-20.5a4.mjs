/**
 * Sprint 20.5A.4 — Inspektor × uwagi billing (MIN)
 * Uruchom: npx vite-node scripts/smoke-test-inspector-billing-notes-20.5a4.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeJobNotes } from "../src/lib/job-wm.ts";
import {
  appendBillingJobNote,
  buildBillingJobNote,
  isBillingJobNote,
  jobNotesForCharge,
  wmJobNotes,
  jobsWithInspectorNotesNeedingAdmin,
} from "../src/lib/job-wm.ts";
import { computeInspectionProgress } from "../src/lib/inspector-dashboard.ts";

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

const JOB_ID = "job-billing-notes";
const CHARGE_ID = "charge-billing-1";

log("=== Sprint 20.5A.4 — Inspector Billing Notes smoke ===\n");

// T1 — Zapis uwagi inspektora
{
  const job = { id: JOB_ID, jobNotes: [], activityLog: [], documents: {}, client: "Test", address: "A", flatNumber: "", status: "in_progress" };
  const note = buildBillingJobNote({
    chargeId: CHARGE_ID,
    text: "Kwota do weryfikacji na miejscu",
    author: "Szymon",
    authorRole: "inspector",
  });
  const updated = appendBillingJobNote(job, note, "Materiał dodatkowy");
  assert("T1 note saved", updated.jobNotes.length === 1);
  assert("T1 charge id", updated.jobNotes[0].recoverableChargeId === CHARGE_ID);
  assert("T1 context billing", updated.jobNotes[0].context === "billing");
  assert("T1 inspector role", updated.jobNotes[0].authorRole === "inspector");
}

// T2 — Widoczność admin (helper)
{
  const notes = [
    buildBillingJobNote({ chargeId: CHARGE_ID, text: "A", author: "Szymon", authorRole: "inspector" }),
    buildBillingJobNote({ chargeId: "other", text: "B", author: "Szymon", authorRole: "inspector" }),
  ];
  const forCharge = jobNotesForCharge(notes, CHARGE_ID);
  assert("T2 admin thread", forCharge.length === 1);
  assert("T2 is billing", isBillingJobNote(forCharge[0]));
}

// T3 — Brak write billing KV
{
  const inspectorSrc = readFileSync(resolve(root, "src/app/InspectorPanel.tsx"), "utf8");
  assert("T3 no pushRecoverableChargesToCloud", !inspectorSrc.includes("pushRecoverableChargesToCloud"));
  assert("T3 no push charges key", !inspectorSrc.includes('pushKeysToCloudSafe(["kw-recoverable-charges"'));
  assert("T3 has appendBillingJobNote", inspectorSrc.includes("appendBillingJobNote"));
  assert("T3 onAddBillingNote wired", inspectorSrc.includes("onAddBillingNote={handleAddBillingNote}"));
}

// T4 — Merge job notes
{
  const local = [buildBillingJobNote({ chargeId: CHARGE_ID, text: "L", author: "A", authorRole: "inspector" })];
  local[0].id = "note-local";
  const cloud = [buildBillingJobNote({ chargeId: CHARGE_ID, text: "C", author: "B", authorRole: "admin" })];
  cloud[0].id = "note-cloud";
  const merged = mergeJobNotes(local, cloud);
  assert("T4 merge count", merged.length === 2);
  assert("T4 merge ids", merged.some((n) => n.id === "note-local") && merged.some((n) => n.id === "note-cloud"));
}

// T5 — activity type
{
  const job = { id: JOB_ID, jobNotes: [], activityLog: [] };
  const note = buildBillingJobNote({ chargeId: CHARGE_ID, text: "Test", author: "Szymon", authorRole: "inspector" });
  const updated = appendBillingJobNote(job, note, "Pozycja X");
  assert("T5 activity type", updated.activityLog[0]?.type === "inspector_billing_note");
  assert("T5 activity prefix", updated.activityLog[0]?.text.includes("Uwaga billing"));
}

// T6 — WM separation
{
  const wm = { id: "w1", author: "S", authorRole: "inspector", text: "WM", at: "2026-06-01T10:00:00Z" };
  const billing = buildBillingJobNote({ chargeId: CHARGE_ID, text: "Bill", author: "S", authorRole: "inspector" });
  const wmOnly = wmJobNotes([wm, billing]);
  assert("T6 wm only count", wmOnly.length === 1);
  assert("T6 wm only text", wmOnly[0].text === "WM");
  const panelSrc = readFileSync(resolve(root, "src/app/JobWmPanel.tsx"), "utf8");
  assert("T6 JobWmPanel uses wmJobNotes", panelSrc.includes("wmJobNotes(job.jobNotes)"));
}

// T7 — Alert admin
{
  const job = {
    id: JOB_ID,
    address: "Test",
    client: "C",
    flatNumber: "",
    status: "in_progress",
    documents: { zlecenie: false, kosztorys: false, protokol: false, protokol2: false, protokol3: false, protokol4: false, protokol5: false, zdjecia: false },
    jobNotes: [buildBillingJobNote({ chargeId: CHARGE_ID, text: "Nowa", author: "Szymon", authorRole: "inspector" })],
  };
  job.jobNotes[0].at = "2026-06-08T12:00:00.000Z";
  const pending = jobsWithInspectorNotesNeedingAdmin([job], "2026-06-01T00:00:00.000Z");
  assert("T7 alert admin", pending.length === 1);
}

// T8 — Odpowiedź admin
{
  const job = { id: JOB_ID, jobNotes: [], activityLog: [] };
  const note = buildBillingJobNote({ chargeId: CHARGE_ID, text: "OK, sprawdzę", author: "Dawid", authorRole: "admin" });
  const updated = appendBillingJobNote(job, note, "Pozycja");
  assert("T8 admin role", updated.jobNotes[0].authorRole === "admin");
  assert("T8 same charge", updated.jobNotes[0].recoverableChargeId === CHARGE_ID);
  assert("T8 admin activity", updated.activityLog[0]?.type === "note");
  assert("T8 admin prefix", updated.activityLog[0]?.text.includes("Odpowiedź Do rozliczenia"));
}

// T9 — Regresja 20.5A.3A (markery panelu)
{
  const panelSrc = readFileSync(resolve(root, "src/app/JobRecoverableChargesPanel.tsx"), "utf8");
  assert("T9 inspector variant", panelSrc.includes('variant === "inspector"'));
  assert("T9 Historia rozliczeń", panelSrc.includes("Historia rozliczeń"));
  assert("T9 Zgłoś uwagę", panelSrc.includes("Zgłoś uwagę"));
  assert("T9 no create inspector", panelSrc.includes("!isInspector && onCreateCharge"));
}

// T10 — Billing note nie wpływa na notesPct
{
  const baseJob = {
    address: "A",
    client: "C",
    flatNumber: "",
    status: "in_progress",
    startDate: "2026-06-01",
    documents: { zlecenie: true, kosztorys: true, protokol: true, protokol2: true, protokol3: true, protokol4: true, protokol5: true, zdjecia: true },
    handoverStage: "handed_over",
    keysHandedOver: true,
    inspectorPhotos: [{ id: "p1" }],
    jobNotes: [],
    activityLog: [],
  };
  const without = computeInspectionProgress(baseJob);
  const withBilling = computeInspectionProgress({
    ...baseJob,
    jobNotes: [buildBillingJobNote({ chargeId: CHARGE_ID, text: "X", author: "S", authorRole: "inspector" })],
    activityLog: [{ id: "a1", at: "2026-06-08T10:00:00Z", actor: "S", type: "inspector_billing_note", text: "Uwaga billing" }],
  });
  assert("T10 notesPct unchanged", without.breakdown.notesPct === withBilling.breakdown.notesPct);
  assert("T10 percent unchanged", without.percent === withBilling.percent);
}

log("\n--- Podsumowanie ---");
const failed = Object.entries(results).filter(([, v]) => v === "FAIL");
if (failed.length === 0) {
  log(`ALL PASS (${Object.keys(results).length}/${Object.keys(results).length})`);
} else {
  log(`FAIL: ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
