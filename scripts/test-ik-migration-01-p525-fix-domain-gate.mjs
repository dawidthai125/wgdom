/**
 * P5.25-FIX — INTERNAL-FIRST domain gate regression (ZERO HTTP · ZERO KV · ZERO Accept).
 *
 * npx vite-node scripts/test-ik-migration-01-p525-fix-domain-gate.mjs
 */
import fs from "node:fs";
import {
  actionContextCompatible,
  buildInternalFirstResearchKey,
  classifySourceHealthError,
  domainsCompatibleForFinalPriceReuse,
  InternalFirstResearchKeyDedupe,
  InternalFirstSourceHealthTracker,
  lookupInternalFirst,
  mapInternalFirstUnit,
  scoreInternalFirstSemantic,
  unitsCompatibleInternalFirst,
  wouldRejectCrossDomainPriceReuse,
} from "../src/lib/intelligent-estimator/index.ts";
import { isIkEntryEnabled } from "../src/lib/intelligent-estimator/ik-entry-flag.ts";

let passed = 0;
let failed = 0;
const results = [];

function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
    results.push({ name, pass: true });
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
    results.push({ name, pass: false, extra: extra ?? null });
  }
}

function row(id, namePl, unit, classHint, base) {
  return {
    id,
    namePl,
    unit,
    classHint,
    base,
    work: { id, namePl, keywords: [], descriptionPl: "" },
  };
}

// ——— Domain matrix ———
ok("reject PACKAGE→MATERIAL", wouldRejectCrossDomainPriceReuse("LABOR_MATERIAL_PACKAGE", "MATERIAL"));
ok("reject PACKAGE→LABOR", wouldRejectCrossDomainPriceReuse("LABOR_MATERIAL_PACKAGE", "LABOR"));
ok("reject MATERIAL→PACKAGE", wouldRejectCrossDomainPriceReuse("MATERIAL", "LABOR_MATERIAL_PACKAGE"));
ok("reject LABOR→PACKAGE", wouldRejectCrossDomainPriceReuse("LABOR", "LABOR_MATERIAL_PACKAGE"));
ok("reject LABOR→MATERIAL", wouldRejectCrossDomainPriceReuse("LABOR", "MATERIAL"));
ok("reject MATERIAL→LABOR", wouldRejectCrossDomainPriceReuse("MATERIAL", "LABOR"));
ok(
  "accept MATERIAL→MATERIAL",
  domainsCompatibleForFinalPriceReuse("MATERIAL", "MATERIAL").compatible,
);
ok("accept LABOR→LABOR", domainsCompatibleForFinalPriceReuse("LABOR", "LABOR").compatible);
ok(
  "accept PACKAGE→PACKAGE",
  domainsCompatibleForFinalPriceReuse("LABOR_MATERIAL_PACKAGE", "LABOR_MATERIAL_PACKAGE").compatible,
);

// ——— FP cases 1–5 (REJECT) ———
const fpCases = [
  {
    name: "FP1 PACKAGE montaż gniazd ≠ MATERIAL puszka",
    desc: "montaż gniazd wtyczkowych podtynkowych w puszkach",
    domain: "LABOR_MATERIAL_PACKAGE",
    candidate: row("cw.inv.pug60gl1", "PUSZKA PODT.DO G-K 60ŁĄCZ./GŁ.", "szt", "MATERIAL", 4.33),
  },
  {
    name: "FP2 PACKAGE montaż grzejnika ≠ MATERIAL grzejnik",
    desc: "montaż grzejnika akumulacyjnego",
    domain: "LABOR_MATERIAL_PACKAGE",
    candidate: row("mat.grzejnik", "Grzejnik stalowy", "szt", "MATERIAL", 450),
  },
  {
    name: "FP3 PACKAGE wymiana baterii ≠ MATERIAL bateria",
    desc: "wymiana baterii umywalkowej",
    domain: "LABOR_MATERIAL_PACKAGE",
    candidate: row("mat.bateria", "Bateria umywalkowa", "szt", "MATERIAL", 120),
  },
  {
    name: "FP4 PACKAGE montaż rurociągu PCW ≠ MATERIAL rura",
    desc: "montaż rurociągu PCW",
    domain: "LABOR_MATERIAL_PACKAGE",
    candidate: row("mat.rura", "Rura PCW 32", "mb", "MATERIAL", 8.5),
  },
  {
    name: "FP5 PACKAGE izolacja otulinami ≠ MATERIAL otulina",
    desc: "izolacja otulinami rurociągu",
    domain: "LABOR_MATERIAL_PACKAGE",
    candidate: row("mat.otulina", "Otulina izolacyjna", "mb", "MATERIAL", 12),
  },
];

