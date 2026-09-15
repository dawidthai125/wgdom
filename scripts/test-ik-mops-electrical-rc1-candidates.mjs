#!/usr/bin/env node
/**
 * MOPS Electrical RC-1 — catalog + identity resolution tests (in-memory).
 * npx vite-node scripts/test-ik-mops-electrical-rc1-candidates.mjs
 *
 * ZERO cloud write · ZERO OUR RATE invent · ZERO BOM invent.
 */
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  MOPS_ELEC_RC1_CREATE_WORKS,
  MOPS_ELEC_RC1_CREATE_WORK_IDS,
  MOPS_ELEC_RC1_EXACT_ALIASES,
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_0402_03_WORK_ID,
  MOPS_ELEC_RC1_1202_01_WORK_ID,
  MOPS_ELEC_RC1_KLAMKI_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  buildMopsElecRc1CatalogWork,
  isMopsElecRc1CreateWorkId,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog.ts";
import { applyMopsElecRc1CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-ops.ts";
import {
  resolveLaborIdentityMapping,
  listWorkRateIdentityMappings,
} from "../src/lib/work-catalog/work-rate-identity-mapping.ts";
import { SEPA_KNNR_1301_01_WORK_ID } from "../src/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog.ts";
import { resolveOwnerWorkUnitCompatibility } from "../src/lib/catalog-coverage/owner-unit-compatibility.ts";
import { getOwnerClassificationPlane } from "../src/lib/intelligent-estimator/owner-classification-map.ts";

const NOW = "2026-09-15T06:00:00.000Z";

let pass = 0;
let fail = 0;
function assert(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra);
  }
}

function emptyStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: NOW,
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: NOW, works: [] },
      dolnyslask: { region: "dolnyslask", updatedAt: NOW, works: [] },
    },
  });
}

function resolve(name, unit) {
  return resolveLaborIdentityMapping({
    observedName: name,
    observedUnit: unit,
    sourceId: "*",
    laborOnly: true,
    includesMaterial: false,
  });
}

// --- catalog specs ---
assert("create count = 5", MOPS_ELEC_RC1_CREATE_WORKS.length === 5);
assert("0504-07 id", MOPS_ELEC_RC1_0504_07_WORK_ID === "knr-wc-knr-5-08-0504-07-szt");
assert("0501-03 unit kpl", MOPS_ELEC_RC1_CREATE_WORKS.find((w) => w.id === MOPS_ELEC_RC1_0501_03_WORK_ID)?.unit === "kpl");
assert("1202 unit pomiar", MOPS_ELEC_RC1_CREATE_WORKS.find((w) => w.id === MOPS_ELEC_RC1_1202_01_WORK_ID)?.unit === "pomiar");
assert("no SEPA 1301 in create", !MOPS_ELEC_RC1_CREATE_WORK_IDS.includes(SEPA_KNNR_1301_01_WORK_ID));

for (const spec of MOPS_ELEC_RC1_CREATE_WORKS) {
  const draft = buildMopsElecRc1CatalogWork(spec, NOW);
  assert(`${spec.id} zero ourWorkRate`, !draft.ourWorkRate);
  assert(`${spec.id} companyPrice 0`, draft.companyPricePln === 0);
  assert(`${spec.id} laborRatio 1`, draft.costSplit?.laborRatio === 1);
  assert(`${spec.id} helper`, isMopsElecRc1CreateWorkId(spec.id));
}

// --- seed idempotent ---
{
  const r1 = applyMopsElecRc1CatalogSeed(emptyStore(), NOW);
  assert("seed changed", r1.changed);
  assert("seed created 5", r1.createdWorkIds.length === 5);
  const w = getWorkByIdFromStore(r1.store, MOPS_ELEC_RC1_0501_03_WORK_ID);
  assert("seeded 0501-03 kpl", w?.unit === "kpl");
  assert("seeded 0501 no rate", !w?.ourWorkRate);

  const r2 = applyMopsElecRc1CatalogSeed(r1.store, NOW);
  assert("seed idempotent", r2.changed === false);
}

// Pre-seed CONNECT targets so knownWorkIds optional path still works
{
  const store = emptyStore();
  const seeded = applyMopsElecRc1CatalogSeed(store, NOW).store;
  // inject CONNECT leaves as stubs (presence only)
  for (const region of ["wroclaw", "dolnyslask"]) {
    const slice = seeded.catalogs[region];
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    for (const id of [
      MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
      MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
    ]) {
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          tradeId: "ELEKTRYKA",
          namePl: id,
          unit: "szt",
          companyPricePln: 0,
          updatedAt: NOW,
          freshnessStatus: "missing",
          active: true,
          favorite: false,
          usageCount: 0,
          source: "custom",
          costSplit: { materialRatio: 0, laborRatio: 1 },
        });
      }
    }
    seeded.catalogs[region] = {
      ...slice,
      works: [...byId.values()],
      updatedAt: NOW,
    };
  }
}

