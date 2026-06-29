/**
 * NG-02.1B — heavy worker inflight lifecycle (P0-A).
 * npx vite-node scripts/test-tender-dossier-heavy-lifecycle.mjs
 */

import {
  clearDossierInflightForItem,
  isDossierInflightForItem,
  markDossierInflightForTest,
  resetDossierHeavyLazyForTests,
} from "../src/app/hooks/useTenderDossierHeavyLazy.ts";
import { retryTenderPipelinePhase } from "../src/lib/tender-pipeline/tender-pipeline-retry.ts";

const ITEM_A = "heavy-lifecycle-a";
const ITEM_B = "heavy-lifecycle-b";

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

resetDossierHeavyLazyForTests();

console.log("=== NG-02.1B Heavy inflight lifecycle ===\n");

ok("H1 start empty", !isDossierInflightForItem(ITEM_A));

markDossierInflightForTest(ITEM_A);
ok("H2 inflight set", isDossierInflightForItem(ITEM_A));

clearDossierInflightForItem(ITEM_A);
ok("H3 clearDossierInflight frees slot", !isDossierInflightForItem(ITEM_A));

markDossierInflightForTest(ITEM_B);
retryTenderPipelinePhase(ITEM_B, "heavy");
ok("H4 retry heavy scope clears inflight", !isDossierInflightForItem(ITEM_B));

markDossierInflightForTest(ITEM_A);
markDossierInflightForTest(ITEM_B);
resetDossierHeavyLazyForTests();
ok("H5 reset clears all inflight", !isDossierInflightForItem(ITEM_A) && !isDossierInflightForItem(ITEM_B));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
