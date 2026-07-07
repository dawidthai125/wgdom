/**
 * TEUX-2 — SSOT tender-ux-tokens + design-system foundation.
 */

import {
  TEUX_CHIP_TOUCH,
  TEUX_FONT_CAPTION,
  TEUX_FONT_HEADLINE,
  TEUX_FONT_META,
  TEUX_KPI_COMPACT_LABEL,
  TEUX_KPI_COMPACT_VALUE,
  TEUX_SECTION_TITLE,
  TEUX_TOKENS_VERSION,
  TEUX_TOUCH_TARGET,
  TEUX_TRANSITION_FAST,
} from "../src/lib/tender-ux-tokens.ts";

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

console.log("=== TEUX-2 TENDER UX TOKENS ===\n");

ok("version frozen tag", TEUX_TOKENS_VERSION.includes("teux2"));
ok("meta 11px not 9px", TEUX_FONT_META.includes("11px") && !TEUX_FONT_META.includes("9px"));
ok("caption text-xs", TEUX_FONT_CAPTION.includes("text-xs"));
ok("headline text-lg", TEUX_FONT_HEADLINE.includes("text-lg"));
ok("KPI compact label uses meta", TEUX_KPI_COMPACT_LABEL.includes("11px"));
ok("KPI compact value no 9px", !TEUX_KPI_COMPACT_VALUE.includes("9px"));
ok("section title uppercase", TEUX_SECTION_TITLE.includes("uppercase"));
ok("chip touch 44px mobile", TEUX_CHIP_TOUCH.includes("min-h-[44px]"));
ok("touch target token", TEUX_TOUCH_TARGET.includes("min-h-[44px]"));
ok("motion fast duration", TEUX_TRANSITION_FAST.includes("duration-150"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
