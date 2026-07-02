import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

function runViteNodeCli(cliPath, arg) {
  const cmd = arg
    ? `npx vite-node "${cliPath.replace(/"/g, '\\"')}" ${arg}`
    : `npx vite-node "${cliPath.replace(/"/g, '\\"')}"`;
  const r = spawnSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || r.stdout?.trim() || `vite-node failed: ${cliPath}`);
  }
  return r.stdout.trim();
}

export function buildPayrollHarnessSeed(opts) {
  const cli = join(ROOT, "e2e/helpers/test-harness/core/seed-ssot-cli.ts");
  const encoded = Buffer.from(JSON.stringify(opts), "utf8").toString("base64");
  const out = runViteNodeCli(cli, encoded);
  return JSON.parse(out);
}

export function runHarnessCleanupViaSsot(payload) {
  const cli = join(ROOT, "e2e/helpers/test-harness/core/cleanup-ssot-cli.ts");
  const r = spawnSync(`npx vite-node "${cli.replace(/"/g, '\\"')}"`, {
    cwd: ROOT,
    encoding: "utf8",
    input: JSON.stringify(payload),
    shell: true,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || r.stdout?.trim() || "cleanup-ssot-cli failed");
  }
  return JSON.parse(r.stdout.trim());
}
