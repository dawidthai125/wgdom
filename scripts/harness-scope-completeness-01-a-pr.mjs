/**
 * SCOPE-COMPLETENESS-01 Stage A — Precision / Recall / FP harness.
 * DF: N≥8 · P≥0.75 · R≥0.60 · FP rate≤0.15 OR FP count≤2
 * npx vite-node scripts/harness-scope-completeness-01-a-pr.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCOPE_COMPLETENESS_A1_ENGINE_VERSION,
  buildScopeGapReport,
  buildScopeGapReportMvp1,
} from "../src/lib/scope-gap/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, "fixtures", "scope-completeness-01-a");
const AT = "2026-08-07T12:00:00.000Z";

const files = fs
  .readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

assert.ok(files.length >= 8, `N gold ≥ 8, got ${files.length}`);

let tp = 0;
let fn = 0;
let fpCount = 0;
let warningsTotal = 0;
let labeledMissingTotal = 0;
let mvpFpOnAbsent = 0;

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8"));
  const input = {
    presentTextBlob: raw.presentTextBlob,
    investmentTemplate: raw.investmentTemplate,
    hasOfferBoqLines: true,
    lineCount: raw.lineCount ?? 1,
    swzTextBlob: raw.swzTextBlob ?? null,
    computedAtIso: AT,
  };

  const report = buildScopeGapReport(input);
  assert.equal(report.engineVersion, SCOPE_COMPLETENESS_A1_ENGINE_VERSION);
  assert.ok(report.warnings.length <= 12);

  const W = report.warnings.map((w) => w.code);
  const M = new Set(raw.labeledMissing ?? []);
  const A = new Set(raw.labeledAbsent ?? []);

  warningsTotal += W.length;
  labeledMissingTotal += M.size;

  for (const code of W) {
    if (M.has(code)) tp += 1;
    else fpCount += 1;
    if (A.has(code)) {
      /* counted as FP via !M.has if gold consistent */
    }
  }
  for (const code of M) {
    if (!W.includes(code)) fn += 1;
  }

  const mvp = buildScopeGapReportMvp1(input);
  for (const w of mvp.warnings) {
    if (A.has(w.code)) mvpFpOnAbsent += 1;
  }
}

const precision = warningsTotal === 0 ? 1 : tp / warningsTotal;
const recall = labeledMissingTotal === 0 ? 1 : tp / labeledMissingTotal;
const fpRate = warningsTotal === 0 ? 0 : fpCount / warningsTotal;

const summary = {
  N: files.length,
  tp,
  fn,
  fpCount,
  warningsTotal,
  labeledMissingTotal,
  precision: Number(precision.toFixed(4)),
  recall: Number(recall.toFixed(4)),
  fpRate: Number(fpRate.toFixed(4)),
  mvpFpOnAbsent,
};

console.log(JSON.stringify(summary, null, 2));

assert.ok(precision >= 0.75, `precision ${precision} < 0.75`);
assert.ok(recall >= 0.6, `recall ${recall} < 0.60`);
assert.ok(
  fpRate <= 0.15 || fpCount <= 2,
  `FP fail: rate=${fpRate} count=${fpCount}`,
);
assert.ok(
  fpCount <= mvpFpOnAbsent || fpCount <= 2,
  `a1 FP regresja vs mvp absent-FP (${fpCount} > ${mvpFpOnAbsent})`,
);

console.log("harness-scope-completeness-01-a-pr: PASS");
