/**
 * TECHNOLOGY-LINE-BINDING-01 — deterministic CostItemFamily from BOQ line.
 * ZERO fuzzy · ZERO LLM · ZERO invented consumption norms.
 */

import type { OfferBoqLineLike } from "./offer-boq-adapter";

export type CostItemFamily =
  | "painting"
  | "priming"
  | "plaster_internal"
  | "screed_leveling"
  | "electrical_cable_lay"
  | "etics_envelope"
  | "paving_cubes"
  | "product_supply"
  | "demolition"
  | "service_disposal"
  | "measurement"
  | "unknown";

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

function hasAny(text: string, terms: readonly string[]): boolean {
  return terms.some((t) => text.includes(foldPl(t)));
}

const ETICS_TERMS = [
  "etics",
  "ocieplen",
  "styropian",
  "eps",
  "xps",
  "elewacj",
  "termoizol",
  "siatka zbroj",
  "tynk elew",
  "klejenie plyt",
  "klejenie płyt",
] as const;

const PAVING_TERMS = [
  "kostka",
  "bruk",
  "nawierzchn",
  "podsypk",
  "korytow",
  "zageszczar",
  "brukarsk",
] as const;

/**
 * Deterministic CostItemFamily for TECHNOLOGY-LINE-BINDING-01.
 * Order: specific tech packs → labor/service families → product → unknown.
 */
export function classifyCostItemFamily(line: OfferBoqLineLike): CostItemFamily {
  const text = lineText(line);
  const cw = String(line.catalogWorkId || "").trim().toLowerCase();
  const unit = foldPl(line.unit || "");

  if (cw.startsWith("cw.etics.") || hasAny(text, ETICS_TERMS)) {
    return "etics_envelope";
  }
  if (cw.startsWith("cw.paving.") || hasAny(text, PAVING_TERMS)) {
    return "paving_cubes";
  }

  if (unit === "pomiar" || hasAny(text, ["pomiar", "sprawdzenie i", "sprawdzenie obwod"])) {
    return "measurement";
  }
  if (hasAny(text, ["kontener", "wywoz", "utylizac", "utylizacja", "gruz mieszany"])) {
    return "service_disposal";
  }
  if (hasAny(text, ["wykucie", "rozebranie", "rozbiorka", "demontaz", "skucie"])) {
    return "demolition";
  }

  // Painting BEFORE generic "farb" product — malowanie is work, not material.
  if (
    hasAny(text, [
      "malowanie",
      "dwukrotne malowanie",
      "malowaniami",
      "farbami emulsyjnymi",
      "farbami lateksowymi",
    ])
  ) {
    return "painting";
  }
  if (hasAny(text, ["gruntowanie", "gruntowanie podloz", "gruntowanie podłoż"])) {
    return "priming";
  }
  if (hasAny(text, ["tynki wewnetrzne", "tynki wewnętrzne", "tynkowanie wewnetrz"])) {
    return "plaster_internal";
  }
  if (hasAny(text, ["warstwy wyrownawcze", "warstwy wyrównawcze", "wylewka"])) {
    return "screed_leveling";
  }
  if (
    hasAny(text, ["ulozenie przewodu", "ułożenie przewodu", "przewody kabelkowe", "ydy", "ydyzo"])
  ) {
    return "electrical_cable_lay";
  }

  if (
    hasAny(text, [
      "skrzydla drzwiowe",
      "skrzydło drzwiowe",
      "skrzydlo drzwiowe",
      "umywalka",
      "kompakt wc",
      "puszki instalacyjne",
    ]) &&
    !hasAny(text, ["montaz", "montaż", "wykucie", "malowanie"])
  ) {
    return "product_supply";
  }

  return "unknown";
}
