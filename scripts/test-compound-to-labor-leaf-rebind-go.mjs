/**
 * Unit tests — compound → labor leaf rebind (CLLR-v1).
 * npx vite-node scripts/test-compound-to-labor-leaf-rebind-go.mjs
 */
import {
  evaluateCompoundToLaborLeafRebind,
  applyCompoundLaborLeafRebindToLine,
  isCeilingSingleLayerGypsumSkimActivity,
  selectCllrRelevantTechnologyPacks,
  CLLR_LEAF_0815_05,
} from "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { normalizeTechnologyPack } from "../src/lib/technology-foundation/pack-schema.ts";
import {
  clearPackRegistryForTests,
  listAllPacks,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
} from "../src/lib/technology-foundation/index.ts";
import { ensureBaselineTechnologyPacksRegistered } from "../src/lib/technology-foundation/ensure-baseline-technology-packs.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${msg}`);
  } else {
    fail += 1;
    console.log(`FAIL ${msg}`);
  }
}

const NOW = Date.parse("2026-09-12T08:00:00.000Z");
const PARENT = "legacy-gladzie_tynki-m2";
const LEAF = CLLR_LEAF_0815_05;

assert(
  isCeilingSingleLayerGypsumSkimActivity(
    "Gładź gipsowa na sufitach jednowarstwowa m2 d.1 0815-05",
  ),
  "ceiling+0815-05 scope",
);
assert(
  isCeilingSingleLayerGypsumSkimActivity("Gładź gipsowa na sufitach jednowarstwowa"),
  "ceiling single without code",
);
assert(
  !isCeilingSingleLayerGypsumSkimActivity(
    "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach z 0815-04",
  ),
  "walls 0815-04 rejected",
);
assert(
  !isCeilingSingleLayerGypsumSkimActivity("Gładź gipsowa dwuwarstwowa na sufitach 0815-06"),
  "double-layer 0815-06 rejected",
);

function makeStore(withLeafRate) {
  const leaf = {
    id: LEAF,
    tradeId: "SCIANY_GK",
    namePl: "KNR 2-02 0815-05 — gładź sufit",
    unit: "m2",
    updatedAt: new Date(NOW).toISOString(),
    freshnessStatus: "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...(withLeafRate
      ? {
          ourWorkRate: {
            ourRatePln: 22.88,
            unit: "m2",
            sourceType: "AUTO_R1",
            updatedAt: new Date(NOW).toISOString(),
            observedAt: new Date(NOW).toISOString(),
            regionScope: "POLSKA",
            history: [],
          },
        }
      : {}),
  };
  const parent = {
    id: PARENT,
    tradeId: "SCIANY_GK",
    namePl: "Gładzie / tynki",
    unit: "m2",
    updatedAt: new Date(NOW).toISOString(),
    freshnessStatus: "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
  const works = [parent, leaf];
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: new Date(NOW).toISOString() },
      dolnyslask: {
        region: "dolnyslask",
        works: structuredClone(works),
        updatedAt: new Date(NOW).toISOString(),
      },
    },
    updatedAt: new Date(NOW).toISOString(),
  });
}

const ceilingLine = {
  lineId: "obl_test_ceiling",
  description: "Gładź gipsowa na sufitach jednowarstwowa m2 d.1 0815-05 poz.1",
  unit: "m2",
  quantity: 10,
  catalogWorkId: PARENT,
  matchMethod: "manual",
  matchConfidence: "high",
  candidateMatches: [],
};

const wallLine = {
  ...ceilingLine,
  lineId: "obl_test_wall",
  description:
    "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach z d.1 0815-04 elementów",
  catalogWorkId: PARENT,
};

const storeOk = makeStore(true);
const accept = evaluateCompoundToLaborLeafRebind({
  line: ceilingLine,
  store: storeOk,
  nowMs: NOW,
});
assert(accept.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "ACCEPT ceiling");
assert(accept.leafWorkId === LEAF, "leaf id");
assert(accept.ourRatePln === 22.88, "rate 22.88");
assert(accept.invent === false, "no invent");
assert(accept.ownerRuntimeDependency === 0, "ownerRuntime=0");

const applied = applyCompoundLaborLeafRebindToLine(ceilingLine, accept);
assert(applied.catalogWorkId === LEAF, "applied leaf");
assert(applied.matchMethod === "auto_contract", "auto_contract provenance");

const idem = evaluateCompoundToLaborLeafRebind({
  line: applied,
  store: storeOk,
  nowMs: NOW,
});
assert(idem.decision === "COMPOUND_LEAF_REBIND_IDEMPOTENT", "idempotent");

const wall = evaluateCompoundToLaborLeafRebind({
  line: wallLine,
  store: storeOk,
  nowMs: NOW,
});
assert(wall.decision === "COMPOUND_LEAF_REBIND_EXCEPTION", "walls HOLD");
assert(
  wall.reasons.includes("SCOPE_NOT_CEILING_SINGLE_LAYER_GYPSUM_SKIM"),
  "walls scope block",
);

const storeNoRate = makeStore(false);
const noRate = evaluateCompoundToLaborLeafRebind({
  line: ceilingLine,
  store: storeNoRate,
  nowMs: NOW,
});
assert(noRate.decision === "COMPOUND_LEAF_REBIND_EXCEPTION", "no rate BLOCK");

