/**
 * TECHNOLOGY-DECOMPOSITION-01 — BOQ line → 1..N TechUnit (Architecture B).
 * Decomposition identifies technologies only — ZERO materials / qtyFactor / prices.
 */

import { classifyCostItemFamily, type CostItemFamily } from "./cost-item-family";
import type { OfferBoqLineLike } from "./offer-boq-adapter";
import { resolvePaintCoats, type PaintCoats } from "./paint-coats";

/** Extended family tokens beyond CostItemFamily (no ACTIVE pack yet → UNBOUND). */
export type TechUnitFamily =
  | CostItemFamily
  | "drywall"
  | "skim_coat"
  | "surface_prep"
  | "masonry"
  | "installation";

export type TechUnitStatus =
  | "BOUND"
  | "UNBOUND"
  | "PARAMETER_REQUIRED"
  | "OWNER_REVIEW";

export type TechUnitRole =
  | "PRIMARY_WORK"
  | "PREPARATION"
  | "FINISH"
  | "MATERIAL_SUPPLY"
  | "INSTALLATION"
  | "DEMOLITION"
  | "DISPOSAL"
  | "MEASUREMENT";

export type LineAggregateStatus =
  | "ATOMIC_BOUND"
  | "ATOMIC_UNBOUND"
  | "ATOMIC_PARAMETER_REQUIRED"
  | "ATOMIC_OWNER_REVIEW"
  | "DECOMPOSED_BOUND"
  | "DECOMPOSED_PARTIAL"
  | "DECOMPOSED_BLOCKED"
  | "UNBOUND"
  | "OWNER_REVIEW"
  | "PARAMETER_REQUIRED";

export interface TechUnitQuantityInput {
  quantity: number;
  unit: string;
}

export interface TechUnitParameters {
  coats?: PaintCoats;
  thicknessMm?: number;
  circuitSpec?: string;
}

export interface TechUnitRecipeBinding {
  packId: string;
  packVersion: string;
}

export interface TechUnit {
  techUnitId: string;
  sourceLineId: string;
  family: TechUnitFamily;
  quantityInput: TechUnitQuantityInput;
  decompositionReason: string;
  status: TechUnitStatus;
  parameters?: TechUnitParameters;
  recipeBinding?: TechUnitRecipeBinding | null;
  role?: TechUnitRole;
}

export interface LineDecompositionResult {
  sourceLineId: string;
  units: TechUnit[];
  lineStatus: LineAggregateStatus;
  decomposed: boolean;
}

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

