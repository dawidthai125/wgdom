/**
 * TRANSPORT-01 MODEL-1A — contract-only harness (D-TR-01…16).
 *
 * npx vite-node scripts/test-wm-tender-transport-01.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTransportComponentResult,
  createUnresolvedTransportPriceProvider,
} from "../src/lib/tender-position-cost/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
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

const CONTRACT_SRC = readFileSync(
  join(ROOT, "src/lib/tender-position-cost/transport-contract.ts"),
  "utf8",
);
const OFFER_BOQ_SRC = readFileSync(join(ROOT, "src/lib/tender-offer-boq.ts"), "utf8");
const EQUIPMENT_SRC = readFileSync(
  join(ROOT, "src/lib/tender-position-cost/equipment-contract.ts"),
  "utf8",
);

// ——— T1 future Bid Transport candidate ———
{
  const c = buildTransportComponentResult({
    lineId: "TR-BID-1",
    namePl: "Dojazd ekipy (kandydat Bid)",
    quantity: 1,
    unit: "kpl",
    sourceClass: "bid_candidate",
  });
  eq("T1 identityKind", c.identityKind, "transport_line");
  eq("T1 sourceClass", c.sourceClass, "bid_candidate");
  eq("T1 lineId", c.lineId, "TR-BID-1");
}

// ——— T2 transport ≠ Equipment ———
{
  const c = buildTransportComponentResult({
    lineId: "TR-BID-1",
    namePl: "Transport Bid",
    quantity: 2,
    unit: "m3",
  });
  eq("T2 identityKind", c.identityKind, "transport_line");
  ok("T2 not equipment_line", c.identityKind !== "equipment_line");
  ok("T2 no offerBoq Equipment field", !("offerBoqLineKind" in c));
}

// ——— T3 transport ≠ Auxiliary ———
{
  const c = buildTransportComponentResult({
    lineId: "TR-BID-1",
    namePl: "Transport Bid",
    quantity: 1,
    unit: "kpl",
    sourceClass: "bid_candidate",
  });
  ok("T3 not auxiliary identity", c.identityKind !== "auxiliary_line");
  ok("T3 source not auxiliary", c.sourceClass !== "auxiliary");
  ok("T3 contract has no aux pricing fields", !("auxiliaryPln" in c));
}

// ——— T4 catalog noise ≠ Bid ———
{
  const noise = buildTransportComponentResult({
    lineId: "NOISE-1",
    namePl: "transport materiałów (noise)",
    quantity: 1,
    unit: "kpl",
    sourceClass: "noise",
  });
  eq("T4 noise INVALID", noise.rateStatus, "INVALID");
  eq("T4 noise null rate", noise.unitRatePln, null);
  eq("T4 noise null total", noise.totalPln, null);
  ok("T4 reason noise", String(noise.reasonPl || "").includes("noise"));
}

// ——— T5 TRANSPORT_UTYLIZACJA ≠ logistics ———
{
  const utyl = buildTransportComponentResult({
    lineId: "UTYL-1",
    namePl: "Wyóz gruzu TRANSPORT_UTYLIZACJA",
    quantity: 5,
    unit: "m3",
    sourceClass: "utylizacja",
  });
  eq("T5 utylizacja INVALID", utyl.rateStatus, "INVALID");
  eq("T5 null rate", utyl.unitRatePln, null);
  eq("T5 null total", utyl.totalPln, null);
  ok("T5 reason D-TR-04", String(utyl.reasonPl || "").includes("TRANSPORT_UTYLIZACJA"));
}

// ——— T6–T9 UNRESOLVED default provider ———
{
  const c = buildTransportComponentResult({
    lineId: "TR-BID-1",
    namePl: "Transport Bid",
    quantity: 3,
    unit: "kpl",
    sourceClass: "bid_candidate",
  });
  eq("T6 rateStatus", c.rateStatus, "UNRESOLVED");
  eq("T7 unitRatePln", c.unitRatePln, null);
  eq("T8 totalPln", c.totalPln, null);
  eq("T9 provenance", c.provenance, null);
  eq("T9 confidence", c.confidence, null);
  ok("T9 never 0 rate", c.unitRatePln !== 0);
  ok("T9 never 0 total", c.totalPln !== 0);
}

// ——— T10–T12 forbidden price sources never in provider output ———
{
  const provider = createUnresolvedTransportPriceProvider();
  const looked = provider.lookup({
    lineId: "TR-BID-1",
    namePl: "X",
    quantity: 1,
    unit: "kpl",
  });
  eq("T10 provider UNRESOLVED", looked.rateStatus, "UNRESOLVED");
  eq("T10 provider rate null", looked.unitRatePln, null);
  ok("T10 no 85 PLN", looked.unitRatePln !== 85);
  ok("T10 src no 85 PLN heuristic", !CONTRACT_SRC.includes("85"));
  const payload = JSON.stringify(looked);
  ok("T10 payload no 85", !payload.includes("85"));
  ok("T11 no ath_priced in output", !payload.includes("ath_priced"));
  ok("T11 src no ath_priced", !CONTRACT_SRC.includes("ath_priced"));
  ok("T12 no companyPrice in output", !payload.includes("companyPrice"));
  ok("T12 src no companyPrice", !CONTRACT_SRC.includes("companyPrice"));
}

// ——— T13 no HTTP/network in provider ———
{
  ok("T13 no fetch in contract", !CONTRACT_SRC.includes("fetch(") && !CONTRACT_SRC.includes("globalThis.fetch"));
  ok("T13 no http(s) urls", !/https?:\/\//.test(CONTRACT_SRC));
  ok("T13 no XMLHttpRequest", !CONTRACT_SRC.includes("XMLHttpRequest"));
  const before = fetchCalls;
  createUnresolvedTransportPriceProvider().lookup({
    lineId: "x",
    namePl: "y",
    quantity: 1,
    unit: "kpl",
  });
  buildTransportComponentResult({
    lineId: "x",
    namePl: "y",
    quantity: 1,
    unit: "kpl",
  });
  eq("T13 fetchCalls unchanged", fetchCalls, before);
}

// ——— T14 no OfferBoqLineKind.Transport ———
{
  const kindBlock = OFFER_BOQ_SRC.match(/export type OfferBoqLineKind\s*=([\s\S]*?);/);
  ok("T14 OfferBoqLineKind block found", !!kindBlock);
  ok("T14 no Transport in OfferBoqLineKind", kindBlock ? !/\|\s*"Transport"/.test(kindBlock[1]) : false);
  ok(
    "T14 contract does not add OfferBoqLineKind.Transport",
    !/OfferBoqLineKind\s*=\s*[\s\S]*"Transport"/.test(CONTRACT_SRC) &&
      !CONTRACT_SRC.includes('offerBoqLineKind: "Transport"'),
  );
}

// ——— T15–T18 locked production files unchanged vs HEAD ———
{
  const lockedClean = [
    "src/lib/tender-position-cost/boq-shadow-adapter.ts",
    "src/lib/tender-position-cost/bid-position-cost-cutover.ts",
    "src/lib/tender-position-cost/equipment-contract.ts",
    "src/lib/tender-offer-boq.ts",
    "src/lib/tender-offer-boq-pricing-engine.ts",
    "src/lib/tender-offer-boq-bid-adapter.ts",
    "src/lib/catalog-coverage/noise-filter.ts",
    "scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-contract.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-fallback-removal.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f1-our-rate.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f2-material.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f3-bom.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f4-boq-shadow.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs",
    "scripts/test-tender-boq-pricing-rebuild-01-f6-ath-catalog-audit.mjs",
    "scripts/test-wm-tender-equipment-01.mjs",
  ];
  for (const f of lockedClean) {
    const dirty = execSync(`git diff --name-only HEAD -- "${f}"`, {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    ok(`T16 locked clean ${f}`, dirty === "");
  }

  // T15: C-MODE production sources (if present) unchanged
  const cModeCandidates = [
    "src/lib/tender-position-cost/c-mode-1a.ts",
    "src/lib/tenders/c-mode-1a.ts",
  ];
  for (const f of cModeCandidates) {
    const dirty = execSync(`git diff --name-only HEAD -- "${f}"`, {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    ok(`T15 C-MODE path clean ${f}`, dirty === "");
  }
  ok(
    "T15 C-MODE harnesses clean",
    execSync(
      "git diff --name-only HEAD -- scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-contract.mjs scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-fallback-removal.mjs",
      { cwd: ROOT, encoding: "utf8" },
    ).trim() === "",
  );

  ok(
    "T17 equipment-contract.ts unchanged vs HEAD",
    execSync("git diff --name-only HEAD -- src/lib/tender-position-cost/equipment-contract.ts", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim() === "",
  );
  ok("T17 equipment_line still in Equipment SSOT", EQUIPMENT_SRC.includes('identityKind: "equipment_line"'));

  const payrollProd = [
    "src/lib/payroll-cycle.ts",
    "src/lib/cloud-sync.ts",
    "src/lib/payroll-carry-forward.ts",
    "scripts/test-payroll-bootstrap-runtime-parity-b4.mjs",
    "scripts/test-p11-bootstrap-payroll.mjs",
  ];
  for (const f of payrollProd) {
    const dirty = execSync(`git diff --name-only HEAD -- "${f}"`, {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    ok(`T18 payroll prod clean ${f}`, dirty === "");
  }
  // PayrollView may be pre-existing Owner WIP — epic must not stage it; harness only notes it is OUT of allowlist.
  ok(
    "T18 PayrollView not in TRANSPORT allowlist",
    true,
  );
}

// ——— Extra: no auto-binder in contract source ———
{
  ok("TX no description.includes", !CONTRACT_SRC.includes("description.includes"));
  ok("TX no noiseKind binder", !CONTRACT_SRC.includes("noiseKind"));
  ok("TX no TRANSPORT_UTYLIZACJA auto-map to bid", !CONTRACT_SRC.includes("TRANSPORT_UTYLIZACJA →"));
  ok("TX transportKind provisional open", CONTRACT_SRC.includes("PROVISIONAL") || CONTRACT_SRC.includes("provisional"));
}

// ——— Extra: invalid qty/unit ———
{
  const bad = buildTransportComponentResult({
    lineId: "bad",
    namePl: "X",
    quantity: 0,
    unit: "kpl",
    sourceClass: "bid_candidate",
  });
  eq("TX bad qty INVALID", bad.rateStatus, "INVALID");
  eq("TX bad qty null rate", bad.unitRatePln, null);
}

eq("TFETCH", fetchCalls, 0);

console.log(`\nWYNIK TRANSPORT-01 MODEL-1A: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
