/**
 * H-HIST — Historical Executed ATH Knowledge harness
 *
 * npx vite-node scripts/test-historical-executed-ath.mjs
 *
 * Asserts READ-ONLY · NO VERIFY · NO APPROVE · NO REJECT · NO CATALOG · NO KL-6
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHistoricalExecutedIndexFromAthSources,
  buildHistoricalExecutedIndexFromOccurrences,
  emptyHistoricalExecutedIndex,
  lookupHistoricalExecuted,
  makeHistoricalOccurrence,
  summarizeHistoricalKinds,
} from "../src/lib/intelligent-estimator/historical-executed/index.ts";
import { buildSyntheticAthFixture } from "../src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts";
import { buildKnrNormContentHash } from "../src/lib/intelligent-estimator/knr-knowledge/knr-content-hash.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { buildIkKnrConversation } from "../src/lib/intelligent-estimator/ik-knr-conversation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(id, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`PASS ${id}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.error(`FAIL ${id}${detail ? ` — ${detail}` : ""}`);
  }
}

function normsFull(rQty = 0.3298, mQty = 0.18) {
  return {
    laborNorms: [
      { kind: "R", code: "RMS-47", description: "robocizna", unit: "r-g", quantity: rQty },
    ],
    materialNorms: [
      { kind: "M", code: "RMS-1", description: "zaprawa", unit: "m3", quantity: mQty },
    ],
    equipmentNorms: [
      { kind: "S", code: "RMS-2", description: "sprzet", unit: "m-g", quantity: 0.01 },
    ],
  };
}

function basis(family, catalogId, tableCode) {
  const display = `${family} ${catalogId}${tableCode ? ` ${tableCode}` : ""}`.trim();
  return {
    family,
    catalogId,
    tableCode,
    rawCode: display,
    display,
    normalizedKey: display.toLowerCase().replace(/\s+/g, "|"),
  };
}

// —— Banlist: historical module must not import KL-6 / write-router ——
const histFiles = [
  "historical-executed-types.ts",
  "historical-executed-normalize.ts",
  "historical-executed-index.ts",
  "historical-executed-lookup.ts",
  "index.ts",
];
const ban = [
  "executeKnrOwnerVerifyApprove",
  "executeKnrOwnerVerifyReject",
  "persistVerifiedKnrCatalogEntry",
  "knr-verify-orchestrator",
  "knr-catalog-write-router",
  "autoOwnerVerify",
];
for (const f of histFiles) {
  const text = readFileSync(
    join(root, "src/lib/intelligent-estimator/historical-executed", f),
    "utf8",
  );
  for (const b of ban) {
    assert(`H-HIST-BAN-${f}-${b}`, !text.includes(b), "no authority import");
  }
}

// 1. EXACT + FULL RMS (L0) via identity
{
  const norms = normsFull();
  const hash = buildKnrNormContentHash(norms);
  const id =
    "KNR|2-02|ORGBUD|1998|CHAPTER|1505|01||";
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 1505-01",
      identityKeyV2: id,
      rmsClass: "FULL_RMS",
      norms,
      contentHash: hash,
      chapter: "ROBOTY",
    }),
    makeHistoricalOccurrence({
      jobId: "j2",
      displayCode: "KNR 2-02 1505-01",
      identityKeyV2: id,
      rmsClass: "FULL_RMS",
      norms,
      contentHash: hash,
      chapter: "ROBOTY",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L1",
      catalogBasis: basis("KNR", "2-02", "1505-01"),
      identityKeyV2: id,
    },
    index,
  );
  assert("H-HIST-01", r.kind === "HISTORICAL_EXACT_RMS" && r.matchLevel === 0, r.kind);
  assert("H-HIST-01b", r.authority === false && r.distinctJobCount === 2);
  assert("H-HIST-01c", r.softLaborHintPl?.includes("0.3298") === true);
  assert("H-HIST-01d", !/OUR\s*RATE/i.test(r.softLaborHintPl ?? ""));
}

// 2. EXACT without RMS (identity, PARTIAL)
{
  const id = "KNR|2-02|P|1998|C|1503|03||";
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 1503-03",
      identityKeyV2: id,
      rmsClass: "PARTIAL_RMS",
      norms: {
        laborNorms: [{ kind: "R", code: "R1", description: "r", unit: "r-g", quantity: 1 }],
        materialNorms: [],
        equipmentNorms: [],
      },
      contentHash: null,
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L2",
      catalogBasis: basis("KNR", "2-02", "1503-03"),
      identityKeyV2: id,
    },
    index,
  );
  assert("H-HIST-02", r.kind === "HISTORICAL_EXACT" && r.matchLevel === 1, r.kind);
}

// 3. FAMILY only
{
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 4-01 0701-05",
      identityKeyV2: "KNR|4-01|P|1988|SCIANY|0701|05||",
      rmsClass: "FULL_RMS",
      norms: normsFull(0.1, 0.1),
      contentHash: "h1",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L3",
      catalogBasis: basis("KNR", "4-01", null),
      description: "malowanie bez table",
    },
    index,
  );
  assert("H-HIST-03", r.kind === "HISTORICAL_FAMILY" && r.matchLevel === 3 && r.confidence === "LOW", r.kind);
  assert("H-HIST-03b", r.exactOccurrenceCount === 0);
}

// 4. CONFLICT — 1003-06 pattern (ŚCIANY vs BIAŁY MONTAŻ)
{
  const nA = normsFull(0.2, 0.18);
  const nB = normsFull(0.2, 0.33);
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "ja",
      displayCode: "KNR 2-05 1003-06",
      identityKeyV2: "KNR|2-05|P|1986|SCIANY|1003|06||",
      chapter: "ŚCIANY",
      description: "sufit",
      rmsClass: "FULL_RMS",
      norms: nA,
      contentHash: buildKnrNormContentHash(nA),
    }),
    makeHistoricalOccurrence({
      jobId: "jb",
      displayCode: "KNR 2-05 1003-06",
      identityKeyV2: "KNR|2-05|P|1986|BIALY MONTAZ|1003|06||",
      chapter: "BIAŁY MONTAŻ",
      description: "armatura",
      rmsClass: "FULL_RMS",
      norms: nB,
      contentHash: buildKnrNormContentHash(nB),
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L4",
      catalogBasis: basis("KNR", "2-05", "1003-06"),
    },
    index,
  );
  assert("H-HIST-04", r.kind === "HISTORICAL_CONFLICT", r.kind);
  assert("H-HIST-04b", r.conflict?.variants.length === 2, String(r.conflict?.variants.length));
  assert("H-HIST-04c", r.softLaborHintPl == null);
}

// 5. MISS
{
  const r = lookupHistoricalExecuted(
    { lineId: "L5", catalogBasis: basis("KNR", "9-99", "9999-99") },
    emptyHistoricalExecutedIndex(),
  );
  assert("H-HIST-05", r.kind === "HISTORICAL_MISS" && r.matchLevel === 5);
}

// 6. duplicate same ATH (same contentSha256)
{
  const norms = normsFull();
  const hash = buildKnrNormContentHash(norms);
  const src = {
    jobId: "j1",
    address: "A",
    filename: "a.ath",
    storagePath: "jobs/j1/a.ath",
    contentSha256: "same-sha",
    jobStatus: "completed",
  };
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 1018-02",
      identityKeyV2: "ID-A",
      source: src,
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 1018-02",
      identityKeyV2: "ID-A",
      source: src,
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
      occurrenceId: "dup2",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L6",
      catalogBasis: basis("KNR", "2-02", "1018-02"),
      identityKeyV2: "ID-A",
    },
    index,
  );
  assert("H-HIST-06", r.distinctSourceCount === 1 && r.occurrenceCount === 2);
}

// 7. duplicate across ATH same hash
{
  const norms = normsFull();
  const hash = buildKnrNormContentHash(norms);
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-15 0208-05",
      identityKeyV2: "ID-B",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j2",
      displayCode: "KNR 2-15 0208-05",
      identityKeyV2: "ID-B",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L7",
      catalogBasis: basis("KNR", "2-15", "0208-05"),
      identityKeyV2: "ID-B",
    },
    index,
  );
  assert("H-HIST-07", r.kind === "HISTORICAL_EXACT_RMS" && r.distinctJobCount === 2);
}

// 8. different chapter → CONFLICT
{
  const n = normsFull(0.1, 0.1);
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-15 0115-02",
      identityKeyV2: "KNR|2-15|P|1985|INSTALACJA SANITARNA|0115|02||",
      chapter: "INSTALACJA SANITARNA",
      norms: n,
      contentHash: "hA",
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j2",
      displayCode: "KNR 2-15 0115-02",
      identityKeyV2: "KNR|2-15|P|1985|BIALY MONTAZ|0115|02||",
      chapter: "BIAŁY MONTAŻ",
      norms: n,
      contentHash: "hB",
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    { lineId: "L8", catalogBasis: basis("KNR", "2-15", "0115-02") },
    index,
  );
  assert("H-HIST-08", r.kind === "HISTORICAL_CONFLICT");
}

// 9. different M quantity (hash split) → CONFLICT
{
  const n1 = normsFull(0.2, 0.18);
  const n2 = normsFull(0.2, 0.33);
  const id = "KNR|2-05|P|1986|SCIANY|1003|06||";
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-05 1003-06",
      identityKeyV2: id,
      chapter: "ŚCIANY",
      norms: n1,
      contentHash: buildKnrNormContentHash(n1),
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j2",
      displayCode: "KNR 2-05 1003-06",
      identityKeyV2: id,
      chapter: "ŚCIANY",
      norms: n2,
      contentHash: buildKnrNormContentHash(n2),
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    { lineId: "L9", catalogBasis: basis("KNR", "2-05", "1003-06") },
    index,
  );
  assert("H-HIST-09", r.kind === "HISTORICAL_CONFLICT", r.kind);
}

// 10. history + current tender (display exact L2, no identity on query)
{
  const norms = normsFull();
  const hash = buildKnrNormContentHash(norms);
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 1505-01",
      identityKeyV2: "ID-C",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L10",
      catalogBasis: basis("KNR", "2-02", "1505-01"),
      identityKeyV2: null,
    },
    index,
  );
  assert("H-HIST-10", r.kind === "HISTORICAL_EXACT" && r.matchLevel === 2, `${r.kind}/${r.matchLevel}`);
}

// 11. zero history
{
  const r = lookupHistoricalExecuted(
    { lineId: "L11", catalogBasis: basis("KNR", "2-02", "1505-01") },
    null,
  );
  assert("H-HIST-11", r.kind === "HISTORICAL_MISS");
}

// 12. multi-source same hash
{
  const norms = normsFull();
  const hash = buildKnrNormContentHash(norms);
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 4-01 0711-01",
      identityKeyV2: "ID-D",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j2",
      displayCode: "KNR 4-01 0711-01",
      identityKeyV2: "ID-D",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j3",
      displayCode: "KNR 4-01 0711-01",
      identityKeyV2: "ID-D",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L12",
      catalogBasis: basis("KNR", "4-01", "0711-01"),
      identityKeyV2: "ID-D",
    },
    index,
  );
  assert("H-HIST-12", r.rmsAgreement === "CONSISTENT" && r.distinctJobCount === 3);
}

// 13. PDF partial — family only, table in description → L2 display
{
  const norms = normsFull();
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 4-01 1204-02",
      identityKeyV2: "ID-E",
      norms,
      contentHash: buildKnrNormContentHash(norms),
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L13",
      catalogBasis: basis("KNR", "4-01", null),
      description: "Dwukrotne malowanie … d.1.1 1204-02 tynków",
      identityKeyV2: null,
    },
    index,
  );
  assert("H-HIST-13", r.kind === "HISTORICAL_EXACT" && r.matchLevel === 2, r.kind);
  assert("H-HIST-13b", r.kind !== "HISTORICAL_EXACT_RMS", "PDF must not invent L0");
}

// 14. PDF description-only (no family) → MISS
{
  const r = lookupHistoricalExecuted(
    {
      lineId: "L14",
      catalogBasis: null,
      description: "malowanie 1204-02",
    },
    buildHistoricalExecutedIndexFromOccurrences([
      makeHistoricalOccurrence({
        jobId: "j1",
        displayCode: "KNR 4-01 1204-02",
      }),
    ]),
  );
  assert("H-HIST-14", r.kind === "HISTORICAL_MISS");
}

// 15. PDF family-only
{
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({ jobId: "j1", displayCode: "KNR 4-02 0235-06" }),
  ]);
  const r = lookupHistoricalExecuted(
    { lineId: "L15", catalogBasis: basis("KNR", "4-02", null) },
    index,
  );
  assert("H-HIST-15", r.kind === "HISTORICAL_FAMILY");
}

// 16. unknown KNR
{
  const r = lookupHistoricalExecuted(
    { lineId: "L16", catalogBasis: basis("KNR", "13-99", "0001-01") },
    buildHistoricalExecutedIndexFromOccurrences([
      makeHistoricalOccurrence({ jobId: "j1", displayCode: "KNR 2-02 1505-01" }),
    ]),
  );
  assert("H-HIST-16", r.kind === "HISTORICAL_MISS");
}

// 17. same displayCode / different identity → CONFLICT
{
  const n = normsFull();
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 0803-01",
      identityKeyV2: "ID-X1",
      chapter: "ROBOTY REMONTOWE",
      norms: n,
      contentHash: "hx1",
      rmsClass: "FULL_RMS",
    }),
    makeHistoricalOccurrence({
      jobId: "j2",
      displayCode: "KNR 2-02 0803-01",
      identityKeyV2: "ID-X2",
      chapter: "ŚCIANY",
      norms: n,
      contentHash: "hx2",
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    { lineId: "L17", catalogBasis: basis("KNR", "2-02", "0803-01") },
    index,
  );
  assert("H-HIST-17", r.kind === "HISTORICAL_CONFLICT" && (r.conflict?.variants.length ?? 0) >= 2);
}

// 18. history match + current tender semantic mismatch (desc delta) — still EXACT code, provenance keeps samples
{
  const norms = normsFull();
  const hash = buildKnrNormContentHash(norms);
  const index = buildHistoricalExecutedIndexFromOccurrences([
    makeHistoricalOccurrence({
      jobId: "j1",
      displayCode: "KNR 2-02 1505-01",
      identityKeyV2: "ID-SEM",
      description: "Historyczne malowanie emulsyjne",
      norms,
      contentHash: hash,
      rmsClass: "FULL_RMS",
    }),
  ]);
  const r = lookupHistoricalExecuted(
    {
      lineId: "L18",
      catalogBasis: basis("KNR", "2-02", "1505-01"),
      description: "Całkiem inny opis przedmiaru PDF",
      identityKeyV2: "ID-SEM",
    },
    index,
  );
  assert("H-HIST-18", r.kind === "HISTORICAL_EXACT_RMS");
  assert("H-HIST-18b", r.sampleDescriptions.some((d) => d.includes("Historyczne")));
}

// ATH bytes path + KNR Expert + EC integration
{
  const bytes = buildSyntheticAthFixture({ displayCode: "KNR 2-02 1505-01" });
  const index = buildHistoricalExecutedIndexFromAthSources([
    {
      bytes,
      jobId: "job-ath-1",
      address: "Test 1",
      filename: "test.ath",
      storagePath: "jobs/job-ath-1/kosztorys-test.ath",
      contentSha256: "sha-ath-1",
      jobStatus: "completed",
    },
  ]);
  assert("H-HIST-ATH-01", index.occurrences.length >= 1, String(index.occurrences.length));

  const expertStub = {
    tenderId: "t1",
    masterBoq: { readyForExperts: true, lineCount: 1, status: "ready" },
    masterBoqLines: [
      {
        dwellingId: "d1",
        line: {
          lineId: "line-1",
          lp: "1",
          description: "malowanie",
          catalogBasis: basis("KNR", "2-02", "1505-01"),
        },
        provenance: null,
      },
    ],
  };
  const report = runIkKnrExpert({
    tenderId: "t1",
    documentExpert: expertStub,
    historicalIndex: index,
  });
  assert("H-HIST-KNR-01", report.status === "COMPLETED");
  assert("H-HIST-KNR-02", report.historicalAuthority === false);
  assert("H-HIST-KNR-03", report.catalogWorkIdWritten === 0);
  assert("H-HIST-KNR-04", report.lines[0]?.historical?.kind === "HISTORICAL_EXACT", report.lines[0]?.historical?.kind);
  assert("H-HIST-KNR-05", (report.counts.historicalExact ?? 0) + (report.counts.historicalExactRms ?? 0) >= 1);

  const conv = buildIkKnrConversation(report);
  const blob = conv.steps.map((s) => s.messagePl).join(" ");
  assert("H-HIST-EC-01", /Historyczne|histor/i.test(blob), blob.slice(0, 120));
  assert(
    "H-HIST-EC-02",
    conv.steps.some((s) => s.sourceRef.artifact?.authority === false),
  );
}

// MISS must not block expert
{
  const expertStub = {
    tenderId: "t2",
    masterBoq: { readyForExperts: true, lineCount: 1, status: "ready" },
    masterBoqLines: [
      {
        dwellingId: "d1",
        line: {
          lineId: "line-x",
          lp: "1",
          description: "nowy knr",
          catalogBasis: basis("KNR", "9-99", "1111-01"),
        },
        provenance: null,
      },
    ],
  };
  const report = runIkKnrExpert({
    tenderId: "t2",
    documentExpert: expertStub,
    historicalIndex: emptyHistoricalExecutedIndex(),
  });
  assert("H-HIST-MISS-FLOW", report.status === "COMPLETED" && report.counts.historicalMiss === 1);
  assert("H-HIST-MISS-FLOW-b", report.lines[0]?.lineStatus === "CANDIDATE");
}

const sum = summarizeHistoricalKinds([]);
assert("H-HIST-SUM", sum.HISTORICAL_MISS === 0);

console.log(`\nH-HIST result: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
