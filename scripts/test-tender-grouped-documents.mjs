/**
 * EPIC P2 — Grouped Documents (klasyfikacja + partycjonowanie listy).
 * npx vite-node scripts/test-tender-grouped-documents.mjs
 */
import assert from "node:assert/strict";
import {
  TENDER_DOCUMENT_BUSINESS_GROUP_ORDER,
  classifyTenderDocumentBusinessGroup,
  defaultTenderDocumentGroupExpanded,
  groupTenderAttachmentRows,
} from "../src/lib/tender-grouped-documents.ts";

function row(filename, sortIndex, isSwzHint = false) {
  return { filename, sortIndex, isSwzHint };
}

function groupItems(groups, id) {
  return groups.find((g) => g.id === id)?.items ?? [];
}

// --- SWZ ---
assert.equal(classifyTenderDocumentBusinessGroup("SWZ_2026.pdf", { isSwzHint: true }), "swz");
assert.equal(classifyTenderDocumentBusinessGroup("modyfikacja_swz.pdf"), "swz");

// --- ATH / Przedmiar ---
assert.equal(classifyTenderDocumentBusinessGroup("przedmiar.ath"), "przedmiaryAth");
assert.equal(classifyTenderDocumentBusinessGroup("Kosztorys_inwestorski.pdf"), "przedmiaryAth");

// --- Formularz ---
assert.equal(classifyTenderDocumentBusinessGroup("Formularz_ofertowy.docx"), "formularze");

// --- Umowa ---
assert.equal(classifyTenderDocumentBusinessGroup("Wzor_umowy.pdf"), "umowy");

// --- OPZ / STWiOR ---
assert.equal(classifyTenderDocumentBusinessGroup("OPZ_zal_1.pdf"), "opzStwior");
assert.equal(classifyTenderDocumentBusinessGroup("STWiOR_budowlany.pdf"), "opzStwior");

// --- Załączniki formalne ---
assert.equal(classifyTenderDocumentBusinessGroup("Zalacznik_nr_3_oswiadczenie.pdf"), "zalacznikiFormalne");

// --- Pozostałe ---
assert.equal(classifyTenderDocumentBusinessGroup("plan_sytuacyjny.pdf"), "pozostale");
assert.equal(classifyTenderDocumentBusinessGroup("dokumentacja.zip"), "pozostale");

// --- Grupowanie z zachowaniem kolejności ---
const rows = [
  row("plan_sytuacyjny.pdf", 0),
  row("SWZ_2026.pdf", 1, true),
  row("przedmiar.ath", 2),
  row("Formularz_ofertowy.docx", 3),
  row("Wzor_umowy.pdf", 4),
  row("OPZ_zal_1.pdf", 5),
  row("Zalacznik_nr_3_oswiadczenie.pdf", 6),
];

const groups = groupTenderAttachmentRows(rows, (r) => r);

assert.equal(groupItems(groups, "swz").length, 1);
assert.equal(groupItems(groups, "swz")[0].filename, "SWZ_2026.pdf");
assert.equal(groupItems(groups, "przedmiaryAth").length, 1);
assert.equal(groupItems(groups, "formularze").length, 1);
assert.equal(groupItems(groups, "umowy").length, 1);
assert.equal(groupItems(groups, "opzStwior").length, 1);
assert.equal(groupItems(groups, "zalacznikiFormalne").length, 1);
assert.equal(groupItems(groups, "pozostale").length, 1);
assert.equal(groupItems(groups, "pozostale")[0].filename, "plan_sytuacyjny.pdf");

// Kolejność wewnątrz grupy (dwa ATH w kolejności wejściowej)
const athRows = [row("kosztorys_a.ath", 10), row("obmiar_b.ath", 11)];
const athGroups = groupTenderAttachmentRows(athRows, (r) => r);
const athItems = groupItems(athGroups, "przedmiaryAth");
assert.deepEqual(athItems.map((r) => r.sortIndex), [10, 11]);

// --- Puste grupy ---
const emptyGroups = groupTenderAttachmentRows([row("SWZ.pdf", 0, true)], (r) => r);
assert.equal(emptyGroups.length, TENDER_DOCUMENT_BUSINESS_GROUP_ORDER.length);
for (const g of emptyGroups) {
  if (g.id === "swz") {
    assert.equal(g.items.length, 1);
    assert.equal(defaultTenderDocumentGroupExpanded(g.items.length), true);
  } else {
    assert.equal(g.items.length, 0);
    assert.equal(defaultTenderDocumentGroupExpanded(g.items.length), false);
  }
}

console.log("test-tender-grouped-documents.mjs — PASS");
