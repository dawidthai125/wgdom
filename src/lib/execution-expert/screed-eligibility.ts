/**
 * ECONOMY_WET_CEMENT_SCREED_V1 — eligibility gate.
 * MUST NOT bind solely because family === screed_leveling.
 */

import type { OfferBoqLineLike } from "./offer-boq-adapter";

/** POSTAR 10 range — locked with ECONOMY_WET_CEMENT_SCREED_V1 pack. */
const THICKNESS_MIN_MM = 10;
const THICKNESS_MAX_MM = 100;

export type WetCementScreedEconomyV1Eligibility =
  | "eligible"
  | "unbound"
  | "parameter_required";

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

function isM2Unit(unit: string | null | undefined): boolean {
  const u = foldPl(String(unit || "")).replace(/²/g, "2");
  return u === "m2" || u === "m^2" || u === "m 2";
}

/** OUT tokens — dry / leveling compound / anhydrite / gypsum / demolition. */
function hasOutProfile(text: string): boolean {
  if (/suchy\s+jastrych|suchego\s+jastrych|jastrych\s+suchy/.test(text)) return true;
  if (/plyta\s+(z\s+)?suchego|plyty\s+suchego\s+jastrych|plyta\s+suchego\s+jastrych/.test(text)) {
    return true;
  }
  if (/podsypka.*(suchego|jastrych)|suchego\s+jastrychu.*podsypka/.test(text)) return true;
  if (/samopoziom|masa\s+szpachlowa\s+samopoziom|masa\s+samopoziom/.test(text)) return true;
  if (/\banhydryt/.test(text)) return true;
  if (/jastrych\s+gips|gipsow[ya]\s+jastrych|jastrych[^\n]{0,20}gips/.test(text)) return true;
  if (/podklad\s+podpanel|podklady\s+podpanel/.test(text)) return true;
  if (/\b(skucie|wykucie|rozebranie|demontaz)\b.*posadzk|\bposadzk[^\n]{0,30}\b(skucie|wykucie)/.test(text)) {
    return true;
  }
  return false;
}

/** Wet cement / cement leveling IN tokens (incl. thickness-addon on wet base wording). */
function hasWetCementCue(text: string): boolean {
  if (/zaprawy\s+cementow|zaprawa\s+cementow/.test(text)) return true;
  if (/jastrych\s+cementow|cementow[ya]\s+jastrych/.test(text)) return true;
  if (/wylewk[ai]\s+cementow|cementow[aya]\s+wylewk/.test(text)) return true;
  if (/warstwy\s+wyrownawcz[^\n]{0,80}cementow|warstwa\s+wyrownawcz[^\n]{0,80}cementow/.test(text)) {
    return true;
  }
  // Addon lines typically keep wet cement phrase from base KNR wording
  if (
    /dodatek.*grubosc|zmian[eę]\s+grubosci|za\s+zmiane\s+grubosci/.test(text) &&
    /cementow|warstwy\s+wyrownawcz|wylewk|jastrych/.test(text)
  ) {
    return true;
  }
  return false;
}

/**
 * Resolve whether BOQ/TechUnit may use pack.screed.economy_wet_cement_v1.
 * Family screed_leveling alone is NOT sufficient — wet cement + mm range + m² required.
 */
export function resolveWetCementScreedEconomyV1Eligibility(
  line: OfferBoqLineLike,
  thicknessMm?: number | null,
): WetCementScreedEconomyV1Eligibility {
  const text = lineText(line);
  if (!text) return "unbound";

  if (hasOutProfile(text)) return "unbound";

  if (!hasWetCementCue(text)) return "unbound";

  if (!isM2Unit(line.unit)) return "unbound";

  if (thicknessMm == null || !Number.isFinite(thicknessMm)) {
    return "parameter_required";
  }

  const t = Number(thicknessMm);
  if (t < THICKNESS_MIN_MM || t > THICKNESS_MAX_MM) {
    return "unbound";
  }

  return "eligible";
}
