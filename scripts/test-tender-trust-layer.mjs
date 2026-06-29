/**
 * NG-01.1 — Tender Trust Layer SSOT
 * npx vite-node scripts/test-tender-trust-layer.mjs
 */
import {
  buildTenderTrustAssessment,
  findTrustDimension,
  TENDER_TRUST_LAYER_VERSION,
} from "../src/lib/tender-trust-layer.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import {
  trustLevelToIcon,
  trustLevelToTone,
  trustLevelShortLabelPl,
  trustLevelToStripStatus,
  getTrustDimensionsForSurface,
  trustDimensionToV4Tab,
  trustStageOverlayLevel,
  shouldShowTrustBanner,
} from "../src/lib/tender-trust-ui.ts";

const FIXED_AT = "2026-06-29T12:00:00.000Z";

function baseItem(overrides = {}) {
  return {
    id: "item-trust-1",
    tenderId: "bzp-uuid-trust",
    noticeNumber: "2026/BZP 00999999",
    title: "Remont budynku test",
    bzpNumber: "2026/BZP 00999999",
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

function kosztorysSnapshot(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function dossier(overrides = {}) {
  return {
    brief: { fields: [], scopeDescription: "Test", builtAt: FIXED_AT },
    kosztorys: kosztorysSnapshot(),
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

function assess(item, extra = {}) {
  return buildTenderTrustAssessment({
    item,
    computedAt: FIXED_AT,
    ...extra,
  });
}

console.log("=== NG-01.1 TENDER TRUST LAYER ===\n");

// T1 — shape + version
{
  const a = assess(baseItem());
  ok("T1 trustVersion", a.trustVersion === TENDER_TRUST_LAYER_VERSION);
  ok("T1 computedAt", a.computedAt === FIXED_AT);
  ok("T1 six dimensions", a.dimensions.length === 6);
  ok("T1 overallLabelPl", typeof a.overallLabelPl === "string" && a.overallLabelPl.length > 5);
}

// T2 — no fetch yet → unknown (SSOT: not_fetched_yet)
{
  const a = assess(baseItem());
  const docs = findTrustDimension(a, "documents");
  ok("T2 documents unknown not fetched", docs?.level === "unknown");
  ok("T2 docs reason docs_not_fetched", docs?.reasons.some((r) => r.code === "docs_not_fetched"));
}

// T2b — fetched but platform empty → blocked
{
  const a = assess(baseItem({ documentsFetchedAt: FIXED_AT }));
  const docs = findTrustDimension(a, "documents");
  ok("T2b documents blocked empty", docs?.level === "blocked");
  ok("T2b docs platform empty", docs?.reasons.some((r) => r.code === "docs_platform_empty"));
}

// T3 — loading docs → unknown
{
  const a = assess(baseItem({ bzpDocuments: [mockDoc] }), { loadingDocs: true });
  const docs = findTrustDimension(a, "documents");
  ok("T3 documents unknown loading", docs?.level === "unknown");
  ok("T3 overall unknown or worse", a.overall === "unknown" || a.overall === "partial");
}

// T4 — docs found, parse pending
{
  const a = assess(baseItem({ bzpDocuments: [mockDoc], documentsFetchedAt: FIXED_AT }));
  const parse = findTrustDimension(a, "parse");
  const kosztorys = findTrustDimension(a, "kosztorys");
  ok("T4 documents trusted", findTrustDimension(a, "documents")?.level === "trusted");
  ok("T4 parse unknown pending", parse?.level === "unknown");
  ok("T4 kosztorys unknown", kosztorys?.level === "unknown");
}

// T5 — full trusted path
{
  const item = baseItem({
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
  const a = assess(item);
  ok("T5 overall trusted", a.overall === "trusted");
  ok("T5 kosztorys trusted", findTrustDimension(a, "kosztorys")?.level === "trusted");
  ok("T5 pricing trusted", findTrustDimension(a, "pricing")?.level === "trusted");
  ok("T5 metadata trusted", findTrustDimension(a, "metadata")?.level === "trusted");
  ok("T5 sync trusted", findTrustDimension(a, "sync")?.level === "trusted");
}

// T6 — PDF CASE 3 → blocked parse + kosztorys
{
  const item = baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: FIXED_AT,
    tenderDossier: dossier({
      kosztorys: null,
      scanSummary: {
        totalDocuments: 1,
        scanned: 1,
        parsed: 1,
        byType: { pdf: 1, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
        sevenZipCount: 0,
        kosztorysFound: false,
        valueFound: false,
        criteriaFound: false,
        estimateFound: false,
        costDiscovery: null,
        pdfPrzedmiarCase: 3,
        parsedAt: FIXED_AT,
      },
      parserVersion: CURRENT_PARSER_VERSION,
    }),
  });
  const a = assess(item);
  ok("T6 parse blocked ocr", findTrustDimension(a, "parse")?.level === "blocked");
  ok("T6 kosztorys blocked", findTrustDimension(a, "kosztorys")?.level === "blocked");
  ok("T6 overall blocked", a.overall === "blocked");
}

// T7 — FOUND_NO_VALUE → partial kosztorys + pricing
{
  const item = baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: FIXED_AT,
    tenderDossier: dossier({
      kosztorys: kosztorysSnapshot({ totalValue: undefined, rows: [], rowCount: 12 }),
      scanSummary: {
        totalDocuments: 1,
        scanned: 1,
        parsed: 1,
        byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 },
        sevenZipCount: 0,
        kosztorysFound: true,
        valueFound: false,
        criteriaFound: false,
        estimateFound: false,
        costDiscovery: { found: true, type: "ath", source: "k.ath", confidence: 0.8 },
        parsedAt: FIXED_AT,
      },
    }),
  });
  const a = assess(item);
  ok("T7 kosztorys partial", findTrustDimension(a, "kosztorys")?.level === "partial");
  ok("T7 pricing partial", findTrustDimension(a, "pricing")?.level === "partial");
}

// T8 — stale parser → sync partial
{
  const item = baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: FIXED_AT,
    tenderDossier: dossier({ parserVersion: 2 }),
  });
  const sync = findTrustDimension(assess(item), "sync");
  ok("T8 sync partial stale", sync?.level === "partial");
  ok("T8 sync_parser_stale", sync?.reasons.some((r) => r.code === "sync_parser_stale"));
}

// T9 — parse failed session
{
  const item = baseItem({ bzpDocuments: [mockDoc], documentsFetchedAt: FIXED_AT });
  const a = assess(item, {
    kosztorysSession: { dossierParseFailed: true, parseErrorMessage: "Timeout sieci" },
  });
  ok("T9 parse blocked failed", findTrustDimension(a, "parse")?.level === "blocked");
  ok("T9 overall blocked", a.overall === "blocked");
}

// T10 — row cap hint
{
  const rows = Array.from({ length: 500 }, (_, i) => ({
    lp: String(i + 1),
    description: "Poz",
    unit: "szt",
    quantity: "1",
    unitPrice: "10",
    total: "10",
  }));
  const item = baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: FIXED_AT,
    tenderDossier: dossier({
      kosztorys: kosztorysSnapshot({ rowCount: 500, rows }),
    }),
  });
  const kosztorys = findTrustDimension(assess(item), "kosztorys");
  ok("T10 row cap partial", kosztorys?.level === "partial");
  ok("T10 kosztorys_row_cap reason", kosztorys?.reasons.some((r) => r.code === "kosztorys_row_cap"));
}

