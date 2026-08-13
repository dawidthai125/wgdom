/**
 * OWNER-INPUT Bid — deterministic unit normalize / compatibility.
 * ZERO invent conversion (m3↛szt, szt↛dzień).
 */

const ALIAS: Readonly<Record<string, string>> = {
  dzień: "day",
  dni: "day",
  d: "day",
  day: "day",
  h: "h",
  godz: "h",
  godzina: "h",
  godzin: "h",
  m3: "m3",
  "m³": "m3",
};

/** Trim · lowercase · collapse spaces · map obvious aliases only. */
export function normalizeOwnerRateUnit(unit: string | null | undefined): string {
  const raw = String(unit ?? "")
    .trim()
    .toLowerCase()
    .replace(/³/g, "3")
    .replace(/\s+/g, "");
  if (!raw) return "";
  return ALIAS[raw] ?? raw;
}

export function areOwnerRateUnitsCompatible(
  lineUnit: string | null | undefined,
  answerUnit: string | null | undefined,
): boolean {
  const a = normalizeOwnerRateUnit(lineUnit);
  const b = normalizeOwnerRateUnit(answerUnit);
  if (!a || !b) return false;
  return a === b;
}
