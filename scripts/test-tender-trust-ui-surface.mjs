/**
 * NG-01-UX-HF-001 — Surface Policy (prezentacja trust UI).
 * npx vite-node scripts/test-tender-trust-ui-surface.mjs
 */
import {
  buildTenderTrustAssessment,
} from "../src/lib/tender-trust-layer.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import {
  buildProcessStripStagePresentation,
  getTrustChipLimit,
  pickDimensionsForSurfaceDisplay,
  pickDocumentsTrustBadge,
  pickKosztorysInlineHint,
  pickPricingBlockedMessage,
  resolveTrustViewport,
  shouldRenderHubTrustBanner,
  sliceTrustDimensionsForDisplay,
} from "../src/lib/tender-trust-ui.ts";

const FIXED_AT = "2026-06-29T12:00:00.000Z";

let pass = 0;
let fail = 0;
function ok(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function baseItem(overrides = {}) {
  return {
    id: "hf-surface-1",
    tenderId: "bzp-hf",
    noticeNumber: "2026/BZP 00111111",
    title: "Test HF surface",
    bzpNumber: "2026/BZP 00111111",
    organizationName: "WM",
    organizationCity: "Wrocław",
    organizationProvince: "PL02",
    cpvCode: "45000000",
    publicationDate: "2026-06-01",
    submittingOffersDate: "2026-07-15T12:00:00.000Z",
    orderType: "Usługi",
    moIdentifier: "mo-1",
    status: "seen",
    notes: "",
    relevanceScore: 80,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: FIXED_AT,
    updatedAt: FIXED_AT,
    ezamowieniaUrl: "https://ezamowienia.gov.pl/test",
    documentsFetchedAt: FIXED_AT,
    bzpDocuments: [{ index: 1, filename: "swz.pdf" }],
    bzpDocuments: [{ index: 1, filename: "kosztorys.ath" }],
    ...overrides,
  };
}

const mockDoc = {
  index: 1,
  documentId: "doc-1",
  filename: "kosztorys.ath",
  contentType: "application/octet-stream",
  downloadUrl: "https://example.com/k.ath",
  isSwzHint: false,
  platform: "ezamowienia",
};

function dossier(overrides = {}) {
  return {
    brief: { fields: [], scopeDescription: "Test", builtAt: FIXED_AT },
    kosztorys: {
      ok: true,
      sourceFilename: "kosztorys.ath",
      rowCount: 42,
      rows: [{ lp: "1", description: "Roboty", unit: "m2", quantity: "10", unitPrice: "100", total: "1000" }],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
      totalValue: "10000",
      currency: "PLN",
    },
    scanSummary: {
      totalDocuments: 1,
      scanned: 1,
      parsed: 1,
      byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 },
      sevenZipCount: 0,
      kosztorysFound: true,
      valueFound: true,
      criteriaFound: false,
      estimateFound: true,
      costDiscovery: { found: true, type: "ath", source: "kosztorys.ath", confidence: 0.9 },
      parsedAt: FIXED_AT,
    },
    estimatePln: 10000,
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: FIXED_AT,
    ...overrides,
  };
}

function trustedItem() {
  return baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: FIXED_AT,
    tenderDossier: dossier({
      bidProposal: { ok: true, recommendedBidPln: 95000, qualityLevel: "good" },
    }),
    swzAnalysis: {
      estimatedValuePln: 100000,
      estimatedValueRaw: "100 000 PLN",
      wadiumPln: 5000,
      wadiumRaw: "5000",
      referenceRequirement: null,
      qualificationHints: [],
      implementationDeadlineRaw: null,
      implementationDays: null,
      technicalRequirements: [],
      tableExtracts: [],
      costLines: [],
      parsedAt: FIXED_AT,
      source: "html",
      profitabilityHint: "unknown",
      profitabilityNote: "",
      awardCriteria: [{ name: "Cena", weightPct: 60, maxPoints: null, description: "" }],
    },
  });
}

function assess(item, extra = {}) {
  return buildTenderTrustAssessment({ item, computedAt: FIXED_AT, ...extra });
}

console.log("\n=== NG-01-UX-HF-001 — Trust UI Surface Policy ===\n");

console.log("1. getTrustChipLimit");
ok("hub wide", getTrustChipLimit("hub", "wide") === 3);
ok("hub compact", getTrustChipLimit("hub", "compact") === 2);
ok("resolveTrustViewport compact", resolveTrustViewport(true) === "compact");
ok("resolveTrustViewport wide", resolveTrustViewport(false) === "wide");

const trustedAssess = assess(trustedItem());
ok("T1 hub trusted banner off", shouldRenderHubTrustBanner(trustedAssess) === false);

const blockedAssess = assess(baseItem({ documentsFetchedAt: FIXED_AT, bzpDocuments: [] }));
ok("T1 hub blocked banner on", shouldRenderHubTrustBanner(blockedAssess) === true);

console.log("\n2. pickDimensionsForSurfaceDisplay");
const hubSlice = pickDimensionsForSurfaceDisplay(blockedAssess, "hub", "wide");
ok("T2 wide limit 3 visible max", hubSlice.visible.length <= 3);
const hubCompact = pickDimensionsForSurfaceDisplay(blockedAssess, "hub", "compact");
ok("T3 compact limit 2 visible max", hubCompact.visible.length <= 2);
ok("T3 overflow count", hubCompact.hiddenCount >= 0);

const dims = blockedAssess.dimensions;
const sliced = sliceTrustDimensionsForDisplay(dims, getTrustChipLimit("hub", "compact"));
ok("slice hiddenCount", sliced.hiddenCount === Math.max(0, sliced.hidden.length));

console.log("\n3. buildProcessStripStagePresentation");
const trustPartial = buildProcessStripStagePresentation(
  { label: "Kosztorys", hint: "hint", status: "done" },
  "partial",
  "Brak pełnego ATH",
);
ok("T4 trust partial → trust icon", trustPartial.iconKind === "trust");
ok("T4 trust icon glyph", trustPartial.trustIcon === "!");

const trustOk = buildProcessStripStagePresentation(
  { label: "Dokumenty", status: "done" },
  "trusted",
  null,
);
ok("T5 trusted → workflow icon", trustOk.iconKind === "workflow");

console.log("\n4. Surface badges / hints");
ok("T6 documents badge trusted null", pickDocumentsTrustBadge(trustedAssess) === null);
ok("T6 documents badge blocked", pickDocumentsTrustBadge(blockedAssess) != null);
ok("T7 kosztorys hint trusted null", pickKosztorysInlineHint(trustedAssess) === null);

const pricingMsg = pickPricingBlockedMessage(blockedAssess, null);
ok("T8 pricing message string", typeof pricingMsg === "string" && pricingMsg.length > 0);
ok("T8 proposal warning priority", pickPricingBlockedMessage(blockedAssess, "Warn z kalkulatora") === "Warn z kalkulatora");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
