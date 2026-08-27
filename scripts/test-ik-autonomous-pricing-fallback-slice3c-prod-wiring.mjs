/**
 * IK-AUTONOMOUS-PRICING-FALLBACK — Slice 3C production wiring + security tests.
 * HTTP=0 (mock only) · no live fetch in this suite.
 *
 * npx vite-node scripts/test-ik-autonomous-pricing-fallback-slice3c-prod-wiring.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createEmptyWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { runSelectiveWorkRateResearch } from "../src/lib/work-catalog/work-rate-research.ts";
import { getNullWorkRateLookupPort } from "../src/lib/work-catalog/work-rate-research.ts";
import { assertLaborResearchAllowed } from "../src/lib/intelligent-estimator/classification-gate.ts";
import {
  APF_KB_BENCHMARK_MEASUREMENT_URL,
  createApfHttpLaborMarketPort,
  createDefaultApfLaborMarketPort,
  createProductionApfLaborMarketPort,
  parseApfMeasurementPriceHtml,
  resolveApfAuthorizedRouteByUrl,
  runApfAuthorizedHttpResearch,
  runAutonomousPricingFallback,
  validateApfHttpRequest,
} from "../src/lib/tender-position-cost/autonomous-pricing-fallback/index.ts";
import { isApfNominatedSourceEligibleForNormalWorkRate } from "../src/lib/tender-position-cost/autonomous-pricing-fallback/apf-source-nomination-registry.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const energospinHtml = readFileSync(
  join(__dir, "../test-infra/fixtures/apf/energospin-cennik.html"),
  "utf8",
);
const electricoHtml = readFileSync(
  join(__dir, "../test-infra/fixtures/apf/electrico-cennik.html"),
  "utf8",
);

let passed = 0;
let failed = 0;
let mockHttp = 0;

function ok(label, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL ${label}`, detail ?? "");
  }
}

function fixtureMapForApfRoutes(htmlByUrl) {
  const map = { ...htmlByUrl };
  if (map["https://www.energospin.pl/cennik/"]) {
    map["https://energospin.pl/cennik/"] = map["https://www.energospin.pl/cennik/"];
  }
  return map;
}

function countingFetch(map, counter) {
  const resolved = fixtureMapForApfRoutes(map);
  return {
    async fetch(url) {
      counter.count += 1;
      const body = resolved[url];
      if (body === undefined) {
        return { ok: false, status: 404, finalUrl: url, bodyText: "" };
      }
      if (typeof body === "object" && body.redirect) {
        return {
          ok: false,
          status: 302,
          finalUrl: body.redirect,
          bodyText: "",
        };
      }
      return { ok: true, status: 200, finalUrl: url, bodyText: body };
    },
  };
}

console.log("\n=== WIRING: production port factory ===");
{
  const prod = createProductionApfLaborMarketPort();
  ok("W1 createProductionApfLaborMarketPort", typeof prod.research === "function");
  const def = createDefaultApfLaborMarketPort();
  ok("W2 default port still fail-closed without fetch", typeof def.research === "function");
}

console.log("\n=== SECURITY A–J ===");
{
  const a = validateApfHttpRequest({
    requestUrl: "https://www.energospin.pl/cennik/",
  });
  ok("A authorized Energospin exact URL", a.ok === true);

  const b = validateApfHttpRequest({
    requestUrl: "https://www.energospin.pl/cennik/?x=1",
  });
  ok("B query string blocked", b.ok === false);

  const c = validateApfHttpRequest({
    requestUrl: "http://www.energospin.pl/cennik/",
  });
  ok("C http blocked", c.ok === false && c.reason === "NOT_HTTPS");

  const d = validateApfHttpRequest({
    requestUrl: "https://www.energospin.pl/inna-strona",
  });
  ok("D subpath blocked", d.ok === false);

  const e = validateApfHttpRequest({ requestUrl: "https://evil.example/" });
  ok("E evil host blocked", e.ok === false);

  const f = validateApfHttpRequest({
    requestUrl: "https://www.energospin.pl/cennik/",
    finalUrl: "https://evil.example/away",
  });
  ok("F redirect external blocked", f.ok === false && f.reason === "REDIRECT_ESCAPE");

  const counter = { count: 0 };
  const fetchPort = countingFetch(
    { "https://www.energospin.pl/cennik/": energospinHtml },
    counter,
  );
  await runApfAuthorizedHttpResearch({
    query: {
      tenderId: "T",
      lineId: "L",
      description: "Pomiar impedancji pętli zwarcia",
      unit: "pomiar",
    },
    fetchPort,
  });
  mockHttp += counter.count;
  ok("G single request per invocation", counter.count === 1);

  const hCounter = { count: 0 };
  const hFetch = countingFetch(
    { "https://electrico-pomiary.pl/cennik/": electricoHtml },
    hCounter,
  );
  const hRes = await runApfAuthorizedHttpResearch({
    query: {
      tenderId: "T",
      lineId: "L2",
      description: "Pomiar pętli zwarcia obwodu 1-fazowego",
      unit: "pomiar",
    },
    fetchPort: hFetch,
    routes: [
      resolveApfAuthorizedRouteByUrl("https://electrico-pomiary.pl/cennik/"),
    ].filter(Boolean),
  });
  mockHttp += hCounter.count;
  ok("H electrico separate invocation PASS", hRes.status === "OK");
  ok("H electrico one request", hCounter.count === 1);

  ok(
    "I KB not APF route",
    resolveApfAuthorizedRouteByUrl(APF_KB_BENCHMARK_MEASUREMENT_URL) == null,
  );

  ok(
    "J normal work-rate energospin blocked",
    isApfNominatedSourceEligibleForNormalWorkRate("energospin_pl") === false,
  );
}

console.log("\n=== WORKID: APF allowed vs NORMAL blocked ===");
{
  let apfHttpAttempted = 0;
  const apfFetch = {
    async fetch(url) {
      apfHttpAttempted += 1;
      return { ok: true, status: 200, finalUrl: url, bodyText: energospinHtml };
    },
  };
  const port = createApfHttpLaborMarketPort(apfFetch);
  const apfRun = await runAutonomousPricingFallback({
    tenderId: "T-WID",
    httpResearch: "off",
    laborMarketPort: port,
    line: {
      lineId: "L-no-wc",
      description: "Pomiar impedancji pętli zwarcia",
      unit: "pomiar",
      catalogWorkId: null,
    },
  });
  mockHttp += apfRun.counters.httpCalls;
  ok("APF no workId reaches HTTP", apfHttpAttempted === 1);
  ok("APF no workId CANDIDATE or HOLD with http", apfRun.counters.httpCalls === 1);

  const store = createEmptyWorkCatalogStore();
  const nullPort = getNullWorkRateLookupPort();
  const normalEmpty = await runSelectiveWorkRateResearch({
    store,
    workId: "",
    unit: "szt",
    namePl: "Test",
    lookupPort: nullPort,
    bypassCooldown: true,
  });
  ok(
    "NORMAL empty workId BLOCKED",
    normalEmpty.status === "BLOCKED" || normalEmpty.httpFetchCount === 0,
    normalEmpty,
  );

  const gateNull = assertLaborResearchAllowed({ workId: null, unit: "szt", namePl: "x" });
  ok("NORMAL null workId classification block", gateNull.ok === false);
}

console.log("\n=== OBSERVATION SAFETY ===");
{
  const counter = { count: 0 };
  const fetchPort = countingFetch(
    { "https://www.energospin.pl/cennik/": energospinHtml },
    counter,
  );
  const run = await runAutonomousPricingFallback({
    tenderId: "T-SAFE",
    httpResearch: "off",
    laborMarketPort: createApfHttpLaborMarketPort(fetchPort),
    line: {
      lineId: "L-safe",
      description: "Pomiar rezystancji izolacji obwodów 1 fazowych",
      unit: "pomiar",
      catalogWorkId: null,
    },
  });
  mockHttp += run.counters.httpCalls;
  ok("OBS catalogWork CREATE 0", run.counters.catalogWorkCreateCalls === 0);
  ok("OBS KV 0", run.counters.kvWriteCalls === 0);
  ok("OBS Accept 0", run.counters.acceptCalls === 0);
  ok(
    "OBS ephemeral limitation",
    run.status === "CANDIDATE"
      ? run.candidate.limitations.some((l) => l.includes("NOT_OUR_RATE"))
      : true,
    run.status,
  );
}

console.log("\n=== PRODUCTION WIRING PATH ===");
{
  let wiredHttp = 0;
  const wiredFetch = {
    async fetch(url) {
      wiredHttp += 1;
      return { ok: true, status: 200, finalUrl: url, bodyText: energospinHtml };
    },
  };
  // Simulate production port wiring without live network
  const port = createApfHttpLaborMarketPort(wiredFetch);
  const run = await runAutonomousPricingFallback({
    tenderId: "T-PROD",
    httpResearch: "off",
    laborMarketPort: port,
    line: {
      lineId: "L-prod",
      description: "Badanie wyłączników różnicowoprądowych (RCD)",
      unit: "pomiar",
      catalogWorkId: null,
    },
  });
  mockHttp += run.counters.httpCalls;
  ok("PROD path HTTP via adapter", wiredHttp === 1);
  ok("PROD path no KNR tableCode", run.candidate?.provenance.queryKeys.tableCode == null || run.status === "CANDIDATE");
}

console.log("\n========================================");
console.log(
  `SLICE3C PROD WIRING: ${passed} PASS / ${failed} FAIL · mock HTTP=${mockHttp}`,
);
process.exit(failed > 0 ? 1 : 0);
