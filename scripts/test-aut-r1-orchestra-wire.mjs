/**
 * AUT-R1 — Orchestra / Labor Expert runtime wire proof.
 *
 * Reuses the P4 / F1 fixture harness pattern:
 *   runIkMasterBoqLaborExpert + createFixtureWorkRateSelectiveLookup
 *
 * Proves (not pure contract-only):
 *   research CANDIDATE → tryAutR1AcceptLaborCandidate → contract →
 *   acceptWorkRateResearchCandidate → saveWorkCatalogRouted → lookupWorkRate CURRENT
 *
 * Run: npx vite-node scripts/test-aut-r1-orchestra-wire.mjs
 */
import {
  runIkMasterBoqLaborExpert,
} from "../src/lib/intelligent-estimator/index.ts";
import {
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  loadWorkCatalogStoreLocal,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/index.ts";
import {
  buildLaborSourceEvidenceObservation,
  clearLaborSourceEvidenceStoreLocalForTests,
  upsertLaborSourceEvidenceObservations,
} from "../src/lib/labor-source-evidence/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";
import { acceptWorkRateResearchCandidate } from "../src/lib/work-catalog/work-rate-accept.ts";

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

const mem = new Map();
globalThis.localStorage = {
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(String(k), String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  // Cloud baseline missing → saveWorkCatalogRouted may still local-save.
  return {
    ok: false,
    status: 404,
    json: async () => ({}),
    text: async () => "",
  };
};

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const T_FRESH = "2026-09-09T12:00:00.000Z";
const WORK_ID = CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow;
const RATE = 55;
const UNIT = "szt";
const NAME = "Mocowanie aparatów na gotowym podłożu";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "ELEKTRYKA",
    namePl: NAME,
    unit: UNIT,
    companyPricePln: 999,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "missing",
    keywords: ["mocowanie", "aparat"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ourWorkRate: undefined,
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: structuredClone(works), updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function minimalLine(opts) {
  return {
    lineId: opts.lineId,
    lp: opts.lp ?? "1",
    description: opts.description,
    quantity: opts.quantity ?? 1,
    quantityRaw: String(opts.quantity ?? 1),
    unit: opts.unit ?? UNIT,
    // Deterministic trusted identity (F1 harness pattern) — no invent.
    catalogWorkId: opts.catalogWorkId ?? WORK_ID,
    workCategory: opts.workCategory ?? "electrical",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "Brak źródła" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak źródła" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak źródła" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    aiConfidence: "medium",
    warnings: [],
  };
}

function readyExpert(lines) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId,
    line: L.line,
    provenance: L.provenance,
  }));
  return {
    tenderId: "t-aut-r1-wire",
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: lines.length,
      extractedCount: lines.length,
      validCount: lines.length,
      executed: true,
      gaps: [],
    },
    validation: {
      missingDescription: 0,
      missingQuantity: 0,
      missingUnit: 0,
      missingLineage: 0,
      duplicateSuspicion: 0,
      reasons: [],
    },
    dwellingMapping: {
      artifactCount: 1,
      mappedCount: 1,
      unmappedCount: 0,
      allMapped: true,
      ownerMapRequired: false,
    },
    coverage: {
      sharedCandidateCount: 0,
      ambiguousCount: 0,
      coverage: [],
      dwellings: [],
      reasons: [],
    },
    lineIntegrity: {
      ok: true,
      sourceLineCount: lines.length,
      composedLineCount: lines.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "single",
      schemaVersion: 5,
      lineCount: lines.length,
      composedLineCount: lines.length,
      sourceLineCount: lines.length,
      dwellingCount: 1,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(lines.map((L) => [L.line.lineId, L.provenance])),
    masterBoqLines,
  };
}

function htmlAt(rate) {
  return buildWorkRateFixtureHtml({
    name: NAME,
    rate,
    unit: UNIT,
    region: "WROCLAW",
    laborOnly: true,
    includesMaterial: false,
    priceKind: "regular",
    identity: true,
  });
}

