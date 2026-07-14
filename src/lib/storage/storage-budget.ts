/**
 * LOCALSTORAGE-ARCH-02 A0 — budget constants + Tier1 sizing helpers.
 */

export const STORAGE_WARNING = Math.floor(1.2 * 1024 * 1024);
export const STORAGE_CRITICAL = Math.floor(1.4 * 1024 * 1024);
export const STORAGE_LIMIT = Math.floor(1.5 * 1024 * 1024);

export type StorageBudgetState = "ok" | "warning" | "critical" | "over";

export function estimateJsonBytes(value: unknown): number {
  try {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (typeof Blob !== "undefined") return new Blob([payload]).size;
    return payload.length * 2;
  } catch {
    return 0;
  }
}

export function measureLocalStorageBytes(): { total: number; perKey: Record<string, number> } {
  const perKey: Record<string, number> = {};
  let total = 0;
  if (typeof localStorage === "undefined") return { total, perKey };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const raw = localStorage.getItem(key) ?? "";
      const bytes = typeof Blob !== "undefined" ? new Blob([raw]).size : raw.length * 2;
      perKey[key] = bytes;
      total += bytes;
    }
  } catch {
    /* ignore */
  }
  return { total, perKey };
}

export function budgetStateForTotal(total: number): StorageBudgetState {
  if (total > STORAGE_LIMIT) return "over";
  if (total > STORAGE_CRITICAL) return "critical";
  if (total > STORAGE_WARNING) return "warning";
  return "ok";
}
