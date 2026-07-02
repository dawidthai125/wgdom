/**
 * Generuje dist/sw.js z Build Identity (short git commit). Używane przez vite plugin i smoke.
 * Cache identity = commit (build) — sw.js rotuje po KAŻDYM deployu. NIE Release Version.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dir, "sw.template.js");

export function swCacheName(buildId) {
  return `wgdom-shell-${buildId}`;
}

export function renderServiceWorker(buildId) {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  if (!template.includes("__SW_CACHE_NAME__")) {
    throw new Error("sw.template.js missing __SW_CACHE_NAME__ placeholder");
  }
  return template.replaceAll("__SW_CACHE_NAME__", swCacheName(buildId));
}

export function writeServiceWorker(buildId, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderServiceWorker(buildId), "utf8");
}
