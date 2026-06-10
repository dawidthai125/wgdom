/**
 * Sprint 20.5B.7 — Version Awareness & Update Banner
 * Uruchom: npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readChangelogVersion } from "./read-changelog-version.mjs";
import { isNewerVersionAvailable } from "../src/lib/app-version-check.ts";

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

log("=== Sprint 20.5B.7 — Version Awareness & Update Banner ===\n");

assert("precheck changelog 2.50.58", readChangelogVersion() === "2.50.58");

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

const tKeys = Object.keys(results).filter((k) => k.startsWith("T"));
const pass = tKeys.filter((k) => results[k] === "PASS").length;
log(`\n=== ${pass}/${tKeys.length} PASS (T1–T10) ===`);

if (pass !== 10) {
  throw new Error(`Expected 10/10 PASS, got ${pass}/10`);
}
