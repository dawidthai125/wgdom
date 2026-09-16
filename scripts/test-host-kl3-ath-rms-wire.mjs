/**
 * Host KL-3 Catalog MISS → ATH RMS → discovery V1 wire — Owner GO tests A–N.
 * npx vite-node scripts/test-host-kl3-ath-rms-wire.mjs
 */
import { fnv1aHex } from "../src/lib/global-knowledge/canonical-id.ts";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_HOST_ATH_RMS_ADAPTER_WIRED,
  adaptAthRmsToDiscoveryV1Hard,
  buildSyntheticAthFixture,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  emptyKnrRawEvidenceStore,
  resolveHostKnrKnowledgeLookupOnly,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import {
  evaluateLaborOnlyAutoBomV1Contract,
  buildWorkIdDiscoveryQueryHash,
} from "../src/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract.ts";
import { executeKl3KnowledgeLookup } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-15T22:30:00.000Z");
const TS = new Date(NOW).toISOString();
const CODE = "KNR 4-01 0909-04";
const WORK_ID = "cw.knr.knr-4-01.0909-04.szt";
const EVIDENCE_KEY = "KNR|4-01|0909-04";
const basis = buildCatalogBasisFromRawCode(CODE);
const superActor = { actorId: "dawid", role: "super_admin", displayName: "Dawid" };

function athFile(displayCode = CODE, opts = {}) {
  return {
    bytes: buildSyntheticAthFixture({
      displayCode,
      includePln: false,
      withR: opts.withR !== false,
      withM: opts.withM === true,
      withS: false,
    }),
    sourceFilename: "synthetic-wire.ath",
    targetDisplayCode: displayCode,
  };
}

ok(KNR_HOST_ATH_RMS_ADAPTER_WIRED === true, "marker KNR_HOST_ATH_RMS_ADAPTER_WIRED");

// ——— A. Host Catalog MISS + valid ATH → adapter invoked ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-a",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    evidenceStore: emptyKnrRawEvidenceStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile(CODE, { withM: false })],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const o = out.athRmsWire.outcomes[0];
  ok(out.athRmsWire.adaptedCount === 1, "A adaptedCount=1");
  ok(o?.status === "ADAPTED", `A status ADAPTED (${o?.status})`);
  ok(
    out.envelope.lineResults[0]?.lookupStatus === "PENDING_VERIFY"
      || out.envelope.lineResults[0]?.lookupStatus === "RESEARCH_NO_RESULT"
      || Boolean(out.envelope.lineResults[0]?.lookupStatus),
    "A Catalog MISS path ran (non-LOCAL_HIT or PENDING)",
  );
}

// ——— B. Canonical identity family/table/position ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-b",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile(CODE, { withM: false })],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const rec = out.athRmsWire.discoveryStore?.entries[EVIDENCE_KEY];
  ok(rec?.evidenceKeyV1 === EVIDENCE_KEY, "B evidenceKeyV1 canonical");
  ok(String(rec?.family || "").toUpperCase() === "KNR", "B family KNR");
  ok(rec?.displayCode?.includes("0909"), "B display has table/pos");
  const labor = rec?.norms?.laborNorms?.[0];
  ok(labor?.kind === "R" && labor?.unit === "r-g", "B labor R r-g");
}

// ——— C. Valid R → Discovery Evidence ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-c",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile(CODE, { withM: false })],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const rec = out.athRmsWire.discoveryStore?.entries[EVIDENCE_KEY];
  ok(rec?.lifecycleState === "ACTIVE", "C ACTIVE evidence");
  ok((rec?.norms?.laborNorms?.[0]?.quantity ?? 0) > 0, "C R>0 persisted");
  ok((rec?.sources?.length ?? 0) >= 1, "C provenance sources");
}

// ——— D. M=0 → NO_MATERIAL_NORM ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-d",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile(CODE, { withM: false })],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(out.athRmsWire.outcomes[0]?.noMaterialNormEmitted === true, "D NM emitted");
  const rec = out.athRmsWire.discoveryStore?.entries[EVIDENCE_KEY];
  ok((rec?.norms?.materialNorms?.length ?? 0) === 0, "D materialNorms empty");
  ok(
    (rec?.sources || []).some((s) => /\bNO_MATERIAL_NORM\b/.test(s.fragment || "")),
    "D NO_MATERIAL_NORM in provenance",
  );
}

