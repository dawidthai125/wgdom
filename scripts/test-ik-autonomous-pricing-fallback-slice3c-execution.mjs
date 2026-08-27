/**
 * IK-AUTONOMOUS-PRICING-FALLBACK — Slice 3C execution (Owner GO).
 * APF-only HTTP · PER_MEASUREMENT · energospin PRIMARY · electrico SECONDARY.
 *
 * npx vite-node scripts/test-ik-autonomous-pricing-fallback-slice3c-execution.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  WORK_RATE_ALLOWED_HOSTS,
} from "../src/lib/work-catalog/work-rate-source-html-parse.ts";
import {
  isP527MeasurementOutOfResearch,
  evaluateExistingCategoryReuseGate,
  WORK_RATE_RESEARCH_PLANE_NORMAL,
  resolveWorkRatePass2Url,
} from "../src/lib/work-catalog/work-rate-discovery-allowlist.ts";
import { assertLaborResearchAllowed } from "../src/lib/intelligent-estimator/classification-gate.ts";
import {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  APF_KB_BENCHMARK_MEASUREMENT_URL,
  assertApfHostsNotInKeep4,
  buildApfPricingCandidateFromEvidence,
  createApfHttpLaborMarketPort,
  createDefaultApfLaborMarketPort,
  evaluateApfEphemeralSelectiveResearchPolicy,
  isApfAuthorizedHost,
  isApfForbiddenUnitProxyForMeasurement,
  isApfHostBlockedFromNormalWorkRate,
  isApfNominatedSourceEligibleForNormalWorkRate,
  isApfRouteBlockedFromNormalWorkRate,
  marketObservationsToResearchEvidence,
  parseApfMeasurementPriceHtml,
  resolveApfAuthorizedRouteByUrl,
  runApfAuthorizedHttpResearch,
  runAutonomousPricingFallback,
  validateApfHttpRequest,
} from "../src/lib/tender-position-cost/autonomous-pricing-fallback/index.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dir, "../test-infra/fixtures/apf");

let passed = 0;
let failed = 0;
let httpCalls = 0;
let catalogWork = 0;
let ourRate = 0;
let accept = 0;
let kv = 0;

function ok(label, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL ${label}`, detail ?? "");
  }
}

const energospinHtml = readFileSync(join(FIX, "energospin-cennik.html"), "utf8");
const electricoHtml = readFileSync(join(FIX, "electrico-cennik.html"), "utf8");

function fixtureFetch(map) {
  const resolved = { ...map };
  if (resolved["https://www.energospin.pl/cennik/"]) {
    resolved["https://energospin.pl/cennik/"] =
      resolved["https://www.energospin.pl/cennik/"];
  }
  return {
    async fetch(url) {
      httpCalls += 1;
      const body = resolved[url];
      if (!body) {
        return { ok: false, status: 404, finalUrl: url, bodyText: "" };
      }
      return { ok: true, status: 200, finalUrl: url, bodyText: body };
    },
  };
}

console.log("\n=== T1–T4: route authorization APF-only ===");
{
  const es = resolveApfAuthorizedRouteByUrl("https://www.energospin.pl/cennik/");
  ok("T1 energospin route authorized APF", Boolean(es) && es.role === "PRIMARY");
  const el = resolveApfAuthorizedRouteByUrl("https://electrico-pomiary.pl/cennik/");
  ok("T3 electrico route authorized APF", Boolean(el) && el.role === "SECONDARY");
  ok("T2 energospin blocked NORMAL host", isApfHostBlockedFromNormalWorkRate("energospin.pl"));
  ok("T4 electrico blocked NORMAL host", isApfHostBlockedFromNormalWorkRate("electrico-pomiary.pl"));
  ok("T2 NOT in WORK_RATE_ALLOWED_HOSTS", !WORK_RATE_ALLOWED_HOSTS.has("energospin.pl"));
  ok("T4 electrico NOT in KEEP4", !WORK_RATE_ALLOWED_HOSTS.has("electrico-pomiary.pl"));
  ok(
    "T1 NORMAL sourceId blocked",
    isApfNominatedSourceEligibleForNormalWorkRate("energospin_pl") === false,
  );
  ok(
    "T3 electrico NORMAL blocked",
    isApfNominatedSourceEligibleForNormalWorkRate("electrico_pomiary_pl") === false,
  );
}

console.log("\n=== T5–T8: HTTP guard fail-closed ===");
{
  const badUrl = validateApfHttpRequest({
    requestUrl: "https://example.com/cennik/",
  });
  ok("T5 arbitrary URL blocked", badUrl.ok === false);
  const http = validateApfHttpRequest({ requestUrl: "http://www.energospin.pl/cennik/" });
  ok("T6 non-HTTPS blocked", http.ok === false && http.reason === "NOT_HTTPS");
  const redirect = validateApfHttpRequest({
    requestUrl: "https://www.energospin.pl/cennik/",
    finalUrl: "https://electrico-pomiary.pl/cennik/",
  });
  ok("T7 redirect escape blocked", redirect.ok === false && redirect.reason === "REDIRECT_ESCAPE");
  const host2 = validateApfHttpRequest({
    requestUrl: "https://kb.pl/foo/",
  });
  ok("T8 unauthorized host blocked", host2.ok === false);
}

console.log("\n=== T9–T13: unit contract ===");
{
  const parsed = parseApfMeasurementPriceHtml({
    html: energospinHtml,
    sourceId: "energospin_pl",
    sourceUrl: "https://www.energospin.pl/cennik/",
  });
  ok("T9 pomiar rows parsed", parsed.length === 5, parsed.length);
  ok("T9 all sourceUnit pomiar", parsed.every((r) => r.sourceUnit === "pomiar"));

  const punktHtml = energospinHtml.replace(
    "5,00 zł netto / pomiar",
    "5,00 zł netto / punkt",
  );
  const punktRows = parseApfMeasurementPriceHtml({
    html: punktHtml,
    sourceId: "energospin_pl",
    sourceUrl: "https://www.energospin.pl/cennik/",
  });
  ok("T10 punkt rejected", !punktRows.some((r) => r.descriptionPl.includes("impedancji")));
  ok("T10 punkt forbidden helper", isApfForbiddenUnitProxyForMeasurement("punkt"));

  const sztHtml = energospinHtml.replace("/ pomiar", "/ szt");
  const sztRows = parseApfMeasurementPriceHtml({
    html: sztHtml,
    sourceId: "energospin_pl",
    sourceUrl: "https://www.energospin.pl/cennik/",
  });
  ok("T11 szt rejected", sztRows.length < 5);
  ok("T11 szt forbidden", isApfForbiddenUnitProxyForMeasurement("szt"));

  const obwHtml = energospinHtml.replace("/ pomiar", "/ obw");
  const obwRows = parseApfMeasurementPriceHtml({
    html: obwHtml,
    sourceId: "energospin_pl",
    sourceUrl: "https://www.energospin.pl/cennik/",
  });
  ok("T12 obw rejected", obwRows.length < 5);

  ok(
    "T13 package/travel/docs not in parsed",
    !parsed.some((r) =>
      /mieszkanie|dom|dojazd|dokumentac/i.test(r.descriptionPl),
    ),
  );
}

console.log("\n=== T14–T19: RCD + no KNR inference ===");
{
  const parsed = parseApfMeasurementPriceHtml({
    html: energospinHtml,
    sourceId: "energospin_pl",
    sourceUrl: "https://www.energospin.pl/cennik/",
  });
  const rcd = parsed.find((r) => /rcd/i.test(r.descriptionPl));
  ok("T16 RCD row recognized", Boolean(rcd));
  ok(
    "T17 no 1305-01",
    !parsed.some((r) => String(r.descriptionPl).includes("1305-01")),
  );
  ok(
    "T18 no 1305-02",
    !parsed.some((r) => String(r.descriptionPl).includes("1305-02")),
  );
  for (const tc of ["1305-01", "1305-02", "1205-05", "1205-06"]) {
    ok(`T19 obs no tableCode ${tc}`, !parsed.some((r) => String(r.descriptionPl).includes(tc)));
  }
}

console.log("\n=== T20–T23: no CatalogWork / OUR RATE / Accept / KV ===");
{
  const pol = evaluateApfEphemeralSelectiveResearchPolicy({ unit: "pomiar" });
  ok("T20 CREATE 0", pol.sideEffects.catalogWorkCreateCalls === 0);
  catalogWork += pol.sideEffects.catalogWorkCreateCalls;
  ok("T21 OUR RATE 0", pol.sideEffects.ourRateWriteCalls === 0);
  ourRate += pol.sideEffects.ourRateWriteCalls;
  ok("T22 Accept 0", pol.sideEffects.acceptCalls === 0);
  accept += pol.sideEffects.acceptCalls;
  ok("T23 KV 0", pol.sideEffects.kvWriteCalls === 0);
  kv += pol.sideEffects.kvWriteCalls;
}

console.log("\n=== T24: NORMAL P5.27 regression ===");
{
  ok(
    "T24 pomiar blocked NORMAL",
    isP527MeasurementOutOfResearch({ unit: "pomiar", namePl: "Pomiar" }),
  );
  const gate = evaluateExistingCategoryReuseGate({
    family: "electrical",
    categoryKey: "electrical",
    namePl: "Pomiar rezystancji",
    domain: "LABOR",
    unit: "pomiar",
    researchPlane: WORK_RATE_RESEARCH_PLANE_NORMAL,
  });
  ok("T24 gate OUT_OF_RESEARCH_MEASUREMENT", gate.rejectReason === "OUT_OF_RESEARCH_MEASUREMENT");
}

console.log("\n=== T25: RESEARCH_ON_UNKNOWN_IDENTITY regression ===");
{
  const gate = assertLaborResearchAllowed({
    workId: null,
    namePl: "Pomiar nieznany",
    unit: "szt",
  });
  ok("T25 unknown workId blocks labor research", gate.ok === false);
}

console.log("\n=== T26–T28: fail-closed research ===");
{
  ok("T26 assertApfHostsNotInKeep4", assertApfHostsNotInKeep4());
  ok(
    "T26 NORMAL route blocked for APF URL",
    isApfRouteBlockedFromNormalWorkRate("https://www.energospin.pl/cennik/"),
  );
  ok(
    "T26 no PASS2 URL for energospin",
    resolveWorkRatePass2Url("energospin_pl", "electrical_measurement") == null,
  );

  const beforeHttp = httpCalls;
  const noTable = await runApfAuthorizedHttpResearch({
    query: {
      tenderId: "T",
      lineId: "L",
      description: "Pomiar",
      unit: "pomiar",
    },
    fetchPort: fixtureFetch({
      "https://www.energospin.pl/cennik/": "<html><body>brak tabeli</body></html>",
    }),
  });
  httpCalls += noTable.httpCalls;
  ok("T27 parser failure NO_SOURCES", noTable.status === "NO_SOURCES");

  const mismatch = await runApfAuthorizedHttpResearch({
    query: {
      tenderId: "T",
      lineId: "L",
      description: "Kompletnie inna usługa hydrauliczna",
      unit: "pomiar",
    },
    fetchPort: fixtureFetch({
      "https://www.energospin.pl/cennik/": energospinHtml,
    }),
  });
  httpCalls += mismatch.httpCalls;
  ok("T28 content mismatch NO_SOURCES", mismatch.status === "NO_SOURCES");
  ok("T26 default port no fetch NO_SOURCES", beforeHttp <= httpCalls);
}

console.log("\n=== T29: PRIMARY HTTP research + ephemeral candidate ===");
{
  const fetchPort = fixtureFetch({
    "https://www.energospin.pl/cennik/": energospinHtml,
  });
  const port = createApfHttpLaborMarketPort(fetchPort);
  const res = await port.research({
    tenderId: "T-3C",
    lineId: "L-izol",
    description: "Pomiar rezystancji izolacji obwodów 1 fazowych",
    unit: "pomiar",
  });
  httpCalls += res.httpCalls;
  ok("T29 OK status", res.status === "OK", res);
  ok("T29 one HTTP call", res.httpCalls === 1);
  ok("T29 PRIMARY sourceId", res.observations[0]?.sourceId === "energospin_pl");
  ok("T29 price 10 PLN", res.observations[0]?.unitRatePln === 10);

  const run = await runAutonomousPricingFallback({
    tenderId: "T-3C-RUN",
    laborMarketPort: port,
    line: {
      lineId: "L-izol",
      description: "Pomiar rezystancji izolacji obwodów 1 fazowych",
      unit: "pomiar",
      catalogWorkId: null,
    },
  });
  httpCalls += run.counters.httpCalls;
  ok("T29 CANDIDATE", run.status === "CANDIDATE", run.status);
  ok("T29 ephemeral NOT OUR RATE", run.candidate?.limitations.some((l) => l.includes("NOT_OUR_RATE")));
  catalogWork += run.counters.catalogWorkCreateCalls;
  kv += run.counters.kvWriteCalls;
  accept += run.counters.acceptCalls;
}

console.log("\n=== T30: cross-source — no silent average ===");
{
  const primary = {
    evidenceId: "p1",
    unitRatePln: 10,
    unit: "pomiar",
    sourceId: "energospin_pl",
    sourceRole: "PRIMARY",
    observedAt: "2026-08-27",
    summaryPl: "PRIMARY",
  };
  const secondary = {
    evidenceId: "s1",
    unitRatePln: 5,
    unit: "pomiar",
    sourceId: "electrico_pomiary_pl",
    sourceRole: "SECONDARY",
    observedAt: "2026-08-27",
    summaryPl: "SECONDARY",
  };
  const evidence = marketObservationsToResearchEvidence([primary, secondary]);
  const cand = buildApfPricingCandidateFromEvidence({
    query: {
      tenderId: "T",
      lineId: "L",
      description: "x",
      unit: "pomiar",
    },
    evidence,
    marketObservations: [primary, secondary],
  });
  ok("T30 candidate uses PRIMARY only (10 not 7.5)", cand?.components.labor?.unitRatePln === 10, cand);
}

console.log("\n=== T31: KB benchmark only — not APF route ===");
{
  ok(
    "T31 KB URL not authorized APF execution",
    resolveApfAuthorizedRouteByUrl(APF_KB_BENCHMARK_MEASUREMENT_URL) == null,
  );
  ok("T31 KB host not APF authorized", !isApfAuthorizedHost("kb.pl"));
}

console.log("\n=== T32: default port without fetchPort — HTTP=0 ===");
{
  const before = httpCalls;
  const port = createDefaultApfLaborMarketPort();
  const res = await port.research({
    tenderId: "T",
    lineId: "L",
    description: "Pomiar impedancji pętli zwarcia",
    unit: "pomiar",
  });
  httpCalls += res.httpCalls;
  ok("T32 NO_SOURCES without fetchPort", res.status === "NO_SOURCES");
  ok("T32 httpCalls 0 on default", res.httpCalls === 0);
}

console.log("\n=== T33: NORMAL work-rate host guard ===");
{
  ok("T33 energospin not KEEP4 host", !WORK_RATE_ALLOWED_HOSTS.has("energospin.pl"));
  ok("T33 electrico not KEEP4 host", !WORK_RATE_ALLOWED_HOSTS.has("electrico-pomiary.pl"));
}

console.log("\n=== T34: electrico fixture parse ===");
{
  const parsed = parseApfMeasurementPriceHtml({
    html: electricoHtml,
    sourceId: "electrico_pomiary_pl",
    sourceUrl: "https://electrico-pomiary.pl/cennik/",
  });
  ok("T34 eight PER_MEASUREMENT rows", parsed.length === 8, parsed.length);
}

console.log("\n========================================");
console.log(
  `SLICE3C EXECUTION: ${passed} PASS / ${failed} FAIL · HTTP=${httpCalls} CREATE=${catalogWork} OUR_RATE=${ourRate} ACCEPT=${accept} KV=${kv}`,
);
process.exit(failed > 0 ? 1 : 0);
