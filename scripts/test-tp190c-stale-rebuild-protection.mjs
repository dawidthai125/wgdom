/**
 * TP190C-1 — stale rebuild: pickBetter(existing, fresh) quality gate
 * npx vite-node scripts/test-tp190c-stale-rebuild-protection.mjs
 */
import { pickBetterKosztorys } from "../src/lib/tender-dossier-merge.ts";
import {
  CURRENT_PARSER_VERSION,
  isDossierParserStale,
  existingKosztorysUnlessStale,
  existingKosztorysForRebuildPick,
  stampDossierParserVersion,
} from "../src/lib/tender-dossier-parser-version.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log("PASS", label); }
  else { fail++; console.log("FAIL", label); }
}

function pdfKosztorys(rowCount, filename = "przedmiar.pdf", pdfCase = 1) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "Roboty", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
    pdfPrzedmiarCase: pdfCase,
  };
}

function athKosztorys(rowCount, filename = "kosztorys.ATH") {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-02T00:00:00.000Z",
  };
}

function dossier(kosztorys, parserVersion) {
  return {
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "2026-06-01T00:00:00.000Z" },
    kosztorys,
    scanSummary: { parsedAt: "2026-06-01T00:00:00.000Z" },
    parserVersion,
    builtAt: "2026-06-01T00:00:00.000Z",
  };
}

/** Symuluje ścieżkę analyze po fresh parse: pickBetter + stamp v3 */
function resolveStaleRebuild(existingDossier, existingK, freshK) {
  const pickExisting = existingKosztorysForRebuildPick(existingDossier, existingK);
  const winner = pickBetterKosztorys(pickExisting, freshK?.ok ? freshK : null);
  const rebuilt = stampDossierParserVersion({
    ...existingDossier,
    kosztorys: winner,
    builtAt: new Date().toISOString(),
  });
  return { winner, rebuilt };
}

console.log("=== TP190C Stale Rebuild Protection ===\n");

// TP190C-1 — BZP 00296845 pattern: existing PDF 148 vs fresh PDF 0 CASE3
console.log("TP190C-1 existing PDF 148 vs fresh PDF 0 CASE3");
{
  const existing = pdfKosztorys(148, "Przedmiar - 3 Maja 5B_9.pdf", 1);
  const fresh = pdfKosztorys(0, "Przedmiar - Krzywoustego 106_8.pdf", 3);
  const d = dossier(existing, 2);
  const { winner, rebuilt } = resolveStaleRebuild(d, existing, fresh);
  assert(winner?.rowCount === 148, "existing 148 wins");
  assert(winner?.sourceFilename.includes("3 Maja"), "keeps stored source");
  assert(rebuilt.parserVersion === CURRENT_PARSER_VERSION, "parserVersion stamped to 3");
}

// TP190C-2 — fresh better rowCount
console.log("\nTP190C-2 existing PDF 148 vs fresh PDF 160");
{
  const existing = pdfKosztorys(148, "old-przedmiar.pdf", 1);
  const fresh = pdfKosztorys(160, "new-przedmiar.pdf", 1);
  const d = dossier(existing, 2);
  const { winner, rebuilt } = resolveStaleRebuild(d, existing, fresh);
  assert(winner?.rowCount === 160, "fresh 160 wins");
  assert(rebuilt.parserVersion === CURRENT_PARSER_VERSION, "parserVersion 3");
}

// TP190C-3 — ATH 302 vs ATH 280
console.log("\nTP190C-3 existing ATH 302 vs fresh ATH 280");
{
  const existing = athKosztorys(302, "Sępa scalony.ATH");
  const fresh = athKosztorys(280, "Sępa scalony replay.ATH");
  const d = dossier(existing, 2);
  const { winner } = resolveStaleRebuild(d, existing, fresh);
  assert(winner?.rowCount === 302, "existing ATH 302 wins");
}

// TP190C-4 — ATH 48 vs ATH 76
console.log("\nTP190C-4 existing ATH 48 vs fresh ATH 76");
{
  const existing = athKosztorys(48, "Staszica.ath");
  const fresh = athKosztorys(76, "Ślężna.ath");
  const d = dossier(existing, null);
  const { winner } = resolveStaleRebuild(d, existing, fresh);
  assert(winner?.rowCount === 76, "fresh ATH 76 wins");
}

// TP190C-5 — stale nadal wymusza rebuild (heavy parse required)
console.log("\nTP190C-5 stale rebuild still required");
{
  const existing = pdfKosztorys(148, "Przedmiar - 3 Maja 5B_9.pdf", 1);
  const d = dossier(existing, 2);
  assert(isDossierParserStale(d), "dossier v2 is stale");
  assert(!tenderDossierHeavyParseDone(d), "heavy parse not done before rebuild");
  assert(existingKosztorysUnlessStale(d, existing) === null, "UnlessStale still null (skip-parse signal)");
  assert(existingKosztorysForRebuildPick(d, existing)?.rowCount === 148, "ForRebuildPick keeps existing for merge");
}

// TP190C-6 — winner gets parserVersion 3 even when existing wins
console.log("\nTP190C-6 winner parserVersion=3 when existing wins");
{
  const existing = pdfKosztorys(148, "Przedmiar - 3 Maja 5B_9.pdf", 1);
  const fresh = pdfKosztorys(0, "Przedmiar - Krzywoustego 106_8.pdf", 3);
  const d = dossier(existing, 2);
  const { rebuilt } = resolveStaleRebuild(d, existing, fresh);
  assert(rebuilt.parserVersion === 3, "stamped v3");
  assert(tenderDossierHeavyParseDone(rebuilt), "dossier valid after rebuild");
}

console.log(`\nTP190C stale rebuild protection: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
