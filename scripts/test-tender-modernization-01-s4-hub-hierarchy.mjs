/**
 * TENDER-MODERNIZATION-01 / S4 — Hub UX hierarchy harness (static source + contract).
 * DF: docs/architecture/TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md
 *
 * Run: npx vite-node scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntelligenceHubShortcutLabel } from "../src/lib/tender-command-layer-ux.ts";
import {
  resolveAuthoritativeOfferPln,
} from "../src/lib/tender-offer-pln-authority.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

console.log("=== TENDER-MODERNIZATION-01 / S4 Hub UX ===\n");

const hub = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const v2 = readSrc("src/app/TenderWorkspaceV2Panel.tsx");
const chief = readSrc("src/app/chief-dossier/ChiefDossierSurface.tsx");
const chiefOffer = readSrc("src/app/chief-dossier/ChiefOfferRecommendation.tsx");
const dwSurface = readSrc("src/app/decision-workspace/DecisionWorkspaceSurface.tsx");
const dwRec = readSrc("src/app/decision-workspace/DecisionRecommendationPanel.tsx");
const detail = readSrc("src/app/TenderDetailPage.tsx");
const cmdUx = readSrc("src/lib/tender-command-layer-ux.ts");
const primaryAction = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");
const authority = readSrc("src/lib/tender-offer-pln-authority.ts");

// --- AC-S4-1 hierarchy markers ---
assert("AC-S4-1 hub data-s4-hub-hierarchy", hub.includes('data-s4-hub-hierarchy="1"'));
assert("AC-S4-1 step analiza", hub.includes('data-s4-step="analiza"'));
assert("AC-S4-1 step eksperci", hub.includes('data-s4-step="eksperci"'));
assert(
  "AC-S4-1 analiza before eksperci",
  hub.indexOf('data-s4-step="analiza"') < hub.indexOf('data-s4-step="eksperci"'),
);
const hubRender = hub.slice(hub.indexOf("return ("));
assert(
  "AC-S4-1 eksperci before DecisionWorkspaceHost (render)",
  hubRender.indexOf('data-s4-step="eksperci"') <
    hubRender.indexOf("<DecisionWorkspaceHost"),
);
assert(
  "AC-S4-1 no pinned InsightsCompact sibling Progress in CL block",
  !hub.includes("commandLayerActive &&") ||
    !/commandLayerActive && \(\s*<>\s*<TenderWorkspaceV2ProgressCompact[\s\S]*TenderWorkspaceV2InsightsCompact/.test(
      hub,
    ),
);
assert(
  "AC-S4-1 Insights only via recovery helper (not pinned stack)",
  hub.includes("insightsRecovery") &&
    !hub.includes("<TenderWorkspaceV2InsightsCompact\n            item={item}\n            swz={swz}\n            intelligenceCtx={intelligenceCtx}\n            onNavigateCostTab={(tab) => onNavigateTab(tab)}\n          />\n          {chiefDossierVm"),
);

// --- AC-S4-2 Intelligence recovery ---
assert("AC-S4-2 recovery attr", hub.includes('data-s4-recovery="1"'));
assert(
  "AC-S4-2 InsightsCompact used via recovery helper",
  hub.includes("insightsRecovery") && hub.includes("<TenderWorkspaceV2InsightsCompact"),
);
assert(
  "AC-S4-2 recovery mounts insightsRecovery",
  hubRender.includes("{insightsRecovery}"),
);
assert(
  "AC-S4-2 recovery summary copy",
  hub.includes("Szczegóły / Intelligence (recovery)"),
);
assert(
  "AC-S4-2 Insights title recovery",
  v2.includes("Alerty / Intelligence (recovery)"),
);
assert(
  "AC-S4-2 id tender-intelligence-hub KEEP",
  v2.includes('id="tender-intelligence-hub"'),
);
assert(
  "AC-S4-2 shortcut label Hub przetargu",
  buildIntelligenceHubShortcutLabel() === "Hub przetargu",
);
assert(
  "AC-S4-2 shortcut label source",
  cmdUx.includes('return "Hub przetargu"'),
);
assert(
  "AC-S4-2 DetailPage scrolls workflow hub",
  detail.includes('querySelector("[data-tender-workflow-hub]")') &&
    detail.includes("scrollToWorkflowHub"),
);
assert(
  "AC-S4-2 DetailPage no intelligence-hub scroll target",
  !detail.includes('getElementById("tender-intelligence-hub")'),
);

// --- AC-S4-3 Chief + EW + DW ---
assert(
  "AC-S4-3 Chief order marker",
  chief.includes('data-s4-chief-order="trace-ew-offer"'),
);
const chiefBody = chief.slice(chief.indexOf('data-s4-chief-order="trace-ew-offer"'));
const traceIdx = chiefBody.indexOf("<ChiefExpertTraceList");
const ewIdx = chiefBody.indexOf("<ExpertWorkspaceSurface");
const offerIdx = chiefBody.indexOf("<ChiefOfferRecommendation");
assert("AC-S4-3 Trace before EW", traceIdx >= 0 && traceIdx < ewIdx);
assert("AC-S4-3 EW before Offer Rec", ewIdx >= 0 && ewIdx < offerIdx);
const dwBody = dwSurface.slice(
  dwSurface.indexOf("S4 LOCKED: Validation") >= 0
    ? dwSurface.indexOf("S4 LOCKED: Validation")
    : dwSurface.indexOf("return ("),
);
assert(
  "AC-S4-3 DW Validation before Rec panel",
  dwBody.indexOf("<DecisionValidationSummary") <
    dwBody.indexOf("<DecisionRecommendationPanel"),
);
assert(
  "AC-S4-3 DW Rec before Findings",
  dwBody.indexOf("<DecisionRecommendationPanel") <
    dwBody.indexOf("<DecisionFindingsPanel"),
);
assert(
  "AC-S4-3 DW Findings before Actions",
  dwBody.indexOf("<DecisionFindingsPanel") < dwBody.indexOf("<DecisionActionsBar"),
);
assert("AC-S4-3 DW step walidacja", dwSurface.includes('data-s4-step="walidacja"'));
assert("AC-S4-3 DW step decyzja", dwSurface.includes('data-s4-step="decyzja"'));
assert("AC-S4-3 Hub keeps S2 dw-primary", hub.includes("data-s2-dw-primary"));

// --- AC-S4-4 single primary PLN ---
assert(
  "AC-S4-4 Hub headline primary attr",
  hub.includes('data-s4-primary-pln="1"') && hub.includes("data-s3-primary-pln-headline"),
);
assert(
  "AC-S4-4 Chief Offer secondary chrome",
  chiefOffer.includes('data-s4-pln-chrome="secondary"') &&
    chiefOffer.includes("text-base font-semibold") &&
    !/text-xl font-bold/.test(chiefOffer),
);
assert(
  "AC-S4-4 DW Rec secondary chrome",
  dwRec.includes('data-s4-pln-chrome="secondary"') &&
    dwRec.includes("text-base font-semibold") &&
    !/text-xl font-bold/.test(dwRec),
);
assert(
  "AC-S4-4 Chief/DW lack primary pln attr",
  !chiefOffer.includes('data-s4-primary-pln="1"') &&
    !dwRec.includes('data-s4-primary-pln="1"'),
);

// --- S3 authority NO TOUCH smoke ---
assert(
  "S3 authority file still exports resolveAuthoritativeOfferPln",
  authority.includes("export function resolveAuthoritativeOfferPln"),
);
const onOffer = resolveAuthoritativeOfferPln({
  expertEffective: true,
  offerPricePln: 100_000,
  recommendedBidPln: 90_000,
});
assert("S3 Expert ON Offer primary", onOffer.source === "offer_expert" && onOffer.primaryPln === 100_000);
const onNull = resolveAuthoritativeOfferPln({
  expertEffective: true,
  offerPricePln: null,
  recommendedBidPln: 90_000,
});
assert("S3 Expert ON Offer null NO PRIMARY", onNull.source === "none" && onNull.primaryPln == null);
const offBid = resolveAuthoritativeOfferPln({
  expertEffective: false,
  offerPricePln: 100_000,
  recommendedBidPln: 90_000,
});
assert("S3 Expert OFF Bid primary", offBid.source === "bid_legacy" && offBid.primaryPln === 90_000);

// --- Guardrails ---
assert("NO NEW FLAG kw-tm01-s4", !hub.includes("kw-tm01-s4") && !detail.includes("kw-tm01-s4"));
assert(
  "PrimaryAction S4 CTA marker",
  primaryAction.includes("data-s4-cta-to-decision"),
);
assert(
  "Hub still uses resolveAuthoritativeOfferPln",
  hub.includes("resolveAuthoritativeOfferPln"),
);

console.log(`\n=== S4 RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
