/**
 * P2-D.1 — testy jednostkowe tender-change-monitor.
 * npx vite-node scripts/test-tender-change-monitor.mjs
 */
import {
  buildTenderChangeSnapshot,
  diffTenderChangeSnapshots,
  processTenderChangeMonitorUpdate,
  applyBzpMergeChangeMonitor,
  filterChangeEvents,
  normalizeTenderDeadline,
} from "../src/lib/tender-change-monitor.ts";

const item = {
  id: "t1",
  title: "Remont budynku X",
  bzpNumber: "2026/BZP 00000001",
  tenderId: "ocds-1",
  submittingOffersDate: "2026-06-20T10:00:00.000Z",
};

const docA = {
  index: 1,
  documentId: "d1",
  filename: "SWZ.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ez/u1",
  isSwzHint: true,
};

const docB = {
  index: 2,
  documentId: "d2",
  filename: "odpowiedzi_na_pytania.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ez/u2",
  isSwzHint: false,
};

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// First fetch — snapshot only, no events
const first = processTenderChangeMonitorUpdate(
  { ...item, changeMonitor: undefined, bzpDocuments: [] },
  { documents: [docA] },
);
assert("first fetch no events", first.newEvents.length === 0);
assert("first fetch snapshot", first.changeMonitor.snapshot?.docCount === 1);

// NEW_DOCUMENT — non-QA doc
const docC = {
  index: 3,
  documentId: "d3",
  filename: "przedmiar.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ez/u3",
  isSwzHint: false,
};
const second = processTenderChangeMonitorUpdate(
  { ...item, changeMonitor: first.changeMonitor, bzpDocuments: [docA] },
  { documents: [docA, docC] },
);
assert("NEW_DOCUMENT", second.newEvents.some((e) => e.type === "NEW_DOCUMENT"));

// QA doc nie generuje NEW_DOCUMENT w change monitor (P2-D.2 → qa-monitor)
const thirdQa = processTenderChangeMonitorUpdate(
  { ...item, changeMonitor: second.changeMonitor, bzpDocuments: [docA, docC] },
  { documents: [docA, docC, docB] },
);
assert("QA doc skipped in change monitor", !thirdQa.newEvents.some((e) => e.type === "NEW_DOCUMENT"));

// DOCUMENT_UPDATED
const docA2 = { ...docA, downloadUrl: "https://ez/u1-v2", filename: "SWZ_v2.pdf" };
const fourth = processTenderChangeMonitorUpdate(
  { ...item, changeMonitor: first.changeMonitor, bzpDocuments: [docA] },
  { documents: [docA2] },
);
assert("DOCUMENT_UPDATED", fourth.newEvents.some((e) => e.type === "DOCUMENT_UPDATED"));

// DOCUMENT_REMOVED
const fifth = processTenderChangeMonitorUpdate(
  { ...item, changeMonitor: second.changeMonitor, bzpDocuments: [docA, docC] },
  { documents: [docA] },
);
assert("DOCUMENT_REMOVED", fifth.newEvents.some((e) => e.type === "DOCUMENT_REMOVED"));

// DEADLINE_CHANGED via snapshot diff
const snap1 = buildTenderChangeSnapshot(
  { ...item, submittingOffersDate: "2026-06-20T10:00:00.000Z" },
  [docA],
);
const snap2 = buildTenderChangeSnapshot(
  { ...item, submittingOffersDate: "2026-06-27T10:00:00.000Z" },
  [docA],
);
const dlEvents = diffTenderChangeSnapshots(item, snap1, snap2);
assert("DEADLINE_CHANGED diff", dlEvents.some((e) => e.type === "DEADLINE_CHANGED"));

// BZP merge deadline
const prevItem = {
  ...item,
  changeMonitor: { snapshot: snap1, events: [], lastCheckedAt: null, unseenCount: 0 },
};
const bzpPatch = applyBzpMergeChangeMonitor(prevItem, { submittingOffersDate: "2026-06-27T10:00:00.000Z" });
assert("Bzp merge deadline patch", Boolean(bzpPatch?.changeMonitor?.events?.some((e) => e.type === "DEADLINE_CHANGED")));

// Filters
const mixed = [
  { id: "1", type: "NEW_DOCUMENT", at: "2026-06-12", tenderItemId: "t1", tenderTitle: "x", bzpNumber: "b", summary: "a" },
  { id: "2", type: "DEADLINE_CHANGED", at: "2026-06-12", tenderItemId: "t1", tenderTitle: "x", bzpNumber: "b", summary: "b" },
];
assert("filter documents", filterChangeEvents(mixed, "documents").length === 1);
assert("filter deadline", filterChangeEvents(mixed, "deadline").length === 1);

assert("normalize deadline", normalizeTenderDeadline("2026-06-20")?.startsWith("2026-06-20"));

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
