/**
 * COST-MULTI-01 — AC M1–M3 + fixture 08dee335 (pure).
 * Run: npx vite-node scripts/test-cost-multi-01.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildCostPackage,
  classifyRelation,
  inferBranchHint,
  resolveCostMultiUiCopy,
  resolveCostPackageFromItem,
  shouldShowCostMultiUi,
  COST_MULTI_01_ENABLED,
} from "../src/lib/cost-multi-01.ts";

const FIXTURE_FILES = [
  "SWZ.zip → KI_MOPS_b_budowlana_PRZEDMIAR.pdf",
  "SWZ.zip → KI_MOPS_b_elektryczna_PRZEDMIAR.pdf",
  "SWZ.zip → KI_MOPS_instalacja hydrantowa_PRZEDMIAR.pdf",
  "SWZ.zip → KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf",
];

const LEGACY =
  "SWZ.zip → KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf";

// --- AC-M1-01 / 02 / 03 / 04 ---
{
  assert.equal(inferBranchHint(FIXTURE_FILES[0]), "construction");
  assert.equal(inferBranchHint(FIXTURE_FILES[1]), "electrical");
  assert.equal(inferBranchHint(FIXTURE_FILES[2]), "fire");
  assert.equal(inferBranchHint(FIXTURE_FILES[3]), "finishes");

  const pkg = buildCostPackage({
    tenderItemId: "08dee335-f338-1f30-ebd1-65000155122a",
    documents: FIXTURE_FILES.map((filename) => ({ filename })),
    legacyWinnerFilename: LEGACY,
  });

  assert.equal(pkg.policyVersion, "cost-multi-01-v1");
  assert.equal(pkg.status, "multi_ready");
  assert.equal(pkg.aggregate?.policy, "SUM_BRANCH_WINNERS");
  assert.notEqual(pkg.aggregate?.policy, "sum(all)");
  assert.equal(pkg.incompleteness.detectedCostCount, 4);
  assert.equal(pkg.incompleteness.legacyOneCoversAllBranches, false);
  assert.ok(pkg.legacyOneWinner);
  assert.ok(/Pensjonat|lokaleOZN/i.test(pkg.legacyOneWinner.filename));
  assert.equal(pkg.aggregate?.included.length, 4);
  assert.equal(pkg.aggregate?.metrics.totalValuePln, null);
  assert.ok(pkg.aggregate?.warnings.includes("scope_overlap_unchecked"));
  assert.equal(COST_MULTI_01_ENABLED, true);
  console.log("PASS AC-M1-01..04 + AC-M2-01..03 fixture branches");
}

// --- AC-M1-05 revision same branch ---
{
  const pkg = buildCostPackage({
    tenderItemId: "t-rev",
    documents: [
      { filename: "KI_budowlana_PRZEDMIAR.pdf", rowCount: 100 },
      { filename: "KI_budowlana_v2_PRZEDMIAR.pdf", rowCount: 100 },
    ],
  });
  assert.equal(pkg.status, "single");
  assert.equal(pkg.aggregate?.policy, "BEST_SINGLE");
  assert.equal(pkg.aggregate?.included.length, 1);
  assert.ok(/v2/i.test(pkg.aggregate.included[0].filename));
  assert.ok(pkg.exclusions.some((e) => e.reason === "superseded_revision" || e.reason === "duplicate_of_winner"));
  const rel = classifyRelation(
    { id: "a", filename: "KI_budowlana_PRZEDMIAR.pdf", costType: "pdf_przedmiar", parseOk: null, rowCount: null, totalValuePln: null, branchHint: "construction", relationHints: ["branch:construction"], roleInPackage: "held" },
    { id: "b", filename: "KI_budowlana_v2_PRZEDMIAR.pdf", costType: "pdf_przedmiar", parseOk: null, rowCount: null, totalValuePln: null, branchHint: "construction", relationHints: ["branch:construction", "revision"], roleInPackage: "held" },
  );
  assert.ok(rel.type === "revision" || rel.type === "same_branch" || rel.type === "duplicate");
  console.log("PASS AC-M1-05 revision/same_branch no SUM both");
}

// --- AC-M1-06 option ---
{
  const pkg = buildCostPackage({
    tenderItemId: "t-opt",
    documents: [
      { filename: "przedmiar_budowlana.pdf" },
      { filename: "prawo_opcji_elektryczna_PRZEDMIAR.pdf" },
    ],
  });
  assert.ok(pkg.exclusions.some((e) => e.reason === "option_scope"));
  assert.ok(!pkg.aggregate?.included.some((m) => /opcji/i.test(m.filename)));
  console.log("PASS AC-M1-06 option_scope");
}

// --- AC-M1-07 variant ---
{
  const pkg = buildCostPackage({
    tenderItemId: "t-var",
    documents: [
      { filename: "przedmiar_budowlana.pdf" },
      { filename: "wariant_elektryczna_PRZEDMIAR.pdf" },
    ],
  });
  assert.ok(pkg.exclusions.some((e) => e.reason === "variant_scope"));
  assert.ok(!pkg.aggregate?.included?.some((m) => /wariant/i.test(m.filename)));
  console.log("PASS AC-M1-07 variant not in base SUM");
}

// --- AC-M1-08 unknown + known → HOLD ---
{
  const pkg = buildCostPackage({
    tenderItemId: "t-unk",
    documents: [
      { filename: "przedmiar_budowlana.pdf" },
      { filename: "kosztorys_XYZ_PRZEDMIAR.pdf" },
    ],
  });
  assert.equal(pkg.aggregate?.policy, "HOLD_MANUAL");
  assert.ok(pkg.status === "multi_hold" || pkg.status === "conflict");
  console.log("PASS AC-M1-08 HOLD_MANUAL unknown branch");
}

// --- AC-M1-09 exclusion reason codes ---
{
  const codes = new Set([
    "formal_offer", "option_scope", "variant_scope", "stage_out_of_base",
    "duplicate_of_winner", "superseded_revision", "unsupported_type",
    "parse_failed", "manual_exclude", "lot_mismatch",
  ]);
  const pkg = buildCostPackage({
    tenderItemId: "t-ex",
    documents: [
      { filename: "Formularz oferty cenowej.pdf" },
      { filename: "przedmiar_budowlana.pdf" },
    ],
  });
  for (const e of pkg.exclusions) {
    assert.ok(codes.has(e.reason), `unexpected reason ${e.reason}`);
  }
  console.log("PASS AC-M1-09 exclusion codes");
}

// --- AC-M3 UX ---
{
  const pkg = buildCostPackage({
    tenderItemId: "08dee335-f338-1f30-ebd1-65000155122a",
    documents: FIXTURE_FILES.map((filename) => ({ filename })),
    legacyWinnerFilename: LEGACY,
  });
  assert.equal(shouldShowCostMultiUi(pkg), true);
  const copy = resolveCostMultiUiCopy(pkg);
  assert.ok(/przedmiarów branżowych/i.test(copy.title));
  assert.ok(copy.members.length >= 4);
  assert.ok(copy.policyLabel);

  const hold = buildCostPackage({
    tenderItemId: "t-hold-ui",
    documents: [
      { filename: "przedmiar_budowlana.pdf" },
      { filename: "kosztorys_XYZ_PRZEDMIAR.pdf" },
    ],
  });
  const holdCopy = resolveCostMultiUiCopy(hold);
  assert.ok(/HOLD|weryfikacja/i.test(holdCopy.title + holdCopy.body));
  assert.ok(!/sumuje automatycznie PLN|rekomendowanej ceny jako sumy branż/i.test(holdCopy.body) || /Nie traktuj rekomendowanej/i.test(holdCopy.body));

  const single = buildCostPackage({
    tenderItemId: "t-single",
    documents: [{ filename: "przedmiar_budowlana.pdf" }],
  });
  assert.equal(shouldShowCostMultiUi(single), false);

  const item = {
    id: "08dee335-f338-1f30-ebd1-65000155122a",
    title: "Pensjonat Kamieńskiego",
    tenderDossier: {
      builtAt: "2026-07-23T12:15:36.015Z",
      kosztorys: {
        ok: true,
        sourceFilename: "KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf",
        rowCount: 80,
        catalogQuantities: [],
        rows: [],
      },
      scanSummary: {
        costDiscovery: {
          found: true,
          type: "zip_pdf_przedmiar",
          source: LEGACY,
          confidence: 0.84,
        },
        costCandidateSources: FIXTURE_FILES,
        kosztorysFound: true,
      },
    },
  };
  const fromItem = resolveCostPackageFromItem(item);
  assert.ok(fromItem);
  assert.equal(fromItem.status, "multi_ready");
  assert.equal(fromItem.incompleteness.detectedCostCount, 4);
  console.log("PASS AC-M3-01..04 + resolve from item");
}

// --- no sum(all) in policy source ---
{
  const src = fs.readFileSync("src/lib/cost-multi-01-package.ts", "utf8");
  assert.ok(!/SUM_ALL|sum\(all\)|sumAll/i.test(src) || /Zakaz: sum\(all\)/.test(src));
  assert.ok(!/"sum_all"/.test(src));
  console.log("PASS AC-N-04 no sum(all) policy");
}

console.log("\nCOST-MULTI-01 tests: ALL PASS");
