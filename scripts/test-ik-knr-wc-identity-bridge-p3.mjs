/**
 * IK-KNR-WC-IDENTITY-BRIDGE P3 — Owner-gated CatalogWork CREATE tests
 *
 * npx vite-node scripts/test-ik-knr-wc-identity-bridge-p3.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-knr-wc-p3";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-knr-wc-p3";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCatalogBasisFromSourceRow } from "../src/lib/tenders-bzp-brief.ts";
import {
  assertKnrWcCreateAllowed,
  buildCatalogWorkDraftFromProposal,
  executeKnrWcCatalogWorkCreate,
  isKnrWcCreateBlockedByProposal,
  suggestCatalogWorkIdFromProposal,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-create.ts";
import {
  buildKnrWcIdentityProposals,
  MOPS_20_NORMALIZED_KEYS,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import {
  forceKnrWcIdentityBridgeRuntimeForTests,
  isKnrWcIdentityBridgeP3CreateRuntimeEnabled,
  KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED,
} from "../src/lib/intelligent-estimator/knr-wc-identity-bridge-feature.ts";
import { emptyKnrCatalogStore } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { catalogWorkExistsInStore, insertWorkBothRegions } from "../src/lib/work-catalog/work-catalog-insert.ts";

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

const NOW = "2026-08-22T18:00:00.000Z";
const TENDER_ID = "mops-p3-test";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storage.set(String(key), String(value));
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

let cloudSnapshot = null;
globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(
      JSON.stringify({
        values: keys.map((key) => (key === WORK_CATALOG_STORAGE_KEY ? cloudSnapshot : null)),
      }),
      { status: 200 },
    );
  }
  if (urlStr.includes("batch-set")) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

function loadMopsKey(normalizedKey) {
  const tender = JSON.parse(
    readFileSync(join(root, ".tmp/ops-mops-09-tender-item.json"), "utf8"),
  );
  const arts = tender?.tenderDossier?.scanSummary?.branchWinnerArtifacts || [];
  for (const art of arts) {
    for (const row of art?.snapshot?.rows || []) {
      const resolved = resolveCatalogBasisFromSourceRow({
        code: row.code,
        description: row.description,
      });
      if (!resolved || resolved.normalizedKey !== normalizedKey) continue;
      return {
        normalizedKey,
        family: resolved.family,
        catalogId: resolved.catalogId,
        tableCode: resolved.tableCode,
        displayCode: resolved.display,
        unitRaw: row.unit || "m2",
        descriptionPl: row.description,
        officialNamePl: String(row.description || "").slice(0, 120),
        lineRefs: [{ dwellingId: "d-mops", lineId: "l1", lp: row.lp }],
      };
    }
  }
  return null;
}

function buildProposalForKey(normalizedKey) {
  const keyInput = loadMopsKey(normalizedKey);
  if (!keyInput) throw new Error(`missing key ${normalizedKey}`);
  const batch = buildKnrWcIdentityProposals({
    tenderId: TENDER_ID,
    keys: [keyInput],
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: null,
    works: [],
    featureEnabled: true,
  });
  return batch.proposals[0];
}

function freshStore() {
  storage.clear();
  cloudSnapshot = null;
  const store = defaultWorkCatalogStore(NOW);
  saveWorkCatalogStoreLocal(store, { updatedAtIso: NOW });
  return store;
}

const P3_RUNTIME_ON = { runtimeP3Enabled: true };

// T-P3-1 — valid CREATE
{
  forceKnrWcIdentityBridgeRuntimeForTests(true);
  const store = freshStore();
  const proposal = buildProposalForKey("KNR|2-02|1505-01");
  const workId = `knr-wc-p3-test-${Date.now()}-m2`;
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    ...P3_RUNTIME_ON,
    confirmDuplicateHigh: proposal.duplicateRisk === "HIGH",
    confirmStaleEvidence: proposal.staleEvidence === true,
  });
  assert("T-P3-1 gate ok", gate.ok === true, gate);
  const result = await executeKnrWcCatalogWorkCreate({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    nowIso: NOW,
    ...P3_RUNTIME_ON,
    confirmDuplicateHigh: proposal.duplicateRisk === "HIGH",
    confirmStaleEvidence: proposal.staleEvidence === true,
  });
  assert("T-P3-1 execute saved", result.ok && result.saved === true, result);
  assert(
    "T-P3-1 work in LS",
    catalogWorkExistsInStore(loadWorkCatalogStoreLocal(), workId),
  );
  const draft = buildCatalogWorkDraftFromProposal(proposal, workId, NOW);
  assert("T-P3-1 companyPricePln=0", draft.companyPricePln === 0);
  assert("T-P3-1 source custom", draft.source === "custom");
  forceKnrWcIdentityBridgeRuntimeForTests(null);
}

// T-P3-2 — HOLD_UNIT blocked
{
  const store = freshStore();
  const proposal = buildProposalForKey("KNNR|5|1305-01");
  assert("T-P3-2 HOLD_UNIT proposal", proposal.unitStatus === "HOLD_UNIT");
  assert(
    "T-P3-2 blocked helper",
    isKnrWcCreateBlockedByProposal(proposal),
  );
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId: "knr-wc-should-not-create",
    store,
    ...P3_RUNTIME_ON,
  });
  assert("T-P3-2 gate blocked", gate.ok === false && gate.reason === "hold_unit_table");
}

// T-P3-3 — duplicateRisk HIGH + confirm
{
  const store = freshStore();
  const proposal = {
    ...buildProposalForKey("KNR|4-01|1204-02"),
    duplicateRisk: "HIGH",
  };
  const workId = suggestCatalogWorkIdFromProposal(proposal) + "-high";
  const without = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    ...P3_RUNTIME_ON,
  });
  assert(
    "T-P3-3 needs confirm",
    without.ok === false && without.reason === "confirm_duplicate_high_required",
  );
  const withConfirm = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    ...P3_RUNTIME_ON,
    confirmDuplicateHigh: true,
  });
  assert("T-P3-3 confirm ok", withConfirm.ok === true);
}

// T-P3-4 — staleEvidence + confirm
{
  const store = freshStore();
  const proposal = {
    ...buildProposalForKey("KNR|2-15|0110-01"),
    staleEvidence: true,
  };
  const workId = suggestCatalogWorkIdFromProposal(proposal) + "-stale";
  const without = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    ...P3_RUNTIME_ON,
  });
  assert(
    "T-P3-4 needs stale confirm",
    without.ok === false && without.reason === "confirm_stale_evidence_required",
  );
  const withConfirm = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    ...P3_RUNTIME_ON,
    confirmStaleEvidence: true,
  });
  assert("T-P3-4 confirm ok", withConfirm.ok === true);
}

// T-P3-5 — ownerDecision unset blocked
{
  const store = freshStore();
  const proposal = buildProposalForKey("KNR|2-15|0115-05");
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "unset",
    workId: "knr-wc-unset",
    store,
    ...P3_RUNTIME_ON,
  });
  assert(
    "T-P3-5 unset blocked",
    gate.ok === false && gate.reason === "owner_decision_not_create",
  );
}

// T-P3-6 — CREATE_NEW allowed
{
  const store = freshStore();
  const proposal = buildProposalForKey("KNR|5-08|0504-03");
  const workId = "knr-wc-p3-t6-szt";
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    ...P3_RUNTIME_ON,
  });
  assert("T-P3-6 CREATE_NEW allowed", gate.ok === true, gate);
}

// T-P3-7 — IK OFF blocked
{
  assert(
    "T-P3-7 prod P3 default OFF",
    KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED === false,
  );
  assert(
    "T-P3-7 runtime OFF without IK",
    isKnrWcIdentityBridgeP3CreateRuntimeEnabled({ ikEntryEnabled: false, p3CreateEnabled: true }) === false,
  );
  assert(
    "T-P3-7 runtime OFF prod default",
    isKnrWcIdentityBridgeP3CreateRuntimeEnabled({ ikEntryEnabled: true }) === false,
  );
}

// T-P3-8 — legacy_only blocked
{
  const store = freshStore();
  const proposal = buildProposalForKey("KNR|4-02|0233-06");
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId: "knr-wc-legacy-block",
    store,
    ...P3_RUNTIME_ON,
    settings: { catalogWriteMode: "legacy_only" },
  });
  assert("T-P3-8 legacy_only", gate.ok === false && gate.reason === "legacy_only");
}

// T-P3-9 — duplicate workId blocked
{
  const store = freshStore();
  const existingId = "knr-wc-existing-dup";
  const existing = buildCatalogWorkDraftFromProposal(
    buildProposalForKey("KNR|4-02|0233-08"),
    existingId,
    NOW,
  );
  const next = insertWorkBothRegions(store, existing, NOW);
  saveWorkCatalogStoreLocal(next, { updatedAtIso: NOW });
  const proposal = buildProposalForKey("KNR|4-03|1124-01");
  const gate = assertKnrWcCreateAllowed({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId: existingId,
    store: next,
    ...P3_RUNTIME_ON,
  });
  assert("T-P3-9 duplicate id", gate.ok === false && gate.reason === "work_id_exists");
}

// T-P3-10 — P2 static safety
{
  const uiFiles = [
    "src/app/ik-pricing/IkKnrWcIdentityProposalQueuePanel.tsx",
    "src/app/ik-pricing/IkKnrWcIdentityProposalReviewCard.tsx",
  ];
  const forbidden = [
    "saveWorkCatalogRouted",
    "applyOwnerKnrMapping",
    "acceptWorkRateResearchCandidate",
  ];
  for (const rel of uiFiles) {
    const src = readFileSync(join(root, rel), "utf8");
    for (const token of forbidden) {
      assert(`T-P3-10 no ${token} in ${rel}`, !src.includes(token));
    }
    assert(`T-P3-10 no fetch in ${rel}`, !/\bfetch\s*\(/.test(src));
  }
  const createLib = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-wc-identity-bridge-create.ts"),
    "utf8",
  );
  assert("T-P3-10 create lib uses router only", createLib.includes("saveWorkCatalogRouted"));
  assert(
    "T-P3-10 create lib no acceptWorkRate",
    !createLib.includes("acceptWorkRateResearchCandidate"),
  );
  assert("T-P3-10 create lib no applyOwnerKnr", !createLib.includes("applyOwnerKnrMapping"));
}

// T-P3-11 — pricing safety
{
  const proposal = buildProposalForKey("KNR|5-08|0501-03");
  const draft = buildCatalogWorkDraftFromProposal(proposal, "knr-wc-pricing-safe", NOW);
  assert("T-P3-11 companyPrice 0", draft.companyPricePln === 0);
  assert("T-P3-11 no ourWorkRate", draft.ourWorkRate == null);
}

// T-P3-12 — post-create metric
{
  forceKnrWcIdentityBridgeRuntimeForTests(true);
  const store = freshStore();
  const proposal = buildProposalForKey("KNNR||1014-07");
  const workId = "knr-wc-p3-metric-m2";
  const result = await executeKnrWcCatalogWorkCreate({
    proposal,
    ownerDecision: "CREATE_NEW",
    workId,
    store,
    nowIso: NOW,
    ...P3_RUNTIME_ON,
  });
  assert(
    "T-P3-12 catalogWorksCreated=1",
    result.ok && result.saved && result.catalogWorksCreated === 1,
    result,
  );
  forceKnrWcIdentityBridgeRuntimeForTests(null);
}

// T-P3-13 — regression hooks
{
  assert("T-P3-13 MOPS keys count", MOPS_20_NORMALIZED_KEYS.length === 20);
  assert(
    "T-P3-13 insertBothRegions export",
    typeof insertWorkBothRegions === "function",
  );
}

console.log("\n--- SUMMARY ---");
console.log(`PASS ${pass} FAIL ${fail}`);
if (fail > 0) process.exit(1);
