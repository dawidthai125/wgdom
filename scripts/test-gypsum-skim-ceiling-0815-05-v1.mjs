/**
 * KNR 2-02 0815-05 gypsum skim ceiling TechnologyPack V1
 * npx vite-node scripts/test-gypsum-skim-ceiling-0815-05-v1.mjs
 */
import assert from "node:assert/strict";
import {
  canPackFeedProductionBom,
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY,
  GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2,
  GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF,
  GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
  ensureBaselineTechnologyPacksRegistered,
  getPack,
  listAllPacks,
  seedB0Fixtures,
  seedGypsumSkimCeiling081505V1,
  validateRecipeProvenance,
} from "../src/lib/technology-foundation/index.ts";
import {
  findActiveTechnologyPacksForWorkId,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/bom-technology-adapter.ts";
import { evaluateAutoBomContract } from "../src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts";
import { isExplicitLaborOnlyWork } from "../src/lib/tender-position-cost/labor-only-classification.ts";
import { evaluateLaborOnlyAutoBomV1Contract } from "../src/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract.ts";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
  seedGypsumSkimCeiling081505V1();
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

resetTf();

// A — exact leaf binding
{
  const pack = getPack(FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID, "1.0");
  ok("pack registered ACTIVE", pack?.lifecycle === "ACTIVE");
  ok(
    "exact catalogWorkId bind",
    pack?.steps.some((s) => s.catalogWorkId === GYPSUM_SKIM_CEILING_0815_05_WORK_ID),
  );
  ok(
    "workId constant matches dotted form",
    GYPSUM_SKIM_CEILING_0815_05_WORK_ID === "cw.knr.knr-2-02.0815-05.m2",
  );
}

// B — active pack discovery
{
  const found = findActiveTechnologyPacksForWorkId(GYPSUM_SKIM_CEILING_0815_05_WORK_ID);
  ok("findActive returns singleton", found.length === 1);
  ok("findActive packId", found[0]?.packId === FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID);
}

// C — BOM resolution
{
  const bom = resolveTechnologyBomForWork({
    workId: GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
    unit: "m2",
    positionQuantity: 10,
  });
  ok("BOM not MISSING_BOM", bom.status === "OK");
  ok("BOM packId", bom.packId === FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID);
  ok(
    "BOM material key",
    bom.components.some((c) => c.materialKey === GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY),
  );
  const gips = bom.components.find(
    (c) => c.materialKey === GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY,
  );
  ok(
    "qtyFactor 2.5 → 25 kg for 10 m2",
    gips?.quantityPerUnit === GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2 &&
      gips?.totalQuantity === 25,
  );
}

// D — AutoBom contract
{
  const packs = listAllPacks();
  const line = {
    lineId: "t1",
    catalogWorkId: GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
    unit: "m2",
    quantity: 12,
    description: "gładź sufit",
    matchMethod: "auto_contract",
    matchedBy: "auto_contract",
    matchConfidence: "high",
  };
  const r = evaluateAutoBomContract({
    line,
    positionQuantity: 12,
    packs,
    discoveryStore: null,
    nowMs: Date.now(),
    requireTrustedIdentity: false,
  });
  ok("AutoBom AUTO_BOM_ACCEPT", r.decision === "AUTO_BOM_ACCEPT");
  ok("AutoBom TECHNOLOGY_PACK mode", r.provenance?.mode === "TECHNOLOGY_PACK");
  ok("AutoBom bomStatus OK", r.bomStatus === "OK");
  ok(
    "AutoBom not MISSING_BOM_NO_TECHNOLOGY_PACK",
    !(r.reasons || []).includes("MISSING_BOM_NO_TECHNOLOGY_PACK"),
  );
}

// E — unrelated packs unchanged
{
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  ensureBaselineTechnologyPacksRegistered();
  const painting = getPack(FIXTURE_PAINTING_ECONOMY_PACK_ID, "1.0");
  const priming = getPack(FIXTURE_PRIMING_ECONOMY_PACK_ID, "1.0");
  ok("painting still ACTIVE", painting?.lifecycle === "ACTIVE");
  ok("priming still ACTIVE", priming?.lifecycle === "ACTIVE");
  ok(
    "painting still binds malowanie only",
    painting?.steps.every((s) => s.catalogWorkId === "legacy-malowanie-m2"),
  );
  const paintForLeaf = findActiveTechnologyPacksForWorkId(
    GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
  ).filter((p) => p.packId === FIXTURE_PAINTING_ECONOMY_PACK_ID);
  ok("painting does not bind 0815-05", paintForLeaf.length === 0);
}

// F — no LABOR_ONLY downgrade
{
  ok("not on Owner labor-only allowlist", !isExplicitLaborOnlyWork(GYPSUM_SKIM_CEILING_0815_05_WORK_ID));
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
    unit: "m2",
    discoveryStore: null,
    nowMs: Date.now(),
  });
  ok(
    "LABOR_ONLY_V1 not accept",
    v1.decision !== "LABOR_ONLY_AUTO_BOM_ACCEPT",
  );
}

// Provenance / production gate
{
  const pack = getPack(FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID, "1.0");
  ok("canPackFeedProductionBom", canPackFeedProductionBom(pack));
  const pv = validateRecipeProvenance(pack);
  ok("provenance no blocking", pv.blockingIssues.length === 0);
  ok(
    "source ref mentions BIP + PROVISIONAL",
    GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF.includes("BIP_KRAKOW_zid=134490") &&
      GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF.includes("PROVISIONAL"),
  );
}

// Parent compound must NOT fuzzy-bind
{
  const parentPacks = findActiveTechnologyPacksForWorkId("legacy-gladzie_tynki-m2");
  ok("parent compound has no pack bind", parentPacks.length === 0);
}

console.log(`\nALL PASS (${passed})`);
