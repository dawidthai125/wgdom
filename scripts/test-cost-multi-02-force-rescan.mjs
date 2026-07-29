/**
 * RCA-MULTI-02 Force Heavy Rescan — unit + integration (DF §11).
 * Run: npx vite-node scripts/test-cost-multi-02-force-rescan.mjs
 */
import assert from "node:assert/strict";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";
import {
  applyForceHeavyRescanAt,
  clearForceHeavyRescanAt,
  COST_MULTI_02_FORCE_RESCAN_CTA,
  FORCE_HEAVY_RESCAN_CTA_LABEL,
  isMissingMulti02HeavyFields,
  shouldShowForceHeavyRescanCta,
} from "../src/lib/cost-multi-02-force-rescan.ts";
import { COST_MULTI_02_AGGREGATE_BID, resolveCostBidInput } from "../src/lib/cost-multi-02.ts";
import { readFileSync } from "node:fs";

const FIXTURE_ID = "08dee335-f338-1f30-ebd1-65000155122a";
const LEGACY =
  "SWZ.zip → KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf";
const BRANCH_FILES = [
  "SWZ.zip → KI_MOPS_b_budowlana_PRZEDMIAR.pdf",
  "SWZ.zip → KI_MOPS_b_elektryczna_PRZEDMIAR.pdf",
  "SWZ.zip → KI_MOPS_instalacja hydrantowa_PRZEDMIAR.pdf",
  LEGACY,
];

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  PASS ${name}`);
}

function healthyDossier(extra = {}) {
  return {
    brief: { title: "t" },
    kosztorys: {
      ok: true,
      sourceFilename: LEGACY,
      title: LEGACY,
      totalValue: "292800",
      currency: "PLN",
      rowCount: 2,
      rows: [],
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-07-28T00:00:00.000Z",
    },
    scanSummary: {
      totalDocuments: 4,
      scanned: 4,
      parsed: 1,
      byType: { pdf: 4, docx: 0, xlsx: 0, zip: 1, ath: 0, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      kosztorysFound: true,
      valueFound: true,
      criteriaFound: false,
      estimateFound: true,
      costDiscovery: null,
      parsedAt: "2026-07-28T00:00:00.000Z",
      ...extra.scanSummary,
    },
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: "2026-07-28T00:00:00.000Z",
    ...extra,
  };
}

function makeItem(dossier) {
  return {
    id: FIXTURE_ID,
    tenderId: FIXTURE_ID,
    title: "MOPS Kamieńskiego",
    tenderDossier: dossier,
  };
}

console.log("\n=== T1–T6 Force Heavy Rescan unit ===\n");

ok("flag ON default", COST_MULTI_02_FORCE_RESCAN_CTA === true);
ok("aggregate bid ON", COST_MULTI_02_AGGREGATE_BID === true);
ok("CTA label", FORCE_HEAVY_RESCAN_CTA_LABEL === "Uzupełnij odczyty branż");

// T1
{
  const d0 = healthyDossier();
  ok("T1 baseline heavyDone true", tenderDossierHeavyParseDone(d0) === true);
  const d1 = applyForceHeavyRescanAt(d0, "2026-07-29T10:00:00.000Z");
  ok("T1 forceHeavyRescanAt set", d1.forceHeavyRescanAt === "2026-07-29T10:00:00.000Z");
  ok("T1 heavyDone false after force", tenderDossierHeavyParseDone(d1) === false);
  ok("T1 kosztorys untouched", d1.kosztorys?.ok === true && d1.kosztorys?.sourceFilename === LEGACY);
  ok("T1 parserVersion untouched", d1.parserVersion === CURRENT_PARSER_VERSION);
}

// T2
{
  const forced = applyForceHeavyRescanAt(healthyDossier(), "2026-07-29T10:00:00.000Z");
  const cleared = clearForceHeavyRescanAt(forced);
  ok("T2 clear removes force", cleared.forceHeavyRescanAt === undefined);
  ok("T2 heavyDone true after clear", tenderDossierHeavyParseDone(cleared) === true);
}

// T3 — missing artifacts
{
  const item = makeItem(
    healthyDossier({
      scanSummary: {
        costCandidateSources: undefined,
        branchWinnerArtifacts: undefined,
      },
    }),
  );
  ok("T3 missing fields", isMissingMulti02HeavyFields(item.tenderDossier) === true);
  ok(
    "T3 CTA visible",
    shouldShowForceHeavyRescanCta({
      item,
      forceHandlerAvailable: true,
    }) === true,
  );
}

// T4 — pełne fields
{
  const snaps = BRANCH_FILES.map((f, i) => ({
    filename: f,
    snapshot: {
      ok: true,
      sourceFilename: f,
      title: f,
      totalValue: String(100000 * (i + 1)),
      currency: "PLN",
      rowCount: 1,
      rows: [{ lp: "1", description: "x", unit: "m2", quantity: "1", total: "" }],
      catalogQuantities: [{ lp: "1", description: "x", unit: "m2", quantity: "1" }],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-07-28T00:00:00.000Z",
    },
  }));
  const item = makeItem(
    healthyDossier({
      scanSummary: {
        costCandidateSources: BRANCH_FILES,
        branchWinnerArtifacts: snaps,
      },
    }),
  );
  ok("T4 not missing", isMissingMulti02HeavyFields(item.tenderDossier) === false);
  ok(
    "T4 CTA hidden",
    shouldShowForceHeavyRescanCta({ item, forceHandlerAvailable: true }) === false,
  );
}

// T5 — flaga OFF (symulacja: gdy force ustawiony ale CTA helper — nie da się wyłączyć
// bez mutacji exportu; sprawdzamy kontrakt: brak handlera → false)
{
  const item = makeItem(healthyDossier());
  ok(
    "T5 no handler → no CTA",
    shouldShowForceHeavyRescanCta({ item, forceHandlerAvailable: false }) === false,
  );
  ok(
    "T5 building → no CTA",
    shouldShowForceHeavyRescanCta({
      item: makeItem(healthyDossier()),
      dossierBuilding: true,
      forceHandlerAvailable: true,
    }) === false,
  );
}

// T6 — F2 (brak kosztorys.ok)
{
  const item = makeItem(
    healthyDossier({
      kosztorys: { ok: false, sourceFilename: "", title: "", rowCount: 0, rows: [], catalogQuantities: [], przedmiar: [], categories: [], warnings: [], parsedAt: "2026-07-28T00:00:00.000Z" },
      scanSummary: {
        parsedAt: "2026-07-28T00:00:00.000Z",
        kosztorysFound: false,
      },
    }),
  );
  ok(
    "T6 F2 → force CTA false",
    shouldShowForceHeavyRescanCta({ item, forceHandlerAvailable: true }) === false,
  );
}

// P0-RETRY DF — healthy CTA + wire retry soft-invalidate (bez zmiany kontraktu Force)
{
  const item = makeItem(
    healthyDossier({
      scanSummary: {
        costCandidateSources: undefined,
        branchWinnerArtifacts: undefined,
      },
    }),
  );
  ok(
    "P0-RETRY healthy Force CTA unchanged (visible)",
    shouldShowForceHeavyRescanCta({ item, forceHandlerAvailable: true }) === true,
  );
  const heavySrc = readFileSync("src/app/hooks/useTenderDossierHeavyLazy.ts", "utf8");
  ok(
    "P0-RETRY retryDossierParse wires shouldSoftInvalidateOnF2ZipRetry",
    heavySrc.includes("shouldSoftInvalidateOnF2ZipRetry"),
  );
  ok(
    "P0-RETRY retry uses applyForceHeavyRescanAt",
    /retryDossierParse[\s\S]{0,1200}applyForceHeavyRescanAt/.test(heavySrc),
  );
}

console.log("\n=== I1 Soft invalidate → Heavy arm contract ===\n");

{
  const before = healthyDossier();
  ok("I1 start heavyDone", tenderDossierHeavyParseDone(before) === true);
  const patched = applyForceHeavyRescanAt(before);
  ok("I1 after patch heavyDone false (E-RUN may start)", tenderDossierHeavyParseDone(patched) === false);
  const heavySrc = readFileSync("src/app/hooks/useTenderDossierHeavyLazy.ts", "utf8");
  ok("I1 forceHeavyRescan exported", heavySrc.includes("forceHeavyRescan"));
  ok("I1 force uses existingDossier null", heavySrc.includes("forceActive ? null : snapshotDossier"));
  ok("I1 HEAVY_MAX_RUNS_PER_KEY still 2", /HEAVY_MAX_RUNS_PER_KEY\s*=\s*2/.test(heavySrc));
  ok("I1 no Discovery call in force path", !/forceHeavyRescan[\s\S]{0,800}discoverBestCostDocument/.test(heavySrc));
}

console.log("\n=== I2 Synthetic AGGREGATE after filled fields (08dee335 shape) ===\n");

{
  const artifacts = BRANCH_FILES.map((f, i) => ({
    filename: f,
    snapshot: {
      ok: true,
      sourceFilename: f,
      title: f,
      totalValue: String(200000 + i * 50000),
      currency: "PLN",
      rowCount: 2,
      rows: [
        { lp: "1", description: `${f} a`, unit: "m2", quantity: "10", total: "" },
        { lp: "2", description: `${f} b`, unit: "m2", quantity: "20", total: "" },
      ],
      catalogQuantities: [
        { lp: "1", description: `${f} a`, unit: "m2", quantity: "10" },
        { lp: "2", description: `${f} b`, unit: "m2", quantity: "20" },
      ],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-07-28T00:00:00.000Z",
    },
  }));
  const item = makeItem(
    healthyDossier({
      scanSummary: {
        costCandidateSources: BRANCH_FILES,
        branchWinnerArtifacts: artifacts,
      },
    }),
  );
  const bid = resolveCostBidInput(item);
  ok("I2 mode AGGREGATE", bid.mode === "AGGREGATE");
  ok("I2 sources >= 4", (item.tenderDossier.scanSummary.costCandidateSources?.length ?? 0) >= 4);
  ok("I2 artifacts >= 2", (item.tenderDossier.scanSummary.branchWinnerArtifacts?.length ?? 0) >= 2);
  ok("I2 ONE filename Pensjonat", item.tenderDossier.kosztorys.sourceFilename.includes("Pensjonat"));
  ok("I2 CTA gone after fill", shouldShowForceHeavyRescanCta({ item, forceHandlerAvailable: true }) === false);
}

console.log("\n=== I3 Single-branch ONE ===\n");

{
  const one = LEGACY;
  const snap = {
    ok: true,
    sourceFilename: one,
    title: one,
    totalValue: "100000",
    currency: "PLN",
    rowCount: 1,
    rows: [{ lp: "1", description: "one", unit: "m2", quantity: "1", total: "" }],
    catalogQuantities: [{ lp: "1", description: "one", unit: "m2", quantity: "1" }],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-07-28T00:00:00.000Z",
  };
  const item = makeItem(
    healthyDossier({
      kosztorys: snap,
      scanSummary: {
        costCandidateSources: [one],
        branchWinnerArtifacts: [{ filename: one, snapshot: snap }],
      },
    }),
  );
  const bid = resolveCostBidInput(item);
  ok("I3 mode ONE", bid.mode === "ONE");
  ok("I3 CTA hidden", shouldShowForceHeavyRescanCta({ item, forceHandlerAvailable: true }) === false);
}

console.log("\n=== Source guards (N1–N3) ===\n");

{
  const forceSrc = readFileSync("src/lib/cost-multi-02-force-rescan.ts", "utf8");
  ok("N1 no discovery import in force lib", !forceSrc.includes("tender-cost-discovery"));
  ok("N2 no cloud-sync", !forceSrc.includes("cloud-sync"));
  const pipeline = readFileSync("src/lib/tender-dossier-pipeline.ts", "utf8");
  ok("N3 heavyDone checks forceHeavyRescanAt", pipeline.includes("forceHeavyRescanAt"));
  const workspace = readFileSync("src/app/TenderKosztorysWorkspace.tsx", "utf8");
  ok("N4 F2 Ponów still present", workspace.includes("Ponów analizę kosztorysu"));
  ok("N4 force CTA data attr", workspace.includes('data-force-heavy-rescan="1"'));
  ok("N4 confirm before force", workspace.includes("window.confirm"));
}

console.log(`\n✓ test-cost-multi-02-force-rescan: ${passed} assertions PASS\n`);