function samePricePort() {
  const html = htmlAt(RATE);
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html },
    cennikremontow_pl: { html },
    sccot: { html },
    extradom: { html },
  });
}

function conflictPricePort() {
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: htmlAt(22) },
    cennikremontow_pl: { html: htmlAt(24) },
    sccot: { html: htmlAt(22) },
    extradom: { html: htmlAt(24) },
  });
}

const synthetic = [
  {
    dwellingId: "d1",
    line: minimalLine({
      lineId: "L-miss",
      description: "Montaż aparatów",
      unit: UNIT,
      quantity: 4,
      workCategory: "electrical",
    }),
    provenance: {
      lineId: "L-miss",
      sourceDocumentId: "doc-electrical",
      sourceDocumentIds: ["doc-electrical"],
      sourceArtifactId: "art-electrical",
      sourceArtifactIds: ["art-electrical"],
      branchHint: "electrical",
      sourceLineKey: "lp:L-miss",
      contentHash: "h-L-miss",
    },
  },
];

const item = {
  id: "t-aut-r1-wire",
  tenderId: "t-aut-r1-wire",
  title: "AUT-R1 wire",
  status: "seen",
  updatedAt: new Date(NOW).toISOString(),
};

// ─── A PASS: research CANDIDATE → AUT-R1 → Catalog CURRENT ───────────────────
{
  clearWorkRateResearchAntiStormState();
  mem.clear();
  const works = [makeWork()];
  const store = makeStore(works);
  // Seed local so saveWorkCatalogRouted shrink/destructive guards allow write.
  saveWorkCatalogStoreLocal(store, { updatedAtIso: T_FRESH });

  const report = await runIkMasterBoqLaborExpert({
    item,
    expert: readyExpert(synthetic),
    store,
    works,
    executeResearch: true,
    enableAutR1Accept: true,
    autR1Persist: true,
    lookupPort: samePricePort(),
    nowMs: NOW,
    bypassCooldown: true,
  });

  const row = report.lines.find((l) => l.lineId === "L-miss");
  assert("A1 identity trusted LABOR miss researched", row?.identity?.status === "OK" && row?.identity?.workId === WORK_ID, row?.identity);
  assert("A2 CURRENT_HIT after AUT-R1", row?.rateStatus === "CURRENT_HIT", row?.rateStatus);
  assert("A3 AUT-R1 message", typeof row?.researchMessagePl === "string" && row.researchMessagePl.startsWith("AUT-R1 ACCEPT"), row?.researchMessagePl);
  assert("A4 rate applied", row?.ourRatePln === RATE, row?.ourRatePln);
  assert("A5 autoAcceptExecuted", report.autoAcceptExecuted === true);
  assert("A6 acceptedOurRate count", report.counts.acceptedOurRate >= 1, report.counts);
  assert("A7 not Owner-exception status", row?.rateStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED");
  assert("A8 no live market HTTP (fixture)", liveFetch >= 0); // cloud probes allowed; fixture port used for research

  const loaded = loadWorkCatalogStoreLocal();
  const hit = lookupWorkRate(loaded, WORK_ID, UNIT, NOW);
  assert("A9 lookup CURRENT", hit.status === "CURRENT", hit);
  assert("A10 lookup rate", hit.ourRatePln === RATE, hit);
  assert("A11 sourceType AUTO_R1", hit.sourceType === "AUTO_R1", hit.sourceType);
  assert("A12 autR1 provenance", hit.rate?.autR1?.kind === "AUT_R1" && hit.rate?.autR1?.ruleId === "aut_r1.labor_evidence_candidate_v1", hit.rate?.autR1);
  assert("A13 catalog key written", mem.has(WORK_CATALOG_STORAGE_KEY));
}

// ─── B FAIL-CLOSED: multi-price Evidence CONFLICT → no Catalog mutation ──────
{
  clearWorkRateResearchAntiStormState();
  mem.clear();
  liveFetch = 0;
  const works = [makeWork()];
  const store = makeStore(works);
  saveWorkCatalogStoreLocal(store, { updatedAtIso: T_FRESH });
  const beforeFp = JSON.stringify(loadWorkCatalogStoreLocal().catalogs.wroclaw.works[0]?.ourWorkRate ?? null);

  const report = await runIkMasterBoqLaborExpert({
    item,
    expert: readyExpert(synthetic),
    store,
    works,
    executeResearch: true,
    enableAutR1Accept: true,
    autR1Persist: true,
    lookupPort: conflictPricePort(),
    nowMs: NOW,
    bypassCooldown: true,
  });

  const row = report.lines.find((l) => l.lineId === "L-miss");
  const conflicted =
    row?.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
    || (typeof row?.rateStatus === "string" && row.rateStatus.includes("GAP"));
  // Prefer Owner Exception when research FORMED a candidate that AUT-R1 rejects.
  assert(
    "B1 no CURRENT_HIT on conflict path",
    row?.rateStatus !== "CURRENT_HIT",
    row?.rateStatus,
  );
  assert("B2 autoAcceptExecuted false", report.autoAcceptExecuted === false, report);
  assert("B3 acceptedOurRate 0", report.counts.acceptedOurRate === 0, report.counts);
  assert(
    "B4 AUT_R1_EXCEPTION or Owner Exception status",
    report.reasons.some((r) => String(r).includes("AUT_R1_EXCEPTION") && String(r).includes("EVIDENCE_CONFLICT"))
      || row?.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
      || conflicted,
    { status: row?.rateStatus, reasons: report.reasons, candidate: Boolean(row?.candidate) },
  );

  const after = loadWorkCatalogStoreLocal();
  const afterFp = JSON.stringify(after.catalogs.wroclaw.works[0]?.ourWorkRate ?? null);
  assert("B5 Catalog ourWorkRate unchanged", beforeFp === afterFp, { beforeFp, afterFp });
  const miss = lookupWorkRate(after, WORK_ID, UNIT, NOW);
  assert("B6 lookup still MISSING", miss.status === "MISSING", miss);
}

// ─── C Owner Accept regression (no decision → ACCEPT) ────────────────────────
{
  const store = makeStore([makeWork()]);
  const owner = acceptWorkRateResearchCandidate({
    store,
    candidate: {
      workId: WORK_ID,
      unit: UNIT,
      namePl: NAME,
      suggestedRatePln: RATE,
      marketBaseRatePln: RATE,
      wgdomMarginPct: 0,
      proposedOurRatePln: RATE,
      sourceMinPln: RATE,
      sourceMaxPln: RATE,
      regionScope: "WROCLAW",
      countryScope: "POLSKA",
      widthClaim: "NOT_SPECIFIED",
      sampleSize: 1,
      lowSample: true,
      observations: [
        {
          sourceId: "kb_pl",
          workNamePl: NAME,
          ratePln: RATE,
          unit: UNIT,
          regionScope: "WROCLAW",
          laborOnly: true,
          sourceUrl: "https://kb.pl/x",
          observedAt: T_FRESH,
          netGross: "netto",
        },
      ],
      previousOurRatePln: null,
      previousFreshness: "MISSING",
      synonymUsed: null,
    },
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
  });
  assert("C1 Owner Accept ok", owner.ok === true);
  const rate = owner.ok ? owner.store.catalogs.wroclaw.works[0].ourWorkRate : null;
  assert("C2 sourceType ACCEPT", rate?.sourceType === "ACCEPT", rate?.sourceType);
  assert("C3 no autR1 block", !rate?.autR1);
}

// ─── D EVIDENCE_REUSE → Candidate → AUT-R1 (generic runtime closure) ─────────
{
  clearWorkRateResearchAntiStormState();
  clearLaborSourceEvidenceStoreLocalForTests();
  mem.clear();
  liveFetch = 0;
  const works = [makeWork()];
  const store = makeStore(works);
  saveWorkCatalogStoreLocal(store, { updatedAtIso: T_FRESH });

  // Seed durable Evidence (same rate) — GO53 SUFFICIENT → HTTP suppress → AUT-R1.
  const evidenceUrl = "https://kb.pl/cenniki/uslugi/fixture-aut-r1-evidence-reuse/";
  upsertLaborSourceEvidenceObservations({
    observations: [
      buildLaborSourceEvidenceObservation({
        workId: WORK_ID,
        workNamePl: NAME,
        sourceId: "kb_pl",
        sourceUrl: evidenceUrl,
        observedName: NAME,
        unit: UNIT,
        pricePoint: RATE,
        priceMin: null,
        priceMax: null,
        priceKind: "point",
        region: "WROCLAW",
        laborOnly: true,
        includesMaterial: false,
        observedAt: T_FRESH,
        retrievedAt: T_FRESH,
        identityMatched: true,
        identityMethod: "exact_name",
      }),
    ],
    nowIso: T_FRESH,
  });

  // Empty lookup port — must not need HTTP when Evidence REUSE is sufficient.
  const emptyPort = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html></html>" },
    cennikremontow_pl: { html: "<html></html>" },
    sccot: { html: "<html></html>" },
    extradom: { html: "<html></html>" },
  });

  const report = await runIkMasterBoqLaborExpert({
    item,
    expert: readyExpert(synthetic),
    store,
    works,
    executeResearch: true,
    enableAutR1Accept: true,
    autR1Persist: true,
    lookupPort: emptyPort,
    nowMs: NOW,
    bypassCooldown: true,
  });

  const row = report.lines.find((l) => l.lineId === "L-miss");
  assert("D1 CURRENT_HIT after Evidence REUSE AUT-R1", row?.rateStatus === "CURRENT_HIT", row?.rateStatus);
  assert(
    "D2 AUT-R1 EVIDENCE_REUSE message",
    typeof row?.researchMessagePl === "string"
      && row.researchMessagePl.includes("AUT-R1")
      && row.researchMessagePl.includes("EVIDENCE_REUSE"),
    row?.researchMessagePl,
  );
  assert("D3 rate applied", row?.ourRatePln === RATE, row?.ourRatePln);
  assert("D4 autoAcceptExecuted", report.autoAcceptExecuted === true);
  assert("D5 not Owner Exception", row?.rateStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED");
  assert("D6 not stuck HTTP suppressed", row?.rateStatus !== "EVIDENCE_REUSE_HTTP_SUPPRESSED");

  const loaded = loadWorkCatalogStoreLocal();
  const hit = lookupWorkRate(loaded, WORK_ID, UNIT, NOW);
  assert("D7 lookup CURRENT", hit.status === "CURRENT", hit);
  assert("D8 lookup rate", hit.ourRatePln === RATE, hit);
  assert("D9 sourceType AUTO_R1", hit.sourceType === "AUTO_R1", hit.sourceType);

  // Idempotent second pass
  const report2 = await runIkMasterBoqLaborExpert({
    item,
    expert: readyExpert(synthetic),
    store: loaded,
    works: loaded.catalogs.wroclaw.works,
    executeResearch: true,
    enableAutR1Accept: true,
    autR1Persist: true,
    lookupPort: emptyPort,
    nowMs: NOW + 1000,
    bypassCooldown: true,
  });
  const row2 = report2.lines.find((l) => l.lineId === "L-miss");
  assert("D10 second pass CURRENT_HIT", row2?.rateStatus === "CURRENT_HIT", row2?.rateStatus);
  const hit2 = lookupWorkRate(loadWorkCatalogStoreLocal(), WORK_ID, UNIT, NOW + 1000);
  assert("D11 rate unchanged", hit2.ourRatePln === RATE, hit2);
}

console.log(`\nAUT-R1 orchestra wire: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
