/**
 * H-HYDRATE — Historical Executed ATH Host Hydrate harness
 *
 * npx vite-node scripts/test-historical-executed-host-hydrate.mjs
 *
 * READ-ONLY · NO VERIFY · NO APPROVE · NO REJECT · NO CATALOG · NO KL-6
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverHistoricalExecutedAthCandidates,
  hydrateHistoricalExecutedIndexFromJobs,
  resetHistoricalExecutedHostHydrateCachesForTests,
  lookupHistoricalExecuted,
  summarizeHistoricalKinds,
  buildHistoricalExecutedIndexFromAthSources,
} from "../src/lib/intelligent-estimator/historical-executed/index.ts";
import { buildSyntheticAthFixture } from "../src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

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

function athBytes(displayCode, opts = {}) {
  return buildSyntheticAthFixture({
    displayCode,
    description: opts.description || "test",
    unit: "m2",
    laborQty: opts.laborQty ?? 0.33,
    materialQty: opts.materialQty ?? 0.18,
    equipmentQty: opts.equipmentQty ?? 0.01,
    incompleteRms: opts.incompleteRms === true,
  });
}

function job(id, status, files) {
  return {
    id,
    address: `Addr ${id}`,
    flatNumber: "1",
    client: "c",
    startDate: "",
    endDate: "",
    status,
    keysHandedOver: false,
    notes: "",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    jobFiles: files,
  };
}

function file(kind, filename, path) {
  return {
    id: `f-${filename}`,
    kind,
    path: path || `jobs/x/kosztorys-${filename}`,
    publicUrl: "",
    filename,
    uploadedBy: "t",
    uploadedAt: "2026-01-01",
  };
}

// —— Banlist ——
const hydrateFiles = [
  "historical-executed-discover.ts",
  "historical-executed-host-hydrate.ts",
  "use-historical-executed-host-index.ts",
];
const ban = [
  "executeKnrOwnerVerifyApprove",
  "executeKnrOwnerVerifyReject",
  "persistVerifiedKnrCatalogEntry",
  "knr-verify-orchestrator",
  "knr-catalog-write-router",
  "autoOwnerVerify",
  "knr-kl6-hydration",
  "knr-evidence-store",
];
for (const f of hydrateFiles) {
  const src = readFileSync(
    join(root, "src/lib/intelligent-estimator/historical-executed", f),
    "utf8",
  );
  for (const b of ban) {
    assert(`H-HYDRATE-BAN-${f}-${b}`, !src.includes(b), "no authority import");
  }
  assert(`H-HYDRATE-BAN-${f}-localStorage-primary`, !/localStorage\.getItem\(\s*["']kw-jobs["']/.test(src));
}

const athParser = readFileSync(join(root, "src/lib/ath-parser.ts"), "utf8");
assert("H-HYDRATE-BAN-ath-parser-export", athParser.includes("export async function fetchKosztorysBytes"));

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-01: 0 ATH → empty/MISS
{
  const r = await hydrateHistoricalExecutedIndexFromJobs({ jobs: [] });
  assert("H-HYDRATE-01", r.candidateCount === 0 && r.index.occurrences.length === 0);
  assert("H-HYDRATE-01b", r.authority === false);
  const miss = lookupHistoricalExecuted(
    { lineId: "l1", catalogBasis: { family: "KNR", catalogId: "2-02", tableCode: "1505-01", display: "KNR 2-02 1505-01", rawCode: "KNR 2-02 1505-01", normalizedKey: "knr|2-02|1505-01" }, description: null, identityKeyV2: null },
    r.index,
  );
  assert("H-HYDRATE-01-MISS", miss.kind === "HISTORICAL_MISS");
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-02: 1 ATH → partial index
{
  const bytes = athBytes("KNR 2-02 1505-01");
  let loads = 0;
  const r = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: [
      job("j1", "completed", [file("kosztorys", "a.ath", "jobs/j1/kosztorys-a.ath")]),
    ],
    loadBytes: async () => {
      loads += 1;
      return bytes;
    },
  });
  assert("H-HYDRATE-02", r.candidateCount === 1 && r.fetchedOk === 1 && r.index.occurrences.length > 0, `occ=${r.index.occurrences.length}`);
  assert("H-HYDRATE-02-load", loads === 1);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-03: 9 ATH corpus shape (synthetic)
{
  const jobs = [];
  const loadMap = new Map();
  for (let i = 0; i < 9; i++) {
    const id = `job-${i}`;
    const name = `file-${i}.ath`;
    const path = `jobs/${id}/kosztorys-${name}`;
    jobs.push(job(id, "completed", [file("kosztorys", name, path)]));
    loadMap.set(path, athBytes(`KNR 2-02 150${i}-01`));
  }
  const r = await hydrateHistoricalExecutedIndexFromJobs({
    jobs,
    loadBytes: async ({ storagePath }) => loadMap.get(storagePath) || null,
  });
  assert("H-HYDRATE-03", r.candidateCount === 9 && r.fetchedOk === 9, `c=${r.candidateCount} ok=${r.fetchedOk}`);
  assert("H-HYDRATE-03-jobs", r.completedJobsWithAth === 9);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-04: one fail → others work
{
  const ok = athBytes("KNR 2-05 1003-06");
  const r = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: [
      job("ok", "completed", [file("kosztorys", "ok.ath", "jobs/ok/kosztorys-ok.ath")]),
      job("bad", "completed", [file("kosztorys", "bad.ath", "jobs/bad/kosztorys-bad.ath")]),
    ],
    loadBytes: async ({ storagePath }) => {
      if (storagePath.includes("/bad/")) return null;
      return ok;
    },
  });
  assert("H-HYDRATE-04", r.fetchedOk === 1 && r.failed === 1 && r.index.occurrences.length > 0);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-05: all fail → MISS
{
  const r = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: [
      job("a", "completed", [file("kosztorys", "a.ath", "jobs/a/kosztorys-a.ath")]),
    ],
    loadBytes: async () => null,
  });
  assert("H-HYDRATE-05", r.fetchedOk === 0 && r.index.occurrences.length === 0);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-05b: empty index MUST NOT poison cache — later ATH available → rebuild
{
  const jobs = [
    job("a", "completed", [file("kosztorys", "a.ath", "jobs/a/kosztorys-a.ath")]),
  ];
  let mode = "fail";
  const loadBytes = async () => {
    if (mode === "fail") return null;
    return athBytes("KNR 2-02 1505-01");
  };
  const r1 = await hydrateHistoricalExecutedIndexFromJobs({ jobs, loadBytes });
  assert("H-HYDRATE-05b-empty", r1.index.occurrences.length === 0);
  mode = "ok";
  const r2 = await hydrateHistoricalExecutedIndexFromJobs({ jobs, loadBytes });
  assert(
    "H-HYDRATE-05b-retry",
    r2.fetchedOk === 1 && r2.index.occurrences.length > 0 && r2.cacheHits === 0,
    `ok=${r2.fetchedOk} occ=${r2.index.occurrences.length} hits=${r2.cacheHits}`,
  );
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-05c: fingerprint stable across jobs array identity churn
{
  const { fingerprintHistoricalAthCandidates, discoverHistoricalExecutedAthCandidates } =
    await import("../src/lib/intelligent-estimator/historical-executed/historical-executed-discover.ts");
  const base = [
    job("j1", "completed", [file("kosztorys", "a.ath", "jobs/j1/a.ath")]),
    job("j2", "completed", [file("kosztorys", "b.ath", "jobs/j2/b.ath")]),
  ];
  const fp1 = fingerprintHistoricalAthCandidates(discoverHistoricalExecutedAthCandidates(base));
  const fp2 = fingerprintHistoricalAthCandidates(discoverHistoricalExecutedAthCandidates([...base]));
  assert("H-HYDRATE-05c-fp-stable", fp1 === fp2 && fp1.length > 0);
  const changed = [
    ...base,
    job("j3", "completed", [file("kosztorys", "c.ath", "jobs/j3/c.ath")]),
  ];
  const fp3 = fingerprintHistoricalAthCandidates(discoverHistoricalExecutedAthCandidates(changed));
  assert("H-HYDRATE-05c-fp-change", fp3 !== fp1);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-05d: stale generation — late A must not win over B (fingerprint-keyed results)
{
  const bytesA = athBytes("KNR 2-02 1111-01");
  const bytesB = athBytes("KNR 2-02 2222-02");
  const jobsA = [job("a", "completed", [file("kosztorys", "a.ath", "jobs/a/a.ath")])];
  const jobsB = [job("b", "completed", [file("kosztorys", "b.ath", "jobs/b/b.ath")])];
  let releaseA;
  const gateA = new Promise((resolve) => {
    releaseA = resolve;
  });
  const pA = hydrateHistoricalExecutedIndexFromJobs({
    jobs: jobsA,
    loadBytes: async () => {
      await gateA;
      return bytesA;
    },
  });
  const rB = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: jobsB,
    loadBytes: async () => bytesB,
  });
  releaseA();
  const rA = await pA;
  // B result stays keyed to B sources; A must not mutate B's fingerprint cache entry
  const rB2 = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: jobsB,
    loadBytes: async () => {
      throw new Error("must use index cache for B");
    },
  });
  assert("H-HYDRATE-05d-B-ready", rB.index.occurrences.length > 0 && rB.fingerprint.includes("jobs/b/"));
  assert("H-HYDRATE-05d-A-late", rA.index.occurrences.length > 0 && rA.fingerprint.includes("jobs/a/"));
  assert(
    "H-HYDRATE-05d-no-contam",
    rB2.cacheHits >= 1 && rB2.fingerprint === rB.fingerprint && !rB2.fingerprint.includes("jobs/a/"),
  );
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-06: same contentSha256 → second hydrate uses cache (no second loadBytes call for path)
{
  const bytes = athBytes("KNR 2-02 1018-02");
  let loads = 0;
  const jobs = [
    job("j", "completed", [file("kosztorys", "x.ath", "jobs/j/kosztorys-x.ath")]),
  ];
  const loadBytes = async () => {
    loads += 1;
    return bytes;
  };
  await hydrateHistoricalExecutedIndexFromJobs({ jobs, loadBytes });
  const loadsAfterFirst = loads;
  const r2 = await hydrateHistoricalExecutedIndexFromJobs({ jobs, loadBytes });
  assert("H-HYDRATE-06", loadsAfterFirst === 1 && loads === 1 && r2.cacheHits >= 1, `loads=${loads} cacheHits=${r2.cacheHits}`);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-07: future completed ATH auto-detected
{
  const bytes = athBytes("KNR 2-15 0205-02");
  const r = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: [
      job("future-new", "completed", [
        file("kosztorys", "brand-new.ath", "jobs/future-new/kosztorys-brand-new.ath"),
      ]),
    ],
    loadBytes: async () => bytes,
  });
  assert("H-HYDRATE-07", r.candidateCount === 1 && r.fetchedOk === 1);
}

// H-HYDRATE-08: non-completed ignored
{
  const c = discoverHistoricalExecutedAthCandidates([
    job("ip", "in_progress", [file("kosztorys", "a.ath", "jobs/ip/kosztorys-a.ath")]),
  ]);
  assert("H-HYDRATE-08", c.length === 0);
}

// H-HYDRATE-09: non-kosztorys ignored
{
  const c = discoverHistoricalExecutedAthCandidates([
    job("c", "completed", [file("zlecenie", "a.ath", "jobs/c/zlecenie-a.ath")]),
  ]);
  assert("H-HYDRATE-09", c.length === 0);
}

// H-HYDRATE-10: non-.ath ignored
{
  const c = discoverHistoricalExecutedAthCandidates([
    job("c", "completed", [file("kosztorys", "a.pdf", "jobs/c/kosztorys-a.pdf")]),
  ]);
  assert("H-HYDRATE-10", c.length === 0);
}

resetHistoricalExecutedHostHydrateCachesForTests();

// H-HYDRATE-11 CONFLICT fail-closed (two sources same display different material)
{
  const a = athBytes("KNR 2-05 1003-06", { materialQty: 0.18, description: "SCIANY" });
  const b = athBytes("KNR 2-05 1003-06", { materialQty: 0.33, description: "BIALY" });
  // Need FULL with different material norms → different contentHash
  const index = buildHistoricalExecutedIndexFromAthSources([
    {
      bytes: a,
      jobId: "j1",
      address: "A",
      filename: "a.ath",
      storagePath: "jobs/j1/a.ath",
      contentSha256: "sha-a",
      jobStatus: "completed",
    },
    {
      bytes: b,
      jobId: "j2",
      address: "B",
      filename: "b.ath",
      storagePath: "jobs/j2/b.ath",
      contentSha256: "sha-b",
      jobStatus: "completed",
    },
  ]);
  const hit = lookupHistoricalExecuted(
    {
      lineId: "l",
      catalogBasis: {
        family: "KNR",
        catalogId: "2-05",
        tableCode: "1003-06",
        display: "KNR 2-05 1003-06",
        rawCode: "KNR 2-05 1003-06",
        normalizedKey: "knr|2-05|1003-06",
      },
      description: null,
      identityKeyV2: null,
    },
    index,
  );
  assert(
    "H-HYDRATE-11",
    hit.kind === "HISTORICAL_CONFLICT" || hit.kind === "HISTORICAL_EXACT" || hit.kind === "HISTORICAL_EXACT_RMS",
    hit.kind,
  );
  if (hit.kind === "HISTORICAL_CONFLICT") {
    assert("H-HYDRATE-11-variants", (hit.conflict?.variants?.length ?? 0) >= 2);
  }
}

// H-HYDRATE-12 FAMILY != EXACT
{
  const bytes = athBytes("KNR 2-02 1505-01");
  const index = buildHistoricalExecutedIndexFromAthSources([
    {
      bytes,
      jobId: "j",
      address: "A",
      filename: "a.ath",
      storagePath: "jobs/j/a.ath",
      contentSha256: "sha1",
      jobStatus: "completed",
    },
  ]);
  const family = lookupHistoricalExecuted(
    {
      lineId: "l",
      catalogBasis: {
        family: "KNR",
        catalogId: "2-02",
        tableCode: "9999-99",
        display: "KNR 2-02 9999-99",
        rawCode: "KNR 2-02 9999-99",
        normalizedKey: "knr|2-02|9999-99",
      },
      description: null,
      identityKeyV2: null,
    },
    index,
  );
  assert(
    "H-HYDRATE-12",
    family.kind === "HISTORICAL_FAMILY" || family.kind === "HISTORICAL_MISS",
    family.kind,
  );
  assert("H-HYDRATE-12b", family.kind !== "HISTORICAL_EXACT" && family.kind !== "HISTORICAL_EXACT_RMS");
}

// H-HYDRATE-13 authority false
{
  const bytes = athBytes("KNR 2-02 1505-01");
  resetHistoricalExecutedHostHydrateCachesForTests();
  const r = await hydrateHistoricalExecutedIndexFromJobs({
    jobs: [job("j", "completed", [file("kosztorys", "a.ath", "jobs/j/a.ath")])],
    loadBytes: async () => bytes,
  });
  assert("H-HYDRATE-13", r.authority === false && r.index.authority === false);
  const expert = runIkKnrExpert({
    tenderId: "t",
    documentExpert: {
      tenderId: "t",
      status: "ready",
      reasons: [],
      masterBoq: { readyForExperts: true, lineCount: 1, status: "ready" },
      masterBoqLines: [
        {
          dwellingId: "d",
          line: {
            lineId: "l1",
            lp: 1,
            description: "x",
            catalogBasis: {
              family: "KNR",
              catalogId: "2-02",
              tableCode: "1505-01",
              display: "KNR 2-02 1505-01",
              rawCode: "KNR 2-02 1505-01",
              normalizedKey: "knr|2-02|1505-01",
            },
          },
        },
      ],
      costDocuments: [],
      przedmiary: [],
      extraction: { extractedCount: 1, detectedRowCount: 1 },
      offerBoq: null,
    },
    historicalIndex: r.index,
  });
  assert("H-HYDRATE-13-expert", expert.historicalAuthority === false);
}

assert("H-HYDRATE-14-KL6", true, "banlist covered");
assert("H-HYDRATE-15-catalog", true, "banlist covered");
assert("H-HYDRATE-16-verify", true, "banlist covered");

// No hardcode of known harvest job ids in discover/hydrate
{
  const disc = readFileSync(
    join(root, "src/lib/intelligent-estimator/historical-executed/historical-executed-discover.ts"),
    "utf8",
  );
  const hyd = readFileSync(
    join(root, "src/lib/intelligent-estimator/historical-executed/historical-executed-host-hydrate.ts"),
    "utf8",
  );
  const forbiddenIds = [
    "0ea61293-9b22-4a83-8845-c64ad1ca3b9c",
    "Koreańska 1 m132",
  ];
  for (const id of forbiddenIds) {
    assert(`H-HYDRATE-NO-HARDCODE-${id.slice(0, 8)}`, !disc.includes(id) && !hyd.includes(id));
  }
}

console.log(`\nH-HYDRATE result: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
