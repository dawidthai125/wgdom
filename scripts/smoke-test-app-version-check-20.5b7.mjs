/**
 * Sprint 20.5B.7 (+ Version Banner Refresh / Build Identity) — Version Awareness & Update Banner
 * Uruchom: npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs
 *
 * Kryterium detekcji: Build Identity (commit). Release Version = wyłącznie prezentacja.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readChangelogVersion } from "./read-changelog-version.mjs";
import {
  isNewBuildAvailable,
  CROSS_TAB_SERVER_BUILD_KEY,
  resolveSeededServerBuild,
  persistCrossTabServerBuild,
  clearCrossTabServerBuild,
} from "../src/lib/app-version-check.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

log("=== Version Awareness & Update Banner — Build Identity (commit) ===\n");

// precheck — Release Version pozostaje niezależnym numerem wydania (SSOT: changelog).
assert("precheck changelog release version", /^\d+\.\d+\.\d+$/.test(readChangelogVersion()));

// T1 — APP_VERSION (Release) + APP_COMMIT (Build Identity)
assert(
  "T1 APP_VERSION + APP_COMMIT",
  readSrc("src/lib/app-version.ts").includes("APP_VERSION")
    && readSrc("src/lib/app-version.ts").includes("APP_COMMIT")
    && readSrc("vite.config.ts").includes("__APP_VERSION__")
    && readSrc("vite.config.ts").includes("__APP_COMMIT__")
    && readSrc("src/app/changelog-data.ts").includes("export const APP_VERSION"),
);

// T2 — version.json (version + commit)
assert(
  "T2 version.json",
  readSrc("vite.config.ts").includes("dist/version.json")
    && existsSync(resolve(root, "scripts/read-changelog-version.mjs"))
    && existsSync(resolve(root, "scripts/build-version-json.mjs")),
);

// T3 — hook fetch (build: version + commit)
assert(
  "T3 hook fetch",
  readSrc("src/lib/app-version-check.ts").includes("fetchServerBuild")
    && readSrc("src/lib/app-version-check.ts").includes("/version.json")
    && readSrc("src/lib/app-version-check.ts").includes("useAppVersionCheck"),
);

// T4 — detekcja po commit (Build Identity), NIE po Release Version
assert(
  "T4 build-identity detection",
  isNewBuildAvailable("abc1234", "def5678")
    && !isNewBuildAvailable("abc1234", "abc1234")
    && !isNewBuildAvailable("abc1234", null),
);

// T5 — banner
assert(
  "T5 banner render",
  readSrc("src/app/AppUpdateBanner.tsx").includes("Dostępna nowa wersja WGDOM")
    && readSrc("src/main.tsx").includes("<AppUpdateBanner"),
);

// T6 — reload
assert(
  "T6 reload button",
  readSrc("src/app/AppUpdateBanner.tsx").includes("Odśwież teraz")
    && readSrc("src/lib/app-version-check.ts").includes("location.reload"),
);

// T7 — dismiss
assert(
  "T7 dismiss",
  readSrc("src/lib/app-version-check.ts").includes("wg-update-banner-dismiss")
    && readSrc("src/app/AppUpdateBanner.tsx").includes("Później"),
);

// T8 — sync untouched
assert(
  "T8 no sync impact",
  !readSrc("src/lib/app-version-check.ts").includes("cloud-sync")
    && readSrc("src/lib/cloud-sync.ts").includes("export const DATA_KEYS"),
);

// T9 — auth untouched
assert(
  "T9 no auth impact",
  !readSrc("src/lib/app-version-check.ts").includes("admin-auth")
    && readSrc("src/lib/admin-auth.ts").includes("loadAdminSessionFromStorage"),
);

// T10 — worker untouched
assert(
  "T10 no worker impact",
  !readSrc("src/lib/app-version-check.ts").includes("workerReports")
    && readSrc("src/app/WorkerPhotoView.tsx").includes("function WorkerPhotoView"),
);

assert(
  "GuideView FAQ",
  readSrc("src/app/GuideView.tsx").includes("Dlaczego widzę komunikat o nowej wersji?"),
);

// T11 — cross-tab localStorage key (Build Identity)
assert(
  "T11 cross-tab key",
  CROSS_TAB_SERVER_BUILD_KEY === "wg-update-server-build"
    && readSrc("src/lib/app-version-check.ts").includes(CROSS_TAB_SERVER_BUILD_KEY),
);

// T12 — storage listener
assert(
  "T12 storage listener",
  readSrc("src/lib/app-version-check.ts").includes('addEventListener("storage"')
    && readSrc("src/lib/app-version-check.ts").includes("CROSS_TAB_SERVER_BUILD_KEY"),
);

// T13 — seed helpers (mock localStorage in Node)
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
}

{
  let t13ok = resolveSeededServerBuild("commitA") === null;
  try {
    localStorage.setItem(
      CROSS_TAB_SERVER_BUILD_KEY,
      JSON.stringify({ version: "9.99.99", commit: "commitB" }),
    );
    t13ok =
      t13ok
      && resolveSeededServerBuild("commitA")?.commit === "commitB"
      && resolveSeededServerBuild("commitB") === null;
  } finally {
    clearCrossTabServerBuild();
  }
  assert("T13 seed helpers", t13ok);
}

// T14 — persist only when commit differs (nowy build)
{
  persistCrossTabServerBuild({ version: "9.99.99", commit: "commitB" }, "commitA");
  const stored = localStorage.getItem(CROSS_TAB_SERVER_BUILD_KEY);
  const afterNewer = stored != null && JSON.parse(stored).commit === "commitB";
  persistCrossTabServerBuild({ version: "9.99.99", commit: "commitA" }, "commitA");
  const afterCaughtUp = localStorage.getItem(CROSS_TAB_SERVER_BUILD_KEY) === null;
  clearCrossTabServerBuild();
  assert("T14 persist helpers", afterNewer && afterCaughtUp);
}

const tKeys = Object.keys(results).filter((k) => k.startsWith("T"));
const pass = tKeys.filter((k) => results[k] === "PASS").length;
log(`\n=== ${pass}/${tKeys.length} PASS (T1–T14) ===`);

if (pass !== 14) {
  throw new Error(`Expected 14/14 PASS, got ${pass}/14`);
}
