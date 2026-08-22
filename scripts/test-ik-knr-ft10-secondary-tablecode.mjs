/**
 * FT-10 — CatalogBasis Secondary TableCode (Variant B · DSEC constrained).
 *
 * npx vite-node scripts/test-ik-knr-ft10-secondary-tablecode.mjs
 *
 * ZERO HTTP · ZERO FEATURE · ZERO Slice D seed · ZERO pricing.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  athPreviewToSnapshot,
  buildCatalogBasisFromRawCode,
  resolveCatalogBasisFromSourceRow,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  composeDwellingOfferBoq,
  mergeDwellingArtifactLines,
} from "../src/lib/multi-boq/index.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/classification-gate.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

function previewRow(opts) {
  return {
    lp: opts.lp ?? "1",
    code: opts.code ?? "",
    description: opts.description ?? "",
    unit: opts.unit ?? "m2",
    quantity: opts.quantity ?? "1",
    unitPrice: "",
    total: "",
  };
}

function makePreview(rows) {
  return {
    ok: true,
    format: "text",
    rows: Array.isArray(rows) ? rows : [rows],
    categories: [],
    warnings: [],
    summaryLines: [],
  };
}

function composeFromSnapshot(snapshot, tenderId = "tender-ft10") {
  const merged = mergeDwellingArtifactLines([
    {
      documentId: "doc-ft10",
      artifactId: "art-ft10",
      filename: "ft10.pdf",
      branchHint: "unknown",
      snapshot,
    },
  ]);
  const dwellingSnap = {
    tenderId,
    dwellingId: "d1",
    sourceDocumentIds: ["doc-ft10"],
    sourceArtifactIds: ["art-ft10"],
    lines: merged.lines,
    completeness: merged.completeness,
    warnings: merged.warnings,
  };
  const composed = composeDwellingOfferBoq({
    snapshot: dwellingSnap,
    builtAt: "2026-08-22T00:00:00.000Z",
  });
  if (!composed.ok) throw new Error("compose failed");
  return composed;
}

function knrFromComposed(composed, tenderId) {
  const lines = composed.document.lines;
  const refs = lines.map((line) => ({
    dwellingId: "d1",
    line,
    provenance: composed.lineProvenance[line.lineId],
  }));
  return runIkKnrExpert({
    tenderId,
    documentExpert: {
      tenderId,
      status: "COMPLETED",
      masterBoq: {
        readyForExperts: true,
        lineCount: lines.length,
        dwellingCount: 1,
      },
      masterBoqLines: refs,
    },
  });
}

console.log("=== FT-10 SECONDARY TABLECODE VARIANT B ===\n");

// 1. PRIMARY pełny code → PRIMARY wins + CONFLICT when secondary differs
{
  const primary = buildCatalogBasisFromRawCode("KNR 2-02 0803-01");
  const resolved = resolveCatalogBasisFromSourceRow({
    code: "KNR 2-02 0803-01",
    description: "Montaż m2 d.1.1 1134-02 tynków",
  });
  assert("1 PRIMARY table from code", primary?.tableCode === "0803-01");
  assert("1 PRIMARY keeps table vs different secondary", resolved?.tableCode === "0803-01");
  assert(
    "1 CONFLICT when PRIMARY ≠ secondary",
    resolved?.tableCodeResolutionHold === "TABLECODE_CONFLICT",
    resolved,
  );
  assert("1 rawCode unchanged", resolved?.rawCode === "KNR 2-02 0803-01");
  assert("1 source PRIMARY_CODE", resolved?.tableCodeSource === "PRIMARY_CODE");
}

// 1b. PRIMARY same as secondary → wins, no conflict
{
  const resolved = resolveCatalogBasisFromSourceRow({
    code: "KNR 2-02 0803-01",
    description: "Montaż m2 d.1.1 0803-01 tynków",
  });
  assert("1b same token no conflict", resolved?.tableCodeResolutionHold == null);
  assert("1b CANDIDATE-ready table", resolved?.tableCode === "0803-01");
}

// 2. KNR 4-01 + DSEC + jeden token → secondary + Expert CANDIDATE
{
  const desc =
    "Dwukrotne malowanie farbami emulsyjnymi starych m2 d.1.1 1204-02 tynków wewnętrznych ścian";
  const resolved = resolveCatalogBasisFromSourceRow({
    code: "KNR 4-01",
    description: desc,
  });
  assert("2 secondary tableCode", resolved?.tableCode === "1204-02");
  assert("2 source SECONDARY_DSEC_HINT", resolved?.tableCodeSource === "SECONDARY_DSEC_HINT");
  assert("2 confidence constrained_hint", resolved?.tableCodeConfidence === "constrained_hint");
  assert("2 family unchanged KNR", resolved?.family === "KNR");
  assert("2 catalogId unchanged 4-01", resolved?.catalogId === "4-01");
  assert("2 rawCode unchanged", resolved?.rawCode === "KNR 4-01");
  assert(
    "2 normalizedKey parity",
    resolved?.normalizedKey === "KNR|4-01|1204-02",
    resolved?.normalizedKey,
  );

  const snap = athPreviewToSnapshot(
    makePreview(previewRow({ code: "KNR 4-01", description: desc, quantity: "12,5" })),
    "mops.pdf",
  );
  const composed = composeFromSnapshot(snap);
  const line = composed.document.lines[0];
  const knr = knrFromComposed(composed, "tender-ft10");
  assert("2 Expert CANDIDATE", knr.lines[0]?.lineStatus === "CANDIDATE", knr.lines[0]);
  assert("2 catalogWorkIdWritten 0", knr.catalogWorkIdWritten === 0);
  assert("2 knrHintMutated false", knr.knrHintMutated === false);
  assert("2 offer catalogWorkId null", line.catalogWorkId === null);
}

// 3. brak tokenu → HOLD INCOMPLETE_TABLE_CODE
{
  const resolved = resolveCatalogBasisFromSourceRow({
    code: "KNR 4-01",
    description: "Skasowanie wykwitów (zacieków)",
  });
  assert("3 no tableCode", resolved?.tableCode == null);
  const snap = athPreviewToSnapshot(
    makePreview(
      previewRow({
        code: "KNR 4-01",
        description: "Skasowanie wykwitów (zacieków)",
        quantity: "2",
      }),
    ),
    "mops.pdf",
  );
  const composed = composeFromSnapshot(snap, "t-hold");
  const knr = knrFromComposed(composed, "t-hold");
  assert("3 HOLD", knr.lines[0]?.lineStatus === "HOLD");
  assert(
    "3 INCOMPLETE_TABLE_CODE",
    knr.lines[0]?.holdReason === "INCOMPLETE_TABLE_CODE",
    knr.lines[0],
  );
}

// 4. dwa tokeny → AMBIGUOUS
{
  const resolved = resolveCatalogBasisFromSourceRow({
    code: "KNR 4-01",
    description: "Opis m2 d.1.1 1204-02 dalej 1134-01 koniec",
  });
  assert("4 ambiguous hold field", resolved?.tableCodeResolutionHold === "AMBIGUOUS_TABLECODE");
  assert("4 no tableCode on ambiguous", resolved?.tableCode == null);
  const snap = athPreviewToSnapshot(
    makePreview(
      previewRow({
        code: "KNR 4-01",
        description: "Opis m2 d.1.1 1204-02 dalej 1134-01 koniec",
        quantity: "1",
      }),
    ),
    "x.pdf",
  );
  const composed = composeFromSnapshot(snap, "t-amb");
  const knr = knrFromComposed(composed, "t-amb");
  assert("4 Expert AMBIGUOUS_TABLECODE", knr.lines[0]?.holdReason === "AMBIGUOUS_TABLECODE");
}

// 5. brak DSEC → HOLD (no secondary)
{
  const resolved = resolveCatalogBasisFromSourceRow({
    code: "KNR 4-01",
    description: "Montaż drzwi 1204-02 bez sekcji d",
  });
  assert("5 no DSEC → no secondary table", resolved?.tableCode == null);
  assert("5 no resolution hold (incomplete)", resolved?.tableCodeResolutionHold == null);
}

// 7. MOPS fixture 56 accept / 32 reject
{
  const fixture = JSON.parse(
    readFileSync(join(root, "scripts/fixtures/ft10-mops-88-lines.json"), "utf8"),
  );
  let accept = 0;
  let reject = 0;
  for (const row of fixture.lines) {
    const basis = resolveCatalogBasisFromSourceRow({
      code: row.code,
      description: row.description,
    });
    const ok =
      basis
      && !basis.tableCodeResolutionHold
      && basis.tableCode
      && /^\d{3,4}-\d{2}$/.test(basis.tableCode);
    if (ok) accept++;
    else reject++;
  }
  assert("7 MOPS accept 56", accept === 56, { accept, reject });
  assert("7 MOPS reject 32", reject === 32, { accept, reject });
  assert("7 fixture n 88", fixture.n === 88 && fixture.lines.length === 88);
}

// 8–10 knrHint / workId / A1
{
  const desc = "Malowanie m2 d.1.1 1204-02 ścian";
  const snap = athPreviewToSnapshot(
    makePreview(previewRow({ code: "KNR 4-01", description: desc, quantity: "3" })),
    "mops.pdf",
  );
  const composed = composeFromSnapshot(snap, "t-a1");
  const line = composed.document.lines[0];
  assert("8 knrHint not equal raw/table", line.knrHint !== "KNR 4-01" && line.knrHint !== "1204-02");
  assert("9 catalogWorkId null", line.catalogWorkId === null);
  const a1 = classifyEstimatorPricingPlane({
    workId: line.catalogWorkId,
    materialKey: null,
    namePl: line.description,
    unit: line.unit,
  });
  assert("10 A1 UNKNOWN without Owner HIT", a1.plane === "UNKNOWN");
  assert(
    "10 classification-gate has no catalogBasis",
    !/catalogBasis/.test(
      readFileSync(join(root, "src/lib/intelligent-estimator/classification-gate.ts"), "utf8"),
    ),
  );
}

// 11. normalizedKey parity with builder when full code
{
  const full = "KNR 4-01 1204-02";
  const fromBuilder = buildCatalogBasisFromRawCode(full);
  const fromResolve = resolveCatalogBasisFromSourceRow({
    code: full,
    description: "x m2 d.1.1 1204-02 y",
  });
  assert(
    "11 normalizedKey parity",
    fromBuilder?.normalizedKey === fromResolve?.normalizedKey
      && fromBuilder?.normalizedKey === "KNR|4-01|1204-02",
  );
}

{
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/ik-knr-expert.ts"),
    "utf8",
  );
  assert(
    "Expert does not call extractSecondary",
    !/extractSecondaryDsecTableCodeHint|applySecondaryDsecTableCodeHint/.test(src),
  );
}

console.log(`\n=== ${fail === 0 ? "PASS" : "FAIL"} ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
