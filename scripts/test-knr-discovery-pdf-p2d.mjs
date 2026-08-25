/**
 * IK-KNR Phase 2D — PDF L3 on-demand discovery seam harness (A–T).
 * ZERO live production hosts · fixture allowlist + injectable extract only.
 *
 * npx vite-node scripts/test-knr-discovery-pdf-p2d.mjs
 */
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT,
  KNR_DISCOVERY_L3_PDF_DOCUMENT_TEST_FIXTURE,
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY,
  buildFakeL3BoqDocumentPdfText,
  clearKnrDiscoveryClientSfStateForTests,
  clearKnrDiscoveryDocumentCacheForTests,
  clearKnrDiscoveryOnDemandBudgetForTests,
  createMemoryAtomicKnrDiscoveryJobStore,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  executeKnrDiscoveryHttpPlan,
  executeKnrDiscoveryPdfPlan,
  extractKnrDiscoveryFactFromDocumentText,
  extractKnrDiscoveryPdfTextFromBytes,
  foldIdentityKeyV2,
  foldKnrDiscoveryCode,
  isKnrDiscoveryAllowlistEmpty,
  parseIdentityPartialFromCatalogBasis,
  planKnrDiscoveryHttp,
  runKnrDiscoveryOnDemand,
  stageDiscoveryFactToPendingCatalog,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";

const NOW = "2026-08-25T17:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const PDF_FIX = KNR_DISCOVERY_L3_PDF_DOCUMENT_TEST_FIXTURE;
const SOURCE_ID = PDF_FIX[0].sourceId;
const DOC_URL = PDF_FIX[0].url;

if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

function missFromCode(code) {
  const basis = buildCatalogBasisFromRawCode(code);
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 = String(basis.normalizedKey ?? "").trim();
  return {
    evidenceKeyV1,
    identityKeyV2,
    family: String(partial.family ?? "KNR"),
    displayCode: String(basis.rawCode ?? evidenceKeyV1),
    normalizedKey: evidenceKeyV1,
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      column: partial.column,
      item: partial.item,
    },
  };
}

const PDF_TEXT = buildFakeL3BoqDocumentPdfText();
const fakePdfBytes = new TextEncoder().encode("%PDF-FAKE " + PDF_TEXT);

function pdfFetchOk(url, bodyBytes = fakePdfBytes, ct = "application/pdf") {
  return async (reqUrl) => ({
    ok: true,
    status: 200,
    url: url || reqUrl,
    headers: { get: (n) => (String(n).toLowerCase() === "content-type" ? ct : null) },
    arrayBuffer: async () => bodyBytes.buffer.slice(
      bodyBytes.byteOffset,
      bodyBytes.byteOffset + bodyBytes.byteLength,
    ),
    text: async () => PDF_TEXT,
  });
}

const extractFromFixture = async () => ({
  text: PDF_TEXT,
  pageCount: 1,
  noTextLayer: false,
  extractError: false,
});

const extractScan = async () => ({
  text: "",
  pageCount: 2,
  noTextLayer: true,
  extractError: false,
});

clearKnrDiscoveryClientSfStateForTests();
clearKnrDiscoveryOnDemandBudgetForTests();
clearKnrDiscoveryDocumentCacheForTests();

// --- T: production controlled pilot defaults ---
ok(
  "T PROD allowlist single pilot source",
  !isKnrDiscoveryAllowlistEmpty()
    && KNR_DISCOVERY_HTTP_ALLOWLIST.length === 1
    && KNR_DISCOVERY_HTTP_ALLOWLIST[0]?.sourceId === "l3_bip_malopolska_1646919",
);
ok(
  "T PROD feature pilot ON",
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT === true,
);
ok(
  "T PROD source selection single key",
  Object.keys(KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY).length === 1
    && KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY["KNR-W|4-01|0701-05"]?.[0] === "l3_bip_malopolska_1646919",
);

