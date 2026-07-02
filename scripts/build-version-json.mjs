/** Payload dist/version.json — version (SSOT changelog) + commit + timestamp. */
import { execSync } from "node:child_process";
import { readChangelogVersion } from "./read-changelog-version.mjs";

/** Build Identity — short git commit HEAD. SSOT dla detekcji „nowy build". */
export function readGitCommitShort() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function buildVersionJsonPayload() {
  return {
    version: readChangelogVersion(),
    commit: readGitCommitShort(),
    timestamp: new Date().toISOString(),
  };
}

export function renderVersionJson() {
  return `${JSON.stringify(buildVersionJsonPayload(), null, 2)}\n`;
}
