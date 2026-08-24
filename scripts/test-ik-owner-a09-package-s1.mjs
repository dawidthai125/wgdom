/**
 * IK-OWNER-A09-PACKAGE-S1 — contract tests (catalog + PACKAGE plane + no identity).
 *
 * npx vite-node scripts/test-ik-owner-a09-package-s1.mjs
 */
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  buildIkOwnerCreateA09PackageCatalogWork,
} from "../src/lib/work-catalog/ik-owner-create-a09-package-catalog.ts";
import {
  applyA09PackageCatalogSeed,
  workMatchesOwnerApprovedA09PackageSpec,
} from "../src/lib/work-catalog/ik-owner-create-a09-package-ops.ts";
import {
  WORK_RATE_IDENTITY_MAPPINGS,
  setWorkRateIdentityMappingsForTests,
} from "../src/lib/work-catalog/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";

const NOW = "2026-08-23T22:00:00.000Z";
const WORK = IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
const HOST = IK_OWNER_A09_REJECTED_LABOR_HOST_ID;

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

function freshStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    updatedAt: NOW,
    catalogs: {
      wroclaw: { works: [], updatedAt: NOW },
      dolnyslask: { works: [], updatedAt: NOW },
    },
  });
}

setWorkRateIdentityMappingsForTests(null);

/** Mirrors ik-p5-internal-first-index classifyCatalogWorkDomain (private). */
function catalogWorkDomainIsPackage(work) {
  const split = work.costSplit;
  return split != null && split.materialRatio >= 0.25 && split.laborRatio >= 0.25;
}

// T1 workId exact
ok("T1 workId exact", WORK === "cc-w2-scianki-dzialowe-gr-pakiet-m2");

// T2 domain PACKAGE
{
  const draft = buildIkOwnerCreateA09PackageCatalogWork(NOW);
  ok(
    "T2 domain PACKAGE",
    catalogWorkDomainIsPackage(draft) &&
      draft.costSplit?.materialRatio === IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT.materialRatio &&
      draft.costSplit?.laborRatio === IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT.laborRatio,
    draft,
  );
}

// T3 unit m2
ok("T3 unit m2", buildIkOwnerCreateA09PackageCatalogWork(NOW).unit === "m2");

// T4 namePl / semantic fields
{
  const d = buildIkOwnerCreateA09PackageCatalogWork(NOW);
  ok(
    "T4 namePl semantic",
    /ścianki działowe/i.test(d.namePl) && d.namePl.includes("pakiet"),
    d.namePl,
  );
  ok(
    "T4 description references G177 KNR",
    d.descriptionPl?.includes("G177") && d.descriptionPl?.includes("55-01"),
    d.descriptionPl,
  );
  ok("T4 verbatim BOQ constant present", IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ.length > 40);
}

// T5 no duplicate id collision with LABOR host
ok("T5 workId != LABOR host", WORK !== HOST);

// T6 region wroclaw
{
  const r = applyA09PackageCatalogSeed(freshStore(), NOW);
  ok(
    "T6 wroclaw",
    workMatchesOwnerApprovedA09PackageSpec(getWorkByIdFromStore(r.store, WORK, "wroclaw")),
  );
}

// T7 region dolnyslask
{
  const r = applyA09PackageCatalogSeed(freshStore(), NOW);
  ok(
    "T7 dolnyslask",
    workMatchesOwnerApprovedA09PackageSpec(getWorkByIdFromStore(r.store, WORK, "dolnyslask")),
  );
}

// T8 idempotent re-run
{
  const s0 = freshStore();
  const r1 = applyA09PackageCatalogSeed(s0, NOW);
  const r2 = applyA09PackageCatalogSeed(r1.store, NOW);
  ok("T8 idempotent changed=false", r2.changed === false);
}

// T9 LABOR host not reused as PACKAGE workId
{
  const d = buildIkOwnerCreateA09PackageCatalogWork(NOW);
  ok("T9 not LABOR host id", d.id !== HOST);
  ok("T9 no rate 118", d.companyPricePln !== 118 && d.ourWorkRate == null);
}

// T10 no identity mapping added
{
  const ids = WORK_RATE_IDENTITY_MAPPINGS.map((r) => r.mappingId);
  ok("T10 registry count still 4", WORK_RATE_IDENTITY_MAPPINGS.length === 4, ids);
  ok(
    "T10 no G177 mapping row",
    !ids.some((id) => id.includes("g177") || id.includes("scianki-dzialowe")),
    ids,
  );
  const aliases = WORK_RATE_IDENTITY_MAPPINGS.flatMap((r) => [...r.observedNameAliases]);
  ok(
    "T10 no G177 verbatim alias in identity registry",
    !aliases.some((a) => a === IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ),
    aliases,
  );
}

console.log(`\nA09-PACKAGE-S1: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
