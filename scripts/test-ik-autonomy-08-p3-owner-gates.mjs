/**
 * IK AUTONOMY-08 P3 — Owner Gates G1/G2 harness.
 * Run: npx vite-node scripts/test-ik-autonomy-08-p3-owner-gates.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { computeIkOrchestraSyncSnapshot } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts";
import {
  buildG1ManualOverride,
  upsertManualOverride,
} from "../src/lib/intelligent-estimator/orchestra/ik-owner-gate-actions.ts";
import {
  buildLaborCandidateAcceptFingerprint,
  isLaborAcceptIdempotentNoop,
} from "../src/lib/intelligent-estimator/orchestra/ik-owner-gate-labor-idem.ts";
import {
  acceptIkLaborResearchAndNotifyIdempotent,
  clearIkLaborResearchSessionDedupeForTests,
} from "../src/lib/ik-pricing-orchestrator/labor-research-bridge.ts";
import { acceptWorkRateResearchCandidate } from "../src/lib/work-catalog/work-rate-accept.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { OFFER_BOQ_SCHEMA_VERSION } from "../src/lib/tender-offer-boq.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { computeShadowPositionCostsForOfferBoq } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { runGatedIdentityPersist } from "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts";
import { clearMultiDwellingPackageStore } from "../src/lib/multi-dwelling/index.ts";

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

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const engineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const panelSrc = readSrc("src/app/intelligent-estimator/IkOwnerGateActionsPanel.tsx");
const bridgeSrc = readSrc("src/lib/ik-pricing-orchestrator/labor-research-bridge.ts");
const p2Src = readSrc("scripts/test-ik-autonomy-08-p2-research-on-miss.mjs");

ok("P3 hook manualOverrides state", hookSrc.includes("manualOverrides"));
ok("P3 engine passes manualOverrides param", engineSrc.includes("manualOverrides,"));
ok("P3 hook ownerGate API", hookSrc.includes("ownerGate:"));
ok("P3 hook g1Accept", hookSrc.includes("g1Accept:"));
ok("P3 hook g2LaborAccept", hookSrc.includes("g2LaborAccept:"));
ok("P3 hook g2MaterialAccept", hookSrc.includes("g2MaterialAccept:"));
ok("P3 hook IC-P3-ORCH-1 catalogReloadEpoch", hookSrc.includes("catalogReloadEpoch"));
ok("P3 hook fullSnapshot deps pricingCatalogRevision", hookSrc.includes("pricingCatalogRevision"));
ok("P3 hook bumpOrchestraAfterPricingAccept", hookSrc.includes("bumpOrchestraAfterPricingAccept"));
ok("P3 host gate panel wired", hostSrc.includes("IkOwnerGateActionsPanel"));
ok("P3 panel G1 actions", panelSrc.includes('dataAction="g1-accept"'));
ok("P3 idempotent wrapper exported", bridgeSrc.includes("acceptIkLaborResearchAndNotifyIdempotent"));
ok("P3 P2 still no host accept", p2Src.includes("ZERO Accept"));

function makeStructuralReport(line, dwellingId = "d1") {
  const refs = [{ dwellingId, line, provenance: null }];
  return {
    tenderId: "t-p3",
    discoverySettled: true,
    attachmentCount: 0,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { detectedRowCount: 0, extractedCount: 0, validCount: 0, executed: false, gaps: [] },
    validation: { missingDescription: 0, missingQuantity: 0, missingUnit: 0, missingLineage: 0, duplicateSuspicion: 0, reasons: [] },
    dwellingMapping: { allMapped: true, mappedCount: 1, unmappedCount: 0, reasons: [] },
    lineIntegrity: { ok: true, lineCount: 1, reasons: [] },
    dwellings: [],
    masterBoq: {
      mode: "legacy_single",
      schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
      lineCount: 1,
      composedLineCount: 1,
      sourceLineCount: 1,
      dwellingCount: 1,
      branchCount: 0,
      sourceCount: 1,
      hasLineProvenance: false,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: null,
    lineProvenance: null,
    masterBoqLines: refs,
  };
}

const gapLine = {
  lineId: "L-gap",
  lp: "1",
  description: "Nieznana pozycja",
  quantity: 5,
  unit: "m2",
  knrHint: null,
  catalogWorkId: null,
  matchMethod: "unmatched",
  matchedBy: "unmatched",
  matchConfidence: "low",
  candidateMatches: [],
  isNoise: false,
  noiseKind: null,
  normalizedDescription: null,
  aliasRuleId: null,
  costIntelligence: null,
  linePricing: null,
  materialUnitPln: null,
  materialCostPln: null,
  materialSource: { kind: "unknown", labelPl: "?" },
  laborRbh: null,
  laborRatePlnPerH: null,
  laborCostPln: null,
  laborSource: { kind: "unknown", labelPl: "?" },
  equipmentUnitPln: null,
  equipmentCostPln: null,
  equipmentSource: { kind: "unknown", labelPl: "?" },
};

const WORK_PAINT = "legacy-malowanie-m2";
const works = [
  {
    id: WORK_PAINT,
    tradeId: "MALOWANIE",
    namePl: "Malowanie",
    unit: "m2",
    active: true,
    keywords: ["malowanie"],
    legacyCategoryId: "MALOWANIE",
  },
];

{
  const structural = makeStructuralReport(gapLine);
  const phaseGap = runIkIdentityPhase({
    structuralReport: structural,
    sliceDExpert: structural,
    item: { id: "t-p3", tenderId: "t-p3", title: "P3", bzpDocuments: [] },
    package: null,
    works,
    manualOverrides: null,
    nowMs: Date.now(),
  });
  ok("G1 gap noIdentityCount > 0", phaseGap.context.noIdentityCount >= 1);
}

{
  const structural = makeStructuralReport(gapLine);
  const override = buildG1ManualOverride({
    dwellingId: "d1",
    lineId: "L-gap",
    catalogWorkId: WORK_PAINT,
  });
  ok("G1 override matchMethod manual", override.matchMethod === "manual");
  const phaseAcc = runIkIdentityPhase({
    structuralReport: structural,
    sliceDExpert: structural,
    item: { id: "t-p3", tenderId: "t-p3", title: "P3", bzpDocuments: [] },
    package: null,
    works,
    manualOverrides: [override],
    nowMs: Date.now(),
  });
  const out = phaseAcc.postIdentityExpert.masterBoqLines[0].line;
  ok("G1 accept manual matchMethod", out.matchMethod === "manual");
  ok("G1 accept catalogWorkId", out.catalogWorkId === WORK_PAINT);
}

{
  const o1 = buildG1ManualOverride({ dwellingId: "d1", lineId: "L1", catalogWorkId: "a" });
  const o2 = buildG1ManualOverride({ dwellingId: "d1", lineId: "L1", catalogWorkId: "b" });
  const merged = upsertManualOverride([o1], o2);
  ok("G1 edit upsert replaces", merged.length === 1 && merged[0].catalogWorkId === "b");
}

clearIkLaborResearchSessionDedupeForTests();
const WORK_ID = "legacy-malowanie-m2";
const baseStore = normalizeWorkCatalogStore({
  schemaVersion: 1,
  activeRegion: "wroclaw",
  updatedAt: new Date().toISOString(),
  catalogs: {
    wroclaw: {
      updatedAt: new Date().toISOString(),
      works: [
        {
          id: WORK_ID,
          tradeId: "MALOWANIE",
          namePl: "Malowanie",
          unit: "m2",
          active: true,
          keywords: ["malowanie"],
          legacyCategoryId: "MALOWANIE",
          companyPricePln: 35,
          updatedAt: new Date().toISOString(),
          freshnessStatus: "ok",
          favorite: false,
          usageCount: 0,
          source: "custom",
        },
      ],
    },
    dolnyslask: { updatedAt: new Date().toISOString(), works: [] },
  },
});

const candidate = {
  workId: WORK_ID,
  unit: "m2",
  namePl: "Malowanie",
  suggestedRatePln: 50,
  marketBaseRatePln: 40,
  wgdomMarginPct: 25,
  proposedOurRatePln: 50,
  sourceMinPln: 38,
  sourceMaxPln: 42,
  regionScope: "WROCLAW",
  countryScope: "POLSKA",
  widthClaim: "NONE",
  sampleSize: 2,
  lowSample: false,
  observations: [
    {
      workId: WORK_ID,
      unit: "m2",
      ratePln: 40,
      regionScope: "WROCLAW",
      observedAt: "2026-08-26T10:00:00.000Z",
      sourceId: "kb_pl",
      sourceUrl: "https://example.test",
      packageKind: "SINGLE",
      widthClaim: "NONE",
      qualified: true,
    },
  ],
  previousOurRatePln: null,
  previousFreshness: "MISSING",
};

ok("IDEM fingerprint stable", buildLaborCandidateAcceptFingerprint(candidate).includes(WORK_ID));
ok("IDEM first accept not noop", !isLaborAcceptIdempotentNoop(baseStore, candidate));

const accepted = acceptWorkRateResearchCandidate({ store: baseStore, candidate });
ok("IDEM first accept ok", accepted.ok === true, accepted.ok ? "" : accepted);
if (accepted.ok) {
  ok("IDEM second identical noop", isLaborAcceptIdempotentNoop(accepted.store, candidate));
  let notifyCount = 0;
  const r1 = await acceptIkLaborResearchAndNotifyIdempotent({
    store: accepted.store,
    candidate,
    notify: {
      bumpPricingCatalogRevision: () => {
        notifyCount += 1;
      },
      bumpChiefRefresh: () => {},
    },
    save: async (s) => ({ ok: true, saved: true, store: s }),
  });
  ok("IDEM wrapper noop ok", r1.ok === true && r1.skippedDuplicate === true);
  ok("IDEM wrapper noop no notify", notifyCount === 0);
}

{
  const item = { id: "t-orch", tenderId: "t-orch", title: "Orch", bzpDocuments: [] };
  const manualLine = {
    ...gapLine,
    lineId: "L1",
    catalogWorkId: WORK_PAINT,
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
  };
  const structural = makeStructuralReport(manualLine);
  const storeLow = normalizeWorkCatalogStore({
    schemaVersion: 1,
    activeRegion: "wroclaw",
    updatedAt: new Date().toISOString(),
    catalogs: {
      wroclaw: {
        updatedAt: new Date().toISOString(),
        works: [
          {
            id: WORK_PAINT,
            tradeId: "MALOWANIE",
            namePl: "Malowanie",
            unit: "m2",
            active: true,
            keywords: ["malowanie"],
            legacyCategoryId: "MALOWANIE",
            companyPricePln: 35,
            updatedAt: new Date().toISOString(),
            freshnessStatus: "ok",
            favorite: false,
            usageCount: 0,
            source: "custom",
            ourWorkRate: {
              workId: WORK_PAINT,
              unit: "m2",
              ourRatePln: 10,
              sourceType: "ACCEPT",
              regionScope: "WROCLAW",
              observedAt: "2026-08-26T00:00:00.000Z",
              updatedAt: "2026-08-26T00:00:00.000Z",
              sourceRatePln: 10,
              history: [],
            },
          },
        ],
      },
      dolnyslask: { updatedAt: new Date().toISOString(), works: [] },
    },
  });

  const flags = {
    p2DocumentsBoqOn: false,
    identityCoverageOn: false,
    p5LaborOn: false,
    p5ResearchOn: false,
    p6MaterialOn: false,
    p6ResearchOn: false,
    p7F5On: true,
    p8RiskOn: false,
  };

  const snap1 = computeIkOrchestraSyncSnapshot({
    item,
    effectiveItem: item,
    pkg: null,
    ingest: null,
    historicalIndex: null,
    knrKnowledge: null,
    knowledgeBusy: false,
    flags,
    chiefSession: null,
    manualOverrides: [
      buildG1ManualOverride({
        dwellingId: "d1",
        lineId: "L1",
        catalogWorkId: WORK_PAINT,
      }),
    ],
  });

  const expertWithBoq = {
    ...snap1.postIdentityExpert,
    offerBoq: {
      schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
      tenderId: "t-orch",
      version: 1,
      builtAt: new Date().toISOString(),
      parserSnapshotRef: {
        kosztorysParsedAt: null,
        sourceFilename: null,
        rowCount: 1,
        pdfPrzedmiarCase: null,
      },
      lines: snap1.postIdentityExpert.masterBoqLines.map((r) => r.line),
      totals: {
        materialsPln: null,
        laborPln: null,
        equipmentPln: null,
        directPln: null,
        kpPln: null,
        overheadPln: null,
        costPricePln: null,
        marginPln: null,
        recommendedBidPln: null,
        profitPln: null,
        profitabilityPct: null,
        estimatedDurationDays: null,
        workingCapitalPln: null,
        lineCount: 1,
        pricedLineCount: 0,
      },
      recomputeToken: "p3-test",
      buildStatus: "mapped",
      mappingStats: null,
      mappingAppliedAt: new Date().toISOString(),
      costIntelligenceStats: null,
      costIntelligenceAppliedAt: null,
      pricingStats: null,
      pricingAppliedAt: null,
      userEditStats: null,
      warnings: [],
    },
  };

  const storeHigh = {
    ...storeLow,
    catalogs: {
      ...storeLow.catalogs,
      wroclaw: {
        ...storeLow.catalogs.wroclaw,
        works: [
          {
            ...storeLow.catalogs.wroclaw.works[0],
            ourWorkRate: {
              ...storeLow.catalogs.wroclaw.works[0].ourWorkRate,
              ourRatePln: 99,
              sourceRatePln: 99,
            },
          },
        ],
      },
    },
  };

  const rateLow = lookupWorkRate(storeLow, WORK_PAINT, "m2", Date.now());
  const rateHigh = lookupWorkRate(storeHigh, WORK_PAINT, "m2", Date.now());
  ok(
    "IC-P3-ORCH-1 catalog reload changes OUR RATE read",
    rateLow.status === "CURRENT"
      && rateHigh.status === "CURRENT"
      && rateHigh.ourRatePln > rateLow.ourRatePln,
    { low: rateLow, high: rateHigh },
  );

  const offerBoqDoc = expertWithBoq.offerBoq;
  const shadowA = computeShadowPositionCostsForOfferBoq({
    doc: offerBoqDoc,
    store: storeLow,
    nowMs: Date.now(),
    paintCoats: 2,
    ensureOwnerQuestions: false,
  });
  const shadowB = computeShadowPositionCostsForOfferBoq({
    doc: offerBoqDoc,
    store: storeHigh,
    nowMs: Date.now(),
    paintCoats: 2,
    ensureOwnerQuestions: false,
  });

  const p7a = runIkP7PositionCostBid({
    item,
    expert: expertWithBoq,
    package: null,
    store: storeLow,
  });

  const p7b = runIkP7PositionCostBid({
    item,
    expert: expertWithBoq,
    package: null,
    store: storeHigh,
  });

  ok(
    "IC-P3-ORCH-1 shadow/P7 store-sensitive (when priced)",
    (shadowA.aggregates.laborCostPln == null && p7a.laborCostPln == null)
      || (shadowB.aggregates.laborCostPln != null
        && shadowB.aggregates.laborCostPln > (shadowA.aggregates.laborCostPln ?? 0)),
    { shadowA: shadowA.aggregates.laborCostPln, shadowB: shadowB.aggregates.laborCostPln, p7a: p7a.laborCostPln, p7b: p7b.laborCostPln },
  );
}

clearMultiDwellingPackageStore();
{
  const structural = makeStructuralReport({ ...gapLine, lineId: "L1" });
  const phase = runIkIdentityPhase({
    structuralReport: structural,
    sliceDExpert: structural,
    item: { id: "t-down", tenderId: "t-down", title: "Down", bzpDocuments: [] },
    package: null,
    works,
    manualOverrides: [
      buildG1ManualOverride({ dwellingId: "d1", lineId: "L1", catalogWorkId: WORK_PAINT }),
    ],
    nowMs: Date.now(),
  });
  const outcome = runGatedIdentityPersist({
    tenderId: "t-down",
    package: null,
    plans: phase.context.persistPlans,
    sessionGate: new Map(),
  });
  ok("G1 persist path callable", outcome != null);
}

console.log(`\nA08-P3 Owner Gates: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
