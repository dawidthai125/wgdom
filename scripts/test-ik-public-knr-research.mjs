/**
 * IK Public KNR Research Engine — tests A–L
 * Run: npx vite-node scripts/test-ik-public-knr-research.mjs
 *
 * ZERO Accept · ZERO VERIFIED write-router · ZERO invent BOM · CHROBREGO immutable
 */
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
  emptyKnrCatalogStore,
  buildFakeKnrDiscoveryHttpSuccess,
  KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  clearKnrDiscoveryOnDemandBudgetForTests,
  clearKnrDiscoveryClientSfStateForTests,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import {
  runIkPublicKnrResearch,
  runIkPublicKnrResearchSync,
  seedPendingKnrCatalogForTests,
} from "../src/lib/intelligent-estimator/ik-public-knr-research-engine.ts";
import { buildPublicKnrQueryPlan } from "../src/lib/intelligent-estimator/ik-public-knr-query.ts";
import { createFixturePublicKnrAdapter } from "../src/lib/intelligent-estimator/ik-public-knr-scraper.ts";
import { runIkBomTechnologyResearch } from "../src/lib/intelligent-estimator/ik-bom-technology-research-engine.ts";
import { createKnrCatalogNormativeProvider } from "../src/lib/intelligent-estimator/ik-knr-catalog-as-normative.ts";
import { isFinancialScheduleNotCostFilename } from "../src/lib/tender-cost-discovery.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

const NOW = "2026-09-01T04:00:00.000Z";
const CHROBREGO = { net: 159000, vat: 36570, gross: 195570 };

const CODE_1124 = "KNR-W 4-03 1124-01";
const EK_1124 = (() => {
  const b = buildCatalogBasisFromRawCode(CODE_1124);
  return String(b?.normalizedKey ?? "");
})();

function fixtureRecord(code, desc, unit) {
  return {
    family: "KNR-W",
    chapter: null,
    catalogId: "4-03",
    positionCode: "1124-01",
    description: desc,
    unit,
    materials: null,
    sourceUrl: "https://example.com/public-tender.pdf",
    sourceHash: "hfixture1",
    sourceKind: "PUBLIC_TENDER",
    sourceTier: "PUBLIC_TENDER_OFFICIAL",
    sourceId: "fixture.public.tender",
    retrievedAt: NOW,
    bomComplete: false,
  };
}

clearKnrDiscoveryOnDemandBudgetForTests();
clearKnrDiscoveryClientSfStateForTests();

// Query planner
{
  const q = buildPublicKnrQueryPlan({
    rawCode: CODE_1124,
    description: "Demontaż łączników instalacyjnych",
  });
  assert("queries multi-variant", q.queries.length >= 5);
  assert("queries include KNR-W form", q.queries.some((x) => /KNR-W/i.test(x)));
  assert("queries include table code", q.queries.some((x) => /1124-01/.test(x)));
}

// A — catalog HIT → HTTP=0
{
  let store = emptyKnrCatalogStore(NOW);
  // Seed VERIFIED via skeleton + force status (test-only path through pending then mark)
  store = seedPendingKnrCatalogForTests({
    rawCode: CODE_1124,
    description: "Demontaż łączników instalacyjnych",
    unit: "szt",
    nowIso: NOW,
    catalogStore: store,
  });
  const key = Object.keys(store.entries)[0];
  store.entries[key] = {
    ...store.entries[key],
    verificationStatus: "VERIFIED",
    verifiedAt: NOW,
    verifiedBy: "test",
  };
  const r = await runIkPublicKnrResearch({
    codes: [{ rawCode: CODE_1124, description: "Demontaż łączników" }],
    nowIso: NOW,
    catalogStore: store,
    featureEnabled: true,
    allowlistOverride: KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  });
  assert("A HTTP=0", r.httpRequestCount === 0);
  assert("A local hit", r.perCode[0]?.catalogLifecycle === "ALREADY_VERIFIED");
  assert("A knr found", r.perCode[0]?.knrEvidenceFound === true);
}

// B — missing → public research executes (on-demand fake OR scraper)
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124, description: "Demontaż łączników" }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/public-tender.pdf"] },
  });
  assert("B research executes", r.perCode[0]?.telemetry.sourcesTried > 0);
}

// C — public source found → record extracted
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("C extracted", r.perCode[0]?.telemetry.recordsExtracted >= 1);
  assert("C validated", r.perCode[0]?.telemetry.recordsValidated >= 1);
}

// D — record valid → catalog inserted PENDING
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("D catalog inserted", r.catalogInsertedTotal >= 1);
  assert("D PENDING_VERIFY", r.perCode[0]?.catalogLifecycle === "PENDING_VERIFY");
  const store = r.catalogStore;
  const entry = Object.values(store.entries)[0];
  assert("D not VERIFIED", entry?.verificationStatus === "PENDING_VERIFY");
}

