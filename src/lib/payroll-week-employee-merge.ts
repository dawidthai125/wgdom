/**
 * SSOT — klucz tożsamości i union listy kw-week-employees (P0 + B6 Edge parity).
 * Importowany przez cloud-sync.ts (klient) i make-server Edge (batch-set / restore).
 */

export type WeekEmployeeMergeIdentity = {
  id?: string;
  directoryId?: string;
  name?: string;
};

export function normalizeWeekEmployeeMergeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Klucz scalania — po directoryId, inaczej dokładne imię (bez mylenia „Tomek od X” z „Tomekiem”). */
export function weekEmployeeMergeKey(emp: WeekEmployeeMergeIdentity): string {
  const dirId = String(emp.directoryId ?? "").trim();
  if (dirId) return `dir:${dirId}`;
  const n = normalizeWeekEmployeeMergeName(String(emp.name ?? ""));
  if (n) return `name:${n}`;
  return `id:${String(emp.id ?? "")}`;
}

export function weekEmployeeMergeKeysFromList(list: unknown[]): Set<string> {
  const keys = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    keys.add(weekEmployeeMergeKey(item as WeekEmployeeMergeIdentity));
  }
  return keys;
}

/** Nowy merge key w next względem prev (B6 — nie surowy UUID). */
export function hasWeekEmployeesRosterExpansion(prev: unknown[], next: unknown[]): boolean {
  const prevKeys = weekEmployeeMergeKeysFromList(prev);
  for (const item of next) {
    if (!item || typeof item !== "object") continue;
    const key = weekEmployeeMergeKey(item as WeekEmployeeMergeIdentity);
    if (key && !prevKeys.has(key)) return true;
  }
  return false;
}

function indexByMergeKey(
  list: unknown[],
  mergeRecord: (a: unknown, b: unknown) => unknown,
): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const key = weekEmployeeMergeKey(item as WeekEmployeeMergeIdentity);
    const prev = map.get(key);
    map.set(key, prev ? mergeRecord(prev, item) : item);
  }
  return map;
}

function collapseByMergeKey(list: unknown[], mergeRecord: (a: unknown, b: unknown) => unknown): unknown[] {
  const map = new Map<string, unknown>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const key = weekEmployeeMergeKey(item as WeekEmployeeMergeIdentity);
    const prev = map.get(key);
    map.set(key, prev ? mergeRecord(prev, item) : item);
  }
  return [...map.values()];
}

/**
 * Union listy rosteru po weekEmployeeMergeKey — wspólny kernel klient + Edge.
 * Per klucz: oba → mergeRecord; tylko jedna strona → ten rekord.
 */
export function mergeWeekEmployeesList(
  local: unknown[],
  cloud: unknown[],
  mergeRecord: (a: unknown, b: unknown) => unknown,
): unknown[] {
  const localArr = Array.isArray(local) ? local : [];
  const cloudArr = Array.isArray(cloud) ? cloud : [];
  if (localArr.length === 0) {
    return collapseByMergeKey(cloudArr, mergeRecord);
  }

  const localByKey = indexByMergeKey(localArr, mergeRecord);
  const cloudByKey = indexByMergeKey(cloudArr, mergeRecord);
  const allKeys = new Set([...localByKey.keys(), ...cloudByKey.keys()]);
  const merged: unknown[] = [];
  for (const key of allKeys) {
    const l = localByKey.get(key);
    const c = cloudByKey.get(key);
    if (l && c) merged.push(mergeRecord(l, c));
    else if (l) merged.push(l);
    else if (c) merged.push(c);
  }
  return collapseByMergeKey(merged, mergeRecord);
}
