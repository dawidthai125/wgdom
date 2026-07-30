/**
 * MARKET-SYNC-01 P0 — normalizacja (pure).
 */

import type { ProviderId } from "@/lib/market-sync/types";
import { PROVIDER_IDS } from "@/lib/market-sync/types";

/** Fold PL — lower + bez diakrytyków + collapse whitespace. */
export function foldPl(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEanDigits(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 8 || digits.length === 13) return digits;
  if (digits.length === 0) return null;
  return null;
}

const UNIT_MAP: Record<string, string> = {
  m2: "m2",
  "m²": "m2",
  mb2: "m2",
  "metr kw": "m2",
  "metr kw.": "m2",
  mb: "mb",
  "m.b.": "mb",
  "m.b": "mb",
  m: "mb",
  szt: "szt",
  "szt.": "szt",
  sztuka: "szt",
  kg: "kg",
  l: "l",
  litr: "l",
  kpl: "kpl",
  komplet: "kpl",
};

export type UnitNormalizeResult =
  | { ok: true; unit: string; unitRaw: string }
  | { ok: false; unitRaw: string; reason: "unknown_unit" };

export function normalizeUnit(raw: string | null | undefined): UnitNormalizeResult {
  const unitRaw = String(raw ?? "").trim();
  if (!unitRaw) return { ok: false, unitRaw, reason: "unknown_unit" };
  const key = foldPl(unitRaw).replace(/\s+/g, " ");
  const mapped = UNIT_MAP[key] ?? UNIT_MAP[unitRaw.toLowerCase()];
  if (!mapped) return { ok: false, unitRaw, reason: "unknown_unit" };
  return { ok: true, unit: mapped, unitRaw };
}

export function parseGrossPrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return null;
  s = s.replace(/zł|pln/gi, "");
  if (s.includes(",") && s.includes(".")) {
    // 1.234,56 → 1234.56
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function normalizeCurrency(raw: string | null | undefined): string {
  const c = String(raw ?? "PLN").trim().toUpperCase();
  return c || "PLN";
}

export function parseProviderId(raw: string | null | undefined): ProviderId | null {
  const v = foldPl(String(raw ?? ""));
  if (!v) return null;
  const aliases: Record<string, ProviderId> = {
    leroy: "leroy",
    "leroy merlin": "leroy",
    lm: "leroy",
    castorama: "castorama",
    casto: "castorama",
    obi: "obi",
    bricoman: "bricoman",
    psb: "psb",
    other: "other",
    inny: "other",
  };
  const hit = aliases[v];
  if (hit) return hit;
  if ((PROVIDER_IDS as readonly string[]).includes(v)) return v as ProviderId;
  return null;
}

export function dedupeFolded(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const t = item.trim();
    if (!t) continue;
    const f = foldPl(t);
    if (seen.has(f)) continue;
    seen.add(f);
    out.push(t);
  }
  return out;
}

export function uniqueEans(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const e = normalizeEanDigits(raw);
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}
