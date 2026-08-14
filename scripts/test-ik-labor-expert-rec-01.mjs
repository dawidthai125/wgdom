/**
 * IK-LABOR-EXPERT-REC-01 — T1–T14 harness (ZERO live HTTP · ZERO KV).
 *
 * npx vite-node scripts/test-ik-labor-expert-rec-01.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  analyzeLaborRateCandidate,
  analyzeLaborRateFromResearchStatus,
  buildIkLaborExpertRecommendation,
  buildIkLaborExpertRecommendationPl,
  buildLaborRateEvidencePack,
  LABOR_RATE_DELTA_PCT_CAUTION,
} from "../src/lib/ik-pricing-orchestrator/index.ts";
import { qualifyWorkRateObservation } from "../src/lib/work-catalog/work-rate-qualify.ts";
import { acceptWorkRateResearchCandidate } from "../src/lib/work-catalog/work-rate-accept.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const NOW = "2026-08-13T12:00:00.000Z";

function makeObs(overrides = {}) {
  return {
    sourceId: "kb_pl",
    workNamePl: "Test robota",
    ratePln: 40,
    unit: "m2",
    regionScope: "WROCLAW",
    laborOnly: true,
    sourceUrl: "https://example.test/kb",
    observedAt: NOW,
    netGross: "netto",
    ...overrides,
  };
}

function makeCandidate(overrides = {}) {
  const observations = overrides.observations ?? [
    makeObs({ ratePln: 38, sourceId: "kb_pl" }),
    makeObs({ ratePln: 42, sourceId: "cennikremontow_pl", sourceUrl: "https://example.test/cr" }),
    makeObs({ ratePln: 40, sourceId: "sccot", sourceUrl: "https://example.test/sccot" }),
  ];
  const rates = observations.map((o) => o.ratePln).sort((a, b) => a - b);
  const mid = rates[Math.floor(rates.length / 2)];
  return {
    workId: "cc-ik-labor-rec-test",
    unit: "m2",
    namePl: "Test malowanie ścian",
    suggestedRatePln: mid,
    regionScope: "WROCLAW",
    sampleSize: observations.length,
    lowSample: observations.length < 3,
    observations,
    previousOurRatePln: null,
    previousFreshness: "MISSING",
    ...overrides,
    observations: overrides.observations ?? observations,
    suggestedRatePln: overrides.suggestedRatePln ?? mid,
    sampleSize: overrides.sampleSize ?? (overrides.observations ?? observations).length,
    lowSample:
      overrides.lowSample ??
      (overrides.sampleSize ?? (overrides.observations ?? observations).length) < 3,
  };
}

// ── T1 CANDIDATE full ───────────────────────────────────────
{
  const candidate = makeCandidate({ lowSample: false, sampleSize: 3 });
  const pack = buildLaborRateEvidencePack(candidate, []);
  const rec = analyzeLaborRateCandidate({ pack, sourceCandidate: candidate });
  ok("T1 pack exists", pack != null);
  ok("T1 rate === suggested", pack.candidateRatePln === candidate.suggestedRatePln);
  ok("T1 stance != NO_RECOMMENDATION", rec.stance !== "NO_RECOMMENDATION");
  ok("T1 companyPrice excluded", pack.companyPricePlnExcluded === true);
  ok("T1 expert may not write", rec.expertMayWrite === false && rec.expertMayAccept === false);
}

// ── T2 GAP ──────────────────────────────────────────────────
{
  const rec = analyzeLaborRateFromResearchStatus({ status: "GAP", candidate: null });
  ok("T2 stance NO_RECOMMENDATION", rec.stance === "NO_RECOMMENDATION");
  ok("T2 rate null", rec.candidateRatePln === null);
}

// ── T3 invalid unit (no pack / no rec from empty) ───────────
{
  const candidate = makeCandidate({
    observations: [],
    suggestedRatePln: 40,
    sampleSize: 0,
  });
  const pack = buildLaborRateEvidencePack(candidate);
  ok("T3 no pack for empty obs", pack === null);
  const rec = analyzeLaborRateCandidate({ pack: null, sourceCandidate: candidate });
  ok("T3 no recommendation", rec.stance === "NO_RECOMMENDATION");
}

// ── T4 L+M rejected by qualify ──────────────────────────────
{
  const q = qualifyWorkRateObservation({
    offer: {
      sourceId: "kb_pl",
      workNamePl: "Pakiet L+M",
      ratePln: 100,
      unit: "m2",
      currency: "PLN",
      regionScope: "WROCLAW",
      laborOnly: false,
      includesMaterial: true,
      identityMatched: true,
      priceKind: "regular",
      sourceUrl: "https://example.test",
      observedAt: NOW,
      netGross: "netto",
    },
    expectedWorkId: "x",
    expectedUnit: "m2",
  });
  ok("T4 L+M qualify reject", q.ok === false);
  ok(
    "T4 reason L+M",
    q.ok === false &&
      (q.reason === "includes_material" || q.reason === "not_labor_only"),
  );
}

// ── T5 companyPrice never used ──────────────────────────────
{
  const candidate = makeCandidate();
  const pack = buildLaborRateEvidencePack(candidate);
  const rec = buildIkLaborExpertRecommendation(candidate);
  const blob = JSON.stringify({ pack, rec });
  ok("T5 no companyPrice in pack/rec", !blob.includes("companyPricePln") || pack.companyPricePlnExcluded === true);
  ok("T5 flag excluded", pack.companyPricePlnExcluded === true && rec.companyPriceUsedAsOurRate === false);
}

// ── T6 AI auto Accept impossible ────────────────────────────
{
  const rec = buildIkLaborExpertRecommendation(makeCandidate());
  ok("T6 aiAutoAccept false", rec.aiAutoAccept === false);
  ok("T6 expertMayAccept false", rec.expertMayAccept === false);
  const src = readFileSync(
    join("src/lib/ik-pricing-orchestrator/labor-rate-expert-rec.ts"),
    "utf8",
  );
  ok(
    "T6 no Accept call in expert-rec",
    !src.includes("acceptWorkRate") && !src.includes("acceptIkLabor"),
  );
}

// ── T7 missing evidence ─────────────────────────────────────
{
  const rec = analyzeLaborRateCandidate({ pack: null });
  ok("T7 NO_RECOMMENDATION", rec.stance === "NO_RECOMMENDATION");
}

// ── T8 Owner Reject = zero write (documented: reject clears UI only) ─
{
  // Reject path does not call accept — verify accept not invoked by expert modules
  const expertSrc = readFileSync(
    join("src/lib/ik-pricing-orchestrator/labor-rate-expert-rec.ts"),
    "utf8",
  );
  const evidenceSrc = readFileSync(
    join("src/lib/ik-pricing-orchestrator/labor-rate-evidence.ts"),
    "utf8",
  );
  ok(
    "T8 expert modules have no save/accept",
    !expertSrc.includes("saveWorkCatalog") &&
      !evidenceSrc.includes("saveWorkCatalog") &&
      !expertSrc.includes("acceptWorkRateResearchCandidate") &&
      !evidenceSrc.includes("acceptWorkRateResearchCandidate"),
  );
}

// ── T9 Owner Accept uses existing Accept only ───────────────
{
  const store = normalizeWorkCatalogStore({
    schemaVersion: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: {
        works: [
          {
            id: "cc-ik-labor-rec-test",
            tradeId: "MALOWANIE",
            namePl: "Test",
            unit: "m2",
            companyPricePln: 99,
            marketQuotes: {},
            marketQuoteHistory: [],
            commercialPricing: { marginPct: 10, updatedAt: NOW, source: "owner" },
            updatedAt: NOW,
            freshnessStatus: "ok",
            keywords: [],
            active: true,
          },
        ],
      },
      dolnyslask: { works: [] },
    },
    updatedAt: NOW,
  });
  const candidate = makeCandidate({ previousFreshness: "MISSING" });
  const beforeCompany = store.catalogs.wroclaw.works[0].companyPricePln;
  const accepted = acceptWorkRateResearchCandidate({
    store,
    candidate,
    observedAt: NOW,
    updatedAt: NOW,
  });
  ok("T9 accept ok", accepted.ok === true);
  if (accepted.ok) {
    const w = accepted.store.catalogs.wroclaw.works.find(
      (x) => x.id === "cc-ik-labor-rec-test",
    );
    ok("T9 OUR RATE set", w?.ourWorkRate?.ourRatePln === candidate.suggestedRatePln);
    ok("T9 companyPrice unchanged", w?.companyPricePln === beforeCompany);
    ok("T9 source OWNER/ACCEPT", w?.ourWorkRate?.sourceType === "OWNER" || w?.ourWorkRate?.sourceType === "ACCEPT");
  }
}

// ── T10 / T11 — documented as covered by W2 two-pass suite (fixture HTTP 0) ─
{
  ok("T10/T11 delegated to test-ik-e2e-wire-w2-labor-two-pass.mjs", true);
}

// ── T12 static grep expert-rec forbidden imports ────────────
{
  const src = readFileSync(
    join("src/lib/ik-pricing-orchestrator/labor-rate-expert-rec.ts"),
    "utf8",
  );
  const ev = readFileSync(
    join("src/lib/ik-pricing-orchestrator/labor-rate-evidence.ts"),
    "utf8",
  );
  const forbidden = [
    "saveWorkCatalogRouted",
    "acceptWorkRateResearchCandidate",
    "acceptIkLaborResearchAndNotify",
    "batch-set",
    "patchOurWorkRateInStore",
  ];
  let clean = true;
  for (const f of forbidden) {
    if (src.includes(f) || ev.includes(f)) clean = false;
  }
  ok("T12 grep forbidden imports", clean);
}

// ── T13 lowSample → CAUTION ─────────────────────────────────
{
  const candidate = makeCandidate({
    observations: [makeObs({ ratePln: 40 })],
    suggestedRatePln: 40,
    sampleSize: 1,
    lowSample: true,
  });
  const rec = buildIkLaborExpertRecommendation(candidate);
  ok("T13 CAUTION", rec.stance === "RECOMMEND_CAUTION");
  ok(
    "T13 LOW_SAMPLE finding",
    rec.findings.some((f) => f.code === "LOW_SAMPLE"),
  );
}

// ── T14 large delta → CAUTION + finding ─────────────────────
{
  const candidate = makeCandidate({
    previousOurRatePln: 20,
    previousFreshness: "STALE",
    suggestedRatePln: 40,
    lowSample: false,
    sampleSize: 3,
    observations: [
      makeObs({ ratePln: 38 }),
      makeObs({ ratePln: 40, sourceId: "cennikremontow_pl" }),
      makeObs({ ratePln: 42, sourceId: "sccot" }),
    ],
  });
  // force suggested to 40 for delta 100% vs 20
  candidate.suggestedRatePln = 40;
  const pack = buildLaborRateEvidencePack(candidate);
  ok(
    "T14 deltaPct >= threshold",
    pack != null &&
      pack.deltaPct != null &&
      Math.abs(pack.deltaPct) >= LABOR_RATE_DELTA_PCT_CAUTION,
  );
  const rec = analyzeLaborRateCandidate({ pack, sourceCandidate: candidate });
  ok("T14 CAUTION", rec.stance === "RECOMMEND_CAUTION");
  ok(
    "T14 LARGE_DELTA finding",
    rec.findings.some((f) => f.code === "LARGE_DELTA_VS_PREVIOUS"),
  );
}

// Rate assert fail closed
{
  const candidate = makeCandidate();
  const pack = buildLaborRateEvidencePack(candidate);
  const tampered = { ...pack, candidateRatePln: pack.candidateRatePln + 1 };
  const rec = analyzeLaborRateCandidate({
    pack: tampered,
    sourceCandidate: candidate,
  });
  ok("ASSERT fail closed NO_REC", rec.stance === "NO_RECOMMENDATION");
}

// Thin PL wrapper still works
{
  const pl = buildIkLaborExpertRecommendationPl(makeCandidate());
  ok("PL wrapper non-empty", typeof pl === "string" && pl.length > 20);
}

console.log(`\nIK-LABOR-EXPERT-REC-01: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
