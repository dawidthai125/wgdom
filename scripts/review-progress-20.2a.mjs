/**
 * Sprint 20.2A.1 — weryfikacja wag computeInspectionProgress
 * Uruchom: npx vite-node scripts/review-progress-20.2a.mjs
 */
import { computeInspectionProgress, inspectionPriority, collectMissingHandoverItems } from "../src/lib/inspector-dashboard.ts";
import { REQUIRED_DOCS } from "../src/lib/job-documents.ts";

const base = () => ({
  id: "j",
  address: "ul. X",
  flatNumber: "",
  client: "WM",
  status: "in_progress",
  keysHandedOver: false,
  startDate: "2026-06-01",
  plannedHandoverDate: "",
  documents: Object.fromEntries(REQUIRED_DOCS.map((d) => [d, false])),
  inspectorPhotos: [],
  jobNotes: [],
  activityLog: [],
});

const scenarios = [
  ["PUSTA", base()],
  ["CZESCIOWO (3/8)", {
    ...base(),
    documents: { ...base().documents, zlecenie: true, kosztorys: true, pomiary: true },
    handoverStage: "in_progress",
    inspectorPhotos: [{ id: "p1" }],
    activityLog: [{ id: "a1", at: "2026-06-05T10:00:00Z", actor: "Jan", type: "inspector_photo", text: "foto" }],
  }],
  ["PRAWIE GOTOWA (7/8)", {
    ...base(),
    documents: Object.fromEntries(REQUIRED_DOCS.map((d, i) => [d, i < 7])),
    handoverStage: "ready_for_handover",
    plannedHandoverDate: "2026-06-06",
    inspectorPhotos: [{ id: "p1" }],
    jobNotes: [{ id: "n1", author: "J", authorRole: "inspector", text: "ok", at: "t" }],
  }],
  ["ZAKONCZONA", {
    ...base(),
    status: "completed",
    documents: Object.fromEntries(REQUIRED_DOCS.map((d) => [d, true])),
    handoverStage: "handed_over",
    inspectorPhotos: [{ id: "p1" }],
    jobNotes: [{ id: "n1", author: "J", authorRole: "inspector", text: "ok", at: "t" }],
  }],
  ["PO TERMINIE (1/8)", {
    ...base(),
    plannedHandoverDate: "2020-01-01",
    handoverStage: "docs_pending",
    documents: { ...base().documents, zlecenie: true },
  }],
];

const OLD = {
  PUSTA: 0,
  "CZESCIOWO (3/8)": 60,
  "PRAWIE GOTOWA (7/8)": 90,
  ZAKONCZONA: 100,
  "PO TERMINIE (1/8)": 25,
};

console.log("Sprint 20.2A.1 — porównanie postępu kontroli\n");
console.log("| Scenariusz | STARE % | NOWE % | docs | priority |");
console.log("|------------|---------|--------|------|----------|");

let ok = true;
for (const [name, job] of scenarios) {
  const p = computeInspectionProgress(job);
  const pri = inspectionPriority(job);
  const old = OLD[name] ?? "—";
  console.log(`| ${name} | ${old} | ${p.percent} | ${p.docsDone}/${p.docsTotal} | ${pri} |`);
  if (name === "PUSTA" && p.percent !== 0) ok = false;
  if (name === "CZESCIOWO (3/8)" && p.percent >= 60) ok = false;
  if (name === "PRAWIE GOTOWA (7/8)" && (p.percent < 80 || p.percent > 95)) ok = false;
  if (name === "ZAKONCZONA" && p.percent !== 100) ok = false;
}

if (!ok) {
  console.error("\nFAIL: scenariusze poza docelowymi widełkami");
  process.exit(1);
}
console.log("\nPASS: wszystkie scenariusze w docelowych widełkach");
