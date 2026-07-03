/**
 * P3.2B — smoke UI: view model analizy CSV (pure, bez przeglądarki).
 * npx vite-node scripts/smoke-test-work-catalog-csv-preview-ui-p3.2b.mjs
 */
import {
  buildCsvPreviewViewModel,
  csvPreviewReasonPl,
  csvPreviewStatusLabelPl,
  DEFAULT_CSV_PREVIEW_REGION,
  filterCsvPreviewTableRows,
  flattenMarketCsvPreviewReport,
  formatCsvPreviewConfidence,
} from "../src/app/work-catalog/work-catalog-csv-import-preview.ts";
import { previewMarketCsvImport } from "../src/lib/work-catalog/index.ts";

const TS = "2026-06-28T17:00:00.000Z";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

console.log("=== WORK CATALOG CSV PREVIEW UI P3.2B SMOKE ===\n");

assert("default region wroclaw", DEFAULT_CSV_PREVIEW_REGION === "wroclaw");
assert("status label matched", csvPreviewStatusLabelPl("matched") === "Dopasowane");
assert("status label ignored", csvPreviewStatusLabelPl("ignored") === "Pominięte");
assert("format confidence", formatCsvPreviewConfidence(0.92) === "92%");

const CSV = `workId,origin,region,price,updatedAt,confidence
malowanie-scian-m2,wgdom,wroclaw,40,${TS},0.95
malowanie-scian-m2,wgdom,dolnyslask,38,${TS},0.9
malowanie-scian-m2,wgdom,polska,35,${TS},0.8
`;

const report = previewMarketCsvImport(CSV, { fallbackUpdatedAt: TS });
const flat = flattenMarketCsvPreviewReport(report);
assert("flatten rows", flat.length === 3);

const vm = buildCsvPreviewViewModel(
  report,
  "wroclaw",
  new Map([["malowanie-scian-m2", "Malowanie ścian"]]),
);

assert("vm matched wroclaw", vm.summary.matched === 1);
assert("vm ignored other regions", vm.summary.ignored === 2);
assert("vm work label from catalog", vm.rows[0].workLabel === "Malowanie ścian");

const ignoredRow = vm.rows.find((r) => r.displayStatus === "ignored");
assert("ignored reason mentions filtr", ignoredRow?.reason.includes("poza filtrem") === true);

const matchedOnly = filterCsvPreviewTableRows(vm.rows, "matched");
assert("filter matched", matchedOnly.length === 1 && matchedOnly[0].displayStatus === "matched");

const reason = csvPreviewReasonPl(
  { ...flat[0], status: "matched", errors: [] },
  "matched",
  "wroclaw",
);
assert("reason matched pl", reason === "Mapowanie potwierdzone");

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
