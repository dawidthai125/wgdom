/**
 * INSPECTOR-P1B — Inspector Delivery Package Download — testy domeny + uprawnień.
 * Uruchom: npx vite-node scripts/test-inspector-delivery-package-p1b.mjs
 */
import JSZip from "jszip";
import {
  applyDeliveryPackagePublication,
  getActiveDeliveryPackagePublication,
} from "../src/lib/delivery-package-publications/publication.ts";
import { mergeDeliveryPackagePublications } from "../src/lib/delivery-package-publications/merge.ts";
import {
  normalizeDeliveryPackagePublications,
  parseDeliveryPackagePublication,
} from "../src/lib/delivery-package-publications/normalize.ts";
import {
  buildDeliveryPackageManifestFromZipBytes,
  groupDeliveryPackageManifestByFolder,
} from "../src/lib/delivery-package-publications/manifest.ts";
import {
  INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS,
  inspectorDeliveryPackageForJob,
} from "../src/lib/delivery-package-publications/inspector-access.ts";
import { formatDeliveryPackageFileSize } from "../src/lib/delivery-package-publications/storage.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import {
  WM_PRINT_ZIP_FOLDER_ODBIORY,
  WM_PRINT_ZIP_FOLDER_POMIARY,
} from "../src/lib/wm-print/generate-zip.ts";

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

const JOB_ID = "job-p1b-test";
const JOB = {
  id: JOB_ID,
  address: "ul. Inspektorska 5",
  flatNumber: "3",
  client: "WM",
  status: "in_progress",
  documents: {},
};

const FP = {
  schemaVersion: 1,
  jobId: JOB_ID,
  selectedTemplateIds: ["t1"],
  includeMeasurements: true,
  measurementId: "m1",
  measurementUpdatedAt: "2026-06-16T10:00:00.000Z",
  measurementReportNumber: "RAP-44-2026",
  dateMode: "today",
  customDateIso: null,
  jobVariableDigest: "jv",
  checklistDigest: "docs:",
  wmJobDocDigests: [],
  templateFileDigests: [],
  settingsDigest: "s",
};

function sampleManifest() {
  return [
    {
      folder: "Odbiory",
      fileName: "01-ZI.pdf",
      relativePath: "Odbiory/01-ZI.pdf",
      displayLabel: "ZI",
      mimeType: "application/pdf",
      sizeBytes: 100000,
    },
    {
      folder: "Pomiary",
      fileName: "RAP-44-2026_PROTOKOL.docx",
      relativePath: "Pomiary/RAP-44-2026_PROTOKOL.docx",
      displayLabel: "Protokół",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 50000,
    },
    {
      folder: "Pomiary",
      fileName: "INDEX-POMIARY.txt",
      relativePath: "Pomiary/INDEX-POMIARY.txt",
      displayLabel: "INDEX-POMIARY (txt)",
      mimeType: "text/plain",
      sizeBytes: 200,
    },
  ];
}

console.log("=== P1B-T01 brak publikacji ===");
{
  assert(inspectorDeliveryPackageForJob([], JOB_ID) === null, "empty publications → null");
  assert(getActiveDeliveryPackagePublication([], JOB_ID) === null, "getActive on empty → null");
}

console.log("=== P1B-T02 ACTIVE publication lookup ===");
{
  const { nextPublications } = applyDeliveryPackagePublication({
    publications: [],
    job: JOB,
    settings: DEFAULT_WM_PRINT_SETTINGS,
    zipVersion: 1,
    publishedByUserId: "dawid",
    publishedByUserName: "Dawid",
    fingerprintHash: "abc",
    fingerprintPayload: FP,
    storagePath: "jobs/x/p.zip",
    zipPublicUrl: "https://cdn.example/p.zip",
    fileName: "INSPEKTORSKA_5_3_ODBIOR_WM.zip",
    fileSizeBytes: 3400000,
    odbiorFileCount: 12,
    pomiaryFileCount: 6,
    includesMeasurements: true,
    manifest: sampleManifest(),
  });
  const active = inspectorDeliveryPackageForJob(nextPublications, JOB_ID);
  assert(active?.status === "ACTIVE", "inspector sees ACTIVE publication");
  assert(active?.publishedByUserName === "Dawid", "author preserved");
  assert(active?.fileCount === 18, "fileCount metadata");
}

console.log("=== P1B-T03 download metadata ===");
{
  const pub = applyDeliveryPackagePublication({
    publications: [],
    job: JOB,
    settings: DEFAULT_WM_PRINT_SETTINGS,
    zipVersion: 1,
    publishedByUserId: "dawid",
    publishedByUserName: "Dawid",
    fingerprintHash: "abc",
    fingerprintPayload: FP,
    storagePath: "p",
    zipPublicUrl: "https://cdn.example/p.zip",
    fileName: "TEST.zip",
    fileSizeBytes: 3400000,
    odbiorFileCount: 12,
    pomiaryFileCount: 6,
    includesMeasurements: true,
    manifest: sampleManifest(),
  }).publication;
  assert(pub.fileName.endsWith(".zip"), "fileName for download");
  assert(pub.zipPublicUrl.startsWith("https://"), "zipPublicUrl for download");
  assert(formatDeliveryPackageFileSize(pub.fileSizeBytes) === "3.2 MB", "formatted size");
  assert(pub.publishedAt.length > 10, "publishedAt ISO");
}