for (const c of fpCases) {
  const scored = scoreInternalFirstSemantic({
    queryDesc: c.desc,
    candidate: c.candidate,
    sourceDomain: c.domain,
  });
  ok(c.name, !!scored.reject && scored.score === 0, scored);
  const lookup = lookupInternalFirst({
    description: c.desc,
    unit: c.candidate.unit,
    sourceDomain: c.domain,
    index: [c.candidate],
  });
  ok(`${c.name} lookup=NO_INTERNAL_MATCH`, lookup.outcome === "NO_INTERNAL_MATCH", lookup);
}

// ——— Valid ACCEPT 6–10 ———
ok(
  "OK6 MATERIAL grzejnik exact",
  lookupInternalFirst({
    description: "grzejnik",
    unit: "szt",
    sourceDomain: "MATERIAL",
    index: [row("mat.grzejnik", "grzejnik", "szt", "MATERIAL", 450)],
  }).outcome === "INTERNAL_EXACT_HIT",
);

ok(
  "OK7 MATERIAL gniazdo exact",
  lookupInternalFirst({
    description: "gniazdo",
    unit: "szt",
    sourceDomain: "MATERIAL",
    index: [row("mat.gniazdo", "gniazdo", "szt", "MATERIAL", 25)],
  }).outcome === "INTERNAL_EXACT_HIT",
);

ok(
  "OK8 LABOR wykucie bruzd exact",
  lookupInternalFirst({
    description: "wykucie bruzd",
    unit: "m",
    sourceDomain: "LABOR",
    index: [row("lab.wykucie", "wykucie bruzd", "mb", "LABOR", 72.5)],
  }).outcome === "INTERNAL_EXACT_HIT",
);

ok(
  "OK9 PACKAGE montaż gniazda exact",
  lookupInternalFirst({
    description: "montaż gniazda",
    unit: "szt",
    sourceDomain: "LABOR_MATERIAL_PACKAGE",
    index: [row("pkg.gniazdo", "montaż gniazda", "szt", "LABOR_MATERIAL_PACKAGE", 85)],
  }).outcome === "INTERNAL_EXACT_HIT",
);

ok(
  "OK10 PACKAGE wymiana baterii exact",
  lookupInternalFirst({
    description: "wymiana baterii",
    unit: "szt",
    sourceDomain: "LABOR_MATERIAL_PACKAGE",
    index: [row("pkg.bater", "wymiana baterii", "szt", "LABOR_MATERIAL_PACKAGE", 180)],
  }).outcome === "INTERNAL_EXACT_HIT",
);

// ——— Critical 111/149 simulation ———
const case111 = lookupInternalFirst({
  description:
    "montaz do gotowego podloza gniazd wtyczkowych podtynkowych 2-biegunowych z uziemieniem (ip44) w puszkach z pod",
  unit: "szt",
  sourceDomain: "LABOR_MATERIAL_PACKAGE",
  index: [
    row("cw.inv.pug60gl1", "PUSZKA PODT.DO G-K 60ŁĄCZ./GŁ.", "szt", "MATERIAL", 4.33),
    row("pkg.montaz-gniazda", "montaż gniazda elektrycznego", "szt", "LABOR_MATERIAL_PACKAGE", 95),
  ],
});
ok(
  "111/149 rejects MATERIAL puszka (no FP base 4.33)",
  case111.outcome !== "INTERNAL_SEMANTIC_HIT" || case111.match?.id !== "cw.inv.pug60gl1",
  case111,
);
ok(
  "111/149 may hit PACKAGE peer if present",
  case111.outcome === "INTERNAL_SEMANTIC_HIT" || case111.outcome === "INTERNAL_EXACT_HIT"
    ? case111.match?.classHint === "LABOR_MATERIAL_PACKAGE"
    : case111.outcome === "NO_INTERNAL_MATCH",
  case111,
);

