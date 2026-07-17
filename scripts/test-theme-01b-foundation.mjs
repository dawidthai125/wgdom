/**
 * @deprecated THEME-01B superseded — run test-theme-01c-atomic-migration.mjs
 * THEME-01B — Foundation smoke (historical).
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
console.warn("DEPRECATED: redirecting to test-theme-01c-atomic-migration.mjs\n");
execSync("npx vite-node scripts/test-theme-01c-atomic-migration.mjs", {
  cwd: root,
  stdio: "inherit",
});
