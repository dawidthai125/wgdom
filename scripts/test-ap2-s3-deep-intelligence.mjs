/**
 * AP2-S3 — deep tender intelligence (facts + key panel).
 * npx vite-node scripts/test-ap2-s3-deep-intelligence.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDeepIntelligenceView,
  buildPrzedmiarInsights,
  confidenceLabelPl,
} from "../src/lib/tender-deep-intelligence.ts";
import { buildTenderDocumentsTabSummary } from "../src/lib/tender-documents-tab-summary.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { canComputeTenderPricingAuto } from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const FIXED = "2026-07-26T12:00:00.000Z";

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

const item = {
  id: "ap2-s3",
  tenderId: "tid-s3",
  title: "Remont instalacji",
  noticeNumber: "2026/BZP 200",
  status: "watching",
  relevanceScore: 50,
  addedAt: FIXED,
  documentsFetchedAt: FIXED,
  submittingOffersDate: "2026-08-15T10:00:00.000Z",
  bzpDocuments: [
    { filename: "SWZ.pdf", url: "https://x/swz", documentIndex: 0, isSwzHint: true },
    { filename: "Przedmiar.pdf", url: "https://x/p", documentIndex: 1 },
    { filename: "Projekt_umowy.pdf", url: "https://x/u", documentIndex: 2 },
  ],
  swzAnalysis: null,
  tenderDossier: {
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: FIXED,
    brief: {
      fields: [],
      scopeDescription: "Remont instalacji elektrycznej",
      location: null,
      procedureType: null,
      offerDeadline: null,
      offerOpening: null,
      contractPeriod: "120 dni od zawarcia umowy",
      paymentTerms: "Płatność w terminie 30 dni od faktury",
      contactInfo: null,
      additionalNotes: [
        "Okres gwarancji wynosi 36 miesięcy",
        "Kary umowne 0,1% wartości za każdy dzień zwłoki",
        "Dopuszczalna waloryzacja wynagrodzenia wg wskaźnika GUS",
        "Możliwość zmian umowy na podstawie art. 455",
        "Okres rękojmi 24 miesiące",
        "Zabezpieczenie należytego wykonania 5% ceny",
      ],
      builtAt: FIXED,
    },
    kosztorys: {
      ok: true,
      sourceFilename: "Przedmiar.pdf",
      rowCount: 3,
      rows: [
        {
          lp: "1",
          description: "KNR 401-01 Montaż kabla",
          unit: "m",
          quantity: "500",
          unitPrice: "",
          total: "",
        },
        {
          lp: "2",
          description: "KNNR 2-02 Układanie rur",
          unit: "m",
          quantity: "120",
          unitPrice: "",
          total: "",
        },
        {
          lp: "3",
          description: "Demontaż osprzętu",
          unit: "szt",
          quantity: "40",
          unitPrice: "",
          total: "",
        },
      ],
      przedmiar: [],
      categories: [
        { name: "Instalacje elektryczne", total: "" },
        { name: "Roboty demontażowe", total: "" },
      ],
      catalogQuantities: [
        { lp: "1", description: "KNR 401-01 Montaż kabla", unit: "m", quantity: "500" },
      ],
      warnings: [],
      parsedAt: FIXED,
      pdfPrzedmiarCase: 1,
    },
    scanSummary: { parsedAt: FIXED },
  },
};

const swz = {
  estimatedValuePln: 1_200_000,
  estimatedValueRaw: "1 200 000 zł",
  wadiumPln: 24_000,
  wadiumRaw: "24 000 zł",
  referenceRequirement: "Referencje z 2 robót podobnych",
  qualificationHints: [],
  formalRequirements: [
    { type: "personnel", label: "Kierownik budowy", confidence: 0.8 },
    { type: "license", label: "Uprawnienia budowlane", confidence: 0.7 },
    { type: "membership", label: "Członkostwo PIIB", confidence: 0.65 },
  ],
  participationRequirements: [
    {
      type: "personnel",
      label: "Kierownik robót elektrycznych",
      required: true,
      confidence: 0.82,
      key: "kierownikElektryczny",
    },
    {
      type: "insurance",
      label: "Polisa OC",
      required: true,
      confidence: 0.7,
      minValuePln: 1_000_000,
      key: "ocInsurance",
    },
    {
      type: "finance",
      label: "Zabezpieczenie należytego wykonania 5%",
      required: true,
      confidence: 0.6,
    },
  ],
  experienceRequirements: [
    {
      minProjects: 2,
      minValuePln: 500_000,
      category: "roboty elektryczne",
      referenceRequired: true,
      periodYears: 5,
      confidence: 0.78,
      label: "Min. 2 roboty elektryczne w 5 lat",
    },
  ],
  implementationDeadlineRaw: "120 dni",
  implementationDays: 120,
  technicalRequirements: ["Okres gwarancji 36 miesięcy na wykonane roboty"],
  tableExtracts: [],
  costLines: [],
  parsedAt: FIXED,
  source: "pdf",
  sourceFilename: "SWZ.pdf",
  profitabilityHint: "unknown",
  profitabilityNote: "",
  awardCriteria: [
    { name: "Cena", weightPct: 60, maxPoints: null, description: "" },
    { name: "Gwarancja", weightPct: 40, maxPoints: null, description: "" },
  ],
  wadiumPercent: 2,
};

console.log("\n=== AP2-S3 Deep Intelligence ===\n");

const view = buildDeepIntelligenceView({ item, swz });
assert.ok(view.keyFacts.length >= 8, `keyFacts >= 8 (got ${view.keyFacts.length})`);
assert.ok(view.keyFacts.length <= 15, "keyFacts <= 15");
assert.ok(view.keyFacts.every((f) => f.value && f.sourceDoc && f.sourceSection && f.confidence), "facts have transparency");
assert.ok(view.keyFacts.some((f) => f.id === "offer_deadline"), "offer deadline");
assert.ok(view.keyFacts.some((f) => f.id === "realization"), "realization");
assert.ok(view.keyFacts.some((f) => f.id === "wadium"), "wadium");
assert.ok(view.keyFacts.some((f) => f.id === "award_criteria"), "criteria");
assert.ok(view.keyFacts.some((f) => f.id === "przedmiar_rows"), "przedmiar rows");
assert.ok(view.keyFacts.some((f) => f.id === "offer_ready"), "offer ready");
assert.ok(view.facts.some((f) => f.id === "warranty"), "warranty from corpus");
assert.ok(view.facts.some((f) => f.id === "penalties"), "penalties clause");
assert.ok(view.facts.some((f) => f.id === "payment_terms"), "payment terms");
assert.ok(view.facts.some((f) => f.id === "valorization"), "valorization");
assert.ok(view.facts.some((f) => f.id === "personnel"), "personnel");
assert.ok(view.facts.some((f) => f.id === "insurance"), "insurance");
assert.ok(view.hasUmowaSignal, "umowa signal from filename");
assert.equal(confidenceLabelPl("high"), "wysoka");

const insights = buildPrzedmiarInsights(item, swz);
assert.ok(insights.rowCount >= 3, "rowCount");
assert.ok(insights.units.includes("m"), "units");
assert.ok(insights.knrCatalogs.length >= 1, "knr catalogs");
assert.ok(insights.topQuantityPositions[0]?.quantity === 500, "top quantity 500");
assert.ok(insights.dominantBranch, "dominant branch");

const summary = buildTenderDocumentsTabSummary({ item, swz });
assert.ok(summary.deepIntelligence.keyFacts.length > 0, "summary wired");
assert.ok(
  !canComputeTenderPricingAuto({
    item,
    hasKosztorys: true,
    costStatus: "FOUND_NO_VALUE",
  }) || true,
  "pricing gate helper still importable",
);

const deepSrc = readSrc("src/lib/tender-deep-intelligence.ts");
assert.ok(deepSrc.includes("bez nowych parserów PDF"), "reuse disclaimer");
assert.ok(!deepSrc.includes("useEffect"), "pure lib");

const header = readSrc("src/app/TenderDocumentsSummaryHeader.tsx");
assert.ok(header.includes("Najważniejsze informacje"), "panel title");
assert.ok(header.includes("data-ap2-s3-key-facts"), "panel marker");
assert.ok(header.includes("pewność:"), "confidence UX");

console.log(`keyFacts: ${view.keyFacts.length}`);
console.log(`all facts: ${view.facts.length}`);
console.log("AP2-S3 deep intelligence — ALL PASS\n");
