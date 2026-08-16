/**
 * IK-MIGRATION-01 P2 IMPLEMENTATION — controlled Documents→BOQ under IK.
 * Guard matrix A–F + reuse Document Expert status/provenance contracts.
 * Run: npx vite-node scripts/test-ik-migration-01-p2-implementation.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultAppSettings,
  mergeAppSettings,
  APP_SETTINGS_KEY,
} from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  forceIkAutoIngestForTests,
  isIkEntryEnabled,
  isIkAutoIngestEnabled,
  isIkP2DocumentsBoqActive,
  resolveIkDetailFirstScreen,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const REAL_TENDER = "08def45d-ead6-5db8-962b-120001d33d37";

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

const mem = new Map();
globalThis.localStorage = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(String(k), String(v)); },
  removeItem(k) { mem.delete(k); },
  clear() { mem.clear(); },
};

function reset() {
  mem.clear();
  forceIkEntryEnabledForTests(null);
  forceIkAutoIngestForTests(null);
}

function setSettings(partial) {
  const next = { ...defaultAppSettings(), ...partial };
  mem.set(APP_SETTINGS_KEY, JSON.stringify(next));
}

function row(lp, description, unit, quantity) {
  return { lp, description, unit, quantity: String(quantity), unitPrice: "", total: "" };
}

function item(overrides = {}) {
  return {
    id: REAL_TENDER,
    tenderId: REAL_TENDER,
    title: "ZZK pustostany",
    status: "seen",
    updatedAt: "2026-08-15T00:00:00.000Z",
    bzpDocuments: [],
    ...overrides,
  };
}

function snapshot(filename, rows, extra = {}) {
  return {
    ok: extra.ok !== false,
    sourceFilename: filename,
    rowCount: extra.rowCount ?? rows.length,
    rows,
    catalogQuantities: extra.catalog ?? [],
    przedmiar: [],
    categories: [],
    warnings: extra.warnings ?? [],
    parsedAt: "2026-08-15T00:00:00.000Z",
    pdfPrzedmiarNoTextLayer: extra.noText === true,
    pdfPrzedmiarExtractError: extra.extractError === true,
  };
}

function artifact(documentId, filename, rows, branch, extra = {}) {
  return {
    documentId,
    filename,
    branch: branch || "cost",
    snapshot: snapshot(filename, rows, extra),
  };
}

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const detailSrc = readSrc("src/app/TenderDetailPage.tsx");
const expertSrc = readSrc("src/lib/intelligent-estimator/ik-document-expert.ts");
const bridgeSrc = readSrc("src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts");

// --- Defaults / settings ---
reset();
assert("default ikEntryEnabled OFF", defaultAppSettings().ikEntryEnabled === false);
assert("default ikAutoIngestEnabled OFF", defaultAppSettings().ikAutoIngestEnabled === false);
assert("A isIkEntryEnabled false", isIkEntryEnabled() === false);
assert("A isIkAutoIngestEnabled false", isIkAutoIngestEnabled() === false);
assert("A isIkP2DocumentsBoqActive false", isIkP2DocumentsBoqActive() === false);
assert("A first screen ng10", resolveIkDetailFirstScreen(false) === "ng10_gate");
assert("A DetailPage retains Gate", /TenderAutonomousGate/.test(detailSrc));

// --- B: IK ON + AUTO OFF ---
reset();
setSettings({ ikEntryEnabled: true, ikAutoIngestEnabled: false });
assert("B IK ON", isIkEntryEnabled() === true);
assert("B AUTO OFF", isIkAutoIngestEnabled() === false);
assert("B P2 inactive", isIkP2DocumentsBoqActive() === false);
assert("B first screen ik_entry", resolveIkDetailFirstScreen(true) === "ik_entry");

// --- C: IK ON + AUTO ON ---
reset();
setSettings({ ikEntryEnabled: true, ikAutoIngestEnabled: true });
assert("C IK ON", isIkEntryEnabled() === true);
assert("C AUTO ON", isIkAutoIngestEnabled() === true);
assert("C P2 active", isIkP2DocumentsBoqActive() === true);

forceIkEntryEnabledForTests(true);
forceIkAutoIngestForTests(false);
assert("C force AUTO OFF disables P2", isIkP2DocumentsBoqActive() === false);
forceIkAutoIngestForTests(true);
assert("C force AUTO ON enables P2", isIkP2DocumentsBoqActive() === true);
forceIkEntryEnabledForTests(false);
assert("C IK OFF kills P2 even if AUTO forced", isIkP2DocumentsBoqActive() === false);

// --- D/E/F: research / experts / identity stay OFF ---
assert("D EXECUTE_RESEARCH false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));
assert("E RUN_RATE_EXPERTS false", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(hostSrc));
assert("F IDENTITY_COVERAGE compile default false", /IK_ENTRY_SHELL_IDENTITY_COVERAGE\s*=\s*false/.test(hostSrc));
assert("D no executeResearch: true", !/executeResearch:\s*true/.test(hostSrc));
assert("D research uses explicit P5/P6 mode flags",
  /executeResearch:\s*p5ResearchOn === true/.test(hostSrc)
  && /executeResearch:\s*p6ResearchOn === true/.test(hostSrc));
assert("D EXECUTE_RESEARCH shell const remains false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));

// --- Host wiring (P2) ---
assert("Host uses isIkAutoIngestEnabled", /isIkAutoIngestEnabled/.test(hostSrc));
assert("Host gates on autoIngestOn", /if\s*\(\s*!autoIngestOn\s*\)/.test(hostSrc));
assert("Host compile AUTO default false", /IK_ENTRY_SHELL_AUTO_INGEST\s*=\s*false/.test(hostSrc));
assert("Host reuses NG-02 bridge", /runIkNg02IngestBridge/.test(hostSrc));
assert("Host reuses Document Expert", /runIkDocumentExpert/.test(hostSrc));
assert("Host data-ik-p2-documents-boq", /data-ik-p2-documents-boq/.test(hostSrc));
assert("Host ingest phase shell when OFF", /:\s*"shell"/.test(hostSrc));
assert("Admin AUTO toggle", /data-ik-auto-ingest-toggle/.test(adminSrc));
assert("Settings field ikAutoIngestEnabled", /ikAutoIngestEnabled/.test(settingsSrc));
assert("mergeIkAutoIngestEnabled present", /mergeIkAutoIngestEnabled/.test(settingsSrc));
assert("flag isIkP2DocumentsBoqActive", /isIkP2DocumentsBoqActive/.test(flagSrc));
assert("flag independent of D", !/expertAiDecydentEnabled/.test(flagSrc));
// P3 lever present but default OFF (P2 must not flip research via coverage)
assert("P3 Host uses isIkIdentityCoverageEnabled", /isIkIdentityCoverageEnabled/.test(hostSrc));
assert("P3 Host gates coverage on identityCoverageOn", /if\s*\(\s*!identityCoverageOn\s*\)/.test(hostSrc));
assert("P3 Admin IDENTITY toggle", /data-ik-identity-coverage-toggle/.test(adminSrc));
assert("P3 default ikIdentityCoverageEnabled OFF", defaultAppSettings().ikIdentityCoverageEnabled === false);

// --- No V2 engines ---
assert("no DocumentParserV2", !/DocumentParserV2/.test(hostSrc + expertSrc + bridgeSrc));
assert("no OfferBoqV2", !/OfferBoqV2/.test(hostSrc + expertSrc));
assert("no MasterBoqV2", !/MasterBoqV2/.test(hostSrc + expertSrc));
assert("bridge reuses buildTenderDossierHeavy", /buildTenderDossierHeavy/.test(bridgeSrc));

// --- Merge safety: AUTO alone does not flip D / research ---
const merged = mergeAppSettings(
  { ikEntryEnabled: true, ikAutoIngestEnabled: true },
  defaultAppSettings(),
);
assert("merge AUTO does not flip D", merged.expertAiDecydentEnabled === false);
assert("merge sets AUTO", merged.ikAutoIngestEnabled === true);

// --- Document Expert statuses (G–W sample via REUSE fixtures) ---
reset();
const readyRows = [
  row("1", "Układanie kabla", "mb", 12),
  row("2", "Montaż gniazda", "szt", 4),
];
const readyItem = item({
  documentsFetchedAt: "2026-08-01T00:00:00.000Z",
  bzpDocuments: [
    { index: 0, documentId: "doc-ath-1", filename: "koszt.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: snapshot("koszt.ath", readyRows),
    scanSummary: {
      costBranchArtifacts: [artifact("doc-ath-1", "koszt.ath", readyRows, "construction")],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
});
const readyR = runIkDocumentExpert({ item: readyItem });
assert("T READY or PARTIAL with lines", readyR.offerBoq && readyR.offerBoq.lines.length === 2);
assert("Q quantity preserved", Number(readyR.offerBoq.lines[0].quantity) === 12);
assert(
  "P unit preserved mb",
  String(readyR.offerBoq.lines[0].unit).toLowerCase().includes("mb"),
);
assert("X no invented third row", readyR.offerBoq.lines.length === 2);
assert("Y extractedCount matches", readyR.extraction.extractedCount === 2);

const emptyR = runIkDocumentExpert({
  item: item({
    documentsFetchedAt: "2026-08-01T00:00:00.000Z",
    bzpDocuments: [],
    tenderDossier: null,
  }),
});
assert(
  "W GAP/PARTIAL/PENDING on empty",
  emptyR.status === "gap" || emptyR.status === "partial" || emptyR.status === "pending",
);
assert("K empty not READY", emptyR.masterBoq.readyForExperts !== true);

const unreadR = runIkDocumentExpert({
  item: item({
    documentsFetchedAt: "2026-08-01T00:00:00.000Z",
    bzpDocuments: [
      { index: 0, documentId: "doc-x", filename: "przedmiar.pdf", contentType: "application/pdf", downloadUrl: "u", isSwzHint: false },
    ],
    tenderDossier: {
      kosztorys: snapshot("przedmiar.pdf", [], { ok: false, noText: true, rowCount: 0 }),
      brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
      builtAt: "2026-08-15T00:00:00.000Z",
    },
  }),
});
assert(
  "H/I scan/OCR unavailable → HOLD/PARTIAL",
  unreadR.status === "hold" || unreadR.status === "partial",
);
assert("H scan not invented READY", unreadR.masterBoq.readyForExperts !== true);

const shortRows = [row("1", "Poz", "szt", 1)];
const partialR = runIkDocumentExpert({
  item: item({
    documentsFetchedAt: "2026-08-01T00:00:00.000Z",
    bzpDocuments: [
      { index: 0, documentId: "doc-p", filename: "przedmiar.pdf", contentType: "application/pdf", downloadUrl: "u", isSwzHint: false },
    ],
    tenderDossier: {
      kosztorys: snapshot("przedmiar.pdf", shortRows, { rowCount: 10 }),
      scanSummary: {
        costBranchArtifacts: [artifact("doc-p", "przedmiar.pdf", shortRows, "unknown", { rowCount: 10 })],
      },
      brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
      builtAt: "2026-08-15T00:00:00.000Z",
    },
  }),
});
assert(
  "L partial extraction not silent READY fake",
  partialR.masterBoq.readyForExperts === false
    || partialR.status === "partial"
    || partialR.reasons.some((r) => /PARTIAL|ROW|WARN/i.test(r)),
);

const budRows = [row("1", "Posadzka", "m2", 20)];
const elecRows = [row("1", "Gniazdo", "szt", 8)];
const multiItem = item({
  documentsFetchedAt: "2026-08-01T00:00:00.000Z",
  bzpDocuments: [
    { index: 0, documentId: "doc-b", filename: "przedmiar-budowlana.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 1, documentId: "doc-e", filename: "przedmiar-elektryczne.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: snapshot("przedmiar-budowlana.ath", budRows),
    scanSummary: {
      costBranchArtifacts: [
        artifact("doc-b", "przedmiar-budowlana.ath", budRows, "construction"),
        artifact("doc-e", "przedmiar-elektryczne.ath", elecRows, "electrical"),
      ],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
});
const multiR = runIkDocumentExpert({ item: multiItem });
assert("M multiple BOQ handled", multiR.przedmiary.length >= 2 || multiR.masterBoq.sourceCount >= 2);

const vm = buildIkEntryConversationViewModel(readyItem);
assert("R/S EC steps have sourceRef tenderId", vm.steps.every((s) => Boolean(s.sourceRef?.tenderId)));
assert(
  "PARSER_EMPTY ≠ price — expert has no market invent",
  !/marketAbsence|MARKET_ABSENCE|inventPrice/.test(expertSrc),
);

// --- Unit safety: no auto remap in host/expert ---
assert(
  "unit safety no auto m2→szt remap invent",
  !/m²\s*→\s*szt|m2\s*->\s*szt|remapUnitAuto/.test(hostSrc + expertSrc),
);

// --- No research/Accept in P2 host path ---
// P8 LOCKED telemetry (`data-ik-p8-auto-accept` / `autoAcceptExecuted`) reports accept=0 —
// that is NOT an Accept invocation. Probe real call/API forms only (Option 1 / P9 Owner GO).
const hostAcceptProbe = hostSrc
  .replace(/data-ik-p8-auto-accept/g, "")
  .replace(/autoAcceptExecuted/g, "");
assert(
  "P2 host does not call Accept",
  !/acceptCatalog|AcceptCandidate/.test(hostAcceptProbe) &&
    !/\bautoAccept\s*\(/.test(hostAcceptProbe),
);
assert("P2 host rate experts gated OFF", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(hostSrc));
// --- Rollback constant ---
assert("rollback path: AUTO false → shell phase", /ingest-phase[\s\S]*shell|:\s*"shell"/.test(hostSrc));

// --- Existing suites present ---
assert("reuse P2 document expert test", existsSync(join(root, "scripts/test-ik-migration-01-p2-document-expert.mjs")));
assert("reuse P2.5 ingest test", existsSync(join(root, "scripts/test-ik-migration-01-p25-ingest.mjs")));
assert("P2 plan DF present", existsSync(join(root, "docs/architecture/IK-MIGRATION-01-P2-PLAN-DESIGN-FREEZE.md")));
assert("BOQ discovery contract present", existsSync(join(root, "docs/architecture/IK-MIGRATION-01-BOQ-DISCOVERY-CONTRACT.md")));

reset();
forceIkEntryEnabledForTests(null);
forceIkAutoIngestForTests(null);

console.log(`\nP2 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
