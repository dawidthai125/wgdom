/**
 * IK-MIGRATION-01 P5.14 — Live Material + Owner Accept (honesty / gap contract).
 * Run: npx vite-node scripts/test-ik-migration-01-p514-live-material.mjs
 *
 * Does NOT claim LIVE PASS. Asserts known blockers + Gate A + zaprawianie lock.
 * Live numbers: prefer .tmp/p5-real-material-report.json when present (from probe).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  acceptIkMaterialResearchCandidate,
} from "../src/lib/intelligent-estimator/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled() === false);
assert("Gate A ik_entry", resolveIkDetailFirstScreen(false) === "ik_entry");

// UI wiring: acceptIkMaterialResearchCandidate must remain lib-only (no IkEntry Accept).
const ikEntry = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");
assert(
  "I IkEntryHost does NOT call acceptIkMaterialResearchCandidate",
  !ikEntry.includes("acceptIkMaterialResearchCandidate"),
);
assert(
  "I IkEntryHost keeps Material Expert plumbing (guarded)",
  ikEntry.includes("runIkMasterBoqMaterialExpert"),
);
assert(
  "I P1 shell EXECUTE_RESEARCH default false",
  /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(ikEntry),
);
assert(
  "I P1 shell RUN_RATE_EXPERTS default false",
  /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(ikEntry),
);
const laborCard = existsSync(join(root, "src/app/ik-pricing/IkLaborCandidateReviewCard.tsx"));
const materialCard = existsSync(join(root, "src/app/ik-pricing/IkMaterialCandidateReviewCard.tsx"));
assert("I Labor Accept card exists", laborCard === true);
assert("I Material Accept card does NOT exist (no parallel UI)", materialCard === false);

const ourPrice = readFileSync(join(root, "src/lib/price-intelligence/our-price-catalog.ts"), "utf8");
assert(
  "I OurPriceCatalog only mat.* keys",
  ourPrice.includes('materialKey.startsWith("mat.")'),
);

assert(
  "lib Accept export still exists (runtime path)",
  typeof acceptIkMaterialResearchCandidate === "function",
);

const reportPath = join(root, ".tmp/p5-real-material-report.json");
if (existsSync(reportPath)) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const zawor = (report.inventory || []).filter((l) =>
    String(l.catalogWorkId || "").includes("zawor-odpowietrzajacy"),
  );
  const zap = (report.inventory || []).filter((l) =>
    String(l.catalogWorkId || "").includes("zaprawianie"),
  );
  assert("A live zawór input 2", zawor.length === 2, zawor.length);
  assert(
    "B live Price Memory BEFORE = HIT (blocks research)",
    zawor.every((l) => l.priceStatus === "PRICE_MEMORY_HIT" && l.priceMemoryHitPln === 28),
  );
  assert(
    "B live research keys empty on zawór",
    zawor.every((l) => !l.researchKey && !l.hasCandidate),
  );
  assert(
    "O zaprawianie material research 0",
    zap.every((l) => l.plane === "LABOR" && !l.hasCandidate && !l.researchKey),
  );
  assert("J qty preserved sample", zawor[0]?.quantity === 3 && zawor[1]?.quantity === 2);
  assert("L unit szt.", zawor.every((l) => String(l.unit).startsWith("szt")));
  assert(
    "M dwelling kotlarska+ptasia",
    zawor.some((l) => l.dwellingId === "kotlarska") && zawor.some((l) => l.dwellingId === "ptasia"),
  );
  assert("N branch sanitary", zawor.every((l) => l.branch === "sanitary"));
  assert(
    "P no Leroy/Castorama candidates in live inventory",
    !JSON.stringify(zawor).includes("89178695")
    && !JSON.stringify(zawor).includes("5902510004040"),
  );
  assert("Gate B incomplete — no live candidates", (report.summary?.focus?.candidates ?? 0) === 0);
} else {
  console.log("SKIP live report asserts — run probe-ik-migration-01-p5-real-material.mjs first");
}

console.log(`
P5.14 LIVE MATERIAL (honesty):
INPUT = 2 (when report present)
REAL RESEARCH = FAIL (CURRENT HIT 28 · skipped)
LEROY candidate = NO
CASTORAMA candidate = NO
OWNER ACCEPT UI = GAP
AUTO-ACCEPT = NO
ZAPRAWIANIE MATERIAL RESEARCH = 0
GATE A = PASS
GATE B = FAIL
`);

console.log(`\nP5.14 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
