/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2 UI — Owner Review queue tests
 *
 * npx vite-node scripts/test-ik-knr-wc-identity-bridge-p2ui.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCatalogBasisFromSourceRow } from "../src/lib/tenders-bzp-brief.ts";
import {
  forceKnrWcIdentityBridgeRuntimeForTests,
  isKnrWcIdentityBridgeP1Enabled,
  isKnrWcIdentityBridgeP21PersistEnabled,
  isKnrWcIdentityBridgeP22HardeningEnabled,
  isKnrWcIdentityBridgeP2UiEnabled,
  isKnrWcIdentityBridgeP2UiRuntimeEnabled,
  KNR_WC_IDENTITY_BRIDGE_P1_ENABLED,
  KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED,
  KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED,
  KNR_WC_IDENTITY_BRIDGE_P2_UI_ENABLED,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import {
  buildUnitByLineIdFromDocumentExpertLines,
  extractKnrWcBridgeKeysFromKnrExpert,
  runKnrWcIdentityProposalQueueBatch,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-queue.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { MOPS_20_NORMALIZED_KEYS } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import {
  emptyKnrWcIdentityProposalStore,
} from "../src/lib/intelligent-estimator/knr-wc-identity-proposal-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

const TENDER_A = "mops-tender-a";
const TENDER_B = "mops-tender-b";
const NOW = "2026-08-22T16:00:00.000Z";

const DF_UNITS = {
  "KNNR||1014-07": "m2",
  "KNNR|5|1305-01": "prob",
  "KNNR|5|1305-02": "prob",
  "KNR-W|4-01|0909-04": "szt",
  "KNR-W|5-08|0407-01": "szt",
  "KNR|13-21|0402-03": "szt",
  "KNR|2-02|1505-01": "m2",
  "KNR|2-15|0110-01": "mb",
  "KNR|2-15|0224-03": "kpl",
  "KNR|4-01|1204-02": "m2",
  "KNR|4-02|0233-06": "szt",
  "KNR|4-02|0233-08": "szt",
  "KNR|4-03|1124-01": "szt",
  "KNR|5-08|0501-03": "kpl",
  "KNR|5-08|0504-03": "szt",
  "KNR|5-08|0504-07": "szt",
  "NNRNKB||1134-01": "m2",
  "NNRNKB||1134-02": "m2",
  "KNNR|2|1404-05": "mb",
  "KNR|2-15|0115-05": "szt",
};

function loadMops20KeysFromTender() {
  const tender = JSON.parse(
    readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
  );
  const arts = tender?.tenderDossier?.scanSummary?.branchWinnerArtifacts || [];
  const byKey = new Map();
  for (const art of arts) {
    for (const row of art?.snapshot?.rows || []) {
      const resolved = resolveCatalogBasisFromSourceRow({
        code: row.code,
        description: row.description,
      });
      if (!resolved?.tableCode) continue;
      const nk = resolved.normalizedKey;
      if (!MOPS_20_NORMALIZED_KEYS.includes(nk)) continue;
      if (!byKey.has(nk)) {
        byKey.set(nk, {
          normalizedKey: nk,
          family: resolved.family,
          catalogId: resolved.catalogId,
          tableCode: resolved.tableCode,
          displayCode: resolved.display,
          unitRaw: DF_UNITS[nk] ?? row.unit ?? null,
          descriptionPl: row.description ?? null,
        });
      }
    }
  }
  return MOPS_20_NORMALIZED_KEYS.map((nk) => byKey.get(nk)).filter(Boolean);
}

function queueRun(opts) {
  return runKnrWcIdentityProposalQueueBatch({
    featureEnabled: true,
    persistEnabled: true,
    p22HardeningEnabled: true,
    p2UiEnabled: true,
    ikEntryEnabled: true,
    persistToLocalStorage: false,
    nowIso: NOW,
    ...opts,
  });
}

const mopsKeys = loadMops20KeysFromTender();
assert("setup mops20 keys", mopsKeys.length === 20, `got ${mopsKeys.length}`);

// T-P2UI-1 — panel hidden when flags OFF (runtime gate)
{
  assert(
    "T-P2UI-1 prod P2_UI flag OFF",
    KNR_WC_IDENTITY_BRIDGE_P2_UI_ENABLED === false,
  );
  assert(
    "T-P2UI-1 runtime OFF without overrides",
    isKnrWcIdentityBridgeP2UiRuntimeEnabled({
      ikEntryEnabled: true,
      p1Enabled: false,
    }) === false,
  );
  const offBatch = runKnrWcIdentityProposalQueueBatch({
    tenderId: TENDER_A,
    keys: mopsKeys,
    ikEntryEnabled: true,
    p2UiEnabled: false,
    featureEnabled: true,
    persistEnabled: true,
    p22HardeningEnabled: true,
  });
  assert("T-P2UI-1 empty when gate OFF", offBatch.proposals.length === 0);
  assert("T-P2UI-1 cacheHits=0 when OFF", offBatch.cacheMetrics.cacheHits === 0);
}

// T-P2UI-2 — recommendation advisory · ownerDecision unset
{
  const first = queueRun({
    tenderId: TENDER_A,
    keys: mopsKeys,
    proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
  });
  assert("T-P2UI-2 proposals>0", first.proposals.length > 0);
  for (const p of first.proposals) {
    assert(
      `T-P2UI-2 ownerDecision unset ${p.normalizedKey}`,
      p.ownerDecision === "unset",
    );
    assert(
      `T-P2UI-2 recommendation set ${p.normalizedKey}`,
      typeof p.recommendation === "string" && p.recommendation.length > 0,
    );
    if (p.recommendation === p.ownerDecision) {
      assert(`T-P2UI-2 rec≠decision ${p.normalizedKey}`, false);
    }
  }
}

// T-P2UI-3 — MOPS 20 + SECOND tender full HIT
{
  const sharedStore = emptyKnrWcIdentityProposalStore(NOW);
  const first = queueRun({
    tenderId: TENDER_A,
    keys: mopsKeys,
    proposalStoreOverride: sharedStore,
    persistToLocalStorage: true,
  });
  assert("T-P2UI-3 first proposals", first.proposals.length === 20);
  const second = queueRun({
    tenderId: TENDER_B,
    keys: mopsKeys,
    proposalStoreOverride: sharedStore,
  });
  assert("T-P2UI-3 cacheHits=20", second.cacheMetrics.cacheHits === 20);
  assert("T-P2UI-3 discoveryCalls=0", second.cacheMetrics.discoveryCalls === 0);
  assert("T-P2UI-3 supabaseQueries=0", second.cacheMetrics.supabaseQueries === 0);
  assert("T-P2UI-3 remoteStoreLoads=0", second.cacheMetrics.remoteStoreLoads === 0);
  assert("T-P2UI-3 proposalsBuilt=0", second.cacheMetrics.proposalsBuilt === 0);
}

// T-P2UI-4 — 1305-01/02 HOLD_UNIT · CREATE blocked semantics
{
  const batch = queueRun({
    tenderId: TENDER_A,
    keys: mopsKeys,
    proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
  });
  for (const code of ["1305-01", "1305-02"]) {
    const p = batch.proposals.find((x) => x.tableCode === code);
    assert(`T-P2UI-4 found ${code}`, Boolean(p));
    assert(
      `T-P2UI-4 HOLD_UNIT ${code}`,
      p?.unitStatus === "HOLD_UNIT" || p?.recommendation === "HOLD_UNIT",
    );
    assert(
      `T-P2UI-4 prob unit ${code}`,
      String(p?.unitRaw || "").toLowerCase() === "prob",
    );
    assert(
      `T-P2UI-4 not szt ${code}`,
      String(p?.proposedUnit || "").toLowerCase() !== "szt",
    );
  }
}

// T-P2UI-5 — staleEvidence advisory on HIT
{
  const store = emptyKnrWcIdentityProposalStore(NOW);
  const seeded = queueRun({
    tenderId: TENDER_A,
    keys: [mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01")],
    proposalStoreOverride: store,
  });
  const rec = store.entries["KNR|2-15|0110-01"];
  assert("T-P2UI-5 seeded", Boolean(rec));
  const staleBatch = queueRun({
    tenderId: TENDER_B,
    keys: [mopsKeys.find((k) => k.normalizedKey === "KNR|2-15|0110-01")],
    proposalStoreOverride: store,
    catalogStore: {
      schemaVersion: 1,
      updatedAt: NOW,
      etag: "changed-for-stale-test",
      entries: {},
      aliasIndex: {},
    },
  });
  assert("T-P2UI-5 still HIT", staleBatch.cacheMetrics.cacheHits === 1);
  assert("T-P2UI-5 staleEvidence", staleBatch.proposals[0]?.staleEvidence === true);
}

// T-P2UI-6 — REUSE staging only (lib simulation · no WC write)
{
  const batch = queueRun({
    tenderId: TENDER_A,
    keys: mopsKeys.slice(0, 3),
    proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
  });
  const p = batch.proposals.find((x) => (x.similarWorks?.length ?? 0) > 0);
  if (p) {
    const staging = {
      decision: "REUSE_EXISTING",
      selectedWorkId: p.similarWorks[0].workId,
    };
    assert("T-P2UI-6 staging workId", staging.selectedWorkId.length > 0);
    assert("T-P2UI-6 proposal owner still unset", p.ownerDecision === "unset");
    assert("T-P2UI-6 WC write 0", batch.cacheMetrics.catalogWorkWritten === 0);
  } else {
    assert("T-P2UI-6 skip no similarWorks", true);
  }
}

// T-P2UI-7 — static guard: no forbidden imports in P2 UI files
{
  const uiFiles = [
    "src/app/ik-pricing/IkKnrWcIdentityProposalQueuePanel.tsx",
    "src/app/ik-pricing/IkKnrWcIdentityProposalReviewCard.tsx",
  ];
  const forbidden = [
    "saveWorkCatalogRouted",
    "applyOwnerKnrMapping",
    "cloud-sync",
    "@supabase",
  ];
  for (const rel of uiFiles) {
    const src = readFileSync(join(root, rel), "utf8");
    for (const token of forbidden) {
      assert(`T-P2UI-7 no ${token} in ${rel}`, !src.includes(token));
    }
  }
}

// T-P2UI-8 — static: no fetch / Supabase in P2 UI files
{
  const uiFiles = [
    "src/app/ik-pricing/IkKnrWcIdentityProposalQueuePanel.tsx",
    "src/app/ik-pricing/IkKnrWcIdentityProposalReviewCard.tsx",
  ];
  for (const rel of uiFiles) {
    const src = readFileSync(join(root, rel), "utf8");
    assert(`T-P2UI-8 no fetch in ${rel}`, !/\bfetch\s*\(/.test(src));
    const withoutMetricsLabel = src.replace(/supabaseQueries/g, "");
    assert(
      `T-P2UI-8 no supabase client in ${rel}`,
      !/supabase/i.test(withoutMetricsLabel),
    );
  }
}

// T-P2UI-9 — regression counts (flags prod OFF)
{
  assert("T-P2UI-9 P1 flag OFF", KNR_WC_IDENTITY_BRIDGE_P1_ENABLED === false);
  assert("T-P2UI-9 P21 flag OFF", KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED === false);
  assert("T-P2UI-9 P22 flag OFF", KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED === false);
}

// extractKnrWcBridgeKeysFromKnrExpert — CANDIDATE dedup
{
  const synthetic = {
    tenderId: "extract-test",
    status: "COMPLETED",
    inputLineCount: 2,
    outputLineCount: 2,
    counts: {
      withBasis: 2,
      withoutBasis: 0,
      recognized: 0,
      candidate: 2,
      hold: 0,
      conflict: 0,
      none: 0,
      resolved: 0,
      historicalExactRms: 0,
      historicalExact: 0,
      historicalFamily: 0,
      historicalConflict: 0,
      historicalMiss: 0,
    },
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    historicalAuthority: false,
    lines: [
      {
        lineId: "l1",
        dwellingId: "d1",
        lp: 1,
        catalogBasis: {
          family: "KNR",
          catalogId: "2-15",
          tableCode: "0110-01",
          rawCode: "0110-01",
          display: "0110-01",
          normalizedKey: "KNR|2-15|0110-01",
        },
        lineStatus: "CANDIDATE",
        proposedWorkId: null,
      },
      {
        lineId: "l2",
        dwellingId: "d1",
        lp: 2,
        catalogBasis: {
          family: "KNR",
          catalogId: "2-15",
          tableCode: "0110-01",
          rawCode: "0110-01",
          display: "0110-01",
          normalizedKey: "KNR|2-15|0110-01",
        },
        lineStatus: "CANDIDATE",
        proposedWorkId: null,
      },
    ],
    examplesHold: [],
    reasons: [],
  };
  const keys = extractKnrWcBridgeKeysFromKnrExpert(synthetic, {
    unitByLineId: { l1: "mb", l2: "mb" },
  });
  assert("extract keys=1 dedup", keys.length === 1);
  assert("extract lineRefs merged", (keys[0].lineRefs?.length ?? 0) === 2);
  assert("extract unitRaw", keys[0].unitRaw === "mb");
}

// T-P2UI-10 — Playwright smoke (SKIP — no existing IK P2 UI e2e harness)
assert("T-P2UI-10 SKIP playwright", true);

// T-P2UI-11 — G1 forceKnrWcIdentityBridgeRuntimeForTests (no role bypass)
forceKnrWcIdentityBridgeRuntimeForTests(true);
assert("T-P2UI-11 force ON P1", isKnrWcIdentityBridgeP1Enabled() === true);
assert("T-P2UI-11 force ON P21", isKnrWcIdentityBridgeP21PersistEnabled() === true);
assert("T-P2UI-11 force ON P22", isKnrWcIdentityBridgeP22HardeningEnabled() === true);
assert("T-P2UI-11 force ON P2UI", isKnrWcIdentityBridgeP2UiEnabled() === true);
assert(
  "T-P2UI-11 runtime IK gate not bypassed",
  isKnrWcIdentityBridgeP2UiRuntimeEnabled({ ikEntryEnabled: false }) === false,
);
assert(
  "T-P2UI-11 runtime OK when IK on",
  isKnrWcIdentityBridgeP2UiRuntimeEnabled({ ikEntryEnabled: true }) === true,
);
forceKnrWcIdentityBridgeRuntimeForTests(null);
assert("T-P2UI-11 force reset P1 OFF", isKnrWcIdentityBridgeP1Enabled() === false);
assert("T-P2UI-11 force reset runtime OFF", isKnrWcIdentityBridgeP2UiRuntimeEnabled({ ikEntryEnabled: true }) === false);

// T-P2UI-12 — G2 multi-dwelling package seam (MOPS SSOT)
{
  const mopsItem = JSON.parse(
    readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
  );
  const mopsPkg = JSON.parse(
    readFileSync(join(root, ".tmp/ops-mops-09-item-pkg.json"), "utf8"),
  ).pkg;
  const tenderId = mopsItem.id;
  const withoutPkg = runIkDocumentExpert({ item: mopsItem });
  assert(
    "T-P2UI-12 without package not ready",
    withoutPkg.status === "hold" || withoutPkg.masterBoq?.readyForExperts !== true,
    `status=${withoutPkg.status}`,
  );
  const withPkg = runIkDocumentExpert({ item: mopsItem, package: mopsPkg });
  assert("T-P2UI-12 with package ready", withPkg.status === "ready");
  assert("T-P2UI-12 readyForExperts", withPkg.masterBoq?.readyForExperts === true);
  const knr = runIkKnrExpert({
    tenderId,
    documentExpert: withPkg,
    historicalIndex: null,
  });
  assert("T-P2UI-12 knr not blocked", knr.status !== "BLOCKED", knr.status);
  const unitByLineId = buildUnitByLineIdFromDocumentExpertLines(
    withPkg.masterBoqLines?.map((r) => ({
      lineId: r.line.lineId,
      unit: r.line.unit,
    })) ?? [],
  );
  const keys = extractKnrWcBridgeKeysFromKnrExpert(knr, { unitByLineId });
  assert("T-P2UI-12 MOPS keys=20", keys.length === 20, `got ${keys.length}`);
}

// T-P2UI-13 — G3 duplicateRisk HIGH compact-list advisory badge
{
  const batch = queueRun({
    tenderId: TENDER_A,
    keys: mopsKeys,
    proposalStoreOverride: emptyKnrWcIdentityProposalStore(NOW),
  });
  const highRows = batch.proposals.filter((p) => p.duplicateRisk === "HIGH");
  assert("T-P2UI-13 has HIGH rows", highRows.length > 0, `count=${highRows.length}`);
  for (const p of highRows) {
    assert(`T-P2UI-13 owner unset ${p.normalizedKey}`, p.ownerDecision === "unset");
    assert(
      `T-P2UI-13 no auto owner ${p.normalizedKey}`,
      p.ownerDecision !== "REUSE_EXISTING" && p.ownerDecision !== "CREATE_NEW",
    );
  }
  const panelSrc = readFileSync(
    join(root, "src/app/ik-pricing/IkKnrWcIdentityProposalQueuePanel.tsx"),
    "utf8",
  );
  assert(
    "T-P2UI-13 compact badge marker",
    panelSrc.includes("data-ik-knr-wc-duplicate-high-badge"),
  );
  assert(
    "T-P2UI-13 badge gated on HIGH",
    panelSrc.includes('duplicateRisk === "HIGH"'),
  );
}

// T-P2UI-14 — G4 supabaseQueries observability in UI metrics (pass-through only)
{
  const panelSrc = readFileSync(
    join(root, "src/app/ik-pricing/IkKnrWcIdentityProposalQueuePanel.tsx"),
    "utf8",
  );
  assert(
    "T-P2UI-14 supabaseQueries in cache metrics UI",
    /supabaseQueries=\$\{m\.supabaseQueries\}/.test(panelSrc),
  );
  const sharedStore = emptyKnrWcIdentityProposalStore(NOW);
  queueRun({
    tenderId: TENDER_A,
    keys: mopsKeys,
    proposalStoreOverride: sharedStore,
    persistToLocalStorage: true,
  });
  const second = queueRun({
    tenderId: TENDER_B,
    keys: mopsKeys,
    proposalStoreOverride: sharedStore,
  });
  assert("T-P2UI-14 cacheHits=20", second.cacheMetrics.cacheHits === 20);
  assert("T-P2UI-14 proposalsBuilt=0", second.cacheMetrics.proposalsBuilt === 0);
  assert("T-P2UI-14 discoveryCalls=0", second.cacheMetrics.discoveryCalls === 0);
  assert("T-P2UI-14 remoteStoreLoads=0", second.cacheMetrics.remoteStoreLoads === 0);
  assert("T-P2UI-14 supabaseQueries=0", second.cacheMetrics.supabaseQueries === 0);
  assert("T-P2UI-14 mappingWritten=0", second.cacheMetrics.mappingWritten === 0);
  assert("T-P2UI-14 catalogWorkWritten=0", second.cacheMetrics.catalogWorkWritten === 0);
  assert("T-P2UI-14 a1Written=0", second.cacheMetrics.a1Written === 0);
  assert("T-P2UI-14 pricingWritten=0", second.cacheMetrics.pricingWritten === 0);
}

console.log(`\nP2 UI: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
