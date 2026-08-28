/**
 * W5 HUB CONNECT — Hub Accept → Orchestra.refreshPhase seam.
 * Run: npx vite-node scripts/test-ik-w5-hub-orchestra-refresh-connect.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveHubAcceptRefreshPhaseKind,
  shouldPreferOrchestraRefreshPhase,
} from "../src/lib/intelligent-estimator/orchestra/orchestra-refresh-phase.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// —— Pure CONNECT helpers ——
ok("default phase pricing_accept", resolveHubAcceptRefreshPhaseKind() === "pricing_accept");
ok(
  "labor meta",
  resolveHubAcceptRefreshPhaseKind({ phase: "labor_accept" }) === "labor_accept",
);
ok(
  "material meta",
  resolveHubAcceptRefreshPhaseKind({ phase: "material_accept" }) === "material_accept",
);
ok(
  "catalog meta",
  resolveHubAcceptRefreshPhaseKind({ phase: "catalog_accept" }) === "catalog_accept",
);
ok("prefer refresh when fn", shouldPreferOrchestraRefreshPhase(() => {}) === true);
ok("prefer refresh when null", shouldPreferOrchestraRefreshPhase(null) === false);

// —— Snapshot / hook expose refreshPhase ——
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const typesSrc = readSrc("src/lib/intelligent-estimator/orchestra/orchestra-types.ts");
const phaseSrc = readSrc(
  "src/lib/intelligent-estimator/orchestra/orchestra-refresh-phase.ts",
);

ok("hook defines refreshPhase", /const refreshPhase = useCallback/.test(hookSrc));
ok(
  "refreshPhase REUSE bumpOrchestraAfterPricingAccept",
  /bumpOrchestraAfterPricingAccept\(\)/.test(hookSrc)
    && hookSrc.includes('refreshPhase("labor_accept")'),
);
ok(
  "ownerGate labor Accept uses refreshPhase",
  /g2LaborAccept[\s\S]*refreshPhase\("labor_accept"\)/.test(hookSrc),
);
ok(
  "ownerGate material Accept uses refreshPhase",
  /g2MaterialAccept[\s\S]*refreshPhase\("material_accept"\)/.test(hookSrc),
);
ok("snapshot type has refreshPhase", typesSrc.includes("refreshPhase:"));
ok(
  "phase module documents notify ≠ full refresh",
  phaseSrc.includes("notifyIkPricingAccepted") && phaseSrc.includes("≠"),
);
ok("no second OrchestraEngine class", !/class\s+OrchestraEngine/.test(phaseSrc));
ok("no second Accept engine in phase module", !/acceptIkLabor/.test(phaseSrc));

// —— Hub labor panel CONNECT ——
const laborPanel = readSrc("src/app/ik-pricing/IkLaborGapResearchPanel.tsx");
ok(
  "Hub labor uses idempotent Accept",
  laborPanel.includes("acceptIkLaborResearchAndNotifyIdempotent"),
);
ok(
  "Hub labor passes labor_accept phase",
  laborPanel.includes('phase: "labor_accept"'),
);
ok(
  "Hub labor respects IDEMPOTENT_NOOP without bump",
  laborPanel.includes("skippedDuplicate") && laborPanel.includes("IDEMPOTENT_NOOP"),
);

// —— Page routes Hub → refreshPhase ——
const pageSrc = readSrc("src/app/TenderDetailPage.tsx");
ok("page resolves Hub refresh kind", pageSrc.includes("resolveHubAcceptRefreshPhaseKind"));
ok(
  "page prefers Orchestra refreshPhase",
  pageSrc.includes("shouldPreferOrchestraRefreshPhase")
    && pageSrc.includes("ikOrchestraSnapshot.refreshPhase"),
);
ok(
  "page keeps LEGACY notify fallback",
  pageSrc.includes("notifyIkPricingAccepted"),
);
ok(
  "Bridge onPricingAccepted still notify (used by bump)",
  /onPricingAccepted=\{\(\) => \{\s*notifyIkPricingAccepted/.test(pageSrc)
    || pageSrc.includes("onPricingAccepted={() => {"),
);

// —— KNR-WC CREATE → catalog_accept ——
const createExec = readSrc("src/app/ik-pricing/IkKnrWcIdentityCreateExecutor.tsx");
const hubSrc = readSrc("src/app/TenderWorkflowHubPanel.tsx");
ok("CreateExecutor has onCatalogAccepted", createExec.includes("onCatalogAccepted"));
ok(
  "Hub wires catalog_accept",
  hubSrc.includes('phase: "catalog_accept"'),
);

// —— notify alone is not the only refresh signal on ownerGate path ——
ok(
  "ownerGate path still has bump/refreshPhase after Accept",
  hookSrc.includes("refreshPhase(\"labor_accept\")")
    && hookSrc.includes("bumpOrchestraAfterPricingAccept"),
);

// —— W3 CONNECT preserved ——
ok(
  "W3 CONNECT still present",
  pageSrc.includes("resolveW3ChiefOrchestraConnect")
    && pageSrc.includes("delegateIkSequencingToOrchestra"),
);

console.log(`\nW5 HUB CONNECT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
