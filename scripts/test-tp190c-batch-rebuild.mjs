/**
 * TP190C-3B — batch rebuild unit tests
 * npx vite-node scripts/test-tp190c-batch-rebuild.mjs
 */
import {
  isStaleDossierCandidate,
  classifyRebuildOutcome,
  rebuildTenderPipelineItem,
  runTp190cBatchRebuild,
} from "../src/lib/tp190c-batch-rebuild.ts";
import { CURRENT_PARSER_VERSION, stampDossierParserVersion } from "../src/lib/tender-dossier-parser-version.ts";
import { pickBetterKosztorys } from "../src/lib/tender-dossier-merge.ts";
import { dossierFromAnalysisResult } from "../src/lib/tender-dossier-pipeline.ts";
import { mergeBriefWithItemTitle, parseNoticeHtmlBrief } from "../src/lib/tenders-bzp-brief.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log("PASS", label); }
  else { fail++; console.log("FAIL", label); }
}

function kosztorys(rowCount, filename, pdfCase) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: [],
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
    pdfPrzedmiarCase: pdfCase,
  };
}

function pipelineItem(id, bzp, dossier) {
  return {
    id,
    bzpNumber: bzp,
    noticeNumber: bzp,
    title: `Test ${bzp}`,
    organizationName: "X",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "",
    publicationDate: "2026-06-01",
    submittingOffersDate: null,
    orderType: "",
    tenderId: `ocds-test-${id}`,
    moIdentifier: "",
    status: "seen",
    notes: "",
    relevanceScore: 50,
    matchedKeywords: [],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ezamowieniaUrl: "",
    bzpDocuments: [],
    tenderDossier: dossier,
  };
}

function mockAnalyzeFromKosztorys(k) {
  return async () => ({
    analysis: { parsedAt: new Date().toISOString(), awardCriteria: [] },
    kosztorys: k,
    estimatePln: null,
    scanSummary: {
      totalDocuments: 0,
      scanned: 0,
      parsed: 0,
      byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      kosztorysFound: Boolean(k?.ok),
      valueFound: false,
      criteriaFound: false,
      estimateFound: false,
      costDiscovery: null,
      parsedAt: new Date().toISOString(),
    },
    warnings: [],
  });
}

console.log("=== T1 stale dossier → rebuild → parserVersion=3 ===");
{
  const d = stampDossierParserVersion({
    brief: mergeBriefWithItemTitle(parseNoticeHtmlBrief(""), "T1"),
    kosztorys: kosztorys(148, "3 Maja.pdf", 1),
    builtAt: "2026-06-01T00:00:00.000Z",
  });
  delete d.parserVersion;
  d.parserVersion = 2;
  const item = pipelineItem("t1", "2026/BZP T1", d);
  const rebuilt = await rebuildTenderPipelineItem(item, {
    analyze: mockAnalyzeFromKosztorys(kosztorys(178, "3 Maja.pdf", 1)),
  });
  assert(rebuilt.after.parserVersion === CURRENT_PARSER_VERSION, "T1 parserVersion 3");
  assert(rebuilt.outcome === "upgraded", "T1 upgraded rows");
}

console.log("\n=== T2 fresh dossier v3 → skip ===");
{
  const d = stampDossierParserVersion({
    brief: mergeBriefWithItemTitle(parseNoticeHtmlBrief(""), "T2"),
    kosztorys: kosztorys(100, "ok.pdf", 1),
    builtAt: "2026-06-01T00:00:00.000Z",
  });
  const item = pipelineItem("t2", "2026/BZP T2", d);
  assert(!isStaleDossierCandidate(item), "T2 not stale");
  const batch = await runTp190cBatchRebuild({ pipeline: [item], dryRun: true });
  assert(batch.stats.skipped === 1, "T2 skipped");
  assert(batch.stats.processed === 0, "T2 not processed");
}

