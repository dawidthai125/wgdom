/**
 * FIX #3 — Harmonogram snapshot ≠ Master BOQ READY
 * npx vite-node scripts/test-ik-not-master-boq-schedule.mjs
 */
import assert from "node:assert/strict";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";

const SOURCE =
  "TP167_Zał. nr 11 do SWZ - Harmonogram rzeczowo-finansowy.xlsx";

const rows = Array.from({ length: 78 }, (_, i) => ({
  lp: String(i + 1),
  description: `Pozycja harmonogramu ${i + 1}`,
  unit: "kpl",
  quantity: "1",
}));

const snapshot = {
  ok: true,
  sourceFilename: SOURCE,
  rowCount: 78,
  rows,
  catalogQuantities: rows.map((r) => ({
    lp: r.lp,
    description: r.description,
    unit: r.unit,
    quantity: r.quantity,
  })),
  parsedAt: "2026-08-31T00:00:00.000Z",
  warnings: [],
};

const item = {
  id: "08defd1c-7dd3-05f6-962b-12000115ca6c",
  tenderId: "08defd1c-7dd3-05f6-962b-12000115ca6c",
  title: "Remont i termomodernizacja — Wyszyńskiego 105A",
  organizationName: "Wrocławskie Mieszkania Sp. z o. o.",
  bzpDocuments: [
    { filename: SOURCE, documentId: "doc-harmonogram" },
    {
      filename: "TP167_Zal. nr 3 do SWZ - Opis przedmiotu zamówienia.zip",
      documentId: "doc-opz",
    },
  ],
  tenderDossier: {
    kosztorys: snapshot,
    brief: { ok: true },
  },
  externalDocDiscovery: { settled: true, files: [] },
};

const report = runIkDocumentExpert({ item });

assert.equal(
  report.masterBoq.readyForExperts,
  false,
  "readyForExperts must be false for Harmonogram snapshot",
);
assert.ok(
  report.reasons.some((r) => r.includes("NOT_MASTER_BOQ_SCHEDULE")),
  `expected NOT_MASTER_BOQ_SCHEDULE in reasons, got: ${report.reasons.join(" | ")}`,
);
assert.ok(
  !(report.offerBoq?.lines?.length > 0 && report.masterBoq.readyForExperts),
  "must not accept schedule OfferBoq as READY Master BOQ",
);
assert.equal(report.przedmiary.length, 0, "schedule must not enter przedmiary list");

// Builder itself still works (gate is in Document Expert, not global)
const raw = buildOfferBoqFromSnapshot({
  tenderId: item.id,
  snapshot,
});
assert.equal(raw.lines.length, 78, "pure builder unchanged");

// Paczka XI-like: legal PDF przedmiar snapshot still READY-capable path
const pdfSnap = {
  ok: true,
  sourceFilename: "Opis przedmiotu zamówienia.zip → Boczna przedmiar.pdf",
  rowCount: 3,
  rows: [
    { lp: "1", description: "Roboty przygotowawcze", unit: "kpl", quantity: "1" },
    { lp: "2", description: "Malowanie ścian", unit: "m2", quantity: "10" },
    { lp: "3", description: "Posadzka", unit: "m2", quantity: "20" },
  ],
  catalogQuantities: [
    { lp: "1", description: "Roboty przygotowawcze", unit: "kpl", quantity: "1" },
    { lp: "2", description: "Malowanie ścian", unit: "m2", quantity: "10" },
    { lp: "3", description: "Posadzka", unit: "m2", quantity: "20" },
  ],
  parsedAt: "2026-08-31T00:00:00.000Z",
  pdfPrzedmiarCase: 1,
  warnings: [],
};
const xiItem = {
  id: "xi-fixture",
  tenderId: "xi-fixture",
  title: "paczka XI",
  bzpDocuments: [
    {
      filename: "Opis przedmiotu zamówienia.zip → Boczna przedmiar.pdf",
      documentId: "xi-pdf",
    },
  ],
  tenderDossier: { kosztorys: pdfSnap },
  externalDocDiscovery: { settled: true, files: [] },
};
const xiReport = runIkDocumentExpert({ item: xiItem });
assert.ok(
  (xiReport.offerBoq?.lines?.length ?? 0) > 0,
  "Paczka XI OfferBoq constructible",
);
assert.ok(
  !xiReport.reasons.some((r) => r.includes("NOT_MASTER_BOQ_SCHEDULE")),
  "PDF przedmiar must not be schedule-blocked",
);

console.log("PASS test-ik-not-master-boq-schedule (C + D OfferBoq)");
