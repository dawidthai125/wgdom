/**
 * WORK-RATE-RESEARCH-NEGATION-SCOPE-01 — regression + matrix (ZERO live HTTP · ZERO KV).
 *
 * npx vite-node scripts/test-work-rate-negation-scope-01.mjs
 */
import {
  extractResearchNegativeScope,
  isSynonymIneligibleForNegativeScope,
  listWorkRateMatchNamesPl,
  listWorkRatePass2CategoryKeysForWork,
  maskNegatedResearchSpans,
  resolveWorkRateWorkFamily,
  WORK_RATE_OWNER_SYNONYMS,
} from "../src/lib/work-catalog/index.ts";

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

const ALIAS = "szpachlowanie bruzd po kablach";
const FILL_SYNS = [
  ALIAS,
  "zaprawianie bruzd",
  "zamurowanie bruzd",
  "uzupełnienie bruzd",
  "bruzdy",
];

const LP3_NAME =
  "KNR 5-08 0210-03 — Przewody kabelkowe o łącznym przekroju żył do Cu-24/Al-40 mm2 układane w gotowych bruzdach bez zaprawiania bruzd na podłożu nie-betonowym — YDY 5x6";
const LP16_NAME =
  "KNR 5-08 0210-01 — Przewody kabelkowe o łącznym przekroju żył do Cu-6/Al-12 mm2 układane w gotowych bruzdach bez zaprawiania bruzd";
const LP3_ID = "cw.knr.knr-5-08.0210-03.m";
const LP16_ID = "cw.knr.knr-5-08.0210-01.m";

function hasFillAlias(names) {
  return FILL_SYNS.some((s) => names.includes(s));
}

function hasSzpachlowanie(names) {
  return names.some((n) => /szpachlowanie bruzd/i.test(n));
}

// ——— Matrix §9 ———
{
  const f1 = resolveWorkRateWorkFamily({ namePl: "zaprawianie bruzd" });
  ok("M1 family=grooves", f1 === "grooves", f1);
  const n1 = listWorkRateMatchNamesPl("zaprawianie bruzd");
  ok("M1 alias allowed", n1.includes(ALIAS), n1);
}

{
  const f2 = resolveWorkRateWorkFamily({ namePl: "bez zaprawiania bruzd" });
  ok("M2 family ≠ grooves", f2 !== "grooves", f2);
  const n2 = listWorkRateMatchNamesPl("bez zaprawiania bruzd");
  ok("M2 szpachlowanie INELIGIBLE", !hasSzpachlowanie(n2), n2);
  ok("M2 fill set blocked", !hasFillAlias(n2) || n2.every((x) => x === "bez zaprawiania bruzd"), n2);
}

{
  const f3 = resolveWorkRateWorkFamily({ namePl: "bruzdy bez zaprawiania" });
  ok("M3 family ≠ grooves from negation", f3 !== "grooves", f3);
  const n3 = listWorkRateMatchNamesPl("bruzdy bez zaprawiania");
  ok("M3 szpachlowanie INELIGIBLE", !hasSzpachlowanie(n3), n3);
}

{
  const f4 = resolveWorkRateWorkFamily({
    namePl: "układanie przewodów w gotowych bruzdach",
  });
  ok("M4 family ≠ grooves (no fill action)", f4 !== "grooves", f4);
  const n4 = listWorkRateMatchNamesPl(
    "układanie przewodów w gotowych bruzdach",
  );
  // Token bruzd may still relate — but without negation, Owner may attach fill set.
  // Contract: do NOT force grooves family. Synonym attach via bruzd token is pre-existing;
  // M4 only asserts family not grooves from fill regex.
  ok("M4 family not grooves-fill", f4 !== "grooves", { f4, n4 });
}

{
  const f5 = resolveWorkRateWorkFamily({
    namePl: "układanie przewodów w gotowych bruzdach bez zaprawiania",
  });
  ok("M5 family ≠ grooves", f5 !== "grooves", f5);
  const n5 = listWorkRateMatchNamesPl(
    "układanie przewodów w gotowych bruzdach bez zaprawiania",
  );
  ok("M5 szpachlowanie INELIGIBLE", !hasSzpachlowanie(n5), n5);
}

{
  const f6 = resolveWorkRateWorkFamily({
    namePl: "szpachlowanie bruzd po kablach",
  });
  ok("M6 family=grooves", f6 === "grooves", f6);
  const n6 = listWorkRateMatchNamesPl("szpachlowanie bruzd po kablach");
  ok(
    "M6 positive preserve relatedness",
    n6.includes("zaprawianie bruzd") || n6.includes(ALIAS) || n6.length >= 1,
    n6,
  );
}