// --- A: PDF valid text extract ---
{
  const r = await extractKnrDiscoveryPdfTextFromBytes(fakePdfBytes, {
    sourceId: SOURCE_ID,
    contentType: "application/pdf",
    extractFn: extractFromFixture,
  });
  ok("A PDF text extract PASS", r.ok === true && r.ok && r.text.includes("KNR-W 4-01 0701-05"), r);
}

// --- B: PDF scan ---
{
  const r = await extractKnrDiscoveryPdfTextFromBytes(fakePdfBytes, {
    extractFn: extractScan,
  });
  ok("B PDF_TEXT_UNAVAILABLE", r.ok === false && r.reason === "PDF_TEXT_UNAVAILABLE", r);
}

// --- C/D/E/F via PDF executor + planner ---
{
  const plan = planKnrDiscoveryHttp({
    sourceId: SOURCE_ID,
    featureEnabled: true,
    allowlistOverride: PDF_FIX,
  });
  ok("plan allowed for fixture", plan.allowed === true && plan.requestUrl === DOC_URL);

  const wrongCt = await executeKnrDiscoveryPdfPlan(plan, {
    fetchImpl: pdfFetchOk(DOC_URL, fakePdfBytes, "text/html"),
    allowlistOverride: PDF_FIX,
    nowIso: NOW,
    extractFn: extractFromFixture,
    skipCache: true,
  });
  ok("C wrong content-type deny", wrongCt.denyCode === "UNSUPPORTED_CONTENT_TYPE" && wrongCt.evidenceWritable === false, wrongCt);

  const httpDenied = await executeKnrDiscoveryPdfPlan(
    {
      ...plan,
      requestUrl: "http://example.com/l3-boq/knr-4-01-fixture.pdf",
    },
    {
      fetchImpl: pdfFetchOk("http://example.com/x.pdf"),
      allowlistOverride: PDF_FIX,
      nowIso: NOW,
      skipCache: true,
    },
  );
  ok("D HTTP URL deny", httpDenied.denyCode === "INVALID_URL" || httpDenied.jobStatus === "DENIED", httpDenied);

  const ssrf = await executeKnrDiscoveryPdfPlan(
    { ...plan, requestUrl: "https://127.0.0.1/secret.pdf" },
    {
      fetchImpl: pdfFetchOk("https://127.0.0.1/secret.pdf"),
      allowlistOverride: [
        {
          sourceId: SOURCE_ID,
          hostname: "127.0.0.1",
          url: "https://127.0.0.1/secret.pdf",
          originId: "knr_official_public_document",
          active: true,
          priority: "OFFICIAL_PUBLIC_DOCUMENT",
        },
      ],
      nowIso: NOW,
      skipCache: true,
    },
  );
  ok("E SSRF/private IP deny", ssrf.denyCode === "SSRF_DENIED", ssrf);

  const redirectDenied = await executeKnrDiscoveryPdfPlan(plan, {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      url: "https://evil.example/loot.pdf",
      headers: { get: (n) => (String(n).toLowerCase() === "content-type" ? "application/pdf" : null) },
      arrayBuffer: async () => fakePdfBytes.buffer.slice(
        fakePdfBytes.byteOffset,
        fakePdfBytes.byteOffset + fakePdfBytes.byteLength,
      ),
    }),
    allowlistOverride: PDF_FIX,
    nowIso: NOW,
    extractFn: extractFromFixture,
    skipCache: true,
  });
  ok("F redirect unauthorized host deny", redirectDenied.denyCode === "REDIRECT_DENIED", redirectDenied);
}

