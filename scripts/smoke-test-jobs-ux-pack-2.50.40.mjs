/**
 * Roboty 2.50.40 UX PACK — split 35/65, detail full width, compact toolbar (static)
 * Uruchom: npx vite-node scripts/smoke-test-jobs-ux-pack-2.50.40.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const headerSrc = read("src/app/JobListPanelHeader.tsx");
const filterSrc = read("src/app/JobListStatus.tsx");
const jobsSrc = read("src/app/JobsView.tsx");
const navSrc = read("src/app/JobDetailSectionNav.tsx");

const checks = [
  ["split_list_flex_7", jobsSrc.includes("flex-[7] min-w-0 min-h-0")],
  ["split_detail_flex_13", jobsSrc.includes("flex-[13] min-w-0 min-h-0")],
  ["detail_md_max_w_none", jobsSrc.includes("md:max-w-none") && !jobsSrc.includes("md:max-w-4xl")],
  ["mobile_max_w_3xl_preserved", jobsSrc.includes("max-w-3xl")],
  ["toolbar_md_space_y_1", headerSrc.includes("md:space-y-1")],
  ["toolbar_kpi_md_compact", headerSrc.includes("md:py-1") && headerSrc.includes("md:text-sm") && headerSrc.includes("md:rounded-xl")],
  ["toolbar_md_grid_search_filters", headerSrc.includes("md:grid md:grid-cols-[minmax(9rem,auto)_1fr_auto]")],
  ["toolbar_filters_md_not_full_width", headerSrc.includes("md:w-auto md:shrink-0")],
  ["filter_bar_md_28", filterSrc.includes("md:min-h-[28px]") && filterSrc.includes("md:px-2.5")],
  ["filter_bar_all_phases", filterSrc.includes('"Wszystkie"') && filterSrc.includes('"Zdane"')],
  ["phase_picker_md_compact", filterSrc.includes("md:p-3 md:space-y-2") && filterSrc.includes("md:text-xs")],
  ["detail_nav_md_compact", navSrc.includes("md:py-1.5") && navSrc.includes("md:text-[11px]")],
  ["detail_header_md_compact", jobsSrc.includes("md:pt-2 md:pb-1.5 md:space-y-2")],
  ["mobile_44_preserved", headerSrc.includes("min-h-[44px]")],
  ["no_flex_11", !jobsSrc.includes("flex-[11]")],
];

console.log("=== Roboty 2.50.40 UX PACK smoke (static) ===\n");
let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (ok) pass += 1;
}
console.log("\n=== " + pass + "/" + checks.length + " | static: " + (pass === checks.length ? "ALL PASS" : "FAIL") + " ===\n");
if (pass !== checks.length) process.exit(1);