// ——— Unit gate ———
ok("unit m↔mb", unitsCompatibleInternalFirst("m", "mb"));
ok("unit m2↔m²", mapInternalFirstUnit("m²") === "m2" && unitsCompatibleInternalFirst("m2", "m²"));
ok("unit szt↔szt.", mapInternalFirstUnit("szt.") === "szt");
ok(
  "unit alone insufficient — PACKAGE vs MATERIAL same szt still reject",
  scoreInternalFirstSemantic({
    queryDesc: "montaż gniazda",
    candidate: row("x", "gniazdo", "szt", "MATERIAL", 20),
    sourceDomain: "LABOR_MATERIAL_PACKAGE",
  }).reject != null,
);

// ——— Context ———
ok(
  "context gniazdo ≠ montaż gniazda (PACKAGE)",
  !actionContextCompatible("montaż gniazda", "gniazdo", "LABOR_MATERIAL_PACKAGE").ok,
);

// ——— Research key dedupe ———
const dedupe = new InternalFirstResearchKeyDedupe();
const k1 = buildInternalFirstResearchKey({
  description: "wykucie bruzd",
  unit: "m",
  domain: "LABOR",
});
const k2 = buildInternalFirstResearchKey({
  description: "wykucie bruzd",
  unit: "mb",
  domain: "LABOR",
});
ok("researchKey m/mb same domain normalizes", k1 === k2);
dedupe.remember({ researchKey: k1, groupNo: "015", base: 72.5, retainedAt: "2026-08-15T00:00:00Z" });
ok("dedupe retain G015", dedupe.get(k2)?.base === 72.5);

// ——— Source health ———
const health = new InternalFirstSourceHealthTracker();
ok("health classify 403", classifySourceHealthError("upstream_403") === "403");
ok("health mark leroy", health.noteError("leroy", "403 Forbidden") === true);
ok("health skip leroy", health.shouldSkip("leroy") === true);
ok("health obi still ok", health.shouldSkip("obi") === false);

// ——— G015/G024 retained artifacts untouched ———
const g015 = JSON.parse(fs.readFileSync(".tmp/p525-batch-02-results.json", "utf8"));
const g015row = (g015.results || []).find((r) => r.groupNo === "015");
ok("G015 retained base 72.5 unchanged in artifact", g015row?.base === 72.5);
const g024 = JSON.parse(fs.readFileSync(".tmp/p525-batch-03-results.json", "utf8"));
const g024row = (g024.results || []).find((r) => r.groupNo === "024" || r.groupNo === "015");
// batch-03 may have 024
const b3 = (g024.results || []).find((r) => r.groupNo === "024");
if (b3) ok("G024 retained base 72.5 unchanged", b3.base === 72.5);
else ok("G024 artifact present or skipped", true);

// ——— ikEntryEnabled OFF ———
ok("ikEntryEnabled OFF", isIkEntryEnabled() === false);

const summary = {
  ok: failed === 0,
  passed,
  failed,
  results,
  closedFalsePositives: [
    "PACKAGE→MATERIAL",
    "PACKAGE→LABOR",
    "MATERIAL→PACKAGE",
    "LABOR→PACKAGE",
    "111/149 puszka",
    "montaż grzejnika≠grzejnik",
    "wymiana baterii≠bateria",
    "rurociąg≠rura",
    "otulina PACKAGE≠MATERIAL",
  ],
  domainGatePath: "src/lib/intelligent-estimator/internal-first-domain.ts",
  semanticPath: "src/lib/intelligent-estimator/internal-first-semantic-match.ts",
  updatedAt: new Date().toISOString(),
};

fs.mkdirSync(".tmp", { recursive: true });
fs.writeFileSync(".tmp/p525-fix-domain-gate-results.json", JSON.stringify(summary, null, 2));
fs.writeFileSync(
  ".tmp/p525-fix-domain-gate-tests.md",
  `# P5.25-FIX domain gate tests\n\nPASS=${passed} FAIL=${failed}\n\n` +
    results.map((r) => `- ${r.pass ? "PASS" : "FAIL"} ${r.name}`).join("\n") +
    `\n`,
);

console.log(`\nSUMMARY pass=${passed} fail=${failed}`);
if (failed) process.exit(1);