// --- identity CONNECT ---
{
  const r03 = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["0504-03"], "szt");
  assert("CONNECT 0504-03 HIT", r03.status === "HIT", JSON.stringify(r03));
  assert(
    "CONNECT 0504-03 workId",
    r03.status === "HIT" && r03.workId === MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  );

  const r07 = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"], "szt");
  assert("CREATE map 0504-07 HIT", r07.status === "HIT", JSON.stringify(r07));
  assert(
    "0504-07 ≠ oprawy leaf",
    r07.status === "HIT" && r07.workId === MOPS_ELEC_RC1_0504_07_WORK_ID,
  );
  assert(
    "0504-03 ≠ 0504-07",
    r03.status === "HIT" &&
      r07.status === "HIT" &&
      r03.workId !== r07.workId,
  );

  const r0407 = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"], "szt");
  assert("CONNECT 0407-01 HIT", r0407.status === "HIT");
  assert(
    "CONNECT 0407 workId",
    r0407.status === "HIT" &&
      r0407.workId === MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  );

  const r0501 = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"], "kpl");
  assert("0501-03 kpl HIT", r0501.status === "HIT", JSON.stringify(r0501));
  assert(
    "0501-03 workId",
    r0501.status === "HIT" && r0501.workId === MOPS_ELEC_RC1_0501_03_WORK_ID,
  );

  const r0501szt = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"], "szt");
  assert(
    "0501-03 szt must MISS (no kpl→szt)",
    r0501szt.status === "MISS",
    JSON.stringify(r0501szt),
  );

  const rRcd = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["0402-03"], "szt");
  assert("RCD HIT", rRcd.status === "HIT");
  assert(
    "RCD workId",
    rRcd.status === "HIT" && rRcd.workId === MOPS_ELEC_RC1_0402_03_WORK_ID,
  );

  const r1202 = resolve(MOPS_ELEC_RC1_EXACT_ALIASES["1202-01"], "pomiar");
  assert("1202 HIT", r1202.status === "HIT");
  assert(
    "1202 ≠ SEPA 1301",
    r1202.status === "HIT" &&
      r1202.workId === MOPS_ELEC_RC1_1202_01_WORK_ID &&
      r1202.workId !== SEPA_KNNR_1301_01_WORK_ID,
  );

  const rK = resolve(MOPS_ELEC_RC1_EXACT_ALIASES.klamki, "szt");
  assert("klamki HIT stolarka", rK.status === "HIT");
  assert(
    "klamki workId",
    rK.status === "HIT" && rK.workId === MOPS_ELEC_RC1_KLAMKI_WORK_ID,
  );
}

// --- family / suffix safety ---
{
  const wrongFloor = resolve(
    "Rozebranie posadzek z paneli podłogowych",
    "m2",
  );
  assert("floor 0504-07 semantic MISS", wrongFloor.status === "MISS");

  const sepaAlias = resolve(
    "Pomiar rezystancji izolacji obwodów 1-fazowych",
    "pomiar",
  );
  assert(
    "SEPA APF alias never binds to MOPS 1202 leaf",
    !(sepaAlias.status === "HIT" && sepaAlias.workId === MOPS_ELEC_RC1_1202_01_WORK_ID),
    JSON.stringify(sepaAlias),
  );
  if (sepaAlias.status === "HIT") {
    assert(
      "SEPA APF if present → 1301 only",
      sepaAlias.workId === SEPA_KNNR_1301_01_WORK_ID,
    );
  } else {
    assert("SEPA APF mapping absent on tip is OK for RC-1 scope", true);
  }
}

// --- owner unit compat 0501 ---
{
  const hit = resolveOwnerWorkUnitCompatibility({
    workId: MOPS_ELEC_RC1_0501_03_WORK_ID,
    sourceUnitRaw: "kpl",
  });
  assert("owner unit kpl restore", hit.ok === true && hit.catalogUnit === "kpl");
  const missSzt = resolveOwnerWorkUnitCompatibility({
    workId: MOPS_ELEC_RC1_0501_03_WORK_ID,
    sourceUnitRaw: "szt",
  });
  assert("owner unit rejects szt for 0501", missSzt.ok === false);
}

// --- classification ---
for (const id of MOPS_ELEC_RC1_CREATE_WORK_IDS) {
  assert(`plane LABOR ${id}`, getOwnerClassificationPlane(id) === "LABOR");
}

// --- registry contains MOPS mappings ---
{
  const ids = listWorkRateIdentityMappings().map((m) => m.mappingId);
  assert(
    "registry has mops 0504-03",
    ids.includes("lim-mops-elec-rc1-0504-03-oprawy-ip20"),
  );
  assert(
    "registry has mops 0504-07",
    ids.includes("lim-mops-elec-rc1-0504-07-oprawy-ip44"),
  );
  assert(
    "registry has klamki",
    ids.includes("lim-mops-elec-rc1-klamki-stolarka"),
  );
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
