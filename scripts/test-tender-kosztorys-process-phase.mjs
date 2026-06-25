/**
 * P0/P1 UX — deriveKosztorysProcessPhase (prezentacja only).
 * npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
 */

import {
  deriveKosztorysProcessPhase,
  deriveKosztorysTechnicalPhase,
  mapKosztorysTechnicalToBusiness,
  resolveKosztorysAwaitingParseDisplay,
} from "../src/lib/tender-kosztorys-process-phase.ts";

const TENDER_ID = "bzp-uuid-test";

function baseItem(overrides = {}) {
  return {
    id: "item-1",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00012345",
    title: "Test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockDoc = {
  index: 1,
  documentId: "doc-1",
  filename: "kosztorys.ath",
  contentType: "application/octet-stream",
};

const zipDoc = {
  index: 2,
  documentId: "doc-zip",
  filename: "zalaczniki.zip",
  contentType: "application/zip",
};

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function phaseId(item, session = {}) {
  return deriveKosztorysProcessPhase(item, session).id;
}

console.log("=== KOSZTORYS PROCESS PHASE P0/P1 ===\n");

// waiting — brak dokumentów
ok("waiting_data bez docs", phaseId(baseItem()) === "waiting_data");

// waiting — upload bez listy BZP
ok(
  "waiting_data upload bez bzpDocuments",
  phaseId(baseItem({ uploadedFile: { name: "x.pdf", url: "u" } })) === "waiting_data",
);

// downloading
ok(
  "downloading_docs autoRunning",
  phaseId(baseItem(), { autoRunning: true }) === "downloading_docs",
);

// failed ma priorytet
ok(
  "failed > parsing",
  phaseId(baseItem({ bzpDocuments: [mockDoc] }), {
    dossierParseFailed: true,
    dossierBuilding: true,
  }) === "failed",
);

ok(
  "failed label + retry",
  (() => {
    const p = deriveKosztorysProcessPhase(baseItem(), {
      dossierParseFailed: true,
      parseErrorMessage: "timeout",
    });
    return p.label === "Analiza została przerwana" && p.showRetry === true;
  })(),
);

// parsing vs preparing
ok(
  "parsing_kosztorys bez archiwum",
  phaseId(baseItem({ bzpDocuments: [mockDoc] }), { dossierBuilding: true }) === "parsing_kosztorys",
);

ok(
  "preparing_docs z zip",
  phaseId(baseItem({ bzpDocuments: [zipDoc] }), { dossierBuilding: true }) === "preparing_docs",
);

// ready
ok(
  "ready kosztorys ok",
  phaseId(
    baseItem({
      bzpDocuments: [mockDoc],
      tenderDossier: {
        builtAt: "2026-06-25T10:00:00.000Z",
        parserVersion: 3,
        kosztorys: { ok: true, rows: [{ lp: "1" }] },
        scanSummary: { parsedAt: "2026-06-25T10:00:00.000Z" },
      },
    }),
  ) === "ready",
);

// not_found
ok(
  "not_found heavy done bez kosztorysu",
  phaseId(
    baseItem({
      bzpDocuments: [mockDoc],
      tenderDossier: {
        builtAt: "2026-06-25T10:00:00.000Z",
        parserVersion: 3,
        kosztorys: { ok: false },
        scanSummary: { parsedAt: "2026-06-25T10:00:00.000Z" },
      },
    }),
  ) === "not_found",
);

// docs + lazy enabled, not building → preparing (start wkrótce)
ok(
  "preparing_docs przed startem parse",
  phaseId(baseItem({ bzpDocuments: [mockDoc] }), { lazyEnabled: true }) === "preparing_docs",
);

// brak tenderId
ok(
  "waiting_data bez tenderId",
  phaseId(baseItem({ tenderId: "" })) === "waiting_data",
);

// P1 — saving
ok(
  "saving dossierSaving",
  phaseId(baseItem({ bzpDocuments: [mockDoc] }), { dossierSaving: true }) === "saving",
);

ok(
  "saving label",
  deriveKosztorysProcessPhase(baseItem({ bzpDocuments: [mockDoc] }), { dossierSaving: true }).label
    === "Zapisywanie wyników",
);

// P1 — technical E2 notice bootstrap
ok(
  "technical e2 fetching notice",
  deriveKosztorysTechnicalPhase(baseItem({ noticeNumber: "2026/BZP 1" }), { autoRunning: true })
    .technicalId === "e2",
);

// P1 — technical E4 partial attachments
ok(
  "technical e4 upload bez bzp",
  deriveKosztorysTechnicalPhase(
    baseItem({ uploadedFile: { id: "u1", filename: "x.pdf", path: "p", publicUrl: "u", uploadedAt: "" } }),
  ).technicalId === "e4",
);

// P1 — mapowanie techniczne → biznesowe
ok(
  "map e11 → failed",
  mapKosztorysTechnicalToBusiness("e11") === "failed",
);
ok(
  "map e8 → saving",
  mapKosztorysTechnicalToBusiness("e8") === "saving",
);

// P1 — awaiting display (nie stały legacy label)
ok(
  "awaiting display pobieranie",
  (() => {
    const ux = resolveKosztorysAwaitingParseDisplay(baseItem({ bzpDocuments: [mockDoc] }), {
      dossierBuilding: true,
    });
    return ux?.label === "Analiza kosztorysu";
  })(),
);

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
