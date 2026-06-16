/**
 * INSPECTOR-P1A — Published Delivery Package — testy domeny.
 * Uruchom: npx vite-node scripts/test-delivery-package-publications-p1a.mjs
 */
import {
  applyDeliveryPackagePublication,
  buildDeliveryPackageGenerationFingerprint,
  countActivePublicationsPerJob,
  getActiveDeliveryPackagePublication,
  getNextDeliveryPackageZipVersion,
} from "../src/lib/delivery-package-publications/publication.ts";
import { mergeDeliveryPackagePublications } from "../src/lib/delivery-package-publications/merge.ts";
import {
  normalizeDeliveryPackagePublications,
  parseDeliveryPackagePublication,
} from "../src/lib/delivery-package-publications/normalize.ts";
import { formatDeliveryPackageFileSize } from "../src/lib/delivery-package-publications/storage.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import { createWmPrintSeedTemplates } from "../src/lib/wm-print/default-templates.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const JOB_ID = "job-p1a-test";
const JOB = {
  id: JOB_ID,
  address: "ul. Testowa 1",
  flatNumber: "2",
  client: "WM",
  status: "in_progress",
  documents: {
    zlecenie: true,
    zakres: false,
    kosztorys: true,
    kominiarz: false,
    pomiary: false,
    oswiadczenia: false,
    gwarancje: false,
    rysunek: false,
  },
};

const templates = createWmPrintSeedTemplates();
const selectedTemplateIds = templates.filter((t) => t.enabled).slice(0, 2).map((t) => t.id);

console.log("=== P1A-T01 normalize + parse ===");
{
  const raw = {
    id: "pub-1",
    jobId: JOB_ID,
    zipVersion: 1,
    publishedAt: "2026-06-16T12:00:00.000Z",
    publishedByUserId: "dawid",
    publishedByUserName: "Dawid",
    generationFingerprint: "abc123",
    fingerprintPayload: {
      schemaVersion: 1,
      jobId: JOB_ID,
      selectedTemplateIds: [],
      includeMeasurements: false,
      measurementId: null,
      measurementUpdatedAt: null,
      measurementReportNumber: null,
      dateMode: "today",
      customDateIso: null,
      jobVariableDigest: "jv",
      checklistDigest: "docs:10101000",
      wmJobDocDigests: [],
      templateFileDigests: [],
      settingsDigest: "s",
    },
    storagePath: "jobs/x/delivery.zip",
    zipPublicUrl: "https://example.com/delivery.zip",
    fileName: "TEST_ODBIOR_WM.zip",
    fileSizeBytes: 3400000,
    fileCount: 18,
    odbiorFileCount: 12,
    pomiaryFileCount: 6,
    includesMeasurements: true,
    status: "ACTIVE",
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  };
  const parsed = parseDeliveryPackagePublication(raw);
  assert(parsed?.fileCount === 18, "parse fileCount");
  assert(parsed?.status === "ACTIVE", "parse status ACTIVE");
  const norm = normalizeDeliveryPackagePublications([raw, { bad: true }]);
  assert(norm.length === 1, "normalize filters invalid");
}

console.log("=== P1A-T02 fingerprint save ===");
{
  const { payload, hash } = await buildDeliveryPackageGenerationFingerprint({
    job: JOB,
    templates,
    jobDocs: [],
    settings: DEFAULT_WM_PRINT_SETTINGS,
    opts: { dateMode: "today" },
    selectedTemplateIds,
    includeMeasurements: false,
  });
  assert(payload.schemaVersion === 1, "fingerprint schemaVersion");
  assert(payload.checklistDigest.includes("docs:"), "fingerprint checklist");
  assert(typeof hash === "string" && hash.length === 64, "fingerprint hash sha256 hex");
  assert(payload.selectedTemplateIds.length === selectedTemplateIds.length, "fingerprint templates");
}