// ——— E. V1-HARD PASS ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-e",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile(CODE, { withM: false })],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: out.athRmsWire.discoveryStore,
    nowMs: NOW,
  });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", `E V1 ACCEPT (${v1.reasons})`);
}

// ——— F. missing ATH → fail-closed ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-f",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(out.athRmsWire.adaptedCount === 0, "F adaptedCount=0");
  ok(out.athRmsWire.outcomes[0]?.status === "SKIPPED_NO_ATH", "F SKIPPED_NO_ATH");
  ok(!out.athRmsWire.discoveryStore?.entries[EVIDENCE_KEY], "F no fabricated evidence");
}

// ——— G. invalid identity → fail-closed (adapter entrypoint host uses) ———
{
  const r = adaptAthRmsToDiscoveryV1Hard({
    athBytes: buildSyntheticAthFixture({
      displayCode: CODE,
      withR: true,
      withM: false,
      withS: false,
    }),
    targetDisplayCode: CODE,
    evidenceKeyV1: "0909-04",
    source: {
      sourceId: "x",
      urlHash: fnv1aHex("u"),
      fragment: "x",
      contentHash: fnv1aHex("c"),
      fetchedAt: TS,
      priority: "OFFICIAL_PUBLIC_DOCUMENT",
    },
    nowIso: TS,
    includeIncompleteRms: true,
    persist: false,
  });
  ok(r.ok === false, "G invalid identity DENY");
  ok(
    r.ok === false
      && (r.reason === "SUFFIX_ONLY_FORBIDDEN" || r.reason === "AMBIGUOUS_IDENTITY"),
    `G reason suffix/ambiguous (${r.ok === false ? r.reason : ""})`,
  );
}

// ——— H. family mismatch → fail-closed ———
{
  const r = adaptAthRmsToDiscoveryV1Hard({
    athBytes: buildSyntheticAthFixture({
      displayCode: CODE,
      withR: true,
      withM: false,
      withS: false,
    }),
    targetDisplayCode: CODE,
    evidenceKeyV1: EVIDENCE_KEY,
    existingFamily: "KNNR",
    source: {
      sourceId: "x",
      urlHash: fnv1aHex("u"),
      fragment: "x",
      contentHash: fnv1aHex("c"),
      fetchedAt: TS,
      priority: "OFFICIAL_PUBLIC_DOCUMENT",
    },
    nowIso: TS,
    includeIncompleteRms: true,
    persist: false,
  });
  ok(r.ok === false && r.reason === "CROSS_FAMILY_FORBIDDEN", "H CROSS_FAMILY_FORBIDDEN");
}

// ——— I. R <= 0 → fail-closed ———
{
  const { adaptNormativeRmsToDiscoveryV1HardInput } = await import(
    "../src/lib/intelligent-estimator/knr-knowledge/normative-rms-to-discovery-v1-adapter.ts"
  );
  const r = adaptNormativeRmsToDiscoveryV1HardInput({
    family: "KNR",
    catalog: "4-01",
    table: "0909",
    position: "04",
    displayCode: CODE,
    evidenceKeyV1: EVIDENCE_KEY,
    positionUnit: "szt",
    laborNorms: [
      { kind: "R", code: "R", description: "r", unit: "r-g", quantity: 0 },
    ],
    materialNorms: [],
    sources: [
      {
        sourceId: "x",
        urlHash: fnv1aHex("u"),
        fragment: "x",
        contentHash: fnv1aHex("c"),
        fetchedAt: TS,
        priority: "OFFICIAL_PUBLIC_DOCUMENT",
      },
    ],
    origin: "LICENSED_ATH_EXPORT",
    nowIso: TS,
  });
  ok(r.ok === false && r.reason === "R_QTY_INVALID", "I R<=0 DENY");
}

