/**
 * GO21 — AUTO_G1_ACCEPT runtime unit tests (pure · no package mutation of TPI).
 * node / npx vite-node scripts/test-auto-g1-accept-runtime-go21.mjs
 */
import { createHash } from "node:crypto";

const {
  evaluateAutoG1Contract,
  applyAutoG1AcceptToLine,
  applyAutoG1ExceptionToLine,
  AUTO_G1_MATCH_METHOD,
  AUTO_G1_GK_LOCKED_WINNER,
  AUTO_G1_RULE_GK_CLADDING_SCIANKI,
  isGkCladdingFamilyDescription,
} = await import("../src/lib/intelligent-estimator/orchestra/auto-g1-accept-contract.ts");
const { resolveWorkIdentityFromOfferBoqLine } = await import(
  "../src/lib/tender-position-cost/boq-shadow-adapter.ts"
);
const { hasCompleteTrustedIdentityTuple } = await import(
  "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts"
);

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

function baseLine(over = {}) {
  return {
    lineId: "obl_test_001",
    lp: "1",
    description: "test",
    quantity: 1,
    quantityRaw: "1",
    unit: "m2",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...over,
  };
}

function cand(id, matchedBy, conf, role = "candidate") {
  return {
    catalogWorkId: id,
    workNamePl: id,
    workCategory: "",
    tradeId: null,
    score: matchedBy === "catalog_map" ? 80 : 40,
    role,
    matchedBy,
    matchConfidence: conf,
    rationale: "t",
  };
}

