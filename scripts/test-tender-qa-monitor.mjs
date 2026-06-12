/**
 * P2-D.2 — testy tender-qa-monitor.
 * npx vite-node scripts/test-tender-qa-monitor.mjs
 */
import {
  buildTenderQaSnapshot,
  diffTenderQaSnapshots,
  processTenderQaMonitorUpdate,
  generateQaAiSummary,
  isQaDocumentFilename,
  filterQaEvents,
} from "../src/lib/tender-qa-monitor.ts";

const item = {
  id: "t1",
  title: "Modernizacja szkoły",
  bzpNumber: "2026/BZP 00000001",
  tenderId: "ocds-1",
};

const qa1 = {
  index: 1,
  documentId: "q1",
  filename: "odpowiedzi_na_pytania_1.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ez/u1",
  isSwzHint: false,
};

const qa2 = {
  index: 2,
  documentId: "q2",
  filename: "odpowiedzi_na_pytania_2.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ez/u2",
  isSwzHint: false,
};

const qa3 = {
  index: 3,
  documentId: "q3",
  filename: "wyjasnienia_tresci_swz.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://ez/u3",
  isSwzHint: false,
};

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

assert("isQa filename odpowiedzi", isQaDocumentFilename("odpowiedzi_na_pytania.pdf"));
assert("isQa filename wyjasnienia", isQaDocumentFilename("wyjaśnienia treści SWZ.pdf"));
assert("not qa swz", !isQaDocumentFilename("SWZ_glowny.pdf"));

const first = processTenderQaMonitorUpdate(
  { ...item, qaMonitor: undefined, bzpDocuments: [] },
  { documents: [qa1] },
);
assert("first snapshot no events", first.newEvents.length === 0);

const second = processTenderQaMonitorUpdate(
  { ...item, qaMonitor: first.qaMonitor, bzpDocuments: [qa1] },
  { documents: [qa1, qa2] },
);
assert("NEW_QA single", second.newEvents.some((e) => e.type === "NEW_QA"));

const batch = processTenderQaMonitorUpdate(
  { ...item, qaMonitor: first.qaMonitor, bzpDocuments: [qa1] },
  { documents: [qa1, qa2, qa3] },
);
assert("QA_BATCH", batch.newEvents.some((e) => e.type === "QA_BATCH"));
assert("QA_BATCH count", batch.newEvents.find((e) => e.type === "QA_BATCH")?.count === 2);

const qa1v2 = { ...qa1, downloadUrl: "https://ez/u1-v2", filename: "odpowiedzi_na_pytania_1_v2.pdf" };
const updated = processTenderQaMonitorUpdate(
  { ...item, qaMonitor: first.qaMonitor, bzpDocuments: [qa1] },
  { documents: [qa1v2] },
);
assert("QA_UPDATED", updated.newEvents.some((e) => e.type === "QA_UPDATED"));

const snap1 = buildTenderQaSnapshot({ tenderId: item.tenderId }, [qa1]);
const snap2 = buildTenderQaSnapshot({ tenderId: item.tenderId }, [qa1, qa2, qa3]);
const diff = diffTenderQaSnapshots(item, snap1, snap2);
assert("diff batch", diff.some((e) => e.type === "QA_BATCH"));

const ai = generateQaAiSummary(["dopuszczono_rownowazne_pokrycie.pdf"]);
assert("ai summary dopuszcz", ai.includes("zamiennik") || ai.includes("równoważ"));

assert("filter new", filterQaEvents(diff, "new").length >= 1);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