// Material-only pack must not authorize via ALLB when packs provided
const matPack = normalizeTechnologyPack({
  packId: "pack.test.mat_only",
  packVersion: "1.0.0",
  definitionId: "def.g2",
  packCapabilities: ["cap.x"],
  lifecycle: "ACTIVE",
  namePl: "mat",
  stages: [{ stageId: "st", order: 1, namePl: "S" }],
  steps: [
    {
      stepId: "s1",
      stageId: "st",
      order: 1,
      namePl: "P",
      catalogWorkId: PARENT,
      quantityFromBoq: true,
    },
  ],
  dependencies: [],
  materials: [
    {
      materialKey: "mat.gladz_gipsowa",
      namePl: "g",
      unit: "kg",
      qtyFactor: 1,
      factorSourceKind: "fixture_legacy",
    },
  ],
  equipment: [],
  labour: [],
  regulatory: [],
});
const matBlock = evaluateCompoundToLaborLeafRebind({
  line: ceilingLine,
  store: storeOk,
  packs: [matPack],
  nowMs: NOW,
});
assert(matBlock.decision === "COMPOUND_LEAF_REBIND_EXCEPTION", "material pack ALLB BLOCK");
assert(matBlock.reasons.includes("ALLB_BLOCK"), "ALLB_BLOCK reason");

const labPack = normalizeTechnologyPack({
  packId: "pack.test.lab",
  packVersion: "1.0.0",
  definitionId: "def.g2",
  packCapabilities: ["cap.x"],
  lifecycle: "ACTIVE",
  namePl: "lab",
  stages: [{ stageId: "st", order: 1, namePl: "S" }],
  steps: [
    {
      stepId: "s1",
      stageId: "st",
      order: 1,
      namePl: "P",
      catalogWorkId: PARENT,
      quantityFromBoq: true,
    },
    {
      stepId: "s2",
      stageId: "st",
      order: 2,
      namePl: "L",
      catalogWorkId: LEAF,
      quantityFromBoq: true,
    },
  ],
  dependencies: [],
  materials: [],
  equipment: [],
  labour: [
    {
      labourKey: LEAF,
      namePl: "0815-05",
      hoursPerUnit: 0.4375,
      factorSourceKind: "norm_ref",
      factorSourceRef: "test",
      factorApprovedAt: new Date(NOW).toISOString(),
    },
  ],
  regulatory: [],
});
const withAllb = evaluateCompoundToLaborLeafRebind({
  line: ceilingLine,
  store: storeOk,
  packs: [labPack],
  nowMs: NOW,
});
assert(withAllb.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "ACCEPT with ALLB pack");
assert(withAllb.allbPass === true, "allbPass true");
assert(withAllb.relevantPackCount === 1, "relevant pack count 1");

// TEST A — unrelated baseline packs → NO_RELEVANT_PACK_CONTEXT (≠ ALLB_BLOCK)
clearPackRegistryForTests();
ensureBaselineTechnologyPacksRegistered();
seedB0Fixtures();
seedScreedEconomyWetCementV1();
const baselinePacks = listAllPacks();
assert(baselinePacks.length === 6, "baseline pack count 6");
const relevantBaseline = selectCllrRelevantTechnologyPacks({
  packs: baselinePacks,
  parentWorkId: PARENT,
  leafWorkId: LEAF,
});
assert(relevantBaseline.length === 0, "TEST A relevantPacks=0");
const unrelated = evaluateCompoundToLaborLeafRebind({
  line: ceilingLine,
  store: storeOk,
  packs: baselinePacks,
  nowMs: NOW,
});
assert(unrelated.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "TEST A ACCEPT");
assert(
  unrelated.reasons.includes("NO_RELEVANT_PACK_CONTEXT"),
  "TEST A NO_RELEVANT_PACK_CONTEXT",
);
assert(!unrelated.reasons.includes("ALLB_BLOCK"), "TEST A no ALLB_BLOCK");
assert(unrelated.relevantPackCount === 0, "TEST A relevantPackCount=0");

// TEST B — empty packs (regression)
const emptyPacks = evaluateCompoundToLaborLeafRebind({
  line: ceilingLine,
  store: storeOk,
  packs: [],
  nowMs: NOW,
});
assert(emptyPacks.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "TEST B ACCEPT");
assert(
  emptyPacks.reasons.includes("ALLB_OPTIONAL_SKIPPED_NO_PACK"),
  "TEST B ALLB_OPTIONAL_SKIPPED_NO_PACK",
);

// TEST C — covered by withAllb above
assert(withAllb.decision === "COMPOUND_LEAF_REBIND_ACCEPT", "TEST C ACCEPT");
assert(withAllb.allbPass === true, "TEST C ALLB PASS");

// TEST D — relevant pack WITHOUT labor authorization for leaf → ALLB_BLOCK
assert(matBlock.decision === "COMPOUND_LEAF_REBIND_EXCEPTION", "TEST D EXCEPTION");
assert(matBlock.reasons.includes("ALLB_BLOCK"), "TEST D ALLB_BLOCK");
assert(matBlock.relevantPackCount === 1, "TEST D relevantPackCount=1");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