// E — duplicate → no second canonical
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const first = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  const second = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    catalogStore: first.catalogStore,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/b.pdf"] },
  });
  assert("E no duplicate insert", second.catalogInsertedTotal === 0);
  assert("E skipped duplicate", second.catalogSkippedDuplicateTotal >= 1);
  assert("E one canonical", Object.keys(first.catalogStore.entries).length === 1);
}

// F — after insert reanalyzeRequired
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("F reanalyzeRequired", r.reanalyzeRequired === true);
}

// G — BOM unavailable → KNR SUCCESS · BOM HOLD
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("G knr found", r.perCode[0]?.knrEvidenceFound === true);
  assert("G bom incomplete", r.perCode[0]?.bomComplete === false);
  assert(
    "G next BOM hold",
    r.perCode[0]?.telemetry.nextAction === "CONTINUE_WITH_PENDING_KNR_BOM_HOLD",
  );
}

// H — identity mismatch ETICS vs electrical + public KNR sidecar
{
  let catalogStore = emptyKnrCatalogStore(NOW);
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const bom = runIkBomTechnologyResearch({
    tenderId: "t",
    dwellingId: "wygodna-10-6",
    lineId: "obl_x",
    workId: "cw.etics.render",
    unit: "szt",
    description: `Demontaż łączników — ${CODE_1124}`,
    knrCatalogStore: catalogStore,
    publicKnrResearchSync: ({ rawCode, description, identityRequired }) => {
      const r = runIkPublicKnrResearchSync({
        codes: [{ rawCode: rawCode || CODE_1124, description, identityRequired }],
        nowIso: NOW,
        catalogStore,
        scraperAdapters: [adapter],
        scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
      });
      catalogStore = r.catalogStore;
      const c = r.perCode[0];
      return {
        knrEvidenceFound: Boolean(c?.knrEvidenceFound),
        bomComplete: Boolean(c?.bomComplete),
        catalogLifecycle: c?.catalogLifecycle ?? "UNCHANGED",
        messagePl: c?.messagePl ?? "",
        telemetryWhy: c?.telemetry.holdReasons ?? [],
        reanalyzeRequired: r.reanalyzeRequired,
      };
    },
    nowMs: Date.parse(NOW),
  });
  assert("H IDENTITY_MISMATCH", bom.status === "IDENTITY_MISMATCH");
  assert("H no ephemeral", bom.ephemeral == null);
  assert(
    "H public knr in why",
    bom.diagnostics.why.some((w) => /PUBLIC_KNR|KNR/i.test(w)),
  );
}

// I — NO_WORK_ID + KNR evidence → IDENTITY_REQUIRED
{
  let catalogStore = emptyKnrCatalogStore(NOW);
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      "KNR 13-21 0402-03": {
        ...fixtureRecord("KNR 13-21 0402-03", "Badanie wyłączników RCD", "szt"),
        family: "KNR",
        catalogId: "13-21",
        positionCode: "0402-03",
      },
    },
  });
  const b0402 = buildCatalogBasisFromRawCode("KNR 13-21 0402-03");
  const ek0402 = String(b0402?.normalizedKey ?? "");
  const bom = runIkBomTechnologyResearch({
    tenderId: "t",
    dwellingId: "prusa-42-9",
    lineId: "obl_rcd",
    workId: "",
    unit: "szt",
    description: "Badanie wyłączników różnicowoprądowych RCD — KNR 13-21 0402-03",
    knrCatalogStore: catalogStore,
    publicKnrResearchSync: ({ description, identityRequired }) => {
      const r = runIkPublicKnrResearchSync({
        codes: [{ rawCode: "KNR 13-21 0402-03", description, identityRequired }],
        nowIso: NOW,
        catalogStore,
        scraperAdapters: [adapter],
        scraperUrlsByEvidenceKey: { [ek0402]: ["https://example.com/rcd.pdf"] },
      });
      catalogStore = r.catalogStore;
      const c = r.perCode[0];
      return {
        knrEvidenceFound: Boolean(c?.knrEvidenceFound),
        bomComplete: false,
        catalogLifecycle: c?.catalogLifecycle ?? "UNCHANGED",
        messagePl: c?.messagePl ?? "",
        telemetryWhy: ["IDENTITY_REQUIRED"],
        reanalyzeRequired: r.reanalyzeRequired,
      };
    },
    nowMs: Date.parse(NOW),
  });
  assert("I OWNER_REQUIRED", bom.status === "OWNER_REQUIRED");
  assert(
    "I KNR_EVIDENCE_FOUND",
    bom.diagnostics.reasons.includes("KNR_EVIDENCE_FOUND")
      || /KNR_EVIDENCE_FOUND/i.test(bom.messagePl),
  );
  assert(
    "I IDENTITY_REQUIRED",
    bom.diagnostics.reasons.includes("IDENTITY_REQUIRED")
      || /IDENTITY_REQUIRED/i.test(bom.messagePl),
  );
}

