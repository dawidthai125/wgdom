/**
 * P5.31 — category key create / allowlist routes (SAFE only).
 * HTTP=0 · Accept=0 · CatalogWork=0
 * npx vite-node scripts/test-ik-migration-01-p531-category-key-create-route.mjs
 */
import {
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  listWorkRatePass2CategoryKeysForWork,
  planWorkRateCategoryRoute,
  preferredCategoryKeysForDemolition,
  resolveWorkRatePass2Url,
  resolveWorkRateWorkFamily,
} from "../src/lib/work-catalog/index.ts";
import { wouldRejectCrossDomainPriceReuse } from "../src/lib/intelligent-estimator/index.ts";

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

const pairs = WORK_RATE_PASS2_CATEGORY_ALLOWLIST.map((e) => `${e.sourceId}::${e.categoryKey}`);
const urls = WORK_RATE_PASS2_CATEGORY_ALLOWLIST.map((e) => e.url);

// A uniqueness
ok("A allowlist 9", WORK_RATE_PASS2_CATEGORY_ALLOWLIST.length === 9);
ok("A unique source+key", new Set(pairs).size === pairs.length, pairs);
ok("A no empty URL", urls.every((u) => /^https:\/\//.test(u)));
ok("A no repairs umbrella", !pairs.some((p) => p.endsWith("::repairs")));
ok("A no repairs_electrical", !pairs.some((p) => p.includes("repairs_electrical")));
ok("A no repairs_appliance", !pairs.some((p) => p.includes("repairs_appliance")));
ok("A no shops hosts", !urls.some((u) => /leroy|castorama|obi/i.test(u)));

// B flooring
ok(
  "B flooring kb URL",
  resolveWorkRatePass2Url("kb_pl", "flooring") ===
    "https://kb.pl/cenniki/uslugi/cennik-ukladania-paneli-podlogowych-w-calej-polsce/",
);
ok(
  "B flooring family",
  resolveWorkRateWorkFamily({ namePl: "Posadzki z paneli podłogowych" }) === "flooring",
);
{
  const plan = planWorkRateCategoryRoute({
    namePl: "Posadzki z paneli podłogowych",
    sourceId: "kb_pl",
    domain: "LABOR_MATERIAL_PACKAGE",
    unit: "m2",
  });
  ok("B flooring PACKAGE PASS2", plan.routingStatus === "PASS2_READY" && plan.primaryCategoryKey === "flooring", plan);
}

// C repairs wall / opening separation
ok(
  "C wall prefs",
  preferredCategoryKeysForDemolition(
    "Rozebranie nieotynkowanych ścianek z prefabrykowanych elementów lekkich",
  )[0] === "repairs_wall",
);
ok(
  "C opening prefs",
  preferredCategoryKeysForDemolition("Wykucie otworów w ścianach z cegieł o grubości 1/2 ceg.")[0] ===
    "repairs_opening",
);
ok(
  "C ościeżnice → opening",
  preferredCategoryKeysForDemolition("Wykucie z muru ościeżnic drewnianych o powierzchni do 2 m2")[0] ===
    "repairs_opening",
);
{
  const wall = planWorkRateCategoryRoute({
    namePl: "Rozebranie ścianki z cegieł o grubości 1/2 ceg.",
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "m2",
  });
  ok("C wall PASS2 repairs_wall", wall.primaryCategoryKey === "repairs_wall", wall);
  const open = planWorkRateCategoryRoute({
    namePl: "Wykucie otworów w ścianach z cegieł",
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "m2",
  });
  ok("C opening PASS2 repairs_opening", open.primaryCategoryKey === "repairs_opening", open);
}

// D joinery
ok(
  "D joinery family",
  resolveWorkRateWorkFamily({ namePl: "Założenie na nowym miejscu klamek z szyldami" }) === "joinery",
);
{
  const plan = planWorkRateCategoryRoute({
    namePl: "Założenie odbojników drzwiowych",
    sourceId: "cennikremontow_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok("D joinery PASS2", plan.routingStatus === "PASS2_READY" && plan.primaryCategoryKey === "joinery_finish", plan);
}

// E G187 blocked
{
  const plan = planWorkRateCategoryRoute({
    namePl: "Założenie numeru porządkowego lokalu",
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok("E G187 FAMILY_UNKNOWN", plan.routingStatus === "FAMILY_UNKNOWN", plan);
}

// F deferred electrical/appliance demontaż — no SAFE demontaż URL (not install page)
{
  const el = planWorkRateCategoryRoute({
    namePl: "Demontaż puszek z tworzyw sztucznych i metalowych",
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok("F demontaż puszek not PASS2 wall/opening", el.routingStatus === "CATEGORY_KEY_MISSING", el);
  const app = planWorkRateCategoryRoute({
    namePl: "Demontaż kuchni gazowej 4 - palnikowej z piekarnikiem",
    sourceId: "cennikremontow_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok("F appliance demontaż blocked", app.routingStatus === "CATEGORY_KEY_MISSING", app);
}

// G grooves ≠ opening
ok(
  "G wykucie bruzd still grooves",
  resolveWorkRateWorkFamily({ namePl: "Wykucie bruzd poziomych 1/4x1 ceg." }) === "grooves",
);

// H domain safety
ok("H PACKAGE↛MATERIAL", wouldRejectCrossDomainPriceReuse("LABOR_MATERIAL_PACKAGE", "MATERIAL"));
ok("H LABOR↛PACKAGE", wouldRejectCrossDomainPriceReuse("LABOR", "LABOR_MATERIAL_PACKAGE"));
{
  const mat = planWorkRateCategoryRoute({
    namePl: "Posadzki z paneli podłogowych",
    sourceId: "kb_pl",
    domain: "MATERIAL",
    unit: "m2",
  });
  ok("H MATERIAL↛flooring labor category", mat.routingStatus === "REJECTED_REUSE", mat);
}

// I no shop on LABOR keys
for (const e of WORK_RATE_PASS2_CATEGORY_ALLOWLIST) {
  ok(`I host ok ${e.categoryKey}`, /kb\.pl|cennikremontow\.pl/.test(e.url));
}

// J listWork keys capped
{
  const keys = listWorkRatePass2CategoryKeysForWork({
    namePl: "Rozebranie nieotynkowanych ścianek",
    sourceId: "kb_pl",
  });
  ok("J wall keys include repairs_wall", keys[0] === "repairs_wall", keys);
  ok("J max 2", keys.length <= 2, keys);
}

console.log(`\nP5.31 RESULT ${passed} PASS / ${failed} FAIL`);
if (failed) process.exit(1);
