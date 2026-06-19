/**
 * TP200A.1 — external discovery nie kasuje parserVersion / pól dossier
 * npx vite-node scripts/test-tp200a-external-discovery-preserve-parser-version.mjs
 */
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { mergeExternalDiscoveryDossierPatch } from "../src/lib/tender-dossier-external-discovery.ts";

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

function brief() {
  return {
    fields: [],
    scopeDescription: "scope",
    location: null,
    procedureType: null,
    offerDeadline: null,
    offerOpening: null,
    contractPeriod: null,
    paymentTerms: null,
    contactInfo: null,
    additionalNotes: [],
    builtAt: "2026-06-01T00:00:00.000Z",
  };
}

function kosztorys(rowCount, filename = "przedmiar.pdf") {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
  };
}

function existingDossier(extra = {}) {
  return {
    brief: brief(),
    kosztorys: kosztorys(123),
    scanSummary: { parsedAt: "2026-06-01T00:00:00.000Z", scannedCount: 5, parsedCount: 3 },
    bidProposal: { recommendedBidPln: 1_000_000, marginPct: 12, builtAt: "2026-06-01T00:00:00.000Z" },
    estimatePln: 950_000,
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: "2026-06-01T00:00:00.000Z",
    ...extra,
  };
}

function discoveryUpdates(k = kosztorys(123)) {
  return {
    brief: brief(),
    kosztorys: k,
    builtAt: "2026-06-19T12:00:00.000Z",
  };
}

console.log("=== TP200A.1 EXTERNAL DISCOVERY PRESERVE TESTS ===\n");

console.log("T1 parserVersion=2 preserved");
{
  const merged = mergeExternalDiscoveryDossierPatch(existingDossier(), discoveryUpdates());
  assert(merged.parserVersion === 2, "parserVersion still 2");
}

console.log("\nT2 scanSummary preserved");
{
  const merged = mergeExternalDiscoveryDossierPatch(existingDossier(), discoveryUpdates());
  assert(merged.scanSummary?.parsedAt === "2026-06-01T00:00:00.000Z", "scanSummary kept");
}

console.log("\nT3 bidProposal preserved");
{
  const merged = mergeExternalDiscoveryDossierPatch(existingDossier(), discoveryUpdates());
  assert(merged.bidProposal?.recommendedBidPln === 1_000_000, "bidProposal kept");
}

console.log("\nT4 estimatePln preserved");
{
  const merged = mergeExternalDiscoveryDossierPatch(existingDossier(), discoveryUpdates());
  assert(merged.estimatePln === 950_000, "estimatePln kept");
}

console.log("\nT5 kosztorys updated — parserVersion still correct");
{
  const existing = existingDossier();
  const newK = kosztorys(200, "updated-przedmiar.pdf");
  const merged = mergeExternalDiscoveryDossierPatch(existing, discoveryUpdates(newK));
  assert(merged.kosztorys?.rowCount === 200, "kosztorys updated");
  assert(merged.parserVersion === 2, "parserVersion still 2 after kosztorys update");
}

console.log("\nT6 legacy dossier without parserVersion — no fake v2");
{
  const legacy = existingDossier({ parserVersion: undefined });
  delete legacy.parserVersion;
  const merged = mergeExternalDiscoveryDossierPatch(legacy, discoveryUpdates());
  assert(merged.parserVersion === undefined, "no fake parserVersion=2");
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
