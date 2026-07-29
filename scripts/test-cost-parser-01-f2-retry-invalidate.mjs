/**
 * AI-COST-PARSER-01 P0-RETRY — T1–T3 pure (DF §7).
 * Run: npx vite-node scripts/test-cost-parser-01-f2-retry-invalidate.mjs
 */
import assert from "node:assert/strict";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";
import { applyForceHeavyRescanAt } from "../src/lib/cost-multi-02-force-rescan.ts";
import { shouldSoftInvalidateOnF2ZipRetry } from "../src/lib/cost-parser-zip-unpack.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  PASS ${name}`);
}

function terminalADossier(extra = {}) {
  return {
    brief: { title: "t" },
    kosztorys: null,
    scanSummary: {
      totalDocuments: 3,
      scanned: 6,
      parsed: 0,
      byType: { pdf: 3, zip: 3, docx: 1, xlsx: 0, ath: 0, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      zipUnpackOk: false,
      zipInnerCount: 0,
      kosztorysFound: false,
      valueFound: false,
      criteriaFound: false,
      estimateFound: false,
      costDiscovery: { found: false, type: "none", source: "", confidence: 0 },
      parsedAt: "2026-07-28T19:02:03.820Z",
      ...extra.scanSummary,
    },
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: "2026-07-28T19:02:03.820Z",
    ...extra,
  };
}

const ZIP_DOCS = [{ filename: "Dokumentacja Techniczna ZADANIE 1.zip" }];
const PDF_ONLY = [{ filename: "SWZ.pdf" }];

console.log("\n=== AI-COST-PARSER-01 P0-RETRY T1–T3 ===\n");

// T1 — true only for terminal A
{
  const d = terminalADossier();
  const done = tenderDossierHeavyParseDone(d);
  ok("T1 heavyParseDone true", done === true);
  ok(
    "T1 predykat true (ZIP ∧ zipUnpackOk=false ∧ done ∧ !kosztorys ∧ !force)",
    shouldSoftInvalidateOnF2ZipRetry(d, ZIP_DOCS, done) === true,
  );
  ok(
    "T1 also 7z archive",
    shouldSoftInvalidateOnF2ZipRetry(d, [{ filename: "docs.7z" }], done) === true,
  );
}

// T2 — false cases
{
  const d = terminalADossier();
  const done = tenderDossierHeavyParseDone(d);
  ok(
    "T2 false: brak archiwum",
    shouldSoftInvalidateOnF2ZipRetry(d, PDF_ONLY, done) === false,
  );
  ok(
    "T2 false: zipUnpackOk true",
    shouldSoftInvalidateOnF2ZipRetry(
      terminalADossier({ scanSummary: { zipUnpackOk: true, zipInnerCount: 2, parsedAt: "2026-07-28T19:02:03.820Z" } }),
      ZIP_DOCS,
      true,
    ) === false,
  );
  ok(
    "T2 false: zipUnpackOk null",
    shouldSoftInvalidateOnF2ZipRetry(
      terminalADossier({ scanSummary: { zipUnpackOk: null, parsedAt: "2026-07-28T19:02:03.820Z" } }),
      ZIP_DOCS,
      true,
    ) === false,
  );
  ok(
    "T2 false: !heavyParseDone",
    shouldSoftInvalidateOnF2ZipRetry(d, ZIP_DOCS, false) === false,
  );
  ok(
    "T2 false: kosztorys.ok",
    shouldSoftInvalidateOnF2ZipRetry(
      terminalADossier({
        kosztorys: { ok: true, sourceFilename: "x.ath", rows: [], warnings: [] },
      }),
      ZIP_DOCS,
      true,
    ) === false,
  );
  ok(
    "T2 false: force już ustawiony",
    shouldSoftInvalidateOnF2ZipRetry(
      { ...d, forceHeavyRescanAt: "2026-07-29T10:00:00.000Z" },
      ZIP_DOCS,
      tenderDossierHeavyParseDone({ ...d, forceHeavyRescanAt: "2026-07-29T10:00:00.000Z" }),
    ) === false,
  );
  ok(
    "T2 false: null dossier",
    shouldSoftInvalidateOnF2ZipRetry(null, ZIP_DOCS, true) === false,
  );
}

// T3 — soft-invalidate ⇒ heavyDone false
{
  const d0 = terminalADossier();
  ok("T3 before force heavyDone true", tenderDossierHeavyParseDone(d0) === true);
  ok(
    "T3 before force predykat true",
    shouldSoftInvalidateOnF2ZipRetry(d0, ZIP_DOCS, tenderDossierHeavyParseDone(d0)) === true,
  );
  const d1 = applyForceHeavyRescanAt(d0, "2026-07-29T12:00:00.000Z");
  ok("T3 forceHeavyRescanAt set", d1.forceHeavyRescanAt === "2026-07-29T12:00:00.000Z");
  ok("T3 after force heavyDone false", tenderDossierHeavyParseDone(d1) === false);
  ok(
    "T3 after force predykat false (force set)",
    shouldSoftInvalidateOnF2ZipRetry(d1, ZIP_DOCS, tenderDossierHeavyParseDone(d1)) === false,
  );
  ok("T3 kosztorys nadal null", d1.kosztorys == null);
  ok("T3 parserVersion untouched", d1.parserVersion === CURRENT_PARSER_VERSION);
  ok("T3 parsedAt untouched na starym snapshot", d1.scanSummary?.parsedAt === "2026-07-28T19:02:03.820Z");
}

console.log(`\n=== PASSED ${passed} ===\n`);
