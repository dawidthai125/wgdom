/**
 * TPI/729 48-residual labor research register — invariant tests.
 * npx vite-node scripts/test-tpi729-48-residual-labor-research-v1.mjs
 */
import {
  TPI729_48_RESIDUAL_HARD_RULES,
  TPI729_48_RESIDUAL_RESEARCH_BASELINE_HEAD,
  TPI729_48_RESIDUAL_RESEARCH_ROWS,
  TPI729_48_RESIDUAL_RESEARCH_VERSION,
  summarizeTpi72948ResidualResearch,
} from "../src/lib/intelligent-estimator/knr-knowledge/tpi729-48-residual-labor-research-v1.ts";

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

ok("version", TPI729_48_RESIDUAL_RESEARCH_VERSION === "TPI729-48-RESIDUALS-V1");
ok("baseline", TPI729_48_RESIDUAL_RESEARCH_BASELINE_HEAD === "7cb6d9fb");
ok("hard rules >= 6", TPI729_48_RESIDUAL_HARD_RULES.length >= 6);
ok(
  "no invent rule present",
  TPI729_48_RESIDUAL_HARD_RULES.some((r) => /r-g|hourly|OUR RATE/i.test(r)),
);

const r1118 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "1118-09");
const r0829 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "0829-03");
const r0815 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "0815-04");
const r2006 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "2006-04");
const r1205 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "1205-09");
const r0135 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "0135-01");
const r0401 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.tableCode === "0401-11");

ok("1118 CURRENT", r1118?.status === "AUT_R1_CURRENT" && r1118.claimedDirectLaborPln === 48.201);
ok("0829 CURRENT", r0829?.status === "AUT_R1_CURRENT" && r0829.claimedDirectLaborPln === 61.12);
ok("0815 CURRENT", r0815?.status === "AUT_R1_CURRENT" && r0815.claimedDirectLaborPln === 13.15013);
ok("0815 URL resolved", r0815?.sources.some((s) => s.urlResolved && /powiatobornicki/.test(s.sourceUrl || "")));
ok("2006 CURRENT", r2006?.status === "AUT_R1_CURRENT" && r2006.claimedDirectLaborPln === 9.62);
ok("2006 URL resolved", r2006?.sources.some((s) => s.urlResolved && /winbud/.test(s.sourceUrl || "")));
ok(
  "1205 live knnr-2",
  r1205?.liveWorkId === "cw.knr.knnr-2.1205-09.m2" &&
    r1205.goProposedWorkId === "cw.knr.knr-2-02.1205-09.m2",
);
ok("1205 no PLN invent", r1205?.claimedDirectLaborPln == null && r1205.laborNormRgPerUnit === 0.96);
ok("0135 identity hold", r0135?.status === "IDENTITY_HOLD");
ok("0401 identity hold", r0401?.status === "IDENTITY_HOLD");

const transport = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) =>
  String(r.liveWorkId || "").includes("transport"),
);
const etics = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) => r.liveWorkId === "cw.etics.substrate");
const p31 = TPI729_48_RESIDUAL_RESEARCH_ROWS.find((r) =>
  String(r.liveWorkId || "").includes("p31"),
);
ok("transport excluded", transport?.status === "EXCLUDED");
ok("etics excluded", etics?.status === "EXCLUDED");
ok("p31 excluded", p31?.status === "EXCLUDED");

// Claimed PLN that is not yet CURRENT must stay HOLD (not silent invent)
for (const row of TPI729_48_RESIDUAL_RESEARCH_ROWS) {
  if (row.status === "AUT_R1_READY" || row.status === "AUT_R1_CURRENT") {
    ok(
      `ready has URL ${row.tableCode || row.liveWorkId}`,
      row.sources.some((s) => s.urlResolved && s.sourceUrl) && row.autR1SufficientPlnEvidence,
    );
  }
  if (
    row.claimedDirectLaborPln != null &&
    !row.autR1SufficientPlnEvidence &&
    row.status !== "AUT_R1_CURRENT"
  ) {
    ok(
      `claimed PLN not auto-ready ${row.tableCode || row.liveWorkId}`,
      row.status === "EVIDENCE_ONLY_HOLD" || row.status === "IDENTITY_HOLD",
    );
  }
}

const sum = summarizeTpi72948ResidualResearch();
ok("summary has currents", sum.autR1Current.length >= 2);
ok("summary has holds", sum.holds.length > 0);

console.log(`\nTPI729-48 research: ${passed} PASS / ${failed} FAIL`);
process.exit(failed ? 1 : 0);
