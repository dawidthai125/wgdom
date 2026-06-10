/**
 * Sprint 20.5B.7 — Version Awareness & Update Banner
 * Uruchom: npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readChangelogVersion } from "./read-changelog-version.mjs";
import {
  isNewerVersionAvailable,
  CROSS_TAB_SERVER_VERSION_KEY,
  resolveSeededServerVersion,
  persistCrossTabServerVersion,
  clearCrossTabServerVersion,
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

log("=== Sprint 20.5B.7 / 20.5B.7D — Version Awareness & Update Banner ===\n");

assert("precheck changelog 2.50.60", readChangelogVersion() === "2.50.60");

// T1 — APP_VERSION
assert(
  "T1 APP_VERSION",
  readSrc("src/lib/app-version.ts").includes("APP_VERSION")
    && readSrc("vite.config.ts").includes("__APP_VERSION__")
    && readSrc("src/app/changelog-data.ts").includes("export const APP_VERSION"),
);

// T2 — version.json
assert(
  "T2 version.json",
  readSrc("vite.config.ts").includes("dist/version.json")
    && existsSync(resolve(root, "scripts/read-changelog-version.mjs")),
);

// T3 — hook fetch
assert(
  "T3 hook fetch",
  readSrc("src/lib/app-version-check.ts").includes("fetchServerVersion")
    && readSrc("src/lib/app-version-check.ts").includes("/version.json")
    && readSrc("src/lib/app-version-check.ts").includes("useAppVersionCheck"),
);

// T4 — detection
assert(
  "T4 version diff",
  isNewerVersionAvailable("2.50.55", "2.50.56")
    && !isNewerVersionAvailable("2.50.56", "2.50.56")
    && !isNewerVersionAvailable("2.50.56", null),
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

// T11 — cross-tab localStorage key (20.5B.7D)
assert(
  "T11 cross-tab key",
  CROSS_TAB_SERVER_VERSION_KEY === "wg-update-server-version"
    && readSrc("src/lib/app-version-check.ts").includes(CROSS_TAB_SERVER_VERSION_KEY),
);

// T12 — storage listener
assert(
  "T12 storage listener",
  readSrc("src/lib/app-version-check.ts").includes('addEventListener("storage"')
    && readSrc("src/lib/app-version-check.ts").includes("CROSS_TAB_SERVER_VERSION_KEY"),
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
  let t13ok =
    resolveSeededServerVersion("2.50.59") === null;
  try {
    localStorage.setItem(CROSS_TAB_SERVER_VERSION_KEY, "2.50.60");
    t13ok =
      t13ok
      && resolveSeededServerVersion("2.50.59") === "2.50.60"
      && resolveSeededServerVersion("2.50.60") === null;
  } finally {
    clearCrossTabServerVersion();
  }
  assert("T13 seed helpers", t13ok);
}

// T14 — persist only when newer
{
  persistCrossTabServerVersion("2.50.60", "2.50.59");
  const afterNewer = localStorage.getItem(CROSS_TAB_SERVER_VERSION_KEY) === "2.50.60";
  persistCrossTabServerVersion("2.50.59", "2.50.59");
  const afterCaughtUp = localStorage.getItem(CROSS_TAB_SERVER_VERSION_KEY) === null;
  clearCrossTabServerVersion();
  assert("T14 persist helpers", afterNewer && afterCaughtUp);
}

const tKeys = Object.keys(results).filter((k) => k.startsWith("T"));
const pass = tKeys.filter((k) => results[k] === "PASS").length;
log(`\n=== ${pass}/${tKeys.length} PASS (T1–T14) ===`);

if (pass !== 14) {
  throw new Error(`Expected 14/14 PASS, got ${pass}/14`);
}
