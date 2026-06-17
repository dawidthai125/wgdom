/**
 * P5-005A — Owner Language smoke.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TENDER_OWNER_TAB_LABELS,
  TENDER_OWNER_NEXT_STEP_CTA,
  TENDER_OWNER_VIEW_COPY,
  TENDER_OWNER_OPERATOR_COPY,
  TENDER_OWNER_TILE_LABELS,
} from "../src/lib/tender-owner-language-pl.ts";
import { TENDER_WORKSPACE_TAB_LABELS } from "../src/lib/tender-workspace-ux.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\n=== P5-005A/B Owner Language ===\n");

console.log("1. Tab labels SSOT (P5-005B module names)");
assert(TENDER_WORKSPACE_TAB_LABELS.overview === TENDER_OWNER_TAB_LABELS.overview, "workspace uses owner tabs");
assert(TENDER_OWNER_TAB_LABELS.valuation === "Wycena", "valuation module tab");
assert(TENDER_OWNER_TAB_LABELS.qualification === "Kwalifikacja", "qualification module tab");
assert(TENDER_OWNER_TAB_LABELS.offer === "Oferta", "offer module tab");
assert(!TENDER_OWNER_TAB_LABELS.overview.includes("Przegląd"), "no Przegląd");

console.log("\n2. Business questions in CTA, not tabs");
assert(TENDER_OWNER_NEXT_STEP_CTA.valuation === "Ile zarobimy?", "next step valuation question");
assert(TENDER_OWNER_NEXT_STEP_CTA.qualification === "Czy możemy wystartować?", "next step qualification question");
assert(TENDER_OWNER_TAB_LABELS.valuation !== TENDER_OWNER_NEXT_STEP_CTA.valuation, "tab != CTA valuation");
const bidPrep = readSrc("src/app/TenderBidPrepPanel.tsx");
assert(bidPrep.includes("TENDER_OWNER_OPERATOR_COPY.analyzeDocuments"), "bid prep uses owner CTA");
assert(!bidPrep.includes('"Analizuj SWZ"'), "removed Analizuj SWZ string");

console.log("\n3. Owner view copy retained");
assert(TENDER_OWNER_VIEW_COPY.financeCta === "Policz zysk", "finance CTA");
assert(TENDER_OWNER_TILE_LABELS.kosztorys === "Plik z pozycjami", "tile kosztorys");
assert(TENDER_OWNER_OPERATOR_COPY.analyzeDocuments === "Przeanalizuj dokumenty", "analyze label");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