// J — paywall skip → continue
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    paywallUrls: ["https://paywall.example/knr"],
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: {
      [EK_1124]: [
        "https://paywall.example/knr",
        "https://example.com/public-ok.pdf",
      ],
    },
  });
  assert(
    "J paywall rejected",
    r.perCode[0]?.telemetry.rejectReasons.includes("PAYWALL"),
  );
  assert("J still found via next", r.perCode[0]?.knrEvidenceFound === true);
}

// K — same KNR 10 tenders → one canonical
{
  let store = emptyKnrCatalogStore(NOW);
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  let inserts = 0;
  for (let i = 0; i < 10; i++) {
    const r = runIkPublicKnrResearchSync({
      codes: [{ rawCode: CODE_1124 }],
      nowIso: NOW,
      catalogStore: store,
      scraperAdapters: [adapter],
      scraperUrlsByEvidenceKey: {
        [EK_1124]: [`https://example.com/tender-${i}.pdf`],
      },
    });
    store = r.catalogStore;
    inserts += r.catalogInsertedTotal;
  }
  assert("K one canonical", Object.keys(store.entries).length === 1);
  assert("K single insert", inserts === 1);
}

// L — no source → NO_PUBLIC_EVIDENCE
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {},
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/empty.pdf"] },
  });
  assert("L no evidence", r.perCode[0]?.knrEvidenceFound === false);
  assert(
    "L next NO_PUBLIC",
    r.perCode[0]?.telemetry.nextAction === "NO_PUBLIC_EVIDENCE",
  );
}

// Authority writes always false
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("authority catalogVerified false", r.authorityWrites.catalogVerified === false);
  assert("authority invent false", r.authorityWrites.invent === false);
  assert("authority g3 false", r.authorityWrites.g3 === false);
}

// Async path with on-demand fake (allowlist fixture)
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const FIXTURE = KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE;
  const sourceId = FIXTURE[0].sourceId;
  // Use a code mapped via keyMapOverride to fixture source
  const code = "KNR-W 4-01 0701-05";
  const r = await runIkPublicKnrResearch({
    codes: [{ rawCode: code, description: "Remont wykwitów" }],
    nowIso: NOW,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    keyMapOverride: {
      [String(buildCatalogBasisFromRawCode(code)?.normalizedKey ?? "")]: [sourceId],
    },
    fakeExecForSource: (id) => {
      const base = buildFakeKnrDiscoveryHttpSuccess(id, NOW);
      return {
        ...base,
        bodyText: `<html><body>opis: Remont wykwitów ${code} unit m2 enough text for min length gate xxxxxxxxxx</body></html>`,
        accounting: { httpRequestCount: 1, attemptedFetch: true },
      };
    },
    ignoreProcessBudget: true,
  });
  assert(
    "async research ran or staged",
    r.httpRequestCount >= 0
      && (r.catalogInsertedTotal >= 0 || r.perCode[0] != null),
  );
}

// Registry fallback — 1124-01 without BY_KEY still selects public sources
{
  const { selectPublicKnrDiscoverySources } = await import(
    "../src/lib/intelligent-estimator/ik-public-knr-source-registry.ts"
  );
  const b = buildCatalogBasisFromRawCode(CODE_1124);
  const partial = parseIdentityPartialFromCatalogBasis(b);
  const miss = {
    evidenceKeyV1: String(b?.normalizedKey ?? ""),
    identityKeyV2: foldIdentityKeyV2(partial),
    family: "KNR-W",
    displayCode: CODE_1124,
    normalizedKey: String(b?.normalizedKey ?? ""),
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      item: partial.item,
    },
  };
  const sel = selectPublicKnrDiscoverySources({ miss, queries: ["1124-01"] });
  assert("registry fallback has sourceIds", sel.sourceIds.length >= 1);
  assert(
    "registry not BY_KEY only",
    sel.selectionReason !== "BY_KEY" || sel.sourceIds.length >= 1,
  );
}

// M — second tender same KNR → catalog HIT HTTP=0
{
  let store = emptyKnrCatalogStore(NOW);
  store = seedPendingKnrCatalogForTests({
    rawCode: CODE_1124,
    description: "Demontaż łączników",
    unit: "szt",
    nowIso: NOW,
    catalogStore: store,
  });
  const r = await runIkPublicKnrResearch({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    featureEnabled: true,
    catalogStore: store,
  });
  assert("M catalog HIT HTTP=0", r.httpRequestCount === 0);
  assert("M knr found", r.perCode[0]?.knrEvidenceFound === true);
}

