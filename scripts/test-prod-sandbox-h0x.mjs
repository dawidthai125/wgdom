#!/usr/bin/env node
/** PROD-SANDBOX-H0X — forces --scenario h0x-recover (orchestrator may pass --dry-run). */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runner = join(root, "test-infra", "prod-sandbox", "runner.mjs");
const extra = process.argv.slice(2);
const hasDry = extra.includes("--dry-run");
const hasAllow = extra.includes("--allow-prod");
const args = [runner, "--scenario", "h0x-recover", ...extra];
if (!hasDry && !hasAllow) {
  // Default suite path: dry-run safe (no prod writes)
  args.push("--dry-run");
}
const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
