/**
 * PAINTING-SCOPE-HARDEN-01 — eligibility for ECONOMY_INTERIOR_WHITE_PAINT_V1.
 * Precedence: OUT → unit → material → surface → coats.
 * MUST NOT bind solely because family === painting.
 */

import type { OfferBoqLineLike } from "./offer-boq-adapter";
import { resolvePaintCoats } from "./paint-coats";

export type PaintingEconomyV1Eligibility =
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

/** OUT chemistry / joinery / pipes — wins over any positive cue. */
function hasOutCue(text: string): boolean {
  if (/\bolejn/.test(text)) return true;
  if (/\bwapien/.test(text)) return true;
  if (/\brur/.test(text)) return true;
  if (/osciezn/.test(text)) return true;
  if (/\bdrzwi/.test(text)) return true;
  if (/stolark/.test(text)) return true;
  if (/skrzydl/.test(text)) return true;
  if (/\blakier/.test(text)) return true;
  if (/hydrofob/.test(text)) return true;
  if (/sylikat/.test(text)) return true;
  if (/krzemian/.test(text)) return true;
  if (/poliuretan/.test(text)) return true;
  return false;
}

/** Explicit economy white chemistry (emulsja / emulsją / emulsyjnymi / lateks*). */
function hasEconomyPaintMaterial(text: string): boolean {
  // emulsja (ą→a) · emulsyjnymi (…syj…) — stem "emuls"
  return /emuls/.test(text) || /lateks/.test(text);
}

/** „farbą/farbami” without emulsja|lateks → ambiguous chemistry (NO GUESS). */
function hasUntypedPaintChemistry(text: string): boolean {
  if (hasEconomyPaintMaterial(text)) return false;
  return /\bfarb(a|y|ami|e)?\b/.test(text);
}

function hasExplicitInteriorSurface(text: string): boolean {
  if (/scian/.test(text)) return true;
  if (/sufit/.test(text)) return true;
  if (/powierzchni\s+wewnetrzn/.test(text)) return true;
  if (/tynkow\s+wewnetrzn|tynki\s+wewnetrzn|tynkow\s+wewn|tynki\s+wewn/.test(text)) {
    return true;
  }
  return false;
}

/**
 * Wall / ceiling / interior plaster context.
 * After OUT + material: classic BOQ „malowanie farbami emulsyjnymi” (01B) counts as
 * interior emulsion paint class without requiring the word „ścian”.
 */
function hasInteriorPaintSurfaceContext(text: string): boolean {
  if (hasExplicitInteriorSurface(text)) return true;
  // Implicit economy interior emulsion/latex painting (material already gated)
  if (/\bmalowan/.test(text)) return true;
  return false;
}

/**
 * Material / chemistry gate (after OUT + unit).
 * IN: emulsja|lateks, OR untyped interior malowanie without „farbą” guess.
 * OUT: „malowanie … farbą” without emulsja/lateks.
 */
function passesMaterialGate(text: string): boolean {
  if (hasUntypedPaintChemistry(text)) return false;
  if (hasEconomyPaintMaterial(text)) return true;
  // Historical compound / interior surface painting without naming emulsion (priming-01)
  if (/\bmalowan/.test(text) && hasExplicitInteriorSurface(text)) return true;
  return false;
}

/**
 * Resolve whether BOQ/TechUnit source line may use pack.painting.economy_interior_white_v1.
 * Family painting alone is NOT sufficient.
 */
export function resolvePaintingEconomyV1Eligibility(
  line: OfferBoqLineLike,
): PaintingEconomyV1Eligibility {
  const text = lineText(line);
  if (!text) return "unbound";

  // 1. OUT / negative
  if (hasOutCue(text)) return "unbound";

  // 2. Unit — m² only
  if (!isM2Unit(line.unit)) return "unbound";

  // 3. Material
  if (!passesMaterialGate(text)) return "unbound";

  // 4. Surface / context
  if (!hasInteriorPaintSurfaceContext(text)) return "unbound";

  // 5. Coats — resolvePaintCoats SSOT; no defaults
  const coats = resolvePaintCoats(line);
  if (coats !== 1 && coats !== 2) return "parameter_required";

  return "eligible";
}
