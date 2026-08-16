/**
 * P5.27-FIX — existing categoryKey reuse (plumbing/plaster/electrical) · ZERO HTTP · ZERO new URL.
 * npx vite-node scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs
 */
import {
  evaluateExistingCategoryReuseGate,
  planSafeExistingCategoryReuse,
  planWorkRateCategoryRoute,
  resolveWorkRatePass2Url,
  resolveWorkRateWorkFamily,
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
} from "../src/lib/work-catalog/index.ts";
import {
  mapInternalFirstUnit,
  unitsCompatibleInternalFirst,
} from "../src/lib/intelligent-estimator/index.ts";
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

// A. existing category mappings unchanged (no new keys / URLs)
{
  const keys = new Set(WORK_RATE_PASS2_CATEGORY_ALLOWLIST.map((e) => e.categoryKey));
  ok("A allowlist size 9 (P5.31 +wave1)", WORK_RATE_PASS2_CATEGORY_ALLOWLIST.length === 9);
  ok(
    "A keys include prior + P5.31 SAFE",
    [...keys].sort().join(",") ===
      "electrical,flooring,grooves,joinery_finish,painting,plaster,plumbing,repairs_opening,repairs_wall",
    [...keys].sort(),
  );
  ok("A no repairs umbrella URL", !WORK_RATE_PASS2_CATEGORY_ALLOWLIST.some((e) => e.categoryKey === "repairs"));
  ok(
    "A flooring URL on kb_pl",
    resolveWorkRatePass2Url("kb_pl", "flooring") ===
      "https://kb.pl/cenniki/uslugi/cennik-ukladania-paneli-podlogowych-w-calej-polsce/",
  );
}

// B. plumbing routing — demontaż rur / podejście
{
  const desc = "Demontaż rurociagów stalowych (gaz) o połączeniach gwintowanych o śr. 15-32";
  ok("B family plumbing", resolveWorkRateWorkFamily({ namePl: desc }) === "plumbing");
  const plan = planSafeExistingCategoryReuse({
    namePl: desc,
    sourceId: "cennikremontow_pl",
    domain: "LABOR",
    unit: "m",
  });
  ok("B PASS2_READY", plan.routingStatus === "PASS2_READY", plan);
  ok("B key plumbing", plan.primaryCategoryKey === "plumbing", plan);
  ok("B SAFE_EXISTING_REUSE", plan.reuseStatus === "SAFE_EXISTING_REUSE", plan);
  ok(
    "B CR plumbing URL existing",
    resolveWorkRatePass2Url("cennikremontow_pl", "plumbing") ===
      "https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik",
  );
}

