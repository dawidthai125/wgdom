/**
 * AP2-S4 — Business Risk Engine.
 * npx vite-node scripts/test-ap2-s4-business-risk-engine.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeepIntelligenceView } from "../src/lib/tender-deep-intelligence.ts";
import {
  BUSINESS_RISK_CATEGORY_LABEL_PL,
  buildBusinessRiskEngineView,
} from "../src/lib/tender-business-risk-engine.ts";
import { buildTenderDocumentsTabSummary } from "../src/lib/tender-documents-tab-summary.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const FIXED = "2026-07-26T12:00:00.000Z";

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function makeItem(overrides = {}) {
  return {
    id: "ap2-s4",
    tenderId: "tid-s4",
    title: "Remont",
    noticeNumber: "2026/BZP 300",
    status: "watching",
    relevanceScore: 50,
    addedAt: FIXED,
    documentsFetchedAt: FIXED,
    submittingOffersDate: "2026-08-20T10:00:00.000Z",
    bzpDocuments: [
      { filename: "SWZ.pdf", url: "https://x/swz", documentIndex: 0, isSwzHint: true },
      { filename: "Przedmiar.pdf", url: "https://x/p", documentIndex: 1 },
      { filename: "Projekt_umowy.pdf", url: "https://x/u", documentIndex: 2 },
    ],
    tenderDossier: {
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: FIXED,
      brief: {
        fields: [],
        scopeDescription: "Remont",
        location: null,
        procedureType: null,
        offerDeadline: null,
        offerOpening: null,
        contractPeriod: "120 dni od zawarcia umowy",
        paymentTerms: "Płatność w terminie 30 dni od faktury",
        contactInfo: null,
        additionalNotes: [
          "Okres gwarancji wynosi 24 miesiące",
          "Kary umowne 0,2% wartości za każdy dzień zwłoki",
          "Dopuszczalna waloryzacja wynagrodzenia",
        ],
        builtAt: FIXED,
      },
      kosztorys: {
        ok: true,
        sourceFilename: "Przedmiar.pdf",
        rowCount: 12,
        rows: Array.from({ length: 12 }, (_, i) => ({
          lp: String(i + 1),
          description: `KNR 401-0${i} Pozycja ${i + 1}`,
          unit: "m",
          quantity: String(100 + i * 10),
          unitPrice: "",
          total: "",
        })),
        przedmiar: [],
        categories: [{ name: "Instalacje", total: "" }],
        catalogQuantities: [],
        warnings: [],
        parsedAt: FIXED,
      },
      scanSummary: { parsedAt: FIXED },
    },
    ...overrides,
  };
}

const swzRich = {
  estimatedValuePln: 800_000,
  estimatedValueRaw: "800 000",
  wadiumPln: 8_000,
  wadiumRaw: "8 000 zł",
  referenceRequirement: null,
  qualificationHints: [],
  formalRequirements: [],
  participationRequirements: [
    {
      type: "insurance",
      label: "Polisa OC",
      required: true,
      confidence: 0.7,
      key: "ocInsurance",
    },
  ],
  experienceRequirements: [],
  implementationDeadlineRaw: "120 dni",
  implementationDays: 120,
  technicalRequirements: ["Okres gwarancji 24 miesiące"],
  tableExtracts: [],
  costLines: [],
  parsedAt: FIXED,
  source: "pdf",
  sourceFilename: "SWZ.pdf",
  profitabilityHint: "unknown",
  profitabilityNote: "",
  awardCriteria: [
    { name: "Cena", weightPct: 70, maxPoints: null, description: "" },
    { name: "Termin", weightPct: 30, maxPoints: null, description: "" },
  ],
};

console.log("\n=== AP2-S4 Business Risk Engine ===\n");

const deep = buildDeepIntelligenceView({ item: makeItem(), swz: swzRich });
const view = buildBusinessRiskEngineView({
  deep,
  valuationLevel: deep.offerReadyLevel,
});

assert.ok(["STARTUJ", "STARTUJ WARUNKOWO", "ODPUŚĆ"].includes(view.recommendation.verdict), "verdict enum");
assert.ok(view.recommendation.reasons.length >= 1, "has reasons");
assert.ok(view.strengths.length >= 1, "has strengths");
assert.ok(view.risks.length >= 1, "has risks (penalties expected)");
assert.ok(view.assessments.every((a) => a.ruleId && a.sourceDoc && a.rationale), "transparency");
assert.ok(view.businessFit.rationale.length > 10, "fit rationale");
assert.ok(["high", "medium", "low"].includes(view.businessFit.level), "fit level");
assert.equal(Object.keys(BUSINESS_RISK_CATEGORY_LABEL_PL).length, 5, "5 categories");

const catsUsed = new Set(view.risks.map((r) => r.category));
assert.ok(catsUsed.size >= 1, "risks categorized");

const penalty = view.risks.find((r) => r.ruleId === "R-PENALTIES");
assert.ok(penalty, "penalties rule fired");
assert.ok(penalty.factId === "penalties", "penalty links fact");

const valor = view.strengths.find((s) => s.ruleId === "R-VALORIZATION");
assert.ok(valor, "valorization strength");

const payment = view.strengths.find((s) => s.ruleId === "R-PAYMENT-GOOD");
assert.ok(payment, "good payment strength");

// Insufficient docs → ODPUŚĆ path
const emptyItem = makeItem({
  bzpDocuments: [{ filename: "ogloszenie.pdf", url: "https://x/o", documentIndex: 0 }],
  submittingOffersDate: null,
  tenderDossier: {
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: FIXED,
    brief: {
      fields: [],
      scopeDescription: null,
      location: null,
      procedureType: null,
      offerDeadline: null,
      offerOpening: null,
      contractPeriod: null,
      paymentTerms: null,
      contactInfo: null,
      additionalNotes: [],
      builtAt: FIXED,
    },
    kosztorys: null,
    scanSummary: null,
  },
});
const deepEmpty = buildDeepIntelligenceView({
  item: emptyItem,
  swz: {
    ...swzRich,
    wadiumPln: null,
    wadiumRaw: null,
    implementationDeadlineRaw: null,
    implementationDays: null,
    awardCriteria: [],
    technicalRequirements: [],
    participationRequirements: [],
  },
});
const viewEmpty = buildBusinessRiskEngineView({
  deep: deepEmpty,
  valuationLevel: "insufficient",
});
assert.equal(viewEmpty.recommendation.verdict, "ODPUŚĆ", "insufficient → ODPUŚĆ");
assert.ok(viewEmpty.recommendation.reasons.length >= 1, "ODPUŚĆ has reasons");
assert.equal(viewEmpty.businessFit.level, "low", "fit low when insufficient");

const summary = buildTenderDocumentsTabSummary({ item: makeItem(), swz: swzRich });
assert.ok(summary.businessRisk.recommendation.verdict, "summary wired");

const engineSrc = readSrc("src/lib/tender-business-risk-engine.ts");
assert.ok(engineSrc.includes("Bez profilu firmy"), "no company profile");
assert.ok(!engineSrc.includes("useEffect"), "pure");
assert.ok(!engineSrc.includes("displayDecision"), "does not touch Autonomous decision");

const header = readSrc("src/app/TenderDocumentsSummaryHeader.tsx");
assert.ok(header.includes("data-ap2-s4-business-risk-panel"), "panel marker");
assert.ok(header.includes("Mocne strony przetargu"), "strengths UI");
assert.ok(header.includes("Dopasowanie przetargu do firmy"), "fit UI");
assert.ok(header.includes("Dlaczego?"), "rationale UI");

console.log(`verdict: ${view.recommendation.verdict}`);
console.log(`risks: ${view.risks.length} · strengths: ${view.strengths.length}`);
console.log(`fit: ${view.businessFit.level} (${view.businessFit.score})`);
console.log("AP2-S4 business risk engine — ALL PASS\n");
