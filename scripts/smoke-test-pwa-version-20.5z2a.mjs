/**
 * Sprint 20.5Z.2A — PWA + Version Awareness Hardening
 * Uruchom: npx vite-node scripts/smoke-test-pwa-version-20.5z2a.mjs
 * Wymaga: npm run build (dist/sw.js)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readChangelogVersion } from "./read-changelog-version.mjs";
import { readGitCommitShort } from "./build-version-json.mjs";
import { renderServiceWorker, swCacheName } from "./generate-service-worker.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const version = readChangelogVersion();
const buildId = readGitCommitShort();

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

console.log("=== Smoke 20.5Z.2A — PWA + Version Awareness Hardening ===\n");

assert("Z1 template exists", existsSync(resolve(root, "scripts/sw.template.js")));
assert("Z2 generate-service-worker.mjs", existsSync(resolve(root, "scripts/generate-service-worker.mjs")));
assert("Z3 vite serviceWorkerPlugin", read("vite.config.ts").includes("serviceWorkerPlugin"));
assert("Z4 public/sw.js removed", !existsSync(resolve(root, "public/sw.js")));

const cacheName = swCacheName(buildId);
assert("Z5 cache name from Build Identity (commit)", cacheName === `wgdom-shell-${buildId}`, cacheName);

const rendered = renderServiceWorker(buildId);
assert("Z6 rendered CACHE constant", rendered.includes(`const CACHE = "${cacheName}"`));
assert("Z7 version.json network-only", rendered.includes('url.pathname === "/version.json"'));
{
  const versionBlock =
    rendered.match(/if \(url\.pathname === "\/version\.json"\)[\s\S]*?return;\s*\}/)?.[0] ?? "";
  assert(
    "Z8 version.json no fallback",
    versionBlock.includes("fetch(event.request)") && !versionBlock.includes("caches.match"),
  );
}

assert(
  "Z9 vercel no-store",
  read("vercel.json").includes("/version.json")
    && read("vercel.json").includes("no-store"),
);

assert("Z10 dist/sw.js exists", existsSync(resolve(root, "dist/sw.js")), "run npm run build first");
const distSw = read("dist/sw.js");
// SSOT builda: commit z dist/version.json (Build Identity zapieczętowany przy buildzie).
const distBuild = JSON.parse(read("dist/version.json"));
const distCacheName = swCacheName(distBuild.commit);
assert(
  "Z11 dist CACHE matches Build Identity (commit)",
  distSw.includes(`const CACHE = "${distCacheName}"`),
  distCacheName,
);
assert("Z12 dist version.json network-only", distSw.includes('url.pathname === "/version.json"'));

assert(
  "Z13 ARCHITECTURE 20.5Z.2A",
  read("docs/ARCHITECTURE.md").includes("20.5Z.2A")
    && read("docs/ARCHITECTURE.md").includes("wgdom-shell-"),
);

assert(
  "Z14 version awareness intact",
  read("src/lib/app-version-check.ts").includes('cache: "no-store"')
    && read("src/app/AppUpdateBanner.tsx").includes("Dostępna nowa wersja WGDOM"),
);

console.log(`\n=== PASS — 20.5Z.2A PWA/Version (${version}) ===`);