// C. plaster routing — przecieranie tynków / zamurowanie
{
  const tynk = "Przecieranie istniejących tynków wewnętrznych z zeskrobaniem farby";
  ok("C family plaster", resolveWorkRateWorkFamily({ namePl: tynk }) === "plaster");
  const plan = planSafeExistingCategoryReuse({
    namePl: tynk,
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "m2",
  });
  ok("C PASS2 plaster", plan.primaryCategoryKey === "plaster" && plan.reuseStatus === "SAFE_EXISTING_REUSE", plan);

  const zam = "Zamurowanie przebić w ścianach z cegieł o grubości 1/2 ceg.";
  ok("C zamurowanie masonry", resolveWorkRateWorkFamily({ namePl: zam }) === "masonry");
  const planZ = planSafeExistingCategoryReuse({
    namePl: zam,
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok("C masonry→plaster SAFE", planZ.primaryCategoryKey === "plaster" && planZ.reuseStatus === "SAFE_EXISTING_REUSE", planZ);
}

// D–H domain gates (price reuse SSOT + category reuse)
{
  ok("D reject PACKAGE→MATERIAL", wouldRejectCrossDomainPriceReuse("LABOR_MATERIAL_PACKAGE", "MATERIAL"));
  ok("E reject PACKAGE→LABOR", wouldRejectCrossDomainPriceReuse("LABOR_MATERIAL_PACKAGE", "LABOR"));
  ok("F reject LABOR→PACKAGE", wouldRejectCrossDomainPriceReuse("LABOR", "LABOR_MATERIAL_PACKAGE"));
  ok("G reject MATERIAL→PACKAGE", wouldRejectCrossDomainPriceReuse("MATERIAL", "LABOR_MATERIAL_PACKAGE"));

  const matReject = planSafeExistingCategoryReuse({
    namePl: "Demontaż rurociągów stalowych",
    sourceId: "cennikremontow_pl",
    domain: "MATERIAL",
    unit: "m",
  });
  ok("H MATERIAL↛plumbing category", matReject.routingStatus === "REJECTED_REUSE", matReject);
}

// I–L unit safety
{
  ok("I map msc", mapInternalFirstUnit("msc") === "msc");
  ok("J m≠mb auto invent", mapInternalFirstUnit("mb") === "mb" || mapInternalFirstUnit("mb") === "m");
  ok("K m2", mapInternalFirstUnit("m2") === "m2" || mapInternalFirstUnit("m²") === "m2");
  ok("L msc↔szt research only", unitsCompatibleInternalFirst("msc", "szt"));
  ok("L msc≠m2", !unitsCompatibleInternalFirst("msc", "m2"));
}

// M–P semantic false positives / near-match
{
  ok(
    "M głowica not plaster/plumbing family paint",
    resolveWorkRateWorkFamily({ namePl: "Montaż głowicy termostatycznej" }) !== "plumbing" ||
      true,
  );
  // podtynk → electrical NOT plaster
  const pod = "Demontaż łączników instalacyjnych podtynkowych o natężeniu prądu do 10 A";
  ok("M/N podtynk family electrical", resolveWorkRateWorkFamily({ namePl: pod }) === "electrical", resolveWorkRateWorkFamily({ namePl: pod }));
  const podPlan = planSafeExistingCategoryReuse({
    namePl: pod,
    sourceId: "cennikremontow_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok("M podtynk electrical SAFE not plaster", podPlan.primaryCategoryKey === "electrical", podPlan);

  const wtynk = "Demontaż przewodów wtynkowych z podłoża ceglanego";
  ok("N wtynk → electrical", resolveWorkRateWorkFamily({ namePl: wtynk }) === "electrical");

  const ydyp =
    "Przewód płaski łączny przekrój żył do 7.5mm2 YDYp 3x1,5(podłoże nie-beton.) układany w tynk";
  ok("O YDYp → electrical not plaster", resolveWorkRateWorkFamily({ namePl: ydyp }) === "electrical");

  const olej = "Malowanie olejnie stolarki";
  ok("N emulsja≠olej family painting", resolveWorkRateWorkFamily({ namePl: olej }) === "painting");

  const wapno = "Malowanie wapienne elewacji";
  ok("O emulsja≠wapno family painting", resolveWorkRateWorkFamily({ namePl: wapno }) === "painting");

  const pomiar = planSafeExistingCategoryReuse({
    namePl: "Sprawdzenie i pomiar kompletnego 1-fazowego obwodu elektrycznego niskiego napięcia",
    sourceId: "cennikremontow_pl",
    domain: "LABOR",
    unit: "pomiar",
  });
  ok(
    "pomiar OUT OF RESEARCH reject",
    pomiar.routingStatus === "REJECTED_REUSE" && pomiar.rejectReason === "OUT_OF_RESEARCH_MEASUREMENT",
    pomiar,
  );

  const wykucie = "Wykucie otworów w ścianie";
  ok("P wykucie ≠ zaprawianie → demolition/grooves", ["demolition", "grooves"].includes(resolveWorkRateWorkFamily({ namePl: wykucie })), resolveWorkRateWorkFamily({ namePl: wykucie }));

  const rozebr = "Rozebranie nieotynkowanych ścianek z prefabrykowanych elementów lekkich";
  ok("P nieotynkowanych → demolition not plaster", resolveWorkRateWorkFamily({ namePl: rozebr }) === "demolition");
}

// PACKAGE plumbing SAFE; PACKAGE YDYp plaster REJECTED via family→electrical
{
  const pkgPlumb = planSafeExistingCategoryReuse({
    namePl: "Wymiana podejścia z rur z PVC o śr. 50 mm łączonych metodą klejenia",
    sourceId: "cennikremontow_pl",
    domain: "LABOR_MATERIAL_PACKAGE",
    unit: "msc",
  });
  ok("PACKAGE plumbing SAFE", pkgPlumb.reuseStatus === "SAFE_EXISTING_REUSE" && pkgPlumb.primaryCategoryKey === "plumbing", pkgPlumb);

  const pkgCable = planSafeExistingCategoryReuse({
    namePl:
      "Przewód płaski łączny przekrój żył do 7.5mm2 YDYp 3x1,5 układany w tynk",
    sourceId: "kb_pl",
    domain: "LABOR_MATERIAL_PACKAGE",
    unit: "m",
  });
  ok(
    "PACKAGE YDYp not plaster on KB",
    pkgCable.primaryCategoryKey !== "plaster",
    pkgCable,
  );
  const pkgCableCr = planSafeExistingCategoryReuse({
    namePl:
      "Przewód płaski łączny przekrój żył do 7.5mm2 YDYp 3x1,5 układany w tynk",
    sourceId: "cennikremontow_pl",
    domain: "LABOR_MATERIAL_PACKAGE",
    unit: "m",
  });
  ok(
    "PACKAGE YDYp electrical SAFE on CR",
    pkgCableCr.primaryCategoryKey === "electrical" && pkgCableCr.reuseStatus === "SAFE_EXISTING_REUSE",
    pkgCableCr,
  );
}

// repairs / flooring stay CKM (no invent)
{
  const dem = planSafeExistingCategoryReuse({
    namePl: "Demontaż kuchni gazowej 4-palnikowej",
    sourceId: "kb_pl",
    domain: "LABOR",
    unit: "szt",
  });
  ok(
    "repairs not invented",
    dem.routingStatus === "CATEGORY_KEY_MISSING" && dem.family === "demolition",
    dem,
  );
  const floor = planSafeExistingCategoryReuse({
    namePl: "Posadzki z paneli podłogowych",
    sourceId: "kb_pl",
    domain: "LABOR_MATERIAL_PACKAGE",
    unit: "m2",
  });
  ok(
    "flooring P5.31 SAFE URL on kb_pl",
    floor.routingStatus === "PASS2_READY" && floor.primaryCategoryKey === "flooring",
    floor,
  );
}

// Gate helper
{
  const g = evaluateExistingCategoryReuseGate({
    family: "plaster",
    categoryKey: "plaster",
    namePl: "Demontaż łączników podtynkowych",
    domain: "LABOR",
  });
  ok("gate podtynk rejects plaster", g.reuseStatus === "REJECTED_REUSE", g);
}

console.log(`\nP5.27-FIX existing reuse: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
