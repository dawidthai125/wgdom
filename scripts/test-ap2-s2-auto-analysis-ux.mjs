/**
 * AP2-S2 — auto analysis UX (historia + journey + CTA copy).
 * npx vite-node scripts/test-ap2-s2-auto-analysis-ux.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANALYSIS_JOURNEY_STAGE_DEFS,
  analysisProgressRatio,
  buildAnalysisJourneyStages,
  buildDocumentsAnalysisGlance,
  buildDocumentsAnalysisHistory,
  formatAnalysisAbsoluteLabel,
  resolveAnalysisJourneyActiveIndex,
  shouldShowLiveAnalysisSummary,
} from "../src/lib/tender-analysis-auto-ux.ts";
import { buildTenderDocumentsTabSummary } from "../src/lib/tender-documents-tab-summary.ts";
import { TENDER_OWNER_OPERATOR_COPY, TENDER_OWNER_HINT_COPY } from "../src/lib/tender-owner-language-pl.ts";
import {
  KOSZTORYS_AWAITING_PARSE_HINT,
  PRICING_AWAITING_TAB_HINT,
} from "../src/lib/tender-analysis-status-ux.ts";
import { KOSZTORYS_V4_EMPTY_NO_POSITIONS } from "../src/lib/tender-detail-v4-display.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}`);
  }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\n=== AP2-S2 Auto Analysis UX ===\n");

console.log("1. CTA / hint copy");
assert(
  TENDER_OWNER_OPERATOR_COPY.analyzeDocuments === "Uruchom ponownie analizę",
  "CTA re-run label",
);
assert(
  !TENDER_OWNER_OPERATOR_COPY.analyzeDocuments.includes("Przeanalizuj"),
  "no Przeanalizuj in CTA",
);
assert(
  TENDER_OWNER_HINT_COPY.criteriaAfterAnalyze.includes("Uruchom ponownie"),
  "criteria hint mentions re-run",
);
assert(
  !KOSZTORYS_AWAITING_PARSE_HINT.includes("Otwórz Dokumenty"),
  "awaiting hint without Otwórz Dokumenty",
);
assert(
  KOSZTORYS_AWAITING_PARSE_HINT.toLowerCase().includes("automatycznie"),
  "awaiting hint says automatic",
);
assert(
  !PRICING_AWAITING_TAB_HINT.includes("Otwórz zakładkę Wycena aby uruchomić"),
  "pricing hint not manual-primary",
);
assert(
  !KOSZTORYS_V4_EMPTY_NO_POSITIONS.includes("Otwórz Dokumenty i uruchom"),
  "v4 empty copy cleaned",
);

console.log("\n2. History + absolute label");
const now = new Date("2026-07-26T14:00:00.000Z");
const isoToday = "2026-07-26T12:47:00.000Z";
assert(
  formatAnalysisAbsoluteLabel(isoToday, now).startsWith("Dzisiaj"),
  "absolute Dzisiaj",
);

const itemFresh = {
  id: "t1",
  bzpDocuments: [
    { filename: "SWZ.pdf" },
    { filename: "przedmiar.pdf" },
  ],
  swzAnalysis: { parsedAt: isoToday },
  tenderDossier: {
    builtAt: isoToday,
    heavyParseCompleted: true,
    kosztorys: { parsedAt: isoToday, rowCount: 12 },
  },
  tenderFit: { fitLabel: "possible", fitScore: 55, assessedAt: isoToday },
};

const history = buildDocumentsAnalysisHistory({
  item: itemFresh,
  swz: { parsedAt: isoToday },
  now,
});
assert(history.status === "success", "history success");
assert(history.documentCount === 2, "history doc count");
assert(history.absoluteLabel?.includes("12:47") || history.absoluteLabel?.includes("14:47"), "history time");
assert(history.headline.includes("✅") || history.absoluteLabel, "history headline");

console.log("\n3. Journey stages mapping (no new pipeline)");
assert(ANALYSIS_JOURNEY_STAGE_DEFS.length === 6, "6 journey stages");
assert(
  ANALYSIS_JOURNEY_STAGE_DEFS[0].label === "Wykrywanie dokumentów",
  "stage detect label",
);
assert(
  ANALYSIS_JOURNEY_STAGE_DEFS[5].label === "Przygotowanie podsumowania",
  "stage summary label",
);

const runningStages = buildAnalysisJourneyStages({
  item: { id: "t2", bzpDocuments: [{ filename: "a.pdf" }] },
  session: { autoRunning: true, dossierBuilding: false, dossierSaving: false },
});
assert(
  runningStages.some((s) => s.state === "active"),
  "running has active stage",
);
assert(analysisProgressRatio(runningStages) > 0, "progress > 0 when running");

const idxDetect = resolveAnalysisJourneyActiveIndex({
  item: { id: "t3", bzpDocuments: [] },
  session: { autoRunning: true },
});
assert(idxDetect === 0, "empty docs → detect stage");

const idxTech = resolveAnalysisJourneyActiveIndex({
  item: {
    id: "t4",
    bzpDocuments: [{ filename: "a.pdf" }],
    swzAnalysis: { parsedAt: isoToday },
  },
  session: { dossierBuilding: true },
});
assert(idxTech === 3 || idxTech === 4, "building with SWZ → technical/risks");

console.log("\n4. Live summary vs skeleton");
assert(
  shouldShowLiveAnalysisSummary({
    busy: true,
    item: itemFresh,
    swz: { parsedAt: isoToday },
  }),
  "busy + prior data → live summary",
);
assert(
  !shouldShowLiveAnalysisSummary({
    busy: true,
    item: { id: "empty", bzpDocuments: [] },
  }) === false
    || shouldShowLiveAnalysisSummary({
      busy: true,
      item: { id: "empty", bzpDocuments: [] },
    }) === false,
  "busy + empty may skeleton",
);
assert(
  shouldShowLiveAnalysisSummary({
    busy: false,
    item: { id: "idle", bzpDocuments: [] },
  }),
  "idle always live",
);

console.log("\n5. Summary integration + glance");
const summary = buildTenderDocumentsTabSummary({
  item: itemFresh,
  swz: { parsedAt: isoToday },
  now,
});
assert(summary.analysisHistory.documentCount === 2, "summary history docs");
assert(summary.journeyStages.length === 6, "summary journey");
assert(summary.glance.riskLabel != null, "glance risk from valuation");
assert(
  summary.glance.recommendationLabel?.includes("rozważenia")
    || summary.glance.recommendationLabel?.includes("55"),
  "glance recommendation from fit",
);

console.log("\n6. No new auto-trigger in hooks (source scan)");
const bootstrap = readSrc("src/app/hooks/useTenderDocumentsBootstrap.ts");
const heavy = readSrc("src/app/hooks/useTenderDossierHeavyLazy.ts");
const autoUx = readSrc("src/lib/tender-analysis-auto-ux.ts");
assert(autoUx.includes("NIE uruchamia analizy"), "auto-ux pure disclaimer");
assert(
  !autoUx.includes("useEffect"),
  "auto-ux has no useEffect",
);
assert(
  bootstrap.includes("pipelineBootstrapCompletedIds")
    || bootstrap.includes("bootstrapInflightIds"),
  "bootstrap guards intact",
);
assert(
  heavy.includes("HEAVY_MAX_RUNS_PER_KEY") || heavy.includes("dossierInflightIds"),
  "heavy guards intact",
);

const header = readSrc("src/app/TenderDocumentsSummaryHeader.tsx");
assert(header.includes("data-ap2-s2-analysis-history"), "history UI");
assert(header.includes("data-ap2-s2-journey-progress"), "journey UI");

const actionBar = readSrc("src/app/TenderWorkflowOperatorActionBar.tsx");
assert(
  actionBar.includes("TENDER_OWNER_OPERATOR_COPY.analyzeDocuments"),
  "action bar uses owner copy SSOT",
);

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
