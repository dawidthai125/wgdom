#!/usr/bin/env node
/** Thin npm wrapper → test-infra/prod-sandbox/runner.mjs */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runner = join(root, "test-infra", "prod-sandbox", "runner.mjs");
const r = spawnSync(process.execPath, [runner, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
