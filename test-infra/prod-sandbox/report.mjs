/**
 * TEST-HARNESS-01 H0 — JSON report writer (Design Freeze D11, #PSB-014)
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * @param {string} outDir
 * @param {Record<string, unknown>} report
 */
export function writeReport(outDir, report) {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "report.json");
  const payload = {
    program: "TEST-HARNESS-01",
    slice: "H0",
    generatedAt: new Date().toISOString(),
    ...report,
  };
  writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
  return path;
}

/**
 * @param {string} root
 * @param {string} [runId]
 */
export function defaultOutDir(root, runId) {
  const id = runId || `h0-${Date.now().toString(36)}`;
  return join(root, ".tmp", "prod-sandbox-out", id);
}
