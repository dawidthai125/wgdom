/**
 * P5.26-FIX — categoryKey / PASS2 / empty-class / unit / soft family (ZERO live HTTP).
 * npx vite-node scripts/test-ik-migration-01-p526-fix-category-pass2.mjs
 */
import {
  classifyWorkRateLookupEmpty,
  listWorkRatePass2CategoryKeysForWork,
  planWorkRateCategoryRoute,
  resolveWorkRatePass2Url,
  resolveWorkRateSelectiveLookupRequest,
  resolveWorkRateWorkFamily,
  softWorkRateFamilyText,
} from "../src/lib/work-catalog/index.ts";
import {
  mapInternalFirstUnit,
  softInternalFirstText,
  unitsCompatibleInternalFirst,
} from "../src/lib/intelligent-estimator/index.ts";

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

const G087 =
  "Zamurowanie przebić w ścianach z cegieł o grubości 1/2 ceg.";
const G090 =
  "Wymiana podejścia z rur z PVC o śr. 50 mm łączonych metodą klejenia";
const G013 =
  "Demontaż rurociagów stalowych (gaz) o połączeniach gwintowanych o śr. 15-32";

// A. G087 categoryKey != null on proper path (KB has plaster fallback for masonry)
{
  const fam = resolveWorkRateWorkFamily({ namePl: G087 });
  ok("A family G087 masonry", fam === "masonry", fam);
  const plan = planWorkRateCategoryRoute({
    namePl: G087,
    sourceId: "kb_pl",
  });
  ok("A G087 routing PASS2_READY", plan.routingStatus === "PASS2_READY", plan);
  ok("A G087 categoryKey != null", plan.primaryCategoryKey != null, plan);
  ok(
    "A G087 categoryKey plaster (masonry_plaster absent)",
    plan.primaryCategoryKey === "plaster",
    plan,
  );
  const url = resolveWorkRatePass2Url("kb_pl", plan.primaryCategoryKey);
  ok("A G087 PASS2 URL resolved", Boolean(url && /gladzi|szpachlowania/i.test(url)), url);
  const req = resolveWorkRateSelectiveLookupRequest({
    sourceId: "kb_pl",
    query: softInternalFirstText(G087).slice(0, 60),
    categoryKey: plan.primaryCategoryKey,
  });
  ok("A G087 lookup contract PASS2_CATEGORY", req.ok && req.discoveryMethod === "PASS2_CATEGORY", req);
}

// B. PASS2 only when contract requires (allowlist hit)
{
  const planCr = planWorkRateCategoryRoute({
    namePl: G090,
    sourceId: "cennikremontow_pl",
  });
  ok("B G090 family plumbing", planCr.family === "plumbing", planCr);
  ok("B G090 PASS2_READY", planCr.routingStatus === "PASS2_READY", planCr);
  ok("B G090 categoryKey plumbing", planCr.primaryCategoryKey === "plumbing", planCr);
  const pass2 = resolveWorkRatePass2Url("cennikremontow_pl", "plumbing");
  ok(
    "B CR plumbing URL",
    pass2 === "https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik",
    pass2,
  );
  const sccot = planWorkRateCategoryRoute({ namePl: G090, sourceId: "sccot" });
  ok(
    "B sccot plumbing → CATEGORY_KEY_MISSING (no PASS2 allowlist)",
    sccot.routingStatus === "CATEGORY_KEY_MISSING",
    sccot,
  );
  ok(
    "B sccot emptyClass CATEGORY_KEY_MISSING",
    sccot.emptyClassIfBlocked === "CATEGORY_KEY_MISSING",
    sccot,
  );
}

// C. G090 unit msc
{
  ok("C map msc", mapInternalFirstUnit("msc") === "msc");
  ok("C map msc.", mapInternalFirstUnit("msc.") === "msc");
  ok("C msc↔szt compatible research", unitsCompatibleInternalFirst("msc", "szt"));
  ok("C szt↔msc compatible", unitsCompatibleInternalFirst("szt", "msc"));
  ok("C msc≠m2", !unitsCompatibleInternalFirst("msc", "m2"));
  const plan = planWorkRateCategoryRoute({
    namePl: G090,
    sourceId: "cennikremontow_pl",
  });
  ok(
    "C G090 category route independent of unit",
    plan.primaryCategoryKey === "plumbing",
    plan,
  );
}

// D. G013 soft / diacritics → plumbing not demolition
{
  const soft = softWorkRateFamilyText(G013);
  ok("D soft demontaz", soft.includes("demontaz") && soft.includes("rurociagow"), soft);
  const fam = resolveWorkRateWorkFamily({ namePl: G013 });
  ok("D G013 family plumbing (not demolition)", fam === "plumbing", fam);
  const keys = listWorkRatePass2CategoryKeysForWork({
    namePl: G013,
    sourceId: "cennikremontow_pl",
  });
  ok("D G013 CR keys include plumbing", keys.includes("plumbing"), keys);
}

// E. PARSE_EMPTY ≠ SOURCE_NO_MATCH / CATEGORY_KEY_MISSING
{
  const blocked = classifyWorkRateLookupEmpty({
    lookupOk: true,
    categoryKey: null,
    routingStatus: "CATEGORY_KEY_MISSING",
    offerCount: 0,
  });
  ok("E blocked → CATEGORY_KEY_MISSING", blocked === "CATEGORY_KEY_MISSING", blocked);

  const parserEmpty = classifyWorkRateLookupEmpty({
    lookupOk: true,
    categoryKey: "plumbing",
    discoveryMethod: "PASS2_CATEGORY",
    routingStatus: "PASS2_READY",
    offerCount: 0,
    rawRowCandidates: 12,
  });
  ok("E PASS2 zero offers → PARSER_EMPTY", parserEmpty === "PARSER_EMPTY", parserEmpty);

  const noRows = classifyWorkRateLookupEmpty({
    lookupOk: true,
    categoryKey: "plaster",
    discoveryMethod: "PASS2_CATEGORY",
    offerCount: 0,
    rawRowCandidates: 0,
  });
  ok("E zero rows → PARSER_EMPTY", noRows === "PARSER_EMPTY", noRows);

  const unavail = classifyWorkRateLookupEmpty({
    lookupOk: false,
    lookupError: "HTTP_503",
    categoryKey: "plumbing",
    offerCount: 0,
  });
  ok("E lookup fail → SOURCE_UNAVAILABLE", unavail === "SOURCE_UNAVAILABLE", unavail);

  ok(
    "E PARSER_EMPTY !== SOURCE_NO_MATCH label",
    parserEmpty !== "SOURCE_NO_MATCH" && blocked !== "SOURCE_NO_MATCH",
  );
}

// Regression: grooves / painting / head≠radiator semantics via family
{
  ok(
    "R zamurowanie bruzd → grooves",
    resolveWorkRateWorkFamily({ namePl: "Zaprawianie / zamurowanie bruzd" }) ===
      "grooves",
  );
  ok(
    "R wykucie bruzd → grooves",
    resolveWorkRateWorkFamily({ namePl: "Wykucie bruzd w betonie" }) === "grooves",
  );
  ok(
    "R malowanie emulsją → painting",
    resolveWorkRateWorkFamily({ namePl: "Malowanie ścian emulsją" }) === "painting",
  );
  ok(
    "R głowica not plumbing via grzejnik alone",
    resolveWorkRateWorkFamily({ namePl: "Głowica termostatyczna" }) !== "plumbing",
  );
}

console.log(`\nP5.26-FIX category/PASS2: ${passed} PASS / ${failed} FAIL`);
process.exit(failed ? 1 : 0);
