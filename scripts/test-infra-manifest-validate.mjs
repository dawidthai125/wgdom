#!/usr/bin/env node
/** Validate TEST-INFRA manifest + orchestrator dry-run metadata. */
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const r = spawnSync("node", ["scripts/test-infra-orchestrator.mjs", "--validate"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

if (r.status !== 0) process.exit(r.status ?? 1);

console.log("test-infra manifest validate: PASS");
process.exit(0);
