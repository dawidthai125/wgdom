#!/usr/bin/env node
/** PROD-SANDBOX-H5 — forces --scenario h5-biblioteka (orchestrator passes no args). */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runner = join(root, "test-infra", "prod-sandbox", "runner.mjs");
const extra = process.argv.slice(2);
const args = [runner, "--scenario", "h5-biblioteka", "--allow-prod", ...extra];
const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