console.log("=== P1B-T04 manifest render ===");
{
  const groups = groupDeliveryPackageManifestByFolder(sampleManifest());
  assert(groups.length === 2, "two folders");
  assert(groups[0].folder === "Odbiory" && groups[0].files.length === 1, "Odbiory count");
  assert(groups[1].folder === "Pomiary" && groups[1].files.length === 2, "Pomiary count incl INDEX");
  const indexEntry = sampleManifest().find((e) => e.fileName.includes("INDEX"));
  assert(!!indexEntry, "INDEX in manifest");
}

console.log("=== P1B-T05 manifest from ZIP bytes ===");
{
  const zip = new JSZip();
  zip.file(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/01-ZI.pdf`, new Uint8Array([1, 2, 3]));
  zip.file(`${WM_PRINT_ZIP_FOLDER_POMIARY}/INDEX-POMIARY.txt`, "rap=1");
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const manifest = await buildDeliveryPackageManifestFromZipBytes(bytes);
  assert(manifest.length === 2, "manifest from zip: 2 files");
  assert(manifest.some((e) => e.folder === "Odbiory"), "odbior folder");
  assert(manifest.some((e) => e.fileName === "INDEX-POMIARY.txt"), "INDEX file");
}

console.log("=== P1B-T06 permissions ===");
{
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canReadPublication === true, "can read");
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canDownloadZip === true, "can download");
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canViewManifest === true, "can manifest");
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canPublish === false, "cannot publish");
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canRevoke === false, "cannot revoke");
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canGenerateZip === false, "cannot generate");
  assert(INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS.canAccessWmPrint === false, "no wm druk");
}

console.log("=== P1B-T07 REVOKED → brak pakietu ===");
{
  const raw = {
    id: "rev-1",
    jobId: JOB_ID,
    zipVersion: 1,
    publishedAt: "2026-06-16T12:00:00.000Z",
    publishedByUserId: "x",
    publishedByUserName: "X",
    generationFingerprint: "h",
    fingerprintPayload: FP,
    storagePath: "p",
    zipPublicUrl: "u",
    fileName: "x.zip",
    fileSizeBytes: 1,
    fileCount: 1,
    odbiorFileCount: 1,
    pomiaryFileCount: 0,
    includesMeasurements: false,
    manifest: [],
    status: "REVOKED",
    createdAt: "2026-06-16T12:00:00.000Z",
    updatedAt: "2026-06-16T12:00:00.000Z",
  };
  const pubs = normalizeDeliveryPackagePublications([raw]);
  assert(inspectorDeliveryPackageForJob(pubs, JOB_ID) === null, "REVOKED hidden from inspector");
}

console.log("=== P1B-T08 reload + sync merge ===");
{
  const local = applyDeliveryPackagePublication({
    publications: [],
    job: JOB,
    settings: DEFAULT_WM_PRINT_SETTINGS,
    zipVersion: 1,
    publishedByUserId: "a",
    publishedByUserName: "A",
    fingerprintHash: "h1",
    fingerprintPayload: FP,
    storagePath: "l",
    zipPublicUrl: "ul",
    fileName: "l.zip",
    fileSizeBytes: 100,
    odbiorFileCount: 1,
    pomiaryFileCount: 0,
    includesMeasurements: false,
    manifest: [],
  }).nextPublications;
  const localOlder = local.map((p) => ({ ...p, updatedAt: "2026-06-16T10:00:00.000Z" }));

  const cloudRaw = {
    id: local[0].id,
    jobId: JOB_ID,
    zipVersion: 1,
    publishedAt: local[0].publishedAt,
    publishedByUserId: "a",
    publishedByUserName: "A",
    generationFingerprint: "h1",
    fingerprintPayload: FP,
    storagePath: "l",
    zipPublicUrl: "ul",
    fileName: "l.zip",
    fileSizeBytes: 100,
    fileCount: 1,
    odbiorFileCount: 1,
    pomiaryFileCount: 0,
    includesMeasurements: false,
    manifest: sampleManifest(),
    status: "ACTIVE",
    createdAt: local[0].createdAt,
    updatedAt: "2026-06-16T14:00:00.000Z",
  };
  const merged = mergeDeliveryPackagePublications(localOlder, normalizeDeliveryPackagePublications([cloudRaw]));
  const active = inspectorDeliveryPackageForJob(merged, JOB_ID);
  assert(active?.manifest.length === 3, "merge picks cloud manifest update");
  assert(parseDeliveryPackagePublication(cloudRaw)?.manifest.length === 3, "parse manifest entries");
}

console.log("");
console.log(`P1B RESULT: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
