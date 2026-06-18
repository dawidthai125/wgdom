/**
 * P5-005A — Owner Language smoke.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TENDER_OWNER_TAB_LABELS,
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

console.log("1. Tab labels SSOT (P5-005B / V3.1 Intelligence)");
assert(TENDER_WORKSPACE_TAB_LABELS.overview === TENDER_OWNER_TAB_LABELS.overview, "workspace uses owner tabs");
assert(TENDER_OWNER_TAB_LABELS.overview === "Intelligence", "overview tab Intelligence");
assert(TENDER_OWNER_TAB_LABELS.valuation === "Wycena", "valuation module tab");
assert(TENDER_OWNER_TAB_LABELS.qualification === "Kwalifikacja", "qualification module tab");
assert(TENDER_OWNER_TAB_LABELS.offer === "Oferta", "offer module tab");
assert(!TENDER_OWNER_TAB_LABELS.overview.includes("Przegląd"), "no Przegląd");
assert(!TENDER_OWNER_TAB_LABELS.overview.includes("Decyzja"), "no legacy Decyzja tab");

console.log("\n2. Intelligence copy SSOT");
const ownerView = readSrc("src/app/TenderOwnerView.tsx");
assert(ownerView.includes("TENDER_INTELLIGENCE_SECTION_COPY"), "Intelligence section copy");
assert(ownerView.includes("intelligenceCtx"), "Owner view renderer uses intelligenceCtx");
assert(!ownerView.includes("scoreTenderForOwnerView"), "no scoring in OwnerView");
assert(!ownerView.includes("OwnerNextSteps"), "OwnerNextSteps removed");
const bidPrep = readSrc("src/app/TenderBidPrepPanel.tsx");
assert(bidPrep.includes("TENDER_OWNER_OPERATOR_COPY.analyzeDocuments"), "bid prep uses owner CTA");
assert(!bidPrep.includes('"Analizuj SWZ"'), "removed Analizuj SWZ string");

console.log("\n3. Owner view copy retained");
assert(TENDER_OWNER_VIEW_COPY.financeCta === "Policz zysk", "finance CTA");
assert(TENDER_OWNER_TILE_LABELS.kosztorys === "Plik z pozycjami", "tile kosztorys");
assert(TENDER_OWNER_OPERATOR_COPY.analyzeDocuments === "Przeanalizuj dokumenty", "analyze label");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
