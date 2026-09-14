/**
 * PAYROLL F1 — extraCosts union-by-id + per-item LWW.
 * Decouples cost merge from WeekEmployee.dataUpdatedAt (hours clock).
 *
 * DELETE LIMITATION (no tombstones in this stage):
 * Intentional filter-remove of a cost may resurrect from the other side until
 * a dedicated tombstone protocol exists. Add/update concurrent safety is primary.
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

/** Prefer submittedAt as weak legacy clock when updatedAt is absent. */
function costClock(c: EmployeeExtraCost): number {
  const u = parseCostTs(c.updatedAt);
  if (u > 0) return u;
  return parseCostTs(c.submittedAt);
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
 * - both updatedAt → newer wins
 * - only one updatedAt → that side wins
 * - neither → weak submittedAt, then richer payload, then prefer `a`
 */
export function pickExtraCostByLww(a: EmployeeExtraCost, b: EmployeeExtraCost): EmployeeExtraCost {
  const aExp = hasExplicitClock(a);
  const bExp = hasExplicitClock(b);
  if (aExp && bExp) {
    const aAt = costClock(a);
    const bAt = costClock(b);
    if (aAt > bAt) return cloneCost(a);
    if (bAt > aAt) return cloneCost(b);
    // equal clocks — stable prefer a
    return cloneCost(a);
  }
  if (aExp && !bExp) return cloneCost(a);
  if (bExp && !aExp) return cloneCost(b);

  // Legacy: weak submittedAt, then richer payload (never prefer empty over filled), then `a`
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
 * Union local+cloud extraCosts by id; LWW per item.
 * Empty side never wipes the other side.
 */
export function mergeExtraCostsById(local: unknown, cloud: unknown): EmployeeExtraCost[] {
  const l = asCostList(local);
  const c = asCostList(cloud);
  if (l.length === 0 && c.length === 0) return [];
  if (l.length === 0) return c.map(cloneCost);
  if (c.length === 0) return l.map(cloneCost);

  const map = new Map<string, EmployeeExtraCost>();
  // Deterministic: ingest cloud first, then local (local wins ties via pick)
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
    const { updatedAt: _u, ...rest } = x;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/**
 * Stamp updatedAt on newly added or content-changed costs.
 * Preserves id; does not invent clocks on unchanged legacy rows.
 */
export function stampExtraCostsOnEdit(
  before: EmployeeExtraCost[] | undefined | null,
  after: EmployeeExtraCost[] | undefined | null,
  nowIso: string,
): EmployeeExtraCost[] {
  const beforeList = asCostList(before);
  const afterList = asCostList(after);
  const beforeById = new Map(beforeList.map((c) => [c.id, c]));
  return afterList.map((c) => {
    const prev = beforeById.get(c.id);
    if (!prev) {
      return { ...c, updatedAt: c.updatedAt && parseCostTs(c.updatedAt) > 0 ? c.updatedAt : nowIso };
    }
    if (!costPayloadEqual(prev, c)) {
      return { ...c, updatedAt: nowIso };
    }
    // unchanged — keep previous clock (may be undefined for legacy)
    if (prev.updatedAt) return { ...c, updatedAt: prev.updatedAt };
    if (c.updatedAt) return c;
    return { ...c };
  });
}