/** Strip purpose clause so "pod malowanie" does not count as PAINTING (R3). */
function textWithoutPaintPurpose(d: string): string {
  return d
    .replace(/pod\s+malowan[a-z]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDemolition(d: string): boolean {
  return /\b(wykucie|rozebranie|rozbiork|demontaz|skucie|usuniecie|skasowanie|zerwanie)\b/.test(d);
}

function hasDrywall(d: string): boolean {
  return (
    /plyt(a|ami)?\s+gips|gipsowo\s*-?\s*karton|plyta\s*gk|\bgk\b|zabudowa.*(gk|instalacj)|scianki\s+dzialowe\s+gr|obudowa\s+(belek|elementow|slupow|konstrukcji)/.test(
      d,
    ) || /obudowa.*plytami\s+gips/.test(d)
  );
}

function hasSkim(d: string): boolean {
  return /\b(gladz|szpachlowan|poszpachlow)/.test(d);
}

function hasSurfacePrep(d: string): boolean {
  return /przygotowanie\s+powierzchni/.test(d);
}

function hasExplicitPainting(d: string): boolean {
  const t = textWithoutPaintPurpose(d);
  return (
    /\bmalowan/.test(t) ||
    /\bdwukrotne\s+malowan/.test(d) ||
    /\bjednokrotne\s+malowan/.test(d) ||
    /\b2\s*[x×]\s*malowan/.test(d)
  );
}

function hasExplicitPriming(d: string): boolean {
  // „bez gruntowania” = painting-only — not a priming TechUnit (PRIMING-01)
  if (/\bbez\s+gruntowan/.test(d)) return false;
  return /\bgruntowan/.test(d);
}

function hasScreed(d: string): boolean {
  return /warstwy\s+wyrownawcz|wylewk|jastrych|szlicht/.test(d);
}

function hasScreedThicknessAddon(d: string): boolean {
  return /dodatek.*grubosc|zmian[eę]\s+grubosci|za\s+zmiane\s+grubosci|za\s+zmianę\s+grubosci/.test(d);
}

function hasMasonryWork(d: string): boolean {
  return /\b(przymurow|murowan|przebicie\s+otwor)/.test(d);
}

/** Door as supply/install — not adjectival "drzwiowych" on demolition/masonry. */
function hasDoorSupply(d: string): boolean {
  if (hasDemolition(d) && /osciezn|drzwiow/.test(d) && !/\b(montaz|dostawa|skrzydl|komplet\s+drzwi)/.test(d)) {
    return false;
  }
  return (
    /\b(skrzydl(o|a)\s+drzwi|komplet\s+drzwi|montaz\s+drzwi|dostawa\s+drzwi|drzwi\s+wewnetrzne)\b/.test(d) ||
    (/\bmontaz\b/.test(d) && /\bdrzwi\b/.test(d))
  );
}

function hasElectricalCable(d: string): boolean {
  return (
    /ulozenie\s+przewod|ułożenie\s+przewod|wciaganie\s+przewod|przewod(y)?\s+(ydy|ylky)|kabelkowe\s+ydy|\bydy\b|\bydyzo\b/.test(
      d,
    )
  );
}

function hasProductInstallPair(d: string): boolean {
  const product =
    /\b(umywalk|miska\s+ustep|brodzik|wanna|bateri|grzejnik|gniazd(o|a)\s+wtykow|wlacznik|opraw(a|y)\s+oswiet)/.test(
      d,
    );
  const install = /\b(montaz|zaloz|obsadz|wbudow)\b/.test(d);
  return product && install;
}

function extractThicknessMm(d: string): number | undefined {
  const nums: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*mm/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const n = Number(String(m[1]).replace(",", "."));
    if (Number.isFinite(n)) nums.push(n);
  }
  if (nums.length === 0) return undefined;
  // base + addon on same line → sum (Example 3)
  if (nums.length >= 2 && hasScreed(d) && hasScreedThicknessAddon(d)) {
    return Math.round(nums.reduce((a, b) => a + b, 0));
  }
  return Math.round(nums[0]!);
}

function extractCircuitSpec(d: string): string | undefined {
  const m =
    d.match(/\bydy[żz]?o?\s*(\d\s*[x×]\s*\d+(?:[.,]\d+)?\s*mm2?)/i) ||
    d.match(/(\d\s*[x×]\s*\d+(?:[.,]\d+)?\s*mm2?)/i);
  if (!m) return undefined;
  return m[1]!.replace(/\s+/g, "").replace(/×/g, "x").replace(/mm2/i, "mm²");
}

function qtyInput(line: OfferBoqLineLike): TechUnitQuantityInput {
  return {
    quantity: Number(line.quantity) || 0,
    unit: String(line.unit || "").trim(),
  };
}

function makeId(sourceLineId: string, family: string, index: number): string {
  return `tu:${sourceLineId}:${family}:${index}`;
}

/**
 * Map TechUnit family → CostItemFamily used by pack binding.
 * Extended tokens without packs map to `unknown` (UNBOUND path).
 */
export function techUnitFamilyToCostItemFamily(family: TechUnitFamily): CostItemFamily {
  if (
    family === "drywall" ||
    family === "skim_coat" ||
    family === "surface_prep" ||
    family === "masonry" ||
    family === "installation"
  ) {
    return "unknown";
  }
  return family;
}

export function aggregateLineStatus(units: readonly TechUnit[]): LineAggregateStatus {
  if (units.length === 0) return "UNBOUND";
  const statuses = units.map((u) => u.status);
  const bound = statuses.filter((s) => s === "BOUND").length;
  const param = statuses.some((s) => s === "PARAMETER_REQUIRED");
  const review = statuses.some((s) => s === "OWNER_REVIEW");
  const unbound = statuses.some((s) => s === "UNBOUND");

  if (units.length === 1) {
    const s = statuses[0]!;
    if (s === "BOUND") return "ATOMIC_BOUND";
    if (s === "PARAMETER_REQUIRED") return "ATOMIC_PARAMETER_REQUIRED";
    if (s === "OWNER_REVIEW") return "ATOMIC_OWNER_REVIEW";
    return "ATOMIC_UNBOUND";
  }

  if (bound === units.length) return "DECOMPOSED_BOUND";
  if (bound >= 1 && bound < units.length) return "DECOMPOSED_PARTIAL";
  if (param && !review) return "PARAMETER_REQUIRED";
  if (review) return "OWNER_REVIEW";
  if (unbound) return "DECOMPOSED_BLOCKED";
  return "DECOMPOSED_BLOCKED";
}

type DraftUnit = {
  family: TechUnitFamily;
  reason: string;
  role?: TechUnitRole;
  parameters?: TechUnitParameters;
  forceStatus?: TechUnitStatus;
};

/**
 * Decompose one BOQ line into TechUnits (N=1 atomic degeneration).
 * Does NOT bind packs / recipes / materials.
 */
export function decomposeOfferBoqLine(line: OfferBoqLineLike): LineDecompositionResult {
  const sourceLineId = String(line.lineId || "").trim() || "line";
  const d = lineText(line);
  const q = qtyInput(line);
  const drafts: DraftUnit[] = [];

  // --- R5: demolition object ≠ supply ---
  if (hasDemolition(d)) {
    drafts.push({
      family: "demolition",
      reason: "Jawna rozbiórka/wykucie (R5 — obiekt ≠ supply)",
      role: "DEMOLITION",
    });
    const units = finalizeDrafts(sourceLineId, q, drafts, line);
    return {
      sourceLineId,
      units,
      lineStatus: aggregateLineStatus(units),
      decomposed: false,
    };
  }

  // --- Example B: prep under paint (R3/R4) ---
  if (hasSurfacePrep(d) && /pod\s+malowan/.test(d)) {
    drafts.push({
      family: "surface_prep",
      reason: "Przygotowanie powierzchni (R3 — bez auto PAINTING)",
      role: "PREPARATION",
    });
    if (hasSkim(d)) {
      drafts.push({
        family: "skim_coat",
        reason: "Jawne poszpachlowanie/szpachlowanie",
        role: "PREPARATION",
      });
    }
    // Do NOT add painting or primer
    const units = finalizeDrafts(sourceLineId, q, drafts, line);
    return {
      sourceLineId,
      units,
      lineStatus: aggregateLineStatus(units),
      decomposed: units.length > 1,
    };
  }

  // --- Collect explicit technologies (R2) ---
  if (hasDrywall(d)) {
    drafts.push({
      family: "drywall",
      reason: "Jawna obudowa/zabudowa GK / płyty gipsowo-kartonowe",
      role: "PRIMARY_WORK",
    });
  }
  if (hasSkim(d) && !hasSurfacePrep(d)) {
    drafts.push({
      family: "skim_coat",
      reason: "Jawne szpachlowanie/gładź",
      role: "FINISH",
    });
  }
  if (hasExplicitPriming(d)) {
    drafts.push({
      family: "priming",
      reason: "Jawne gruntowanie",
      role: "PREPARATION",
    });
  }
  if (hasExplicitPainting(d)) {
    const coats = resolvePaintCoats(line);
    drafts.push({
      family: "painting",
      reason: "Jawne malowanie (poza klauzulą „pod malowanie”)",
      role: "FINISH",
      parameters: coats != null ? { coats } : undefined,
      forceStatus: coats == null ? "PARAMETER_REQUIRED" : undefined,
    });
  }
  if (hasScreed(d) || (hasScreedThicknessAddon(d) && /\bmm\b/.test(d))) {
    const thicknessMm = extractThicknessMm(d);
    drafts.push({
      family: "screed_leveling",
      reason: hasScreedThicknessAddon(d)
        ? "Wylewka/warstwa wyrównawcza + dodatek grubości = ONE parametric TechUnit (R7)"
        : "Jawna warstwa wyrównawcza/wylewka",
      role: "PRIMARY_WORK",
      parameters: thicknessMm != null ? { thicknessMm } : undefined,
      forceStatus: thicknessMm == null ? "PARAMETER_REQUIRED" : undefined,
    });
  }
  if (hasElectricalCable(d)) {
    const circuitSpec = extractCircuitSpec(d);
    drafts.push({
      family: "electrical_cable_lay",
      reason: "Jawne ułożenie/wciąganie przewodu",
      role: "PRIMARY_WORK",
      parameters: circuitSpec ? { circuitSpec } : undefined,
      forceStatus: circuitSpec ? undefined : "PARAMETER_REQUIRED",
    });
  }
  if (hasMasonryWork(d)) {
    drafts.push({
      family: "masonry",
      reason: "Jawne przymurowanie/murowanie",
      role: "PRIMARY_WORK",
    });
  }
  if (hasDoorSupply(d)) {
    drafts.push({
      family: "product_supply",
      reason: "Jawna dostawa/montaż drzwi (nie sam przymiotnik drzwiowy)",
      role: "MATERIAL_SUPPLY",
    });
  }
  if (hasProductInstallPair(d) && drafts.length === 0) {
    drafts.push({
      family: "product_supply",
      reason: "Jawny produkt w linii montażowej (R6)",
      role: "MATERIAL_SUPPLY",
    });
    drafts.push({
      family: "installation",
      reason: "Jawny montaż/obsadzenie (R6)",
      role: "INSTALLATION",
    });
  }

  // ETICS / paving / measurement / disposal — atomic fallbacks via classic family if nothing matched
  if (drafts.length === 0) {
    const family = classifyCostItemFamily(line);
    if (family === "painting") {
      const coats = resolvePaintCoats(line);
      drafts.push({
        family: "painting",
        reason: "Atomic CostItemFamily=painting (N=1)",
        role: "PRIMARY_WORK",
        parameters: coats != null ? { coats } : undefined,
        forceStatus: coats == null ? "PARAMETER_REQUIRED" : undefined,
      });
    } else if (family !== "unknown") {
      drafts.push({
        family,
        reason: `Atomic CostItemFamily=${family} (N=1, R1)`,
        role:
          family === "demolition"
            ? "DEMOLITION"
            : family === "measurement"
              ? "MEASUREMENT"
              : family === "service_disposal"
                ? "DISPOSAL"
                : family === "product_supply"
                  ? "MATERIAL_SUPPLY"
                  : "PRIMARY_WORK",
      });
    } else {
      drafts.push({
        family: "unknown",
        reason: "Nie rozpoznano bezpiecznej technologii (UNBOUND)",
        forceStatus: "UNBOUND",
      });
    }
  }

  const units = finalizeDrafts(sourceLineId, q, drafts, line);
  return {
    sourceLineId,
    units,
    lineStatus: aggregateLineStatus(units),
    decomposed: units.length > 1,
  };
}

function finalizeDrafts(
  sourceLineId: string,
  q: TechUnitQuantityInput,
  drafts: DraftUnit[],
  line: OfferBoqLineLike,
): TechUnit[] {
  // Dedupe by family (keep first)
  const seen = new Set<string>();
  const unique = drafts.filter((d) => {
    if (seen.has(d.family)) return false;
    seen.add(d.family);
    return true;
  });

  return unique.map((d, i) => {
    const unit: TechUnit = {
      techUnitId: makeId(sourceLineId, d.family, i),
      sourceLineId,
      family: d.family,
      quantityInput: q,
      decompositionReason: d.reason,
      status: d.forceStatus ?? "UNBOUND",
      ...(d.parameters ? { parameters: d.parameters } : {}),
      ...(d.role ? { role: d.role } : {}),
      recipeBinding: null,
    };
    // Painting coats already in parameters; keep PARAMETER_REQUIRED if forced
    if (d.family === "painting" && !d.forceStatus && d.parameters?.coats == null) {
      const coats = resolvePaintCoats(line);
      if (coats != null) {
        unit.parameters = { ...(unit.parameters || {}), coats };
      } else {
        unit.status = "PARAMETER_REQUIRED";
      }
    }
    return unit;
  });
}