// 1. no locked rule → EXCEPTION even with single catalog_map (fail-closed · no wrong-family AUTO)
{
  const line = baseLine({
    description: "Montaż drzwi wewnętrznych m2",
    matchMethod: "catalog_map",
    candidateMatches: [
      cand("p2b-skrzydla-drzwiowe-wewnetrzne-m2", "catalog_map", "medium", "primary"),
      cand("legacy-gladzie_tynki-m2", "keyword", "low"),
    ],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_EXCEPTION", "1 no locked rule → EXCEPTION (fail-closed)");
  ok(r.catalogWorkId == null, "1 no fabricate");
}

// 1b. GK locked rule AUTO + F5 OK
{
  const line = baseLine({
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) m2 2006-04 pojedyncze na stropach na rusztach",
    candidateMatches: [
      cand(AUTO_G1_GK_LOCKED_WINNER, "catalog_map", "medium"),
      cand("legacy-gk-m2", "keyword", "low"),
      cand("legacy-gladzie_tynki-m2", "catalog_map", "high", "primary"),
    ],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_ACCEPT", "1b GK ACCEPT");
  const applied = applyAutoG1AcceptToLine(line, r);
  ok(applied.matchMethod === AUTO_G1_MATCH_METHOD, "1b provenance auto_contract");
  ok(applied.matchMethod !== "manual", "1b never manual");
  const id = resolveWorkIdentityFromOfferBoqLine(applied);
  ok(id.status === "OK" && id.workId === AUTO_G1_GK_LOCKED_WINNER, "1b F5 OK after AUTO");
}

// 2–3. GK locked rule
{
  const desc =
    "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) m2 2006-04 pojedyncze na stropach na rusztach";
  ok(isGkCladdingFamilyDescription(desc), "2 GK family detector");
  const line = baseLine({
    description: desc,
    candidateMatches: [
      cand(AUTO_G1_GK_LOCKED_WINNER, "catalog_map", "medium"),
      cand("legacy-gk-m2", "keyword", "low"),
      cand("legacy-gladzie_tynki-m2", "catalog_map", "high", "primary"),
      cand("cw.etics.render", "keyword", "low"),
    ],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_ACCEPT", "3 GK → ACCEPT");
  ok(r.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER, "3 scianki winner");
  ok(r.ruleId === AUTO_G1_RULE_GK_CLADDING_SCIANKI, "3 rule id");
  ok(r.discardedContaminationIds.includes("legacy-gladzie_tynki-m2"), "5 contamination filtered");
}

// 4. competing without locked rule → EXCEPTION
{
  const line = baseLine({
    description: "Roboty instalacyjne ogólne m2",
    candidateMatches: [
      cand("work-a-m2", "catalog_map", "medium"),
      cand("work-b-m2", "catalog_map", "medium"),
    ],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_EXCEPTION", "4 competing → EXCEPTION");
  ok(r.catalogWorkId == null, "4 no fabricate");
}

// 6–7. not first / not highest score
{
  const line = baseLine({
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) 2006-04 na stropach na rusztach",
    candidateMatches: [
      // gladzie would be "primary"/high score — must NOT win
      cand("legacy-gladzie_tynki-m2", "catalog_map", "high", "primary"),
      cand(AUTO_G1_GK_LOCKED_WINNER, "catalog_map", "medium"),
      cand("legacy-gk-m2", "keyword", "low"),
    ],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  ok(r.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER, "6/7 not first/high-score gladzie");
}

// 8. invalid / missing unit
{
  const r = evaluateAutoG1Contract(baseLine({ unit: "", description: "Something real enough work" }), {
    nowMs: 1,
  });
  ok(r.decision === "AUTO_G1_EXCEPTION" && r.reasons.includes("INVALID_OR_MISSING_UNIT"), "8 missing unit");
}

// 9. lineId continuity — apply does not change lineId
{
  const line = baseLine({
    lineId: "obl_keep_me",
    description: "Montaż drzwi wewnętrznych m2",
    candidateMatches: [cand("p2b-skrzydla-drzwiowe-wewnetrzne-m2", "catalog_map", "medium")],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  const a = applyAutoG1AcceptToLine(line, r);
  ok(a.lineId === "obl_keep_me", "9 lineId unchanged");
}

// 10–12. idempotent / preserve trusted
{
  const trusted = baseLine({
    catalogWorkId: "legacy-malowanie-m2",
    matchMethod: "manual",
    matchedBy: "manual",
    matchConfidence: "high",
    candidateMatches: [],
  });
  ok(hasCompleteTrustedIdentityTuple(trusted), "12 trusted tuple");
  const r = evaluateAutoG1Contract(trusted, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_EXCEPTION" && r.reasons.some((x) => x.includes("ALREADY_TRUSTED")), "12 AUTO skip trusted");

  const gkLine = baseLine({
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) 2006-04 na stropach na rusztach",
    candidateMatches: [
      cand(AUTO_G1_GK_LOCKED_WINNER, "catalog_map", "medium"),
      cand("legacy-gladzie_tynki-m2", "catalog_map", "high", "primary"),
    ],
  });
  const autoOnce = applyAutoG1AcceptToLine(gkLine, evaluateAutoG1Contract(gkLine, { nowMs: 1 }));
  const again = evaluateAutoG1Contract(autoOnce, { nowMs: 2 });
  ok(again.reasons.some((x) => x.includes("ALREADY_TRUSTED")), "11 idempotent skip re-accept");
  ok(autoOnce.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER, "10 persisted shape");
}

// 15. exception keeps candidates
{
  const line = baseLine({
    description: "Dopasowanie skrzydeł okiennych-Konserwacja, naprawa",
    unit: "szt",
    candidateMatches: [cand("legacy-elektryka-szt", "keyword", "low")],
  });
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  const e = applyAutoG1ExceptionToLine(line, r);
  ok(r.decision === "AUTO_G1_EXCEPTION", "15 window EXCEPTION");
  ok(e.candidateMatches.length === 1, "15 candidates preserved");
  ok(e.catalogWorkId == null, "15 no invent");
}

// 18. no tender-specific lineIds in module source
{
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync(
      new URL("../src/lib/intelligent-estimator/orchestra/auto-g1-accept-contract.ts", import.meta.url),
      "utf8",
    ),
  );
  ok(!/obl_300e0d2b|ocds-148610|kosciuszki-46-4|TPI\/729/.test(src), "18 no tender hardcode in engine");
}

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS — GO21 AUTO_G1 runtime unit");