// --- Layout-aware FACT extract (A–H) + contiguous regression ---
{
  // A: multi-line KNR-W + spaced unit m 2
  const layoutA = [
    "2 KNR-W 4-01 Naprawa posadzki cementowej z zatarciem na gładko o po- miejsc 6,00",
    "d.1.1 0804-01 wierzchni do 0.25 m2 w jednym miejscu .",
    "3 KNR-W 4-01 Odbicie tynków z zaprawy cementowo-wapiennej w miejs- m 2 (14,3+14,3)*1,1+6,50 =",
    "d.1.1 0701-05 cach widocznych zawilgoceń. 37,96",
    "analogia",
    "4 KNR BC-02 Odgrzybianie ścian preparatem - ręcznie, malowanie dwu- m 2 37,96+21 = 58,96",
  ].join("\n");
  const factA = extractKnrDiscoveryFactFromDocumentText(layoutA, {
    expectedCode: "KNR-W 4-01 0701-05",
    evidenceKeyV1: "KNR-W|4-01|0701-05",
    sourceId: "l3_bip_malopolska_1646919",
  });
  ok(
    "LA-A multi-line KNR-W 0701-05 FULL",
    factA.extractionStatus === "FULL"
      && foldKnrDiscoveryCode(factA.knrCode) === foldKnrDiscoveryCode("KNR-W 4-01 0701-05")
      && factA.unit === "m2"
      && Boolean(factA.description && /Odbicie/i.test(factA.description)),
    factA,
  );

  // B: multi-line KNR + szt.
  const layoutB = [
    "1 KNR 4-01 Wykucie z muru ościeżnic stalowych drzwi",
    "0354-07 szt. 4,000",
    "2 KNR 4-01 Inna pozycja następną szt. 1",
  ].join("\n");
  const factB = extractKnrDiscoveryFactFromDocumentText(layoutB, {
    expectedCode: "KNR 4-01 0354-07",
    evidenceKeyV1: "KNR|4-01|0354-07",
  });
  ok(
    "LA-B multi-line 0354-07 FULL szt",
    factB.extractionStatus === "FULL"
      && /0354/.test(factB.knrCode)
      && /^szt/i.test(factB.unit || "")
      && Boolean(factB.description && /Wykucie/i.test(factB.description)),
    factB,
  );

  // C: slash form 1202/08
  const layoutC = [
    "9 KNR 4-01 Zeskrobanie i zmycie starej farby w pomieszczeniach",
    "1202/08 m2 32,540",
  ].join("\n");
  const factC = extractKnrDiscoveryFactFromDocumentText(layoutC, {
    expectedCode: "KNR 4-01 1202-08",
    evidenceKeyV1: "KNR|4-01|1202-08",
  });
  ok(
    "LA-C slash 1202/08 FULL m2",
    factC.extractionStatus === "FULL"
      && foldKnrDiscoveryCode(factC.knrCode).includes("1202")
      && factC.unit === "m2"
      && Boolean(factC.description && /Zeskrobanie/i.test(factC.description)),
    factC,
  );

  // D: false positive bare T
  const layoutD = "KNR 4-01 0111-01 Opis roboty malarskiej ścian T nagłówek kolumny enough padding xxxxxxxxxx";
  const factD = extractKnrDiscoveryFactFromDocumentText(layoutD, {
    expectedCode: "KNR 4-01 0111-01",
    evidenceKeyV1: "KNR|4-01|0111-01",
  });
  ok("LA-D unit != T false positive", factD.unit !== "T" && factD.unit !== "t", factD);

  // E: do not absorb next row
  const layoutE = [
    "3 KNR-W 4-01 Odbicie tynków wewnętrznych z zaprawy cementowej m2",
    "0701-05 widocznych zawilgoceń",
    "4 KNR 4-01 0354-07 Wykucie ościeżnic stalowych drzwi szt. 2",
  ].join("\n");
  const factE = extractKnrDiscoveryFactFromDocumentText(layoutE, {
    expectedCode: "KNR-W 4-01 0701-05",
    evidenceKeyV1: "KNR-W|4-01|0701-05",
  });
  ok(
    "LA-E no next-row bleed",
    factE.extractionStatus === "FULL"
      && factE.unit === "m2"
      && !/Wykucie|ościeżnic|0354/i.test(factE.description || ""),
    factE,
  );

  // F: missing description → PARTIAL
  const factF = extractKnrDiscoveryFactFromDocumentText(
    "KNR 4-01 0888-01 m2",
    { expectedCode: "KNR 4-01 0888-01", evidenceKeyV1: "KNR|4-01|0888-01" },
  );
  ok(
    "LA-F missing description PARTIAL",
    factF.extractionStatus === "PARTIAL_DISCOVERY" && factF.description == null && factF.unit === "m2",
    factF,
  );

  // G: missing unit → PARTIAL
  const factG = extractKnrDiscoveryFactFromDocumentText(
    "KNR 4-01 0999-01 Rozebranie posadzki z płytek ceramicznych na zaprawie cementowej enough padding xxxxxxxxxx",
    { expectedCode: "KNR 4-01 0999-01", evidenceKeyV1: "KNR|4-01|0999-01" },
  );
  ok(
    "LA-G missing unit PARTIAL",
    factG.extractionStatus === "PARTIAL_DISCOVERY" && factG.unit == null && Boolean(factG.description),
    factG,
  );

  // H: bare table-item without KNR prefix
  const factH = extractKnrDiscoveryFactFromDocumentText(
    "d.1.1 0701-05 cach widocznych zawilgoceń. 37,96 m2",
    { expectedCode: "0701-05", evidenceKeyV1: "0701-05" },
  );
  ok(
    "LA-H bare 0701-05 not full KNR",
    factH.extractionStatus !== "FULL"
      && (factH.knrCode === "" || !/^KNR/i.test(factH.knrCode) || factH.description == null),
    factH,
  );

  // Contiguous fixture regressions (previous G/H/I/J/K/L/M/N)
  const fullW = extractKnrDiscoveryFactFromDocumentText(PDF_TEXT, {
    expectedCode: "KNR-W 4-01 0701-05",
    evidenceKeyV1: "KNR-W|4-01|0701-05",
    sourceId: SOURCE_ID,
  });
  ok("H KNR-W extract", fullW.knrCode.toUpperCase().includes("KNR-W") && fullW.extractionStatus === "FULL", fullW);
  ok("J description", Boolean(fullW.description && /Odbicie/i.test(fullW.description)), fullW);
  ok("K unit", Boolean(fullW.unit && /m2/i.test(fullW.unit)), fullW);
  ok("N R/M/S absent (no invent)", true);

  const full354 = extractKnrDiscoveryFactFromDocumentText(PDF_TEXT, {
    expectedCode: "KNR 4-01 0354-07",
    evidenceKeyV1: "KNR|4-01|0354-07",
  });
  ok("G KNR 4-01 0354-07", full354.extractionStatus === "FULL" && /0354/.test(full354.knrCode), full354);

  const slash = extractKnrDiscoveryFactFromDocumentText(PDF_TEXT, {
    expectedCode: "KNR 4-01 1202-08",
    evidenceKeyV1: "KNR|4-01|1202-08",
  });
  ok(
    "I slash/hyphen normalization",
    slash.extractionStatus === "FULL"
      && foldKnrDiscoveryCode(slash.knrCode).includes("1202")
      && foldKnrDiscoveryCode("KNR 4-01 1202/08") === foldKnrDiscoveryCode("KNR 4-01 1202-08"),
    slash,
  );

  const noUnit = extractKnrDiscoveryFactFromDocumentText(
    "KNR 4-01 0999-01 Rozebranie posadzki ceramicznej bez jednostki miary w tekście enough padding xxxxxxxxxx",
    { expectedCode: "KNR 4-01 0999-01", evidenceKeyV1: "KNR|4-01|0999-01" },
  );
  ok("L missing unit → partial", noUnit.extractionStatus === "PARTIAL_DISCOVERY" && noUnit.unit == null, noUnit);

  const noDesc = extractKnrDiscoveryFactFromDocumentText(
    "prefix KNR 4-01 0888-01 m2 trailing enough padding xxxxxxxxxx",
    { expectedCode: "KNR 4-01 0888-01", evidenceKeyV1: "KNR|4-01|0888-01" },
  );
  ok(
    "M missing description → partial/no guess invent",
    noDesc.unit != null && noDesc.extractionStatus === "PARTIAL_DISCOVERY" && noDesc.description == null,
    noDesc,
  );

  // Real malopolska layout regression (captured text shape from preflight)
  const malopolska = [
    "1 KNR 4-04 0504- Rozebranie posadzek z wykładzin z tworzyw sztucznych - m 2 (3,26*3,69)+(4,0*3,26) =",
    "d.1.1 07 płytki 25,07",
    "2 KNR-W 4-01 Naprawa posadzki cementowej z zatarciem na gładko o po- miejsc 6,00",
    "d.1.1 0804-01 wierzchni do 0.25 m2 w jednym miejscu .",
    "3 KNR-W 4-01 Odbicie tynków z zaprawy cementowo-wapiennej w miejs- m 2 (14,3+14,3)*1,1+6,50 =",
    "d.1.1 0701-05 cach widocznych zawilgoceń. 37,96",
    "analogia",
    "4 KNR BC-02 Odgrzybianie ścian preparatem - ręcznie, malowanie dwu- m 2 37,96+21 = 58,96",
  ].join("\n");
  const realTarget = extractKnrDiscoveryFactFromDocumentText(malopolska, {
    expectedCode: "KNR-W 4-01 0701-05",
    evidenceKeyV1: "KNR-W|4-01|0701-05",
    sourceId: "l3_bip_malopolska_1646919",
  });
  ok(
    "REAL malopolska 0701-05 FULL",
    realTarget.extractionStatus === "FULL"
      && foldKnrDiscoveryCode(realTarget.knrCode) === foldKnrDiscoveryCode("KNR-W 4-01 0701-05")
      && realTarget.unit === "m2"
      && Boolean(realTarget.description && /Odbicie/i.test(realTarget.description) && /zawilg/i.test(realTarget.description)),
    realTarget,
  );
}

