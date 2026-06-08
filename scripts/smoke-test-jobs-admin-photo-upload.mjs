/**
 * Admin Roboty — upload zdjęć (fix brakującego importu prepareWatermarkedPhoto)
 * Uruchom: npx vite-node scripts/smoke-test-jobs-admin-photo-upload.mjs
 */
import { readFileSync } from "node:fs";
import { prepareWatermarkedPhoto } from "../src/app/app-domain.ts";
import { PHOTO_LABEL_ORDER, PHOTO_LABEL_NAMES } from "../src/app/app-domain.ts";

const R = {};

function log(m) {
  console.log(m);
}

// T1 — JobsView import prepareWatermarkedPhoto
function testT1() {
  log("\n═══ T1 — JobsView import prepareWatermarkedPhoto ═══");
  const src = readFileSync("src/app/JobsView.tsx", "utf8");
  const hasImport =
    /import\s*\{[^}]*prepareWatermarkedPhoto[^}]*\}\s*from\s*["']@\/app\/app-domain["']/.test(src);
  const noDeadWatermark =
    !/from\s*["']@\/lib\/photo-watermark["']/.test(src);
  log(`  import prepareWatermarkedPhoto: ${hasImport}`);
  log(`  brak martwego photo-watermark import: ${noDeadWatermark}`);
  R.T1 = hasImport && noDeadWatermark ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — prepareWatermarkedPhoto wyeksportowane
function testT2() {
  log("\n═══ T2 — prepareWatermarkedPhoto export ═══");
  const ok = typeof prepareWatermarkedPhoto === "function";
  log(`  typeof: ${typeof prepareWatermarkedPhoto}`);
  R.T2 = ok ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3–T5 — kategorie admin upload (before / after / progress)
function testCategories() {
  const expected = [
    { id: "T3", label: "before", name: "Przed remontem" },
    { id: "T4", label: "after", name: PHOTO_LABEL_NAMES.after },
    { id: "T5", label: "progress", name: PHOTO_LABEL_NAMES.progress },
  ];
  for (const { id, label, name } of expected) {
    log(`\n═══ ${id} — kategoria ${name} ═══`);
    const inOrder = PHOTO_LABEL_ORDER.includes(label);
    const named = PHOTO_LABEL_NAMES[label] === name;
    log(`  PHOTO_LABEL_ORDER: ${inOrder}`);
    log(`  PHOTO_LABEL_NAMES: ${named ? name : PHOTO_LABEL_NAMES[label]}`);
    R[id] = inOrder && named ? "PASS" : "FAIL";
    log(`${id}: ${R[id]}`);
  }
}

// T6 — handler ma catch (toast.error)
function testT6() {
  log("\n═══ T6 — upload handler catch + toast ═══");
  const src = readFileSync("src/app/JobsView.tsx", "utf8");
  const hasCatch = /catch\s*\(err\)/.test(src) && /toast\.error/.test(src);
  log(`  catch + toast.error: ${hasCatch}`);
  R.T6 = hasCatch ? "PASS" : "FAIL";
  log(`T6: ${R.T6}`);
}

testT1();
testT2();
testCategories();
testT6();

const all = Object.values(R);
const pass = all.filter((x) => x === "PASS").length;
log(`\n═══ PODSUMOWANIE admin photo upload: ${pass}/${all.length} PASS ═══`);
if (pass !== all.length) process.exit(1);
