/**
 * CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01 · Slice B — drawings frequency separation.
 *
 * B1–B5: static contract on App.tsx + domain push path (no live browser).
 *
 * Run: npx vite-node scripts/test-cloud-sync-drawings-frequency-separation-01.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let pass = 0;
let fail = 0;
function assert(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log("PASS", name, detail ? `· ${detail}` : "");
  } else {
    fail++;
    console.log("FAIL", name, detail ? `· ${detail}` : "");
  }
}

const appSrc = readFileSync(resolve("src/app/App.tsx"), "utf8");
const syncSrc = readFileSync(resolve("src/lib/wm-technical-drawings/sync.ts"), "utf8");

console.log("=== CLOUD-SYNC drawings frequency separation ===\n");

// Locate auto-sync effect deps
const autoFx = appSrc.match(
  /\/\/ Auto-save to cloud[\s\S]*?useEffect\(\(\) => \{\s*scheduleAutoCloudSync\(\);[\s\S]*?\}, \[([^\]]+)\]\)/,
);
assert("auto-sync useEffect found", !!autoFx);
const deps = autoFx?.[1] ?? "";

assert("B2 drawings NOT in full RS auto-sync deps", !/\bwmTechnicalDrawings\b/.test(deps), deps.slice(0, 200));
assert("B3 Payroll weekEmployees STILL in auto-sync deps", /\bweekEmployees\b/.test(deps));
assert("B3 savedWeeks STILL in auto-sync deps", /\bsavedWeeks\b/.test(deps));
assert("B4 jobs STILL in auto-sync deps", /\bjobs\b/.test(deps));
assert("B5 directory STILL in auto-sync deps", /\bdirectory\b/.test(deps));
assert("B5 operationalNotes STILL in auto-sync deps", /\boperationalNotes\b/.test(deps));
assert("B5 electricalSchematics STILL in auto-sync deps", /\belectricalSchematics\b/.test(deps));

// B1 — commit → drawings-only push
const commitFn = appSrc.match(
  /const commitWmTechnicalDrawings = useCallback\([\s\S]*?\}, \[[^\]]*\]\);/,
);
assert("commitWmTechnicalDrawings present", !!commitFn);
const commitBody = commitFn?.[0] ?? "";
assert(
  "B1 commit calls pushWmTechnicalDrawingsToCloud",
  /pushWmTechnicalDrawingsToCloud\(payload\)/.test(commitBody),
);
assert(
  "B1 commit does NOT call runCloudSync / scheduleAutoCloudSync",
  !/runCloudSync|scheduleAutoCloudSync/.test(commitBody),
);

assert(
  "domain push uses pushKeysToCloud([WM_TECHNICAL_DRAWINGS_KEY])",
  /pushKeysToCloud\(\[WM_TECHNICAL_DRAWINGS_KEY\]/.test(syncSrc),
);

// Guard: no joint disable of payroll+drawings
assert(
  "no joint wmTechnicalDrawings+payroll exclusion block",
  !/wmTechnicalDrawings\s*\+\s*payroll|payroll.*wmTechnicalDrawings.*exclude/i.test(appSrc),
);

console.log(`\n=== RESULT pass=${pass} fail=${fail} ===`);
process.exit(fail > 0 ? 1 : 0);