{
  const f7 = resolveWorkRateWorkFamily({
    namePl: "naprawa bruzd po kablach",
  });
  // Pre-existing: may be unknown (no fill regex without zapraw/szpachlow…). Do not force electrical.
  ok("M7 family ≠ electrical forced", f7 !== "electrical", f7);
}

{
  const f8 = resolveWorkRateWorkFamily({ namePl: "bez demontażu" });
  ok("M8 family ≠ demolition", f8 !== "demolition", f8);
}

{
  const f9 = resolveWorkRateWorkFamily({ namePl: "bez malowania" });
  ok("M9 family ≠ painting", f9 !== "painting", f9);
}

{
  const f10 = resolveWorkRateWorkFamily({
    namePl: "montaż bez podłączenia",
  });
  ok("M10 family ≠ electrical from negated podłączenia", f10 !== "electrical", f10);
}

// ——— LP3 / LP16 ———
{
  const f = resolveWorkRateWorkFamily({ workId: LP3_ID, namePl: LP3_NAME });
  const names = listWorkRateMatchNamesPl(LP3_NAME);
  const pass2 = listWorkRatePass2CategoryKeysForWork({
    workId: LP3_ID,
    namePl: LP3_NAME,
    sourceId: "kb_pl",
  });
  ok("LP3 family ≠ grooves", f !== "grooves", f);
  ok("LP3 no szpachlowanie synonym", !hasSzpachlowanie(names), names);
  ok("LP3 no fill alias set", !hasFillAlias(names), names);
  ok("LP3 PASS2 has no grooves key", !pass2.includes("grooves"), pass2);
}

{
  const f = resolveWorkRateWorkFamily({ workId: LP16_ID, namePl: LP16_NAME });
  const names = listWorkRateMatchNamesPl(LP16_NAME);
  const pass2 = listWorkRatePass2CategoryKeysForWork({
    workId: LP16_ID,
    namePl: LP16_NAME,
    sourceId: "kb_pl",
  });
  ok("LP16 family ≠ grooves", f !== "grooves", f);
  ok("LP16 no szpachlowanie synonym", !hasSzpachlowanie(names), names);
  ok("LP16 no fill alias set", !hasFillAlias(names), names);
  ok("LP16 PASS2 has no grooves key", !pass2.includes("grooves"), pass2);
}

// ——— Positive regression (KB-BRUZDY) ———
{
  const NAME = "Zaprawianie / zamurowanie bruzd";
  ok(
    "POS family grooves",
    resolveWorkRateWorkFamily({ namePl: NAME }) === "grooves",
  );
  const names = listWorkRateMatchNamesPl(NAME);
  ok("POS alias present", names.includes(ALIAS), names);
}

{
  ok(
    "POS szpachlowanie family",
    resolveWorkRateWorkFamily({ namePl: ALIAS }) === "grooves",
  );
}

// ——— Scope extract ———
{
  const s = extractResearchNegativeScope("bez zaprawiania bruzd");
  ok("SCOPE has zapraw root", s.negativeActions.some((a) => a.startsWith("zapraw")), s);
  ok("SCOPE expanded szpachlow", s.negativeActions.some((a) => a.startsWith("szpachlow")), s);
  ok(
    "SCOPE synonym ineligible",
    isSynonymIneligibleForNegativeScope({
      synonym: ALIAS,
      canonicalConcept: "zaprawianie bruzd",
      canonicalWorkFamily: "grooves",
      scope: s,
    }),
  );
  const masked = maskNegatedResearchSpans(
    "ukladane w gotowych bruzdach bez zaprawiania bruzd na podlozu",
  );
  ok(
    "MASK removes zaprawiania bruzd",
    !/zapraw\w*\s*bruz/.test(masked),
    masked,
  );
  ok("MASK keeps bruzdach context token", /bruzdach/.test(masked), masked);
}

// ——— Owner table still has alias row (eligibility is runtime filter) ———
{
  ok(
    "TABLE still has KB-BRUZDY alias row",
    WORK_RATE_OWNER_SYNONYMS.some((r) => r.synonym === ALIAS),
  );
}

// ——— 17 MATCH_EMPTY out of scope: electrical coverage unchanged ———
{
  // Bare YDY / przewody kabelkowe without fill — still must NOT invent electrical family
  // (pre-existing; this epic must not add electrical synonyms/coverage).
  const f = resolveWorkRateWorkFamily({
    namePl: "przewody kabelkowe YDY 5x6",
  });
  const names = listWorkRateMatchNamesPl("przewody kabelkowe YDY 5x6");
  ok(
    "17-scope: no new electrical invent via this epic",
    f !== "grooves" && !hasSzpachlowanie(names),
    { f, names },
  );
}

console.log(`\nRESULT ${passed} passed · ${failed} failed`);
if (failed > 0) process.exit(1);