console.log("\n=== T3 existing 148 vs fresh 0 → existing zostaje (pickBetter) ===");
{
  const existing = kosztorys(148, "Przedmiar - 3 Maja 5B_9.pdf", 1);
  const fresh = kosztorys(0, "Przedmiar - Krzywoustego 106_8.pdf", 3);
  const winner = pickBetterKosztorys(existing, fresh);
  assert(winner?.rowCount === 148, "T3 pickBetter keeps 148");
  const d = { kosztorys: existing, parserVersion: 2, builtAt: "2026-06-01T00:00:00.000Z" };
  const item = pipelineItem("t3", "2026/BZP T3", d);
  const rebuilt = await rebuildTenderPipelineItem(item, {
    analyze: mockAnalyzeFromKosztorys(existing),
  });
  assert(rebuilt.after.rowCount === 148, "T3 after rows 148");
  assert(rebuilt.after.parserVersion === CURRENT_PARSER_VERSION, "T3 stamped v3");
}

console.log("\n=== T4 existing 48 vs fresh 76 → fresh wygrywa ===");
{
  const existing = kosztorys(48, "Staszica.ath");
  const fresh = kosztorys(76, "Slezna.ath");
  const winner = pickBetterKosztorys(existing, fresh);
  assert(winner?.rowCount === 76, "T4 pickBetter fresh 76");
  assert(classifyRebuildOutcome(
    { parserVersion: null, rowCount: 48, sourceFilename: "Staszica.ath" },
    { parserVersion: 3, rowCount: 76, sourceFilename: "Slezna.ath" },
  ) === "upgraded", "T4 classify upgraded");
}

console.log("\n=== T5 formularz 45 → pozostaje formularz ===");
{
  const form = kosztorys(45, "Formularz oferty.xlsx");
  const d = { kosztorys: form, parserVersion: null, builtAt: "2026-06-01T00:00:00.000Z" };
  const item = pipelineItem("t5", "2026/BZP T5", d);
  const rebuilt = await rebuildTenderPipelineItem(item, {
    analyze: mockAnalyzeFromKosztorys(form),
  });
  assert(rebuilt.after.rowCount === 45, "T5 rows 45");
  assert(/formularz/i.test(rebuilt.after.sourceFilename ?? ""), "T5 formularz filename");
  assert(rebuilt.outcome === "unchanged", "T5 unchanged quality");
}

console.log("\n=== T6 błąd pojedynczego tendera → batch kontynuuje ===");
{
  const stale1 = pipelineItem("t6a", "BZP-A", {
    kosztorys: kosztorys(10, "a.pdf", 1),
    parserVersion: 2,
    builtAt: "2026-06-01T00:00:00.000Z",
  });
  const stale2 = pipelineItem("t6b", "BZP-B", {
    kosztorys: kosztorys(20, "b.pdf", 1),
    parserVersion: null,
    builtAt: "2026-06-01T00:00:00.000Z",
  });
  const stale3 = pipelineItem("t6c", "BZP-C", {
    kosztorys: kosztorys(30, "c.pdf", 1),
    parserVersion: 2,
    builtAt: "2026-06-01T00:00:00.000Z",
  });
  let calls = 0;
  const batch = await runTp190cBatchRebuild({
    pipeline: [stale1, stale2, stale3],
    dryRun: true,
    rebuildOne: async (item) => {
      calls += 1;
      if (item.id === "t6b") throw new Error("simulated network error");
      const result = stampDossierParserVersion({
        ...item.tenderDossier,
        kosztorys: item.tenderDossier.kosztorys,
        builtAt: new Date().toISOString(),
      });
      return { ...item, tenderDossier: result, updatedAt: new Date().toISOString() };
    },
  });
  assert(calls === 3, "T6 all 3 attempted");
  assert(batch.stats.processed === 3, "T6 processed 3");
  assert(batch.stats.failed === 1, "T6 one failed");
  assert(batch.stats.upgraded + batch.stats.unchanged === 2, "T6 two succeeded");
  assert(batch.dryRun === true, "T6 dry run");
  assert(batch.wrote === false, "T6 no write");
}

console.log(`\n=== SUMMARY: ${pass} PASS, ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
