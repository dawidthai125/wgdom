/**
 * Stable identity + canonical serialization helpers (C-ID · C-DET · B0-16).
 */

import type { BoqContext } from "./types";

const FORBIDDEN_PRICE_RE =
  /\b(unitPrice|companyPrice|quote|recommendedBid|pricePln|PLN)\b/i;

export function assertNoPriceTokens(value: unknown, path = "root"): void {
  if (value == null) return;
  if (typeof value === "string") {
    if (FORBIDDEN_PRICE_RE.test(value)) {
      throw new Error(`TF-1 forbid price token in string at ${path}: ${value}`);
    }
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoPriceTokens(v, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_PRICE_RE.test(k)) {
        throw new Error(`TF-1 forbid price field key at ${path}.${k}`);
      }
      assertNoPriceTokens(v, `${path}.${k}`);
    }
  }
}

/** Deep-sort object keys for stable JSON (C-DET / B0-16). */
export function canonicalize(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function deepEqualCanonical(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function roundTripEqual(value: unknown): boolean {
  const json = stableStringify(value);
  const parsed = JSON.parse(json) as unknown;
  return deepEqualCanonical(value, parsed);
}

/** FNV-1a 32-bit hex — deterministic, no crypto dependency. */
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function canonicalBoqContextKey(ctx: BoqContext): string {
  const lines = [...(ctx.lines ?? [])]
    .map((l) => ({
      lineKey: String(l.lineKey || ""),
      catalogWorkIdHint: l.catalogWorkIdHint ? String(l.catalogWorkIdHint) : "",
      quantity: Number(l.quantity) || 0,
      unit: l.unit ? String(l.unit) : "",
    }))
    .sort((a, b) => a.lineKey.localeCompare(b.lineKey));
  return stableStringify({ lines });
}

export function composePlanRevision(packId: string, packVersion: string, ctx: BoqContext): string {
  return `rev_${fnv1aHex(`${packId}|${packVersion}|${canonicalBoqContextKey(ctx)}`)}`;
}

export function composePlanId(packId: string, packVersion: string, planRevision: string): string {
  return `plan_${packId}_${packVersion}_${planRevision}`;
}

export function composeBomLineId(
  packId: string,
  packVersion: string,
  role: "mat" | "eq" | "lab",
  key: string,
): string {
  return `bom_${role}_${fnv1aHex(`${packId}|${packVersion}|${role}|${key}`)}`;
}

export function composeBundleId(packId: string, packVersion: string, planRevision: string): string {
  return `bundle_${fnv1aHex(`${packId}|${packVersion}|${planRevision}`)}`;
}

export function composeBomId(packId: string, packVersion: string, planRevision: string): string {
  return `bom_${fnv1aHex(`${packId}|${packVersion}|${planRevision}`)}`;
}

export { FORBIDDEN_PRICE_RE };
