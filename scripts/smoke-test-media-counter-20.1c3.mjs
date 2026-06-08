/**
 * Sprint 20.1C.3 — media counter (sidebar badge, bez dublowania crew_photo)
 * Uruchom: npx vite-node scripts/smoke-test-media-counter-20.1c3.mjs
 */
import { countBrowserFiles, countAllJobsMediaItems, summarizeJobBrowserFiles } from "../src/lib/job-files-browser.ts";
import { collectJobFileCatalog } from "../src/lib/job-files-index.ts";
import { jobApprovedPhotos } from "../src/app/app-domain.ts";

const R = {};

function log(m) {
  console.log(m);
}

function makeJob(overrides = {}) {
  return {
    id: "job-1",
    address: "Testowa 1",
    flatNumber: "6",
    client: "Test",
    jobFiles: [],
    inspectorPhotos: [],
    photos: [],
    workerReports: [],
    ...overrides,
  };
}

function crewPhoto(id, extra = {}) {
  return {
    id,
    publicUrl: `https://example.com/crew/${id}.jpg`,
    label: "before",
    uploadedBy: "Ekipa",
    uploadedAt: "2026-06-08T10:00:00Z",
    status: "approved",
    ...extra,
  };
}

function jobFile(id, kind) {
  return {
    id,
    kind,
    filename: `${kind}.pdf`,
    publicUrl: `https://example.com/docs/${id}.pdf`,
    path: `jobs/job-1/${kind}.pdf`,
    uploadedBy: "Admin",
    uploadedAt: "2026-06-08T09:00:00Z",
  };
}

function inspectorPhoto(id) {
  return {
    id,
    publicUrl: `https://example.com/insp/${id}.jpg`,
    path: `jobs/job-1/insp-${id}.jpg`,
    label: "before_handover",
    uploadedBy: "Inspektor",
    uploadedAt: "2026-06-08T11:00:00Z",
    caption: `insp-${id}`,
  };
}

/** Stara (błędna) formuła badge — do asercji regresji. */
function legacyDoubleCountBadge(jobs) {
  const photos = jobs.reduce((s, j) => s + jobApprovedPhotos(j).length, 0);
  const files = jobs.reduce((s, j) => s + countBrowserFiles(j), 0);
  return photos + files;
}

function badgeCount(jobs) {
  return countAllJobsMediaItems(jobs);
}

// T1 — 8 crew + 2 dokumenty → badge 10 (nie 18)
function testT1() {
  log("\n═══ T1 — 8 crew + 2 docs → badge 10 ═══");
  const photos = Array.from({ length: 8 }, (_, i) => crewPhoto(`cp-${i}`));
  const job = makeJob({
    photos,
    jobFiles: [jobFile("jf-z", "zlecenie"), jobFile("jf-k", "kosztorys")],
  });
  const n = badgeCount([job]);
  const legacy = legacyDoubleCountBadge([job]);
  const summary = summarizeJobBrowserFiles(job);
  log(`  badge=${n} legacy=${legacy} crew=${summary.crewPhotos} docs=${summary.zlecenie + summary.kosztorys}`);
  R.T1 = n === 10 && legacy === 18 ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — 0 zdjęć + 2 dokumenty → badge 2
function testT2() {
  log("\n═══ T2 — 0 photos + 2 docs → badge 2 ═══");
  const job = makeJob({
    jobFiles: [jobFile("jf-z", "zlecenie"), jobFile("jf-k", "kosztorys")],
  });
  const n = badgeCount([job]);
  log(`  badge=${n}`);
  R.T2 = n === 2 ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — 5 inspector photos
function testT3() {
  log("\n═══ T3 — 5 inspector photos ═══");
  const job = makeJob({
    inspectorPhotos: Array.from({ length: 5 }, (_, i) => inspectorPhoto(`ip-${i}`)),
  });
  const n = badgeCount([job]);
  const catalog = collectJobFileCatalog(job).length;
  log(`  badge=${n} catalog=${catalog}`);
  R.T3 = n === 5 && catalog === 5 ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — mixed media, brak podwójnego liczenia
function testT4() {
  log("\n═══ T4 — mixed media, no double count ═══");
  const job = makeJob({
    photos: [crewPhoto("c1"), crewPhoto("c2"), crewPhoto("c3")],
    inspectorPhotos: [inspectorPhoto("i1"), inspectorPhoto("i2")],
    jobFiles: [jobFile("jf-z", "zlecenie")],
    workerReports: [
      {
        id: "r1",
        workerName: "Jan",
        submittedAt: "2026-06-08T12:00:00Z",
        sketch: { publicUrl: "https://example.com/sketch.jpg", path: "jobs/job-1/sk.jpg" },
      },
    ],
  });
  const n = badgeCount([job]);
  const legacy = legacyDoubleCountBadge([job]);
  const expected = 3 + 2 + 1 + 1;
  log(`  badge=${n} expected=${expected} legacy=${legacy}`);
  R.T4 = n === expected && legacy > n ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

// T5 — countBrowserFiles == collectJobFileCatalog
function testT5() {
  log("\n═══ T5 — countBrowserFiles == catalog length ═══");
  const fixtures = [
    makeJob(),
    makeJob({ photos: [crewPhoto("x")] }),
    makeJob({
      photos: Array.from({ length: 4 }, (_, i) => crewPhoto(`p${i}`)),
      jobFiles: [jobFile("a", "zlecenie")],
      inspectorPhotos: [inspectorPhoto("i")],
    }),
  ];
  let ok = true;
  for (const job of fixtures) {
    const browser = countBrowserFiles(job);
    const catalog = collectJobFileCatalog(job).length;
    if (browser !== catalog) {
      log(`  MISMATCH job=${job.id} browser=${browser} catalog=${catalog}`);
      ok = false;
    }
  }
  R.T5 = ok ? "PASS" : "FAIL";
  log(`T5: ${R.T5}`);
}

testT1();
testT2();
testT3();
testT4();
testT5();

const all = Object.values(R);
const pass = all.filter((x) => x === "PASS").length;
log(`\n═══ PODSUMOWANIE 20.1C.3 media counter: ${pass}/${all.length} PASS ═══`);
if (pass !== all.length) process.exit(1);
