/** Generuje dist/sw.js z APP_VERSION (CHANGELOG[0]). Używane przez vite plugin i smoke. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dir, "sw.template.js");

export function swCacheName(version) {
  return `wgdom-shell-${version}`;
}

export function renderServiceWorker(version) {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  if (!template.includes("__SW_CACHE_NAME__")) {
    throw new Error("sw.template.js missing __SW_CACHE_NAME__ placeholder");
  }
  return template.replaceAll("__SW_CACHE_NAME__", swCacheName(version));
}

export function writeServiceWorker(version, outPath) {
  writeFileSync(outPath, renderServiceWorker(version), "utf8");
}