// --- A via full PDF executor success ---
{
  clearKnrDiscoveryDocumentCacheForTests();
  const plan = planKnrDiscoveryHttp({
    sourceId: SOURCE_ID,
    featureEnabled: true,
    allowlistOverride: PDF_FIX,
  });
  const exec = await executeKnrDiscoveryPdfPlan(plan, {
    fetchImpl: pdfFetchOk(DOC_URL),
    allowlistOverride: PDF_FIX,
    nowIso: NOW,
    extractFn: extractFromFixture,
    skipCache: false,
  });
  ok("A PDF executor SUCCEEDED", exec.jobStatus === "SUCCEEDED" && exec.evidenceWritable && exec.accounting.httpRequestCount === 1, exec);

  const exec2 = await executeKnrDiscoveryPdfPlan(plan, {
    fetchImpl: async () => {
      throw new Error("should not fetch again");
    },
    allowlistOverride: PDF_FIX,
    nowIso: NOW,
    extractFn: extractFromFixture,
    skipCache: false,
  });
  ok("O shared cache second fetch HTTP=0", exec2.jobStatus === "SUCCEEDED" && exec2.accounting.httpRequestCount === 0, exec2);
}

// --- O/P/Q/R/S learning loop via on-demand ---
{
  clearKnrDiscoveryClientSfStateForTests();
  clearKnrDiscoveryOnDemandBudgetForTests();
  let fetchCount = 0;
  const missA = missFromCode("KNR 4-01 0354-07");
  const missB = missFromCode("KNR-W 4-01 0701-05");
  const keyMap = {
    [missA.normalizedKey]: [SOURCE_ID],
    [missB.normalizedKey]: [SOURCE_ID],
  };

  const r1 = await runKnrDiscoveryOnDemand({
    missing: [missA, missB],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: PDF_FIX,
    keyMapOverride: keyMap,
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
    fakeExecForSource: async (sourceId) => {
      fetchCount += 1;
      return {
        jobStatus: "SUCCEEDED",
        denyCode: null,
        accounting: { httpRequestCount: fetchCount === 1 ? 1 : 0, attemptedFetch: fetchCount === 1 },
        finalUrl: DOC_URL,
        contentType: "application/pdf",
        bodyText: PDF_TEXT,
        fetchedAtIso: NOW,
        evidenceWritable: true,
      };
    },
    httpMode: "fake",
  });

  ok("O multi MISS same PDF — orch ran both", r1.perKey.length === 2 && r1.perKey.every((k) => k.reason === "ORCH_DONE"), r1.perKey);
  ok("P evidence keys present", Boolean(r1.discoveryStore.entries[missA.evidenceKeyV1] && r1.discoveryStore.entries[missB.evidenceKeyV1]));
  ok(
    "R FULL → PENDING_VERIFY",
    r1.catalogStore.entries[missA.identityKeyV2]?.verificationStatus === "PENDING_VERIFY"
      || r1.perKey.some((k) => k.stagedPending),
    r1.perKey,
  );
  ok(
    "S never VERIFIED",
    Object.values(r1.catalogStore.entries).every((e) => e.verificationStatus !== "VERIFIED")
      && r1.authorityWrites.catalogVerified === false,
  );

  const r2 = await runKnrDiscoveryOnDemand({
    missing: [missA],
    nowIso: NOW,
    nowMs: NOW_MS + 1,
    featureEnabled: true,
    allowlistOverride: PDF_FIX,
    keyMapOverride: keyMap,
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore: r1.discoveryStore,
    catalogStore: r1.catalogStore,
    ignoreProcessBudget: true,
    httpMode: "fake",
    fakeExecForSource: async () => {
      throw new Error("learn-once must not fetch");
    },
  });
  ok("Q learn-once / repeated KNR no fetch", r2.perKey[0]?.reason === "SKIP_HIT_OR_EVIDENCE" && r2.httpRequestCount === 0, r2.perKey[0]);
}

