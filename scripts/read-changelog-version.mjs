/** Odczyt CHANGELOG[0].version z changelog-data.ts — build + smoke. */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = resolve(__dir, "../src/app/changelog-data.ts");

export function readChangelogVersion() {
  const src = readFileSync(CHANGELOG_PATH, "utf8");
  const anchor = src.indexOf("export const CHANGELOG");
  if (anchor < 0) throw new Error("CHANGELOG export not found in changelog-data.ts");
  const head = src.slice(anchor, anchor + 600);
  const m = head.match(/version:\s*"([^"]+)"/);
  if (!m) throw new Error("Cannot parse CHANGELOG[0].version from changelog-data.ts");
  return m[1];
}
