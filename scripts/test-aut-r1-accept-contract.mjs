/**
 * AUT-R1 — Autonomous Labor OUR RATE contract + Accept writer tests.
 * npx vite-node scripts/test-aut-r1-accept-contract.mjs
 */
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { evaluateAutR1LaborAcceptContract } from "../src/lib/work-catalog/aut-r1-accept-contract.ts";
import { tryAutR1AcceptLaborCandidate } from "../src/lib/work-catalog/aut-r1-accept.ts";
import { acceptWorkRateResearchCandidate } from "../src/lib/work-catalog/work-rate-accept.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("PASS:", msg);
  }
}

const NOW = Date.parse("2026-09-10T10:00:00.000Z");
const T_FRESH = new Date(NOW).toISOString();
const WORK_ID = "legacy-malowanie-m2";

function makeWork(ourRate) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: "Malowanie ścian",
    unit: "m2",
    companyPricePln: 999,
    updatedAt: T_FRESH,
    freshnessStatus: "missing",
    keywords: ["malowanie"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...(ourRate ? { ourWorkRate: ourRate } : {}),
  };
}

function makeStore(ourRate) {
  const works = [makeWork(ourRate)];
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

function obs(ratePln, over = {}) {
  return {
    sourceId: over.sourceId ?? "kb_pl",
    workNamePl: "Malowanie ścian",
    ratePln,
    unit: "m2",
    regionScope: "WROCLAW",
    laborOnly: true,
    sourceUrl: over.sourceUrl ?? `https://kb.pl/rate-${ratePln}`,
    observedAt: over.observedAt ?? "2026-09-09T12:00:00.000Z",
    netGross: "netto",
  };
}

function candidate(over = {}) {
  const observations = over.observations ?? [obs(45), obs(45, { sourceId: "cennikremontow_pl", sourceUrl: "https://cennikremontow.pl/a" })];
  return {
    workId: WORK_ID,
    unit: "m2",
    namePl: "Malowanie ścian",
    suggestedRatePln: 45,
    marketBaseRatePln: over.marketBaseRatePln ?? 45,
    wgdomMarginPct: 0,
    proposedOurRatePln: 45,
    sourceMinPln: 45,
    sourceMaxPln: 45,
    regionScope: "WROCLAW",
    countryScope: "POLSKA",
    widthClaim: "NOT_SPECIFIED",
    sampleSize: observations.length,
    lowSample: observations.length < 2,
    observations,
    previousOurRatePln: null,
    previousFreshness: "MISSING",
    synonymUsed: null,
    ...over,
  };
}

// ─── A PASS: trusted + sufficient same-price Evidence + candidate ───────────
{
  const store = makeStore(null);
  const c = candidate();
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.decision === "AUT_R1_ACCEPT", "A contract PASS");
  ok(contract.mayPersistOurRate === true, "A mayPersistOurRate");
  ok(contract.idempotentNoop === false, "A not noop");

  const applied = await tryAutR1AcceptLaborCandidate({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
    persist: false,
  });
  ok(applied.ok && applied.accepted, "A Accept applied");
  ok(applied.autR1AutonomousAccept === true, "A autR1AutonomousAccept");
  ok(applied.aiAutoAccept === false, "A aiAutoAccept remains false");
  ok(applied.companyPriceUsedAsOurRate === false, "A no companyPrice");

  const hit = lookupWorkRate(applied.store, WORK_ID, "m2", NOW);
  ok(hit.status === "CURRENT", "A lookup CURRENT");
  ok(hit.ourRatePln === 45, "A rate 45");
  ok(hit.sourceType === "AUTO_R1", "A provenance AUTO_R1");
  ok(hit.rate.autR1?.kind === "AUT_R1", "A autR1 audit block");
  ok(hit.rate.autR1?.ruleId === "aut_r1.labor_evidence_candidate_v1", "A ruleId");
}

// ─── B Idempotent repeat ────────────────────────────────────────────────────
{
  const store0 = makeStore(null);
  const c = candidate();
  const first = await tryAutR1AcceptLaborCandidate({
    store: store0,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
    persist: false,
  });
  ok(first.ok && first.accepted, "B first accept");
  const second = await tryAutR1AcceptLaborCandidate({
    store: first.store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW + 1000,
    persist: false,
  });
  ok(second.ok && second.idempotentNoop, "B idempotent noop");
  ok(second.accepted === false, "B no second write");
  const hist = first.store.catalogs.wroclaw.works[0].ourWorkRate.history.filter(
    (h) => h.kind === "OUR",
  );
  const hist2 = second.store.catalogs.wroclaw.works[0].ourWorkRate.history.filter(
    (h) => h.kind === "OUR",
  );
  ok(hist2.length === hist.length, "B history not duplicated");
}

// ─── C Missing Evidence / empty observations ────────────────────────────────
{
  const store = makeStore(null);
  const c = candidate({ observations: [] });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.decision === "AUT_R1_EXCEPTION", "C EXCEPTION");
  ok(contract.reasons.includes("MISSING_CANDIDATE_OBSERVATIONS"), "C missing obs");
  ok(contract.mayPersistOurRate === false, "C no persist");
}

// ─── D Insufficient Evidence (no durable + conflict-empty path via invalid) ─
{
  const store = makeStore(null);
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: null,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("NO_CANDIDATE"), "D no candidate");
}

