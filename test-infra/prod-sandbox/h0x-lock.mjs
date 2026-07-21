/**
 * TEST-HARNESS-01 H0.x — Single-writer lock (D-H0X-04/05/17/18)
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
export const H0X_LOCK_PATH = join(ROOT, ".tmp", "prod-sandbox-out", "h0x.lock");

/**
 * @param {number} pid
 */
export function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    const err = /** @type {NodeJS.ErrnoException} */ (e);
    if (err && err.code === "ESRCH") return false;
    // EPERM: process exists but signal not permitted
    if (err && err.code === "EPERM") return true;
    // Ambiguous → treat as alive (FAIL loud preference for takeover)
    return true;
  }
}

export function getLockPath() {
  return H0X_LOCK_PATH;
}

/**
 * @param {{ pid: number, scenario: string, startedAt?: string }} opts
 */
export async function acquireH0xLock(opts) {
  const pid = opts.pid || process.pid;
  const scenario = opts.scenario || "unknown";
  const startedAt = opts.startedAt || new Date().toISOString();
  mkdirSync(dirname(H0X_LOCK_PATH), { recursive: true });

  if (existsSync(H0X_LOCK_PATH)) {
    let existing;
    try {
      existing = JSON.parse(readFileSync(H0X_LOCK_PATH, "utf8"));
    } catch {
      // corrupt lock → takeover
      existing = null;
    }
    const otherPid = existing && Number(existing.pid);
    if (otherPid && otherPid !== pid && isPidAlive(otherPid)) {
      throw new Error(
        `PSB_H0X_LOCK_HELD: pid=${otherPid} scenario=${existing.scenario || "?"} path=${H0X_LOCK_PATH}`,
      );
    }
    if (otherPid && otherPid !== pid) {
      console.warn(
        `WARNING h0x.lock stale takeover: dead pid=${otherPid} → new pid=${pid}`,
      );
    }
  }

  writeFileSync(
    H0X_LOCK_PATH,
    JSON.stringify({ pid, scenario, startedAt }, null, 2),
    "utf8",
  );
}

/**
 * @param {{ pid?: number }} [opts]
 */
export async function releaseH0xLock(opts = {}) {
  const pid = opts.pid ?? process.pid;
  if (!existsSync(H0X_LOCK_PATH)) return;
  try {
    const existing = JSON.parse(readFileSync(H0X_LOCK_PATH, "utf8"));
    if (existing && Number(existing.pid) !== pid) return;
  } catch {
    /* best-effort */
  }
  try {
    unlinkSync(H0X_LOCK_PATH);
  } catch {
    /* ignore */
  }
}
