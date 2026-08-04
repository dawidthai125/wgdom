/**
 * WORKER-INSPECTOR-MOBILE-01 WIM-P1a — smoke (static markers · WorkerPhotoView only)
 * Run: npx vite-node scripts/test-worker-inspector-mobile-p1a.mjs
 *
 * AC / markers: WIM-AR-P1a-03 — grep WorkerPhotoView source only.
 * Note: camera is 1× HiddenFileInput inside LABELS.map → 3 runtime instances (WIM-AR-P1a-01).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name);
  }
}

console.log("WORKER-INSPECTOR-MOBILE-01 WIM-P1a — test-worker-inspector-mobile-p1a\n");

const worker = readFileSync(join(root, "src/app/WorkerPhotoView.tsx"), "utf8");

/* Extract LABELS array literal (first PhotoEntry labels block) */
const labelsMatch = worker.match(
  /const LABELS:[^=]*=\s*\[([\s\S]*?)\];/,
);
const labelsBody = labelsMatch?.[1] ?? "";
const labelValueCount = (labelsBody.match(/value:\s*["']/g) || []).length;

const hfiOpenCount = (worker.match(/<HiddenFileInput\b/g) || []).length;
const captureCount = (worker.match(/capture=["']environment["']/g) || []).length;
const imageAcceptCount = (worker.match(/accept=\{IMAGE_ACCEPT\}/g) || []).length;

/* M5 / AC-P1a-01 — no raw <input type="file"> in WorkerPhotoView JSX */
assert("M5 AC-01 no raw input type=file", !/<input\b[^>]*\btype=["']file["']/.test(worker));

/* M6 / AC-P1a-02 — no multiple + capture adjacent */
assert(
  "M6 AC-02 no multiple+capture same attrs",
  !/\bmultiple\b[^<\n]{0,120}\bcapture=/.test(worker) && !/\bcapture=[^<\n]{0,120}\bmultiple\b/.test(worker),
);

/* Source HFI: G + A(map) + R-cam + R-file = 4 openings; A×3 via LABELS.length */
assert("T00 LABELS count = 3 (camera ×3 runtime)", labelValueCount === 3);
assert("T00 HiddenFileInput source openings = 4", hfiOpenCount === 4);
assert("M1 capture=environment source count = 2 (map + R-cam)", captureCount === 2);
assert("M1 IMAGE_ACCEPT source count = 2 (map + R-cam)", imageAcceptCount === 2);

/* M1 — camera map: HiddenFileInput with IMAGE_ACCEPT + capture, no multiple, → handleFiles */
assert(
  "M1 AC-03 camera map HFI IMAGE_ACCEPT+capture",
  /LABELS\.map\(\(lbl\)\s*=>\s*\(\s*<HiddenFileInput[\s\S]*?accept=\{IMAGE_ACCEPT\}[\s\S]*?capture=["']environment["'][\s\S]*?handleFiles\(files,\s*lbl\.value\)/.test(
    worker,
  ),
);
assert(
  "M1 camera map HFI no multiple",
  /LABELS\.map\(\(lbl\)\s*=>\s*\(\s*<HiddenFileInput(?![^>]*\bmultiple\b)[\s\S]*?capture=["']environment["']/.test(
    worker,
  ) || /LABELS\.map\(\(lbl\)\s*=>\s*\(\s*<HiddenFileInput[\s\S]*?capture=["']environment["'][\s\S]*?<\/HiddenFileInput>/.test(
    worker,
  ) && !/LABELS\.map\(\(lbl\)\s*=>\s*\(\s*<HiddenFileInput[^>]*\bmultiple\b/.test(worker),
);

/* M2 — gallery */
assert("M2 AC-04 gallery onPick=onGalleryPick", /<HiddenFileInput multiple onPick=\{onGalleryPick\}>/.test(worker));
assert("M2 gallery line has no capture", !/<HiddenFileInput multiple[^>]*capture=/.test(worker));

/* M3 / M4 — receipt */
assert(
  "M3 AC-05 R-file accept pdf",
  /accept=["']image\/\*,application\/pdf,\.pdf["']/.test(worker),
);
assert(
  "M3 R-file accept not paired with capture",
  !/accept=["']image\/\*,application\/pdf,\.pdf["'][^<\n]{0,80}capture=/.test(worker),
);
assert("M4 R-cam label Aparat", worker.includes("Aparat"));
assert("M4 R-file label Plik/PDF", worker.includes("Plik/PDF"));
assert(
  "M4 R-cam uses IMAGE_ACCEPT (receipt block before gallery)",
  worker.indexOf('accept={IMAGE_ACCEPT}') < worker.indexOf("<HiddenFileInput multiple onPick={onGalleryPick}>") &&
    worker.indexOf('capture="environment"') < worker.indexOf("<HiddenFileInput multiple onPick={onGalleryPick}>"),
);

/* Imports / copy / shell / REUSE */
assert("T01 imports IMAGE_ACCEPT", /import\s*\{[^}]*IMAGE_ACCEPT[^}]*\}\s*from\s*["']@\/app\/HiddenFileInput["']/.test(worker));
assert("T02 imports HiddenFileInput", worker.includes("HiddenFileInput"));
assert("T03 camera copy 1 zdjęcie", worker.includes("1 zdjęcie"));
assert("T04 WG_TOUCH_MIN used", worker.includes("WG_TOUCH_MIN"));
assert("T05 worker-shell kept", worker.includes("worker-shell"));
assert("T08 handleFiles from camera", worker.includes("handleFiles(files, lbl.value)"));
assert("T09 submitReceipt from receipt", worker.includes("submitReceipt(f)"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
