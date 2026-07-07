/**
 * TEUX-7c — Accessibility: bulk checkbox, aria-pressed, min 12px typography, contrast.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function readSrc(rel) {
  return readFileSync(`${ROOT}/${rel}`, "utf8");
}

console.log("=== TEUX-7c TENDER A11Y ===\n");

const bulk = readSrc("src/app/tenders/list/TenderListBulkCheckbox.tsx");
ok("bulk is button role=checkbox", bulk.includes("<button") && bulk.includes('role="checkbox"'));
ok("bulk aria-checked", bulk.includes("aria-checked={selected}"));
ok("bulk aria-label prop", bulk.includes("aria-label={ariaLabel}"));
ok("bulk keyboard Space/Enter", bulk.includes('e.key === " "') && bulk.includes('e.key === "Enter"'));
ok("bulk stopPropagation", bulk.includes("stopPropagation"));
ok("bulk teux7c marker", bulk.includes("data-teux7c-bulk-checkbox"));
ok("bulk TEUX_TOUCH_TARGET import", bulk.includes("TEUX_TOUCH_TARGET"));
ok("bulk no span role=checkbox", !bulk.includes("<span") || !bulk.match(/<span[^>]*role="checkbox"/));

const mobileCard = readSrc("src/app/tenders/list/TenderListMobileCard.tsx");
const desktopCard = readSrc("src/app/tenders/list/TenderListDesktopCard.tsx");
ok("mobile card ariaLabel", mobileCard.includes("ariaLabel={`${bulkSelected"));
ok("desktop card ariaLabel", desktopCard.includes("ariaLabel={`${bulkSelected"));

const filters = readSrc("src/app/tenders/list/TenderListFiltersPanel.tsx");
ok("bulk toggle aria-pressed", filters.includes("aria-pressed={bulkMode}"));
ok("bulk toggle aria-label", filters.includes("aria-label={bulkMode"));
ok("bulk toggle data-teux7c", filters.includes("data-teux7c-bulk-toggle"));

const strip = readSrc("src/app/TenderWorkflowProcessStrip.tsx");
ok("strip TEUX_FONT_CAPTION import", strip.includes("TEUX_FONT_CAPTION"));
ok("strip no text-[10px] on buttons", !strip.match(/<button[\s\S]*?text-\[10px\]/));
ok("strip no text-[9px]", !strip.includes("text-[9px]"));
ok("strip aria-label on stage button", strip.includes("aria-label={presentation.title}"));

const trust = readSrc("src/app/tenders/trust/TrustChip.tsx");
ok("trust TEUX_FONT_CAPTION", trust.includes("TEUX_FONT_CAPTION"));
ok("trust no text-[10px]", !trust.includes("text-[10px]"));
ok("trust button aria-label", trust.includes("aria-label={ariaLabel}"));
ok("trust neutral contrast boost", trust.includes("text-foreground/85"));

const decyzja = readSrc("src/app/TenderDecyzjaSubTabBar.tsx");
ok("decyzja TEUX_FONT_CAPTION", decyzja.includes("TEUX_FONT_CAPTION"));
ok("decyzja no text-[11px]", !decyzja.includes("text-[11px]"));

const shortcuts = readSrc("src/app/TenderOverviewShortcuts.tsx");
ok("shortcuts TEUX_FONT_CAPTION", shortcuts.includes("TEUX_FONT_CAPTION"));
ok("shortcuts no text-[10px]", !shortcuts.includes("text-[10px]"));
ok("shortcuts aria-label on buttons", (shortcuts.match(/aria-label=/g) || []).length >= 3);

ok("tokens frozen — no teux7c edits", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux7c"));

const forbidden = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/hooks/useTenderDocumentsBootstrap.ts",
  "src/app/tenders/strategy/hooks/useTendersPipeline.ts",
  "src/app/App.tsx",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden ${p} no teux7c`, !src.includes("teux7c"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
