/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01 — eligibility for ECONOMY_INTERIOR_PRIMER_V1.
 * eligible | unbound — deterministic tokens only (no fuzzy / LLM / substrate engine).
 */

import type { OfferBoqLineLike } from "./offer-boq-adapter";

export type PrimingEconomyV1Eligibility = "eligible" | "unbound";

function foldPl(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}

function lineText(line: OfferBoqLineLike): string {
  return foldPl(
    `${line.normalizedDescription || ""} ${line.description || ""} ${line.catalogWorkId || ""}`,
  );
}

/**
 * Resolve whether BOQ/TechUnit source line may use pack.priming.economy_interior_v1.
 * UNBOUND for deep primers, hydro, tile adhesive, plaster target, double priming, ambiguous.
 */
export function resolvePrimingEconomyV1Eligibility(
  line: OfferBoqLineLike,
): PrimingEconomyV1Eligibility {
  const text = lineText(line);
  if (!text) return "unbound";

  // Explicit "without priming" is painting-only — not a priming recipe
  if (/\bbez\s+gruntowan/.test(text)) return "unbound";

  if (!/\bgruntowan/.test(text)) return "unbound";

  // --- Mandatory UNBOUND (DF §5) ---
  if (/\bct\s*17\b|\bct17\b|\bceresit\s*ct\b/.test(text)) return "unbound";
  if (/\batlas\s*uni|\buni[\s-]*grunt\b/.test(text)) return "unbound";
  if (/gleboko\s*penetr|penetrujac/.test(text)) return "unbound";
  if (/uszczeln|hydroizol|izolacje\s+przeciwwilg/.test(text)) return "unbound";
  if (/pod\s+klej|kleje\s+cementowe|okladzin/.test(text)) return "unbound";
  if (/zapraw[ay]\s+cementow|gruntowan[^\n]{0,40}keramzyt|keramzyt[^\n]{0,40}gruntowan/.test(text)) {
    return "unbound";
  }
  if (/pod\s+tynk\b/.test(text)) return "unbound";
  if (
    /\bdwukrotn[^\n]{0,30}gruntowan|\bgruntowan[^\n]{0,30}dwukrotn|\b2[\s-]*krotn[^\n]{0,20}grunt/.test(
      text,
    )
  ) {
    return "unbound";
  }

  // --- Positive IN patterns (latex primer / under paint / preparatami) ---
  const positive =
    /gruntowanie\s+podloz/.test(text) ||
    /gruntowanie\s+podloza/.test(text) ||
    /pod\s+malowan/.test(text) ||
    /preparatami/.test(text) ||
    /jednokrotn[^\n]{0,20}gruntowan/.test(text) ||
    /gruntowan[^\n]{0,20}jednokrotn/.test(text) ||
    /reczne\s+gruntowan/.test(text) ||
    /gruntowanie\s+powierzchn/.test(text) ||
    /z\s+jednokrotnym\s+gruntowan/.test(text) ||
    /wraz\s+z\s+gruntowan/.test(text) ||
    /z\s+gruntowan/.test(text);

  if (positive) return "eligible";

  // Ambiguous bare "gruntowanie" without safe class markers
  return "unbound";
}
