/**
 * PAYROLL F1 — extraCosts union-by-id + per-item LWW.
 * Decouples cost merge from WeekEmployee.dataUpdatedAt (hours clock).
 *
 * GAP-2 DELETE: soft-delete via `deletedAt` tombstone on the cost row.
 * Same-id resurrection from a stale live copy is blocked (tombstone wins).
 * UI creates new costs with new UUIDs — same-id re-add is not a product path.
 */

import type { EmployeeExtraCost } from "@/app/app-domain";

function parseCostTs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function asCostList(raw: unknown): EmployeeExtraCost[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is EmployeeExtraCost =>
      !!c && typeof c === "object" && typeof (c as EmployeeExtraCost).id === "string" && !!(c as EmployeeExtraCost).id,
  );
}

function cloneCost(c: EmployeeExtraCost): EmployeeExtraCost {
  return { ...c };
}

export function isExtraCostDeleted(c: EmployeeExtraCost | null | undefined): boolean {
  return typeof c?.deletedAt === "string" && c.deletedAt.length > 0;
}

/** Live (non-tombstoned) costs for UI / display. */
export function visibleExtraCosts(raw: unknown): EmployeeExtraCost[] {
  return asCostList(raw).filter((c) => !isExtraCostDeleted(c));
}

/** Prefer submittedAt as weak legacy clock when updatedAt is absent. */
function costClock(c: EmployeeExtraCost): number {
  const u = parseCostTs(c.updatedAt);
  if (u > 0) return u;
  return parseCostTs(c.submittedAt);
}

function deleteClock(c: EmployeeExtraCost): number {
  const d = parseCostTs(c.deletedAt);
  if (d > 0) return d;
  return costClock(c);
}

function hasExplicitClock(c: EmployeeExtraCost): boolean {
  return parseCostTs(c.updatedAt) > 0;
}

/** Prefer non-empty amount/description so legacy JSON lexicography cannot wipe filled fields. */
function costRichness(c: EmployeeExtraCost): number {
  let n = 0;
  if (String(c.amount ?? "").trim()) n += 4;
  if (String(c.description ?? "").trim()) n += 2;
  if (c.status) n += 1;
  if (c.receiptUrl) n += 1;
  return n;
}

/**
 * Pick winner for the same cost id.
 * Tombstone (`deletedAt`) blocks resurrection from a live peer copy.
 * - both deleted → newer deletedAt / clock wins
 * - one deleted → deleted wins (same-id re-add blocked)
 * - both live → updatedAt LWW / legacy fallback (F1)
 */
export function pickExtraCostByLww(a: EmployeeExtraCost, b: EmployeeExtraCost): EmployeeExtraCost {
  const aDel = isExtraCostDeleted(a);
  const bDel = isExtraCostDeleted(b);
  if (aDel && bDel) {
    const aAt = deleteClock(a);
    const bAt = deleteClock(b);
    if (aAt > bAt) return cloneCost(a);
    if (bAt > aAt) return cloneCost(b);
    return cloneCost(a);
  }
  if (aDel && !bDel) return cloneCost(a);
  if (bDel && !aDel) return cloneCost(b);

  const aExp = hasExplicitClock(a);
  const bExp = hasExplicitClock(b);
  if (aExp && bExp) {
    const aAt = costClock(a);
    const bAt = costClock(b);
    if (aAt > bAt) return cloneCost(a);
    if (bAt > aAt) return cloneCost(b);
    return cloneCost(a);
  }
  if (aExp && !bExp) return cloneCost(a);
  if (bExp && !aExp) return cloneCost(b);

  const aWeak = costClock(a);
  const bWeak = costClock(b);
  if (aWeak > bWeak) return cloneCost(a);
  if (bWeak > aWeak) return cloneCost(b);
  const aRich = costRichness(a);
  const bRich = costRichness(b);
  if (aRich > bRich) return cloneCost(a);
  if (bRich > aRich) return cloneCost(b);
  return cloneCost(a);
}

/**
 * Union local+cloud extraCosts by id; LWW per item (incl. delete tombstones).
 * Empty side never wipes the other side.
 */
export function mergeExtraCostsById(local: unknown, cloud: unknown): EmployeeExtraCost[] {
  const l = asCostList(local);
  const c = asCostList(cloud);
  if (l.length === 0 && c.length === 0) return [];
  if (l.length === 0) return c.map(cloneCost);
  if (c.length === 0) return l.map(cloneCost);

  const map = new Map<string, EmployeeExtraCost>();
  const order: string[] = [];
  const touch = (id: string) => {
    if (!order.includes(id)) order.push(id);
  };

  for (const item of c) {
    touch(item.id);
    map.set(item.id, cloneCost(item));
  }
  for (const item of l) {
    touch(item.id);
    const prev = map.get(item.id);
    map.set(item.id, prev ? pickExtraCostByLww(item, prev) : cloneCost(item));
  }

  return order.map((id) => map.get(id)!).filter(Boolean);
}

function costPayloadEqual(a: EmployeeExtraCost, b: EmployeeExtraCost): boolean {
  const strip = (x: EmployeeExtraCost) => {
    const { updatedAt: _u, deletedAt: _d, ...rest } = x;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
    && !!a.deletedAt === !!b.deletedAt;
}

/**
 * Stamp updatedAt on newly added or content-changed costs.
 * IDs present in before but absent from after → soft-delete tombstone (`deletedAt`).
 * Preserves prior tombstones from before.
 */
export function stampExtraCostsOnEdit(
  before: EmployeeExtraCost[] | undefined | null,
  after: EmployeeExtraCost[] | undefined | null,
  nowIso: string,
): EmployeeExtraCost[] {
  const beforeList = asCostList(before);
  const afterList = asCostList(after);
  const beforeById = new Map(beforeList.map((c) => [c.id, c]));
  const afterIds = new Set(afterList.map((c) => c.id));

  const stampedLive = afterList.map((c) => {
    const prev = beforeById.get(c.id);
    if (!prev) {
      return { ...c, updatedAt: c.updatedAt && parseCostTs(c.updatedAt) > 0 ? c.updatedAt : nowIso };
    }
    // Re-introducing a previously tombstoned id without clearing delete — keep tombstone.
    if (isExtraCostDeleted(prev) && !isExtraCostDeleted(c)) {
      return cloneCost(prev);
    }
    if (!costPayloadEqual(prev, c)) {
      return { ...c, updatedAt: nowIso };
    }
    if (prev.updatedAt) return { ...c, updatedAt: prev.updatedAt };
    if (c.updatedAt) return c;
    return { ...c };
  });

  const tombs: EmployeeExtraCost[] = [];
  for (const prev of beforeList) {
    if (afterIds.has(prev.id)) continue;
    if (isExtraCostDeleted(prev)) {
      tombs.push(cloneCost(prev));
    } else {
      tombs.push({
        ...prev,
        deletedAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  return [...stampedLive, ...tombs];
}