// T11 — discovery retry (notice newer than docs fetch)
{
  const item = baseItem({
    bzpDocuments: [],
    documentsFetchedAt: "2026-06-01T10:00:00.000Z",
    noticeHtmlFetchedAt: "2026-06-29T10:00:00.000Z",
    noticeHtml: "x".repeat(120),
  });
  const sync = findTrustDimension(assess(item), "sync");
  ok("T11 sync partial discovery retry", sync?.level === "partial");
}

// T12 — findTrustDimension helper
{
  const a = assess(baseItem({ bzpDocuments: [mockDoc], documentsFetchedAt: FIXED_AT }));
  ok("T12 findTrustDimension parse", findTrustDimension(a, "parse")?.id === "parse");
  ok("T12 findTrustDimension missing", findTrustDimension(a, "nope") === undefined);
}

console.log("\n=== NG-01.2 TRUST UI HELPERS ===\n");

ok("UI trustLevelToIcon trusted", trustLevelToIcon("trusted") === "✓");
ok("UI trustLevelToIcon partial", trustLevelToIcon("partial") === "!");
ok("UI trustLevelToIcon blocked", trustLevelToIcon("blocked") === "×");
ok("UI trustLevelToIcon unknown", trustLevelToIcon("unknown") === "…");
ok("UI trustLevelToTone blocked", trustLevelToTone("blocked") === "error");
ok("UI strip partial", trustLevelToStripStatus("partial") === "partial");
ok("UI strip trusted done", trustLevelToStripStatus("trusted") === "done");
ok("UI dimension tab kosztorys", trustDimensionToV4Tab("kosztorys") === "kosztorys");
ok("UI dimension tab pricing", trustDimensionToV4Tab("pricing") === "ceny");
{
  const a = assess(baseItem({ bzpDocuments: [mockDoc], documentsFetchedAt: FIXED_AT }));
  ok("UI surface documents count", getTrustDimensionsForSurface(a, "documents").length === 3);
  ok("UI overlay parse unknown", trustStageOverlayLevel(a, "analysis") === "unknown");
  ok("UI short label partial", trustLevelShortLabelPl("partial") === "Niepełne");
  ok("UI shouldShow blocked", shouldShowTrustBanner(assess(baseItem({ documentsFetchedAt: FIXED_AT })), ["documents"]) === true);
}

console.log(`\nTENDER TRUST LAYER: ${fail === 0 ? "ALL PASS" : "FAILURES"} (${pass} pass, ${fail} fail)`);
if (fail > 0) process.exit(1);
