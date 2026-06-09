/**
 * Roboty 2.50.30 — desktop toolbar compact (static source check)
 * Uruchom: npx vite-node scripts/smoke-test-jobs-toolbar-2.50.30.mjs
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

const checks = [
  ["toolbar_md_padding", headerSrc.includes("md:pt-2") && headerSrc.includes("md:pb-2")],
  ["toolbar_md_space", headerSrc.includes("md:space-y-1.5")],
  ["toolbar_kpi_md_compact", headerSrc.includes("md:py-1.5") && headerSrc.includes("md:text-base")],
  ["toolbar_buttons_md_36", headerSrc.includes("md:min-h-[36px]")],
  ["toolbar_list_toggle_md_32", headerSrc.includes("md:min-h-[32px]")],
  ["toolbar_search_md_32", headerSrc.includes("md:min-h-[32px]")],
  ["filter_bar_md_32", filterSrc.includes("md:min-h-[32px]")],
  ["mobile_44_preserved", headerSrc.includes("min-h-[44px]")],
  ["detail_max_w_4xl", jobsSrc.includes("md:max-w-4xl")],
  ["mobile_max_w_3xl", jobsSrc.includes("max-w-3xl")],
];

console.log("=== Roboty 2.50.30 toolbar + detail smoke (static) ===\n");
let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (ok) pass += 1;
}
console.log("\n=== " + pass + "/" + checks.length + " | static: " + (pass === checks.length ? "ALL PASS" : "FAIL") + " ===\n");
if (pass !== checks.length) process.exit(1);