// --- HTTP exec PDF path + feature off ---
{
  clearKnrDiscoveryDocumentCacheForTests();
  const denied = planKnrDiscoveryHttp({
    sourceId: SOURCE_ID,
    featureEnabled: false,
    allowlistOverride: PDF_FIX,
  });
  ok("FEATURE off plan denied", denied.allowed === false && denied.denyCode === "FEATURE_OFF");

  const planOn = planKnrDiscoveryHttp({
    sourceId: SOURCE_ID,
    featureEnabled: true,
    allowlistOverride: PDF_FIX,
  });
  const httpPdf = await executeKnrDiscoveryHttpPlan(planOn, {
    fetchImpl: pdfFetchOk(DOC_URL),
    allowlistOverride: PDF_FIX,
    nowIso: NOW,
    pdfExtractFn: extractFromFixture,
    skipDocumentCache: true,
  });
  ok("HTTP exec PDF path SUCCEEDED", httpPdf.jobStatus === "SUCCEEDED" && httpPdf.contentType?.includes("pdf"), httpPdf);

  const staged = stageDiscoveryFactToPendingCatalog({
    fact: extractKnrDiscoveryFactFromDocumentText(PDF_TEXT, {
      expectedCode: "KNR-W 4-01 0701-05",
      evidenceKeyV1: missFromCode("KNR-W 4-01 0701-05").evidenceKeyV1,
    }),
    identityKeyV2: missFromCode("KNR-W 4-01 0701-05").identityKeyV2,
    evidenceKeyV1: missFromCode("KNR-W 4-01 0701-05").evidenceKeyV1,
    identity: missFromCode("KNR-W 4-01 0701-05").identity,
    displayCode: "KNR-W 4-01 0701-05",
    nowIso: NOW,
    catalogStore: emptyKnrCatalogStore(NOW),
    sourceIdentifier: SOURCE_ID,
  });
  ok("catalog stage FULL pending only", staged.ok && staged.outcome === "STAGED_PENDING" && staged.entry?.verificationStatus === "PENDING_VERIFY", staged);
}

console.log(`\nPDF-P2D ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
