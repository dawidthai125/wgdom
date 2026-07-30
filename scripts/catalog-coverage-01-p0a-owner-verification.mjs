/**
 * CATALOG-COVERAGE-01 P0a — Owner Verification (Noise Filter vs TV-01 / classify).
 * Offline: `.tmp/catalog-coverage-01-classify.json` + TV-01 aggregate.
 * Uruchom: npx vite-node scripts/catalog-coverage-01-p0a-owner-verification.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  classifyOfferBoqLineNoise,
  summarizeNoiseFilter,
  collectNoiseFilterSamples,
} from "../src/lib/catalog-coverage/index.ts";

const OUT = path.join(process.cwd(), ".tmp");
const reportPath = path.join(OUT, "catalog-coverage-01-p0a-ov.json");

const tvPath = path.join(OUT, "tender-validation-01-results.json");
const classifyPath = path.join(OUT, "catalog-coverage-01-classify.json");

if (!fs.existsSync(tvPath) || !fs.existsSync(classifyPath)) {
  console.error("Brak artefaktów TV-01 / classify w .tmp/");
  process.exit(1);
}

const tv = JSON.parse(fs.readFileSync(tvPath, "utf8"));
const classify = JSON.parse(fs.readFileSync(classifyPath, "utf8"));

const totalLines = tv.aggregate?.totalLines ?? classify.baseline?.totalLines ?? 0;
const quotesHit = tv.aggregate?.pricedFromProductQuotes ?? classify.baseline?.mapped ?? 0;
const coverageBeforePct =
  totalLines === 0 ? 0 : Math.round((quotesHit / totalLines) * 1000) / 10;

/** Wszystkie unmapped z classify (wiersze z desc). */
const rows = Array.isArray(classify.unmappedRows)
  ? classify.unmappedRows
  : Array.isArray(classify.rows)
    ? classify.rows
    : [];
let descriptions = rows.map((r) => ({
  description: r.desc || r.description || "",
  lp: r.lp || "",
  knrHint: null,
}));

if (descriptions.length === 0 && Array.isArray(classify.unmapped)) {
  descriptions = classify.unmapped.map((r) => ({
    description: r.desc || "",
    lp: r.lp || "",
    knrHint: null,
  }));
}

/** P0a filtr na unmapped TV (526) — noise wśród missing. */
const resultsUnmapped = descriptions.map((d) => classifyOfferBoqLineNoise(d.description, d.knrHint));
const statsUnmapped = summarizeNoiseFilter(resultsUnmapped);

/**
 * Estymacja na pełnej próbie TV-01:
 * noise wśród previously-unmapped; mapped linie (quotesHit) zakładamy eligible
 * (Noise Filter nie powinien ich łapać — OV material guard).
 */
const noiseOnFullEstimate = statsUnmapped.noiseCount;
const eligibleAfter = totalLines - noiseOnFullEstimate;
const coverageAfterEligiblePct =
  eligibleAfter === 0 ? 0 : Math.round((quotesHit / eligibleAfter) * 1000) / 10;
/** Coverage Quotes / wszystkie linie — bez zmian hitów (noise i tak bez Quotes). */
const coverageAfterAllPct = coverageBeforePct;

const samples = collectNoiseFilterSamples(descriptions, 12);
const byKind = statsUnmapped.byKind;

/** False-positive check: „Dostawa i montaż” nie może być noise. */
const dostawaMontazNoise = descriptions.filter((d) => {
  const t = d.description || "";
  if (!/dostawa\s+i\s+monta/i.test(t)) return false;
  return classifyOfferBoqLineNoise(t).isNoise;
}).length;

const report = {
  id: "CATALOG-COVERAGE-01-P0a-OV",
  generatedAt: new Date().toISOString(),
  tv01: {
    totalLines,
    quotesHit,
    unmappedBaseline: classify.baseline?.unmapped ?? descriptions.length,
    coverageBeforePct,
  },
  noiseFilter: {
    scannedUnmapped: descriptions.length,
    noiseCount: statsUnmapped.noiseCount,
    eligibleUnmapped: statsUnmapped.eligibleCount,
    byKind,
    samples,
    dostawaMontazFalseNoise: dostawaMontazNoise,
  },
  coverage: {
    beforeAllLinesPct: coverageBeforePct,
    afterAllLinesPct: coverageAfterAllPct,
    afterEligiblePct: coverageAfterEligiblePct,
    deltaEligiblePp: Math.round((coverageAfterEligiblePct - coverageBeforePct) * 10) / 10,
    formula:
      "afterEligible = quotesHit / (totalLines - noiseAmongUnmapped); all-lines Quotes % unchanged",
  },
  impactTv01: {
    note: "P0a nie zwiększa Quotes hit — odfiltrowuje niemateriałowe z puli unmapped/SMART missing.",
    actionableUnmappedBefore: classify.actionable ?? null,
    actionableUnmappedAfterEst:
      (classify.actionable ?? descriptions.length - (classify.noiseTotal || 0)) -
      0 +
      ((classify.noiseTotal || 0) - statsUnmapped.noiseCount),
    // simpler:
    actionableAfter: statsUnmapped.eligibleCount,
    noiseAuditLegacy: classify.noiseTotal ?? null,
  },
  gates: {
    noFalseDostawaMontaz: dostawaMontazNoise === 0,
    kalkulacjaCaught: byKind.kalkulacja_wlasna >= 20,
    zeroWrite: true,
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("=== CATALOG-COVERAGE-01 P0a OWNER VERIFICATION ===\n");
console.log(`TV-01 lines:           ${totalLines}`);
console.log(`Quotes hit:            ${quotesHit}`);
console.log(`Coverage BEFORE (all): ${coverageBeforePct}%`);
console.log(`Unmapped scanned:      ${descriptions.length}`);
console.log(`Noise filtered:        ${statsUnmapped.noiseCount}`);
console.log(`  kalkulacja_wlasna:   ${byKind.kalkulacja_wlasna}`);
console.log(`  transport:           ${byKind.transport}`);
console.log(`  lp_artifact:         ${byKind.lp_artifact}`);
console.log(`  smieci_krotkie:      ${byKind.smieci_krotkie}`);
console.log(`Eligible unmapped:     ${statsUnmapped.eligibleCount}`);
console.log(`Coverage AFTER (all):  ${coverageAfterAllPct}% (Quotes hits unchanged)`);
console.log(`Coverage AFTER (elig): ${coverageAfterEligiblePct}% (+${report.coverage.deltaEligiblePp} pp eligible)`);
console.log(`Dostawa+montaż FP:     ${dostawaMontazNoise}`);
console.log("\nPrzykłady odrzuconych:");
for (const s of samples.slice(0, 8)) {
  console.log(`  [${s.noiseKind}] lp=${s.lp} ${s.description}`);
}
console.log(`\nJSON: ${reportPath}`);

const ok =
  report.gates.noFalseDostawaMontaz &&
  report.gates.kalkulacjaCaught &&
  statsUnmapped.noiseCount >= 20;
if (!ok) {
  console.error("\nOV GATES FAIL");
  process.exit(1);
}
console.log("\nOV GATES PASS");