// ─── E Conflicting Evidence (different prices) ──────────────────────────────
{
  const store = makeStore(null);
  const c = candidate({
    marketBaseRatePln: 23,
    observations: [
      obs(22, { sourceId: "kb_pl", sourceUrl: "https://kb.pl/a" }),
      obs(24, { sourceId: "cennikremontow_pl", sourceUrl: "https://cennikremontow.pl/b" }),
    ],
  });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.decision === "AUT_R1_EXCEPTION", "E EXCEPTION conflict");
  ok(contract.reasons.includes("EVIDENCE_CONFLICT"), "E CONFLICT reason");
  const applied = await tryAutR1AcceptLaborCandidate({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
    persist: false,
  });
  ok(!applied.accepted, "E no write");
  ok(lookupWorkRate(store, WORK_ID, "m2", NOW).status === "MISSING", "E still MISSING");
}

// ─── F Ambiguous identity ───────────────────────────────────────────────────
{
  const store = makeStore(null);
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: candidate(),
    identityTrusted: false,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("NOT_TRUSTED_IDENTITY"), "F not trusted");
}

// ─── G Invalid / missing unit ───────────────────────────────────────────────
{
  const store = makeStore(null);
  const c = candidate();
  c.unit = "";
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("NO_UNIT"), "G no unit");
}

// ─── H Stale candidate / STALE catalog blocks ───────────────────────────────
{
  const staleIso = new Date(NOW - 400 * 24 * 3600 * 1000).toISOString();
  const store = makeStore({
    workId: WORK_ID,
    unit: "m2",
    ourRatePln: 40,
    sourceType: "ACCEPT",
    regionScope: "WROCLAW",
    observedAt: staleIso,
    updatedAt: staleIso,
    history: [],
  });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: candidate({ marketBaseRatePln: 45 }),
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("LOOKUP_STALE_BLOCKED"), "H STALE blocked");
}

// ─── I Existing stronger/fresher different rate ─────────────────────────────
{
  const fresh = new Date(NOW - 86400000).toISOString();
  const store = makeStore({
    workId: WORK_ID,
    unit: "m2",
    ourRatePln: 50,
    sourceType: "ACCEPT",
    regionScope: "WROCLAW",
    observedAt: fresh,
    updatedAt: fresh,
    history: [],
  });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: candidate({ marketBaseRatePln: 45 }),
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.overwriteBlocked === true, "I overwrite blocked");
  ok(contract.reasons.includes("OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"), "I reason");
}

// ─── J Missing provenance ───────────────────────────────────────────────────
{
  const store = makeStore(null);
  const c = candidate({
    observations: [
      {
        sourceId: "",
        workNamePl: "Malowanie",
        ratePln: 45,
        unit: "m2",
        regionScope: "WROCLAW",
        laborOnly: true,
        sourceUrl: "",
        observedAt: "",
        netGross: "netto",
      },
    ],
  });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("MISSING_PROVENANCE"), "J missing provenance");
}

// ─── K companyPrice only ────────────────────────────────────────────────────
{
  const store = makeStore(null);
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: candidate(),
    identityTrusted: true,
    nowMs: NOW,
    companyPriceOnly: true,
  });
  ok(contract.reasons.includes("COMPANY_PRICE_FORBIDDEN"), "K companyPrice forbidden");
  // Ensure catalog companyPrice never written as OUR RATE on Owner path either
  const owner = acceptWorkRateResearchCandidate({
    store,
    candidate: candidate(),
  });
  ok(owner.ok, "K Owner Accept still works");
  ok(owner.store.catalogs.wroclaw.works[0].ourWorkRate.ourRatePln === 45, "K Owner uses market base");
  ok(owner.store.catalogs.wroclaw.works[0].ourWorkRate.ourRatePln !== 999, "K not companyPrice");
  ok(owner.store.catalogs.wroclaw.works[0].ourWorkRate.sourceType === "ACCEPT", "K Owner ACCEPT");
}

// ─── L Research candidate without validation (invalid rate) ─────────────────
{
  const store = makeStore(null);
  const c = candidate({ marketBaseRatePln: 0 });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: c,
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("INVALID_CANDIDATE_RATE"), "L invalid rate");
}

// ─── M Existing OWNER stronger than AUT-R1 ──────────────────────────────────
{
  const fresh = new Date(NOW - 86400000).toISOString();
  const store = makeStore({
    workId: WORK_ID,
    unit: "m2",
    ourRatePln: 60,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: fresh,
    updatedAt: fresh,
    history: [],
  });
  const contract = evaluateAutR1LaborAcceptContract({
    store,
    candidate: candidate({ marketBaseRatePln: 45 }),
    identityTrusted: true,
    nowMs: NOW,
  });
  ok(contract.reasons.includes("OVERWRITE_BLOCKED_OWNER"), "M Owner protected");
}

// ─── Owner Accept path unchanged (default decision) ─────────────────────────
{
  const store = makeStore(null);
  const accepted = acceptWorkRateResearchCandidate({
    store,
    candidate: candidate(),
  });
  ok(accepted.ok, "Owner Accept ok");
  ok(accepted.store.catalogs.wroclaw.works[0].ourWorkRate.sourceType === "ACCEPT", "Owner source ACCEPT");
  ok(!accepted.store.catalogs.wroclaw.works[0].ourWorkRate.autR1, "Owner no autR1 block");
}

if (failed > 0) {
  console.error(`\nAUT-R1 TESTS FAILED: ${failed}`);
  process.exit(1);
}
console.log("\nAUT-R1 TESTS PASSED");
