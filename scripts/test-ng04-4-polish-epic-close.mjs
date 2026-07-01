/**
 * NG-04.4 — Polish & EPIC Close tests (T01–T10).
 * npx vite-node scripts/test-ng04-4-polish-epic-close.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("T01 — UX-01: BOQ header przed search");
{
  const src = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");
  const headerIdx = src.indexOf("data-kosztorys-boq-header");
  const searchIdx = src.indexOf("data-kosztorys-boq-search");
  assert(headerIdx >= 0 && searchIdx > headerIdx, "T01 header block before search input");
  assert(src.includes("BOQ Explorer"), "T01 section title present");
}

console.log("\nT02 — UX-03: desktop Benchmark rbh header");
{
  const src = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");
  assert(src.includes("Benchmark rbh"), "T02 desktop column Benchmark rbh");
  assert(!src.includes(">Benchmark<"), "T02 no bare Benchmark th");
}

console.log("\nT03 — UX-03 / B-02: mobile Benchmark rbh label");
{
  const src = read("src/app/kosztorys/KosztorysBoqRowFields.tsx");
  assert(src.includes("Benchmark rbh"), "T03 mobile benchmark label");
}

console.log("\nT04 — ATH-01: suppress priced tooltip in UI");
{
  const src = read("src/app/kosztorys/BoqAthTooltip.tsx");
  assert(src.includes('athCellState === "priced"'), "T04 priced suppress branch");
  assert(!src.includes("resolveBoqAthCellState"), "T04 no resolve in tooltip");
}

console.log("\nT05 — ATH-02 / M-01: aria-label + icon button trigger");
{
  const src = read("src/app/kosztorys/BoqAthTooltip.tsx");
  assert(src.includes("aria-label={tooltip}"), "T05 aria-label on trigger");
  assert(src.includes('type="button"'), "T05 button trigger for touch target");
}

console.log("\nT06 — ATH-03: section TooltipProvider");
{
  const section = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");
  const tooltip = read("src/app/kosztorys/BoqAthTooltip.tsx");
  const strip = read("src/app/kosztorys/BoqAthSourceStrip.tsx");
  assert(section.includes("TooltipProvider"), "T06 section wraps TooltipProvider");
  assert(tooltip.includes("TooltipPrimitive.Root"), "T06 primitive root in BoqAthTooltip");
  assert(!tooltip.includes("<Tooltip>"), "T06 no nested Tooltip provider in BoqAthTooltip");
  assert(strip.includes("TooltipPrimitive.Root"), "T06 primitive root in BoqAthSourceStrip");
}

console.log("\nT07 — UX-04: rows_fallback DEV only");
{
  const src = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");
  assert(src.includes("import.meta.env.DEV"), "T07 rows_fallback gated by DEV");
}

console.log("\nT08 — UX-07: empty catalog message");
{
  const src = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");
  assert(src.includes("data-kosztorys-boq-empty-catalog"), "T08 empty catalog marker");
  assert(src.includes("Brak pozycji w katalogu"), "T08 empty catalog copy");
}

console.log("\nT09 — M-02 / M-03: table a11y + filter aria-pressed");
{
  const src = read("src/app/kosztorys/KosztorysBoqExplorerSection.tsx");
  assert(src.includes('scope="col"'), "T09 th scope col");
  assert(src.includes("sr-only"), "T09 caption sr-only");
  assert(src.includes("aria-pressed"), "T09 filter aria-pressed");
}

console.log("\nT10 — DOC-01 + frozen merge / #010");
{
  const guide = read("src/app/GuideView.tsx");
  const explorer = read("src/lib/tender-kosztorys-boq-explorer.ts");
  const badge = read("src/app/kosztorys/BoqLaborBenchmarkBadge.tsx");
  assert(guide.includes("BOQ Explorer"), "T10 GuideView mentions BOQ Explorer");
  assert(!explorer.includes("tender-kosztorys-boq-ath-presentation"), "T10 explorer merge frozen");
  assert(badge.includes("—"), "T10 benchmark empty em dash");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
