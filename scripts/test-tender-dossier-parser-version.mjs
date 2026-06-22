/**
 * TP200A — parserVersion + stale dossier invalidation
 * npx vite-node scripts/test-tender-dossier-parser-version.mjs
 */
import {
  CURRENT_PARSER_VERSION,
  dossierHasHeavyParseArtifacts,
  isDossierParserStale,
  existingKosztorysUnlessStale,
  stampDossierParserVersion,
} from "../src/lib/tender-dossier-parser-version.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";
import { pickBetterKosztorys, mergeTenderDossierByQuality } from "../src/lib/tender-dossier-merge.ts";

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

function kosztorys(sourceFilename, rowCount) {
  return {
    ok: true,
    sourceFilename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
  };
}

function dossier(k, opts = {}) {
  return {
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
      builtAt: "2026-06-01T00:00:00.000Z",
    },
    kosztorys: k,
    scanSummary: opts.scanSummary ?? null,
    parserVersion: opts.parserVersion,
    builtAt: opts.builtAt ?? "2026-06-01T00:00:00.000Z",
  };
}

console.log("=== TP200A PARSER VERSION TESTS ===\n");

/** T1 — stare dossier bez parserVersion → stale → heavy parse required */
console.log("T1 legacy dossier without parserVersion");
{
  const d = dossier(kosztorys("formularz.xlsx", 45));
  assert(isDossierParserStale(d), "stale");
  assert(!tenderDossierHeavyParseDone(d), "heavy parse required");
}

/** T2 — parserVersion 1, CURRENT → stale */
console.log("\nT2 outdated parserVersion 1");
{
  const d = dossier(kosztorys("przedmiar.pdf", 86), { parserVersion: 1 });
  assert(isDossierParserStale(d), "stale v1");
  assert(!tenderDossierHeavyParseDone(d), "heavy parse required");
}

/** T3 — parserVersion zgodny → dossier valid */
console.log("\nT3 current parserVersion");
{
  const d = stampDossierParserVersion(dossier(kosztorys("przedmiar.pdf", 123)));
  assert(d.parserVersion === CURRENT_PARSER_VERSION, "stamped current");
  assert(!isDossierParserStale(d), "not stale");
  assert(tenderDossierHeavyParseDone(d), "dossier valid");
}

/** T4 — nowy rebuild → zapis parserVersion */
console.log("\nT4 stamp after rebuild");
{
  const legacy = dossier(kosztorys("formularz.xlsx", 45));
  const stamped = stampDossierParserVersion(legacy);
  assert(stamped.parserVersion === CURRENT_PARSER_VERSION, "parserVersion saved");
  assert(tenderDossierHeavyParseDone(stamped), "valid after stamp");
}

/** T5 — legacy TP182 fixture → wymusza reparse */
console.log("\nT5 TP182 legacy fixture (form 55 vs PDF 123 target)");
{
  const tp182Legacy = dossier(kosztorys("TP_182_Zal. nr 1 do SWZ - Formularz oferty (Część 1).xlsx", 55));
  assert(!tenderDossierHeavyParseDone(tp182Legacy), "legacy TP182 requires reparse");
  const existingK = existingKosztorysUnlessStale(tp182Legacy, tp182Legacy.kosztorys);
  assert(existingK === null, "stale kosztorys ignored on rescan");
  const replayPdf = kosztorys("Nowowiejska 86a_27 - przedmiar.pdf", 123);
  const picked = pickBetterKosztorys(existingK, replayPdf);
  assert(picked?.rowCount === 123, "fresh PDF 123 wins after rescan");
  const rebuilt = stampDossierParserVersion({ ...tp182Legacy, kosztorys: picked });
  assert(rebuilt.parserVersion === CURRENT_PARSER_VERSION, "rebuilt dossier has current parserVersion");
}

console.log("\n--- supplementary ---");

console.log("\nT-sup empty dossier not stale");
{
  const d = dossier(null);
  assert(!dossierHasHeavyParseArtifacts(d), "no artifacts");
  assert(!isDossierParserStale(d), "not stale");
}

console.log("\nT-sup merge prefers fresh parserVersion side");
{
  const staleLocal = dossier(kosztorys("formularz.xlsx", 45));
  const freshCloud = stampDossierParserVersion(dossier(kosztorys("przedmiar.pdf", 123)));
  const merged = mergeTenderDossierByQuality(staleLocal, freshCloud);
  assert(merged?.kosztorys?.rowCount === 123, "fresh cloud kosztorys");
  assert(merged?.parserVersion === CURRENT_PARSER_VERSION, "parserVersion from fresh");
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
