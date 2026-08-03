/**
 * WM-RYSUNKI-01 P1B — Feature Rollout (AppSettings SSOT)
 * Run: npx vite-node scripts/test-wm-rysunki-01-p1b.mjs
 */
import {
  defaultAppSettings,
  mergeWmRysunkiEnabled,
  mergeAppSettings,
  loadAppSettingsLocal,
  APP_SETTINGS_KEY,
} from "../src/lib/app-settings.ts";
import {
  forceWmRysunki01ForTests,
  isWmRysunki01Enabled,
  maybePromoteWmRysunki01FromLs,
  clearWmRysunki01LsLegacyOn,
  WM_RYSUNKI_01_LS_KEY,
  WM_RYSUNKI_01_DEFAULT,
} from "../src/lib/wm-technical-drawings/flag.ts";
import { getVisibleWmPrintTabs } from "../src/lib/wm-print/wm-print-tabs.ts";
import { DATA_KEYS, APP_SETTINGS_KEY as CLOUD_APP_SETTINGS_KEY } from "../src/lib/cloud-sync.ts";
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

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

/** Minimal LS mock for Node. */
const mem = new Map();
globalThis.localStorage = {
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(k, String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};

function resetLs() {
  mem.clear();
  forceWmRysunki01ForTests(null);
}

console.log("WM-RYSUNKI-01 P1B — test-wm-rysunki-01-p1b\n");

resetLs();

// --- AC-P1B-01 default OFF ---
assert("T01 default AppSettings.wmRysunkiEnabled false", defaultAppSettings().wmRysunkiEnabled === false);
assert("T02 WM_RYSUNKI_01_DEFAULT false", WM_RYSUNKI_01_DEFAULT === false);
assert(
  "T03 gate OFF without settings / LS",
  isWmRysunki01Enabled() === false,
);
assert(
  "T04 tabs hide rysunki default",
  getVisibleWmPrintTabs(defaultAppSettings()).every((t) => t.key !== "rysunki"),
);

// --- AC-P1B-02 AppSettings ON → tab ---
const onSettings = { ...defaultAppSettings(), wmRysunkiEnabled: true };
assert("T05 gate ON with AppSettings", isWmRysunki01Enabled(onSettings) === true);
assert(
  "T06 tabs show rysunki after Odbiory",
  getVisibleWmPrintTabs(onSettings)[0].key === "odbiory" &&
    getVisibleWmPrintTabs(onSettings)[1].key === "rysunki",
);

// --- AC-P1B-05 FORCE OFF (D-P1B-11) ---
resetLs();
localStorage.setItem(WM_RYSUNKI_01_LS_KEY, "0");
assert(
  "T07 FORCE OFF beats AppSettings ON",
  isWmRysunki01Enabled(onSettings) === false,
);
assert(
  "T08 tabs hide under FORCE OFF",
  getVisibleWmPrintTabs(onSettings).every((t) => t.key !== "rysunki"),
);

// --- Fallback LS=1 when settings not passed ---
resetLs();
localStorage.setItem(WM_RYSUNKI_01_LS_KEY, "1");
assert("T09 fallback LS=1 without settings", isWmRysunki01Enabled() === true);
assert(
  "T10 LS=1 does NOT override AppSettings OFF when settings passed",
  isWmRysunki01Enabled({ ...defaultAppSettings(), wmRysunkiEnabled: false }) === false,
);

// --- AC-P1B-06 / D-P1B-10 one-shot promote ---
resetLs();
localStorage.setItem(WM_RYSUNKI_01_LS_KEY, "1");
const off = { ...defaultAppSettings(), wmRysunkiEnabled: false };
// Mock persist: saveAppSettings writes LS app-settings — OK in test env
const promoted = await maybePromoteWmRysunki01FromLs(off);
assert("T11 promote returns settings ON", promoted != null && promoted.wmRysunkiEnabled === true);
assert(
  "T12 promote removed LS key",
  localStorage.getItem(WM_RYSUNKI_01_LS_KEY) == null,
);
assert(
  "T13 second promote is no-op",
  (await maybePromoteWmRysunki01FromLs(promoted)) === null,
);

// Promote blocked under FORCE OFF
resetLs();
localStorage.setItem(WM_RYSUNKI_01_LS_KEY, "0");
assert(
  "T14 no promote under FORCE OFF",
  (await maybePromoteWmRysunki01FromLs(off)) === null,
);
assert("T15 FORCE OFF key kept", localStorage.getItem(WM_RYSUNKI_01_LS_KEY) === "0");

// Cleanup when already ON + leftover LS=1
resetLs();
localStorage.setItem(WM_RYSUNKI_01_LS_KEY, "1");
assert(
  "T16 cleanup LS when already ON",
  (await maybePromoteWmRysunki01FromLs(onSettings)) === null &&
    localStorage.getItem(WM_RYSUNKI_01_LS_KEY) == null,
);

// --- Merge (MR-P1B-04) ---
assert(
  "T17 merge cloud true wins",
  mergeWmRysunkiEnabled({ wmRysunkiEnabled: true }, off) === true,
);
assert(
  "T18 merge cloud false wins",
  mergeWmRysunkiEnabled({ wmRysunkiEnabled: false }, onSettings) === false,
);
assert(
  "T19 mergeAppSettings includes field",
  mergeAppSettings({ wmRysunkiEnabled: true }, off).wmRysunkiEnabled === true,
);

// --- load local ---
resetLs();
localStorage.setItem(
  APP_SETTINGS_KEY,
  JSON.stringify({ ...defaultAppSettings(), wmRysunkiEnabled: true }),
);
assert("T20 loadAppSettingsLocal reads field", loadAppSettingsLocal().wmRysunkiEnabled === true);

// --- AC-P1B-08 no new DATA_KEY · reuse APP_SETTINGS ---
assert("T21 APP_SETTINGS_KEY stable", APP_SETTINGS_KEY === "kw-app-settings");
assert("T22 cloud APP_SETTINGS same", CLOUD_APP_SETTINGS_KEY === "kw-app-settings");
assert(
  "T23 no new rysunki LS key in DATA_KEYS",
  !DATA_KEYS.includes("kw-wm-rysunki-01"),
);

// --- Source contracts ---
const flagSrc = readSrc("src/lib/wm-technical-drawings/flag.ts");
assert("T24 gate documents FORCE OFF", flagSrc.includes('ls === "0"') || flagSrc.includes("=== \"0\""));
assert("T25 promote removes LS", flagSrc.includes("clearWmRysunki01LsLegacyOn"));

const modalSrc = readSrc("src/app/AdminSettingsModal.tsx");
assert("T26 AdminSettings has Moduły / Rysunki WM", modalSrc.includes("Rysunki WM") && modalSrc.includes("wmRysunkiEnabled"));
assert("T27 AdminSettings promote on open", modalSrc.includes("maybePromoteWmRysunki01FromLs"));

const wmSrc = readSrc("src/app/WmPrintView.tsx");
assert("T28 mirror WM Ustawienia", wmSrc.includes("wmRysunkiEnabled") && wmSrc.includes("Moduły — Rysunki WM"));
assert("T29 mirror uses saveAppSettings", wmSrc.includes("saveAppSettings"));
assert("T30 no WmPrintSettings.rysunki field", !readSrc("src/lib/wm-print/settings.ts").includes("rysunki"));

const appSettingsSrc = readSrc("src/lib/app-settings.ts");
assert("T31 field + merge helper", appSettingsSrc.includes("wmRysunkiEnabled") && appSettingsSrc.includes("mergeWmRysunkiEnabled"));

const changelog = readSrc("src/app/changelog-data.ts");
assert("T32 changelog 2.65.98", changelog.includes('version: "2.65.98"'));

forceWmRysunki01ForTests(null);
clearWmRysunki01LsLegacyOn();

console.log(`\nP1B result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