console.log("=== P1A-T03 create + supersede + ACTIVE uniqueness ===");
{
  let publications = [];
  const fp = {
    schemaVersion: 1,
    jobId: JOB_ID,
    selectedTemplateIds,
    includeMeasurements: false,
    measurementId: null,
    measurementUpdatedAt: null,
    measurementReportNumber: null,
    dateMode: "today",
    customDateIso: null,
    jobVariableDigest: "jv1",
    checklistDigest: "docs:",
    wmJobDocDigests: [],
    templateFileDigests: [],
    settingsDigest: "s1",
  };

  const first = applyDeliveryPackagePublication({
    publications,
    job: JOB,
    settings: DEFAULT_WM_PRINT_SETTINGS,
    zipVersion: 1,
    publishedByUserId: "admin",
    publishedByUserName: "Admin",
    fingerprintHash: "hash1",
    fingerprintPayload: fp,
    storagePath: "p1",
    zipPublicUrl: "u1",
    fileName: "a.zip",
    fileSizeBytes: 1000,
    odbiorFileCount: 5,
    pomiaryFileCount: 0,
    includesMeasurements: false,
  });
  publications = first.nextPublications;
  assert(getActiveDeliveryPackagePublication(publications, JOB_ID)?.zipVersion === 1, "first active v1");
  assert(countActivePublicationsPerJob(publications, JOB_ID) === 1, "one ACTIVE after first");

  const second = applyDeliveryPackagePublication({
    publications,
    job: JOB,
    settings: DEFAULT_WM_PRINT_SETTINGS,
    zipVersion: 2,
    publishedByUserId: "admin",
    publishedByUserName: "Admin",
    fingerprintHash: "hash2",
    fingerprintPayload: { ...fp, jobVariableDigest: "jv2" },
    storagePath: "p2",
    zipPublicUrl: "u2",
    fileName: "b.zip",
    fileSizeBytes: 2000,
    odbiorFileCount: 6,
    pomiaryFileCount: 0,
    includesMeasurements: false,
  });
  publications = second.nextPublications;
  const active = getActiveDeliveryPackagePublication(publications, JOB_ID);
  const superseded = publications.find((p) => p.status === "SUPERSEDED");
  assert(active?.zipVersion === 2, "second publish active v2");
  assert(superseded?.supersededByPublicationId === active?.id, "first superseded links to second");
  assert(countActivePublicationsPerJob(publications, JOB_ID) === 1, "ACTIVE uniqueness after supersede");
  assert(getNextDeliveryPackageZipVersion(publications, JOB_ID) === 3, "next version is 3");
}

console.log("=== P1A-T04 merge + reload sync simulation ===");
{
  const local = [
    {
      id: "a",
      jobId: JOB_ID,
      zipVersion: 1,
      publishedAt: "2026-06-16T10:00:00.000Z",
      publishedByUserId: "x",
      publishedByUserName: "X",
      generationFingerprint: "h1",
      fingerprintPayload: {
        schemaVersion: 1,
        jobId: JOB_ID,
        selectedTemplateIds: [],
        includeMeasurements: false,
        measurementId: null,
        measurementUpdatedAt: null,
        measurementReportNumber: null,
        dateMode: "today",
        customDateIso: null,
        jobVariableDigest: "",
        checklistDigest: "",
        wmJobDocDigests: [],
        templateFileDigests: [],
        settingsDigest: "",
      },
      storagePath: "p",
      zipPublicUrl: "u",
      fileName: "f.zip",
      fileSizeBytes: 1,
      fileCount: 1,
      odbiorFileCount: 1,
      pomiaryFileCount: 0,
      includesMeasurements: false,
      status: "SUPERSEDED",
      createdAt: "2026-06-16T10:00:00.000Z",
      updatedAt: "2026-06-16T11:00:00.000Z",
    },
  ];
  const cloud = [
    {
      ...local[0],
      updatedAt: "2026-06-16T12:00:00.000Z",
      status: "ACTIVE",
    },
  ];
  const merged = mergeDeliveryPackagePublications(local, cloud);
  assert(merged.length === 1, "merge dedupes by id");
  assert(merged[0].status === "ACTIVE", "merge prefers newer updatedAt from cloud");
}

console.log("=== P1A-T05 metadata format ===");
{
  assert(formatDeliveryPackageFileSize(3400000).includes("MB"), "format MB");
  assert(formatDeliveryPackageFileSize(18).includes("B"), "format bytes");
}

console.log("\n--- SUMMARY ---");
console.log(`PASS: ${passed}  FAIL: ${failed}`);
if (failed > 0) process.exit(1);
