/**
 * Sprint 20.5A.8 — Media Library UX (separation + counters + ZIP)
 * Uruchom: npx vite-node scripts/smoke-test-media-separation-20.5a8.mjs
 */
import {
  collectJobImages,
  collectJobDocuments,
  countJobImages,
  countJobDocuments,
  countAllJobsImages,
  countAllJobsDocuments,
} from "../src/lib/media-separation.ts";
import { collectJobFileCatalog } from "../src/lib/job-files-index.ts";
import { collectJobBrowserFileGroups } from "../src/lib/job-files-browser.ts";
import { collectJobDocumentPackEntries } from "../src/lib/job-documents-pack.ts";
import { collectJobPhotoPackEntries } from "../src/lib/photo-download.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function assertEq(name, got, expected) {
  assert(name, got === expected, got === expected ? "" : `got ${got}, expected ${expected}`);
}

function assertNotIncludes(name, haystack, needle) {
  assert(name, !haystack.some((x) => x.id === needle || x.filename?.includes(needle)), needle);
}

function assertIncludes(name, haystack, needle) {
  assert(name, haystack.some((x) => x.id === needle || x.publicUrl?.includes(needle)), needle);
}

const jobFixture = {
  id: "job-smoke-20.5a8",
  address: "ul. Testowa 1",
  flatNumber: "2",
  client: "WM Test",
  jobFiles: [
    {
      id: "jf-zlec",
      kind: "zlecenie",
      path: "jobs/job-smoke/zlec.pdf",
      publicUrl: "https://example.com/zlec.pdf",
      filename: "zlecenie.pdf",
      uploadedBy: "Admin",
      uploadedAt: "2026-06-09T10:00:00.000Z",
    },
  ],
  photos: [
    {
      id: "cp-1",
      status: "approved",
      publicUrl: "https://example.com/crew.jpg",
      label: "before",
      uploadedBy: "Ekipa",
      uploadedAt: "2026-06-09T11:00:00.000Z",
    },
    {
      id: "cp-pending",
      status: "pending",
      publicUrl: "https://example.com/pending.jpg",
      label: "progress",
      uploadedBy: "Ekipa",
      uploadedAt: "2026-06-09T11:30:00.000Z",
    },
  ],
  inspectorPhotos: [
    {
      id: "ip-1",
      publicUrl: "https://example.com/insp.jpg",
      path: "jobs/job-smoke/insp.jpg",
      uploadedBy: "Inspektor",
      uploadedAt: "2026-06-09T12:00:00.000Z",
      label: "before_handover",
      caption: "Inspektor test",
    },
  ],
  workerReports: [
    {
      id: "wr-1",
      workerName: "Jan",
      submittedAt: "2026-06-09T13:00:00.000Z",
      sketch: { publicUrl: "https://example.com/sketch.jpg", path: "jobs/job-smoke/sk.jpg" },
    },
  ],
};

log("=== Sprint 20.5A.8 — Media separation smoke ===\n");

// 1–4: images vs files catalog
const images = collectJobImages(jobFixture);
const catalog = collectJobFileCatalog(jobFixture);
const browserGroups = collectJobBrowserFileGroups(jobFixture);

assertIncludes("1 crew photo in images", images, "cp:cp-1");
assertNotIncludes("2 crew photo NOT in file catalog", catalog, "cp:cp-1");
assertEq("2 browser groups count (docs only)", browserGroups.reduce((s, g) => s + g.files.length, 0), 1);

assertIncludes("3 inspector photo in images", images, "ip:ip-1");
assertNotIncludes("4 inspector photo NOT in file catalog", catalog, "ip:ip-1");

// 5–8: sketch + PDF
assertIncludes("5 report sketch in images", images, "sk:wr-1");
assertNotIncludes("6 report sketch NOT in file catalog", catalog, "sk:wr-1");
assertEq("7 PDF in file catalog", catalog.length, 1);
assertEq("7 PDF category", catalog[0]?.category, "zlecenie");
assertEq("8 PDF NOT in images count", collectJobImages({ ...jobFixture, photos: [], inspectorPhotos: [], workerReports: [] }).length, 0);

// 9–10: ZIP entries
const docPack = collectJobDocumentPackEntries({
  ...jobFixture,
  startDate: "",
  endDate: "",
  status: "in_progress",
  keysHandedOver: false,
  notes: "",
  documents: {
    zlecenie: true,
    zakres: false,
    kosztorys: false,
    kominiarz: false,
    pomiary: false,
    oswiadczenia: false,
    gwarancje: false,
    rysunek: false,
    zdjecia: false,
  },
});
const photoPack = collectJobPhotoPackEntries(jobFixture);

assertEq("9 doc ZIP has no image URLs", docPack.filter((e) => e.url.includes("jpg")).length, 0);
assertEq("9 doc ZIP has PDF", docPack.length, 1);
assertEq("10 photo ZIP has images", photoPack.length, 3);
assertEq("10 photo ZIP no jobFiles", photoPack.filter((e) => e.zipPath.includes("zlecenie.pdf")).length, 0);

// 11–12: counters
assertEq("11 countJobImages", countJobImages(jobFixture), 3);
assertEq("12 countJobDocuments", countJobDocuments(jobFixture), 1);

const jobs = [jobFixture];
assertEq("11 global images", countAllJobsImages(jobs), 3);
assertEq("12 global documents", countAllJobsDocuments(jobs), 1);

const passed = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${passed}/${total} PASS ===`);

if (passed !== total) process.exit(1);
