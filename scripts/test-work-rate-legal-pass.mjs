/**
 * WORK-RATE Legal PASS — harness (docs/flag only · ZERO live HTTP).
 *
 * npx vite-node scripts/test-work-rate-legal-pass.mjs
 */
import {
  WORK_RATE_AUTHORIZED_SOURCES,
  WORK_RATE_LEGAL_GATE,
  isWorkRateFullCatalogueForbidden,
  isWorkRateFullCatalogueResearchImplemented,
  isWorkRateKbPlAdapterImplemented,
  isWorkRateSelectiveResearchAuthorized,
  isWorkRateSourceVerified,
  requestWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";
import { MARKET_SYNC_P3_LEGAL_GATE } from "../src/lib/market-sync/p3-flag.ts";

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
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

eq("gate PASS", WORK_RATE_LEGAL_GATE, "PASS");
eq("selective authorized", isWorkRateSelectiveResearchAuthorized(), true);
eq("full catalogue forbidden", isWorkRateFullCatalogueForbidden(), true);
eq("material gate UNCHANGED PASS", MARKET_SYNC_P3_LEGAL_GATE, "PASS");

eq("sources count 4", WORK_RATE_AUTHORIZED_SOURCES.length, 4);
ok(
  "all VERIFIED",
  WORK_RATE_AUTHORIZED_SOURCES.every((s) => s.status === "VERIFIED"),
);
ok(
  "all OWNER_ATTESTATION",
  WORK_RATE_AUTHORIZED_SOURCES.every((s) => s.authorization === "OWNER_ATTESTATION"),
);
ok(
  "all PRIVATE_OWNER_HELD",
  WORK_RATE_AUTHORIZED_SOURCES.every((s) => s.evidence === "PRIVATE_OWNER_HELD"),
);
ok(
  "all API NOT_AVAILABLE",
  WORK_RATE_AUTHORIZED_SOURCES.every((s) => s.api === "NOT_AVAILABLE"),
);

eq("KB verified", isWorkRateSourceVerified("kb_pl"), true);
eq("SCCOT verified", isWorkRateSourceVerified("sccot"), true);
eq("Extradom verified", isWorkRateSourceVerified("extradom"), true);
eq("CennikRemontow verified", isWorkRateSourceVerified("cennikremontow_pl"), true);

const before = fetchCalls;
const res = requestWorkRateResearch({ workId: "cw.paint.walls", unit: "m2" });
eq("research READY", res.status, "READY");
eq("adapter KB implemented", isWorkRateKbPlAdapterImplemented(), true);
eq("full catalogue impl absent", isWorkRateFullCatalogueResearchImplemented(), false);
eq("zero HTTP", fetchCalls, before);

console.log(`\nWYNIK LEGAL PASS: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