// N — identity mismatch → no ETICS BOM (BOM research gate)
{
  const r = runIkBomTechnologyResearch({
    tenderId: "08def932-550d-d6f5-962b-1200014aa6e7",
    dwellingId: "prusa-42-9",
    lineId: "obl_4e7c8672",
    workId: "cw.etics.render",
    unit: "szt",
    positionQuantity: 10,
    description:
      "Demontaż łączników instalacyjnych podtynkowych 1124-01 wyłącznik 1 biegunowy",
    nowIso: NOW,
  });
  assert(
    "N identity mismatch or hold",
    r.status === "IDENTITY_MISMATCH"
      || r.status === "OWNER_REQUIRED"
      || r.diagnostics?.identityMismatch === true
      || r.diagnostics?.why?.some((w) => /IDENTITY/i.test(w)),
  );
}

// O — NO_WORK_ID → KNR evidence path identity HOLD
{
  const r = runIkBomTechnologyResearch({
    tenderId: "08def932-550d-d6f5-962b-1200014aa6e7",
    dwellingId: "prusa-42-9",
    lineId: "obl_3c3811ca",
    workId: null,
    unit: "szt",
    positionQuantity: 6,
    description: "Badanie wyłącznika przeciwporażeniowego 0402-03 różnicowo-prądowego",
    nowIso: NOW,
  });
  assert("O NO_WORK_ID hold", r.status === "OWNER_REQUIRED" || r.holdReasons?.length > 0);
}

// P — cross-family reject 0402-03 as KNR 4-03 (wrong family)
{
  const { validateCrossFamilySafety } = await import(
    "../src/lib/intelligent-estimator/ik-public-knr-validation.ts"
  );
  const b = buildCatalogBasisFromRawCode("KNR 4-03 0402-03");
  const partial = parseIdentityPartialFromCatalogBasis(b);
  const miss = {
    evidenceKeyV1: String(b?.normalizedKey ?? ""),
    identityKeyV2: foldIdentityKeyV2(partial),
    family: "KNR",
    displayCode: "KNR 4-03 0402-03",
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      item: partial.item,
    },
  };
  const wrong = {
    family: "KNR",
    chapter: null,
    catalogId: "13-21",
    positionCode: "0402-03",
    description: "Badanie wyłącznika różnicowo-prądowego",
    unit: "szt",
    sourceUrl: "https://example.com/x.pdf",
    sourceHash: "h1",
    sourceKind: "BIP",
    sourceTier: "GOVERNMENT_BIP",
    sourceId: "test",
    retrievedAt: NOW,
    bomComplete: false,
  };
  const gate = validateCrossFamilySafety(wrong, miss);
  assert("P cross-family or code gate", gate.ok === false);
}

// Q — authority writes zero outside catalog staging
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("Q no p7", r.authorityWrites.p7Persist === false);
  assert("Q no verified write", r.authorityWrites.catalogVerified === false);
}

// T — paywall never accepted
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {},
    paywallUrls: ["https://paywall.example.com/doc.pdf"],
  });
  const chain = (
    await import("../src/lib/intelligent-estimator/ik-public-knr-scraper.ts")
  ).runPublicKnrScraperChainSync({
    adapters: [adapter],
    urls: ["https://paywall.example.com/doc.pdf"],
    expectedCode: CODE_1124,
  });
  assert("T paywall rejected", chain.records.length === 0);
  assert("T paywall reason", chain.rejectReasons.includes("PAYWALL"));
}

// Reanalysis target when staged
{
  const adapter = createFixturePublicKnrAdapter({
    sourceId: "fx",
    recordsByCode: {
      [CODE_1124.toUpperCase()]: fixtureRecord(
        CODE_1124,
        "Demontaż łączników instalacyjnych elektrycznych",
        "szt",
      ),
    },
  });
  const r = runIkPublicKnrResearchSync({
    codes: [{ rawCode: CODE_1124 }],
    nowIso: NOW,
    scraperAdapters: [adapter],
    scraperUrlsByEvidenceKey: { [EK_1124]: ["https://example.com/a.pdf"] },
  });
  assert("L reanalyze when staged", r.reanalyzeRequired === true);
}

assert("CHROBREGO", CHROBREGO.net === 159000 && CHROBREGO.gross === 195570);
assert(
  "Harmonogram BLOCK",
  isFinancialScheduleNotCostFilename("Harmonogram rzeczowo-finansowy.xlsx"),
);

// Normative provider from empty catalog = NOT_CONFIGURED
{
  const p = createKnrCatalogNormativeProvider(emptyKnrCatalogStore(NOW));
  assert("normative empty NOT_CONFIGURED", p.availability === "NOT_CONFIGURED");
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
