/**
 * P1D — Work Scope Inference.
 * npx vite-node scripts/test-p1d-work-scope-inference.mjs
 */
import {
  dedupeWorkCategories,
  inferWorkScope,
  inferWorkScopeFromTexts,
  mapWorkScopeConfidence,
  sanitizeWorkCategoryName,
  scoreWorkScopeTexts,
  WORK_SCOPE_CONFIDENCE_LABELS,
} from "../src/lib/tender-work-scope-inference.ts";
import {
  buildExecutiveSummary,
  EXECUTIVE_SUMMARY_NO_WORKS,
} from "../src/lib/tender-executive-summary.ts";
import { buildDocumentPreviewSummary } from "../src/lib/tender-document-summary-header.ts";
import { buildPreviewContextFromPipelineItem } from "../src/lib/tender-pdf-preview-ux.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

const RYNEK = "Rynek_IS_W_PR_20260410.pdf";

/** Realistyczny mix pozycji infrastrukturalnych (PDF przedmiar bez categories). */
function rynekCatalogDescriptions() {
  const templates = [
    "Wykonanie wykopu pod kanał sanitarny PVC",
    "Montaż rury kanalizacyjnej PVC fi 200",
    "Wykonanie studni rewizyjnej DN1000",
    "Roboty ziemne — zasypka wykopu piaskiem",
    "Odtworzenie nawierzchni z kostki brukowej",
    "Rozbiórka istniejącej nawierzchni asfaltowej",
    "Montaż wpustu deszczowego",
    "Wykonanie przyłącza wodociągowego PE",
    "Ułożenie kabla oświetleniowego",
    "Montaż oprawy oświetleniowej ulicznej",
  ];
  return Array.from({ length: 221 }, (_, i) => templates[i % templates.length]);
}

// --- sanitize ---
assert("sanitize KNR rejected", sanitizeWorkCategoryName("KNR 2-01 0301-02") == null);

// --- kanalizacja ---
const kan = inferWorkScopeFromTexts([
  "Montaż rury kanalizacyjnej PVC fi 160",
  "Wykonanie studni rewizyjnej",
  "Wpust deszczowy DN150",
]);
assert("kanalizacja detected", kan.mainWorks.some((w) => /kanalizac|studni/i.test(w)));
assert("kanalizacja ranking", kan.mainWorks[0]?.includes("Kanalizacja") || kan.mainWorks[0]?.includes("Studnie"));

// --- drogi ---
const drogi = inferWorkScopeFromTexts([
  "Odtworzenie nawierzchni z kostki",
  "Warstwa podbudowy pod chodnik",
  "Ułożenie krawężnika betonowego",
]);
assert("drogi nawierzchnia", drogi.mainWorks.some((w) => /nawierzchn|kostk/i.test(w)));

// --- elektryka ---
const el = inferWorkScopeFromTexts([
  "Ułożenie kabla YKY 4x16",
  "Montaż oprawy oświetleniowej LED",
  "Słup oświetleniowy stalowy",
]);
assert("elektryka detected", el.mainWorks.some((w) => /elektr|oświetl/i.test(w)));

// --- kubatura ---
const kub = inferWorkScopeFromTexts([
  "Tynkowanie ścian wewnętrznych",
  "Wylewanie posadzki betonowej",
  "Wykonanie stropu monolitycznego",
]);
assert("kubatura detected", kub.mainWorks.some((w) => /kubatur|Roboty kubaturowe/i.test(w)));

// --- termomodernizacja ---
const termo = inferWorkScopeFromTexts([
  "Ocieplenie elewacji styropianem 15 cm",
  "Montaż wełny mineralnej na fasadzie",
]);
assert("termomodernizacja", termo.mainWorks.includes("Termomodernizacja"));

// --- mix branż ---
const mix = inferWorkScopeFromTexts(rynekCatalogDescriptions());
assert("mix at least 3 groups", mix.mainWorks.length >= 3);
assert("mix max 5", mix.mainWorks.length <= 5);

// --- ranking ---
const ranked = scoreWorkScopeTexts([
  ...Array(20).fill("Wykop pod kanał sanitarny"),
  ...Array(5).fill("Odtworzenie nawierzchni kostka"),
  ...Array(2).fill("Kabel oświetleniowy"),
]);
assert("ranking kanalizacja first", ranked[0]?.groupId === "kanalizacja" || ranked[0]?.groupId === "ziemne");

// --- confidence ---
assert("confidence high", mapWorkScopeConfidence(30, 15, "catalog") === "high");
assert("confidence medium", mapWorkScopeConfidence(10, 4, "descriptions") === "medium");
assert("confidence low", mapWorkScopeConfidence(2, 1, "descriptions") === "low");
assert("confidence categories always high", mapWorkScopeConfidence(1, 1, "categories") === "high");

