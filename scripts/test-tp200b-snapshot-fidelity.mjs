/**
 * TP200B — kosztorys snapshot fidelity (rows cap, rowCount, wycena, sync)
 * npx vite-node scripts/test-tp200b-snapshot-fidelity.mjs
 */
import {
  athPreviewToSnapshot,
  SNAPSHOT_PRICED_ROWS_CAP,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  pickBetterKosztorys,
  mergeTenderDossierByQuality,
  kosztorysEffectiveRowCount,
} from "../src/lib/tender-dossier-merge.ts";
import {
  CURRENT_PARSER_VERSION,
  isDossierParserStale,
} from "../src/lib/tender-dossier-parser-version.ts";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`);
  }
}

function athPreviewRows(count, opts = {}) {
  const withPrices = opts.withPrices !== false;
  return Array.from({ length: count }, (_, i) => ({
    lp: String(i + 1),
    description: `KNR 4-01 pozycja ${i + 1} remont`,
    unit: "m2",
    quantity: "10",
    unitPrice: withPrices ? "100,00" : "",
    total: withPrices ? "1000,00" : "",
    przedmiar: [],
  }));
}

function athPreview(count, opts = {}) {
  const rows = athPreviewRows(count, opts);
  const totalPln = (count * 1000).toLocaleString("pl-PL");
  return {
    ok: true,
    format: "ath_ini",
    title: "KOSZTORYS ATHENASOFT",
    rows,
    warnings: [],
    categories: [],
    summaryLines: [`Razem netto: ${totalPln} PLN`],
    currency: "PLN",
    totalValue: totalPln,
  };
}

function snapshotFromCount(count, filename = "test.ATH") {
  return athPreviewToSnapshot(athPreview(count), filename);
}

const costModel = {
  headcount: 4,
  activeWorkersOnSite: 3,
  avgGrossHourlyPln: 28,
  employerBurdenPct: 20,
  materialPriceIndexPct: 100,
  laborNormIndexPct: 100,
  overheadPct: 12,
  profitPct: 8,
  riskPct: 3,
};

console.log("=== TP200B SNAPSHOT FIDELITY TESTS ===\n");

console.log("T1 ATH 302 pozycji → snapshot 302");
{
  const snap = snapshotFromCount(302, "SĘPA.ATH");
  assert(snap.rowCount === 302, "rowCount 302");
  assert(snap.rows.length === 302, "rows.length 302");
}

console.log("\nT2 rowCount === rows.length");
{
  const snap = snapshotFromCount(302);
  assert(snap.rowCount === snap.rows.length, "rowCount matches rows.length");
  assert(kosztorysEffectiveRowCount(snap) === 302, "effectiveRowCount 302");
}

console.log("\nT3 pickBetterKosztorys 302 > 40 (legacy cap)");
{
  const legacy40 = snapshotFromCount(40, "Formularz oferty.xlsx");
  legacy40.sourceFilename = "TP113_Zal. nr 1 do SWZ - Formularz oferty.xlsx";
  const full302 = snapshotFromCount(302, "SĘPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH");
  const picked = pickBetterKosztorys(legacy40, full302);
  assert(picked?.rowCount === 302, "pickBetter → 302 ATH");
  assert(kosztorysEffectiveRowCount(picked) === 302, "effective 302");
}

console.log("\nT4 ath_priced 302 poz. — bez skalowania snapshot gap");
{
  const snap = snapshotFromCount(302, "job.ATH");
  const bid = computeTenderBidProposal({
    kosztorys: snap,
    swz: { estimatedValuePln: 302_000, implementationDays: 60 },
    fit: { priceWeightPct: 60 },
    costModel,
    minProjectDays: 30,
    maxConcurrentProjects: 2,
  });
  assert(bid.ok === true, "bid ok");
  assert(bid.pricingMode === "ath_priced", "ath_priced mode");
  const scaled = bid.assumptions.some((a) => a.includes("Skalowanie do pełnej sumy"));
  assert(!scaled, "no scaling assumption (full fidelity rows)");
  assert(snap.rowCount === snap.rows.length, "no snapshot row gap");
}

console.log("\nT5 TP182 PDF target — 123 poz. w snapshot");
{
  const snap = snapshotFromCount(123, "Nowowiejska 86a_27 - przedmiar.pdf");
  snap.pdfPrzedmiarCase = 1;
  assert(snap.rowCount === 123, "rowCount 123");
  assert(snap.rows.length === 123, "rows.length 123");
}

console.log("\nT7 discovery tie-break — remis rowCount → discovery winner");
{
  const discoverySource = "SEPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH";
  const other = snapshotFromCount(148, "Przedmiar - Krzywoustego 106_8.pdf");
  const winner = snapshotFromCount(148, "SEPA-SZARZYŃSKIEGO 65a_P_Scalony.ATH");
  const picked = pickBetterKosztorys(other, winner, { discoveryWinnerSource: discoverySource });
  assert(picked?.sourceFilename === winner.sourceFilename, "discovery winner on remis");
}

console.log("\nT8 parser v3 truncated snapshot → stale (lazy rescan)");
{
  assert(CURRENT_PARSER_VERSION === 4, "CURRENT_PARSER_VERSION is 4");
  const truncated = snapshotFromCount(40, "legacy.ATH");
  truncated.rowCount = 302;
  const staleDossier = {
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
      builtAt: "2026-06-19T12:00:00.000Z",
    },
    kosztorys: truncated,
    parserVersion: 3,
    builtAt: "2026-06-19T12:00:00.000Z",
  };
  assert(isDossierParserStale(staleDossier), "v3 dossier stale after v4 bump");
}

console.log("\nT6 sync LS ↔ Cloud — brak utraty fidelity");
{
  const localDossier = {
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "2026-06-01T00:00:00.000Z" },
    kosztorys: snapshotFromCount(302),
    parserVersion: 2,
    builtAt: "2026-06-19T12:00:00.000Z",
  };
  const cloudDossier = {
    ...localDossier,
    kosztorys: snapshotFromCount(40, "Formularz.xlsx"),
  };
  cloudDossier.kosztorys.sourceFilename = "Formularz oferty.xlsx";
  const merged = mergeTenderDossierByQuality(localDossier, cloudDossier);
  assert(merged?.kosztorys?.rowCount === 302, "merge keeps 302 rowCount");
  assert(merged?.kosztorys?.rows?.length === 302, "merge keeps 302 priced rows");

  const localItem = {
    id: "t6",
    tenderId: "t6",
    title: "test",
    status: "seen",
    updatedAt: "2026-06-20T12:00:00.000Z",
    tenderDossier: localDossier,
  };
  const cloudItem = {
    ...localItem,
    updatedAt: "2026-06-15T08:00:00.000Z",
    tenderDossier: cloudDossier,
  };
  const pipelineMerged = mergeTenderPipelineForCloud([localItem], [cloudItem])[0];
  assert(pipelineMerged.tenderDossier?.kosztorys?.rows?.length === 302, "pipeline merge fidelity");
}

console.log("\n--- supplementary ---");

console.log("\nT-sup SNAPSHOT_PRICED_ROWS_CAP aligned with parser");
{
  assert(SNAPSHOT_PRICED_ROWS_CAP === 500, "cap 500");
  const snap501 = snapshotFromCount(501);
  assert(snap501.rowCount === 501, "rowCount 501 from parser");
  assert(snap501.rows.length === 500, "rows capped at 500");
}

console.log("\nT-sup legacy rowCount>rows triggers scaling guard only when gap");
{
  const legacyGap = snapshotFromCount(40);
  legacyGap.rowCount = 302;
  legacyGap.totalValue = "302 000,00";
  const bidLegacy = computeTenderBidProposal({
    kosztorys: legacyGap,
    swz: { estimatedValuePln: 302_000 },
    fit: {},
    costModel,
    minProjectDays: 30,
    maxConcurrentProjects: 2,
  });
  const scaledLegacy = bidLegacy.assumptions.some((a) => a.includes("Skalowanie"));
  assert(scaledLegacy, "legacy gap still scales (backward compat)");
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