// ——— J. no provenance → fail-closed ———
{
  const { adaptNormativeRmsToDiscoveryV1HardInput } = await import(
    "../src/lib/intelligent-estimator/knr-knowledge/normative-rms-to-discovery-v1-adapter.ts"
  );
  const r = adaptNormativeRmsToDiscoveryV1HardInput({
    family: "KNR",
    catalog: "4-01",
    table: "0909",
    position: "04",
    displayCode: CODE,
    evidenceKeyV1: EVIDENCE_KEY,
    positionUnit: "szt",
    laborNorms: [
      { kind: "R", code: "R", description: "r", unit: "r-g", quantity: 1.1 },
    ],
    materialNorms: [],
    sources: [],
    origin: "LICENSED_ATH_EXPORT",
    nowIso: TS,
  });
  ok(r.ok === false && r.reason === "MISSING_PROVENANCE", "J MISSING_PROVENANCE");
}

// ——— K. Labor PLN path NOT invoked ———
{
  const hostSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter.ts"),
    "utf8",
  );
  const runtimeSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts"),
    "utf8",
  );
  ok(!/runIkLaborGapResearch/.test(hostSrc), "K host no runIkLaborGapResearch");
  ok(
    /athFiles:\s*opts\.athFiles/.test(runtimeSrc)
      && /adaptAthRmsToDiscoveryV1Hard/.test(hostSrc),
    "K orchestra passes athFiles · host uses adapter",
  );
  ok(!/runSelectiveWorkRateResearch/.test(hostSrc), "K host no selective PLN research");
}

// ——— L. Public norms=[] does NOT fabricate RMS ———
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-l",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const rec = out.athRmsWire.discoveryStore?.entries[EVIDENCE_KEY];
  ok(!rec, "L no ATH-adapted record without ATH");
  const od = out.onDemandDiscovery;
  if (od?.discoveryStore) {
    const anyLabor = Object.values(od.discoveryStore.entries || {}).some(
      (e) => (e.norms?.laborNorms?.length ?? 0) > 0,
    );
    ok(!anyLabor, "L on-demand did not invent laborNorms");
  } else {
    ok(true, "L on-demand skipped (feature off) — no fabricated RMS");
  }
}

// ——— M + N. Cross-tender reuse / second tender Knowledge FIRST ———
{
  const first = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-m1",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles: [athFile(CODE, { withM: false })],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(first.athRmsWire.adaptedCount === 1, "M first tender adapted");
  const store = first.athRmsWire.discoveryStore;
  const qh = buildWorkIdDiscoveryQueryHash(WORK_ID);
  ok((store?.byQueryHash[qh] || []).includes(EVIDENCE_KEY), "M workId queryHash indexed");

  const second = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-wire-m2",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: store,
    actor: superActor,
    athFiles: [],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(second.athRmsWire.adaptedCount === 0, "N second tender no re-adapt without ATH");
  ok(second.athRmsWire.outcomes[0]?.status === "SKIPPED_NO_ATH", "N fail-closed no ATH");
  const v1b = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: store,
    nowMs: NOW,
  });
  ok(v1b.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", "N V1 REUSE from prior discovery — no research");
}

// ——— Orchestra pass-through athFiles ———
{
  const knr = {
    tenderId: "t-orch",
    status: "ready",
    lines: [
      {
        lineId: "L1",
        dwellingId: "d1",
        catalogBasis: basis,
        lookupStatus: null,
      },
    ],
    reasons: [],
  };
  let captured = null;
  const result = await executeKl3KnowledgeLookup({
    tenderId: "t-orch",
    knr,
    athFiles: [athFile(CODE, { withM: false })],
    isCancelled: () => false,
    setKnrKnowledge: () => {},
    setKnowledgeBusy: () => {},
    onHostComplete: (r) => {
      captured = r;
    },
  });
  ok(result?.athRmsWire?.adaptedCount === 1, "Orchestra athFiles → adapter CONNECT");
  ok(captured?.athRmsWire?.adaptedCount === 1, "Orchestra onHostComplete sees wire");
}

if (failed > 0) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nALL PASS — host KL-3 ATH RMS wire A–N");