// --- duplikaty ---
const deduped = dedupeWorkCategories(["Kanalizacja", "kanalizacja", "Roboty ziemne"]);
assert("dedupe categories", deduped.length === 2);

// --- brak danych ---
const empty = inferWorkScope({});
assert("brak danych empty", empty.mainWorks.length === 0);
assert("brak danych no confidence", empty.confidence == null);

// --- scopeDescription fallback ---
const scope = inferWorkScope({
  scopeDescription: "Budowa kanalizacji deszczowej i odtworzenie nawierzchni jezdni na rynku",
});
assert("scope fallback works", scope.mainWorks.length >= 2);
assert("scope source", scope.source === "scope");
assert("scope low or medium confidence", scope.confidence === "low" || scope.confidence === "medium");

// --- catalog priority over scope ---
const catalogFirst = inferWorkScope({
  catalogDescriptions: rynekCatalogDescriptions(),
  scopeDescription: "Inny opis bez słów kluczowych",
});
assert("catalog over scope", catalogFirst.source === "catalog");
assert("catalog confidence medium+", catalogFirst.confidence === "high" || catalogFirst.confidence === "medium");

// --- Rynek PDF przedmiar (bez categories[], z catalogQuantities) ---
const rynekItem = {
  tenderId: "t1",
  bzpDocuments: [{ index: 0, filename: "UMiG.7z", isSwzHint: false, contentType: "application/x-7z-compressed" }],
  tenderDossier: {
    brief: {
      scopeDescription: "Roboty sanitarne i drogowe na rynku",
      fields: [],
      additionalNotes: [],
      builtAt: new Date().toISOString(),
    },
    kosztorys: {
      ok: true,
      sourceFilename: RYNEK,
      sourceDocumentIndex: 0,
      zipInnerPath: "II. PRZEDMIARY/Rynek_IS_W_PR_20260410.pdf",
      totalValue: "0",
      currency: "PLN",
      rowCount: 221,
      rows: [],
      przedmiar: [],
      categories: [],
      catalogQuantities: rynekCatalogDescriptions().map((description, i) => ({
        lp: String(i + 1),
        description,
        unit: "mb",
        quantity: "10",
      })),
      warnings: [],
      parsedAt: new Date().toISOString(),
      pdfPrzedmiarCase: 2,
    },
    scanSummary: {
      kosztorysFound: true,
      costDiscovery: { found: true, type: "zip_pdf_przedmiar", source: RYNEK, confidence: 0.9 },
    },
  },
};
const rynekCtx = buildPreviewContextFromPipelineItem(rynekItem);
const rynekDoc = buildDocumentPreviewSummary(rynekCtx, { filename: RYNEK });
const rynekExec = buildExecutiveSummary(rynekCtx, rynekDoc, { filename: RYNEK });
assert("Rynek ctx catalogDescriptions", (rynekCtx?.catalogDescriptions?.length ?? 0) === 221);
assert("Rynek exec has works", (rynekExec?.mainWorks.length ?? 0) >= 3);
assert("Rynek no fallback message", rynekExec?.noWorksMessage == null);
assert("Rynek kanalizacja or studnie", rynekExec?.mainWorks.some((w) => /kanalizac|studni/i.test(w)));
assert("Rynek confidence label", rynekExec?.confidenceLabel === WORK_SCOPE_CONFIDENCE_LABELS.high
  || rynekExec?.confidenceLabel === WORK_SCOPE_CONFIDENCE_LABELS.medium);
assert("Rynek source catalog", rynekExec?.workScopeSource === "catalog");

// --- SWZ excluded ---
const swzExec = buildExecutiveSummary(
  { pdfRole: "swz" },
  buildDocumentPreviewSummary(undefined, { filename: "swz.pdf" }),
  { filename: "swz.pdf" },
);
assert("SWZ no exec", swzExec == null);

// --- categories still win ---
const withCats = inferWorkScope({
  snapshotCategoryNames: ["Dział A", "Dział B"],
  catalogDescriptions: rynekCatalogDescriptions(),
});
assert("categories priority", withCats.source === "categories");
assert("categories works", withCats.mainWorks[0] === "Dział A");

console.log(`\nP1D work scope inference: ${pass} PASS, ${fail} FAIL`);
if (fail === 0) {
  console.log("\nRynek Executive Summary preview:");
  console.log("  Główne roboty:", rynekExec?.mainWorks.join(" · "));
  console.log("  Pewność:", rynekExec?.confidenceLabel);
}
process.exit(fail > 0 ? 1 : 0);
