/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — qualification + mediana.
 * Pure · ZERO HTTP · labor-only · unit match · region preference.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkRateSourceId } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import type { WorkRateParsedOffer } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import {
  WORK_RATE_REGION_FALLBACK_CHAIN,
  type WorkRateRegionScope,
} from "@/lib/work-catalog/work-rate-types";

export type WorkRateQualifyRejectReason =
  | "invalid_rate"
  | "currency_not_pln"
  | "unit_mismatch"
  | "not_labor_only"
  | "includes_material"
  | "promo_excluded"
  | "package_excluded"
  | "minimum_excluded"
  | "price_kind_unknown"
  | "identity_mismatch"
  | "missing_timestamp"
  | "region_missing";

export type WorkRateQualifiedObservation = {
  sourceId: WorkRateSourceId;
  workNamePl: string;
  /** Market-base PLN (point or range midpoint) — NOT OUR RATE. */
  ratePln: number;
  unit: WgdomCostUnit;
  regionScope: WorkRateRegionScope;
  laborOnly: true;
  sourceUrl: string;
  observedAt: string;
  netGross: "netto" | "brutto" | "unknown";
  sourceMinPln?: number | null;
  sourceMaxPln?: number | null;
  marketBaseKind?: "point" | "range_midpoint";
};

export type QualifyWorkRateObservationResult =
  | { ok: true; observation: WorkRateQualifiedObservation }
  | { ok: false; reason: WorkRateQualifyRejectReason; messagePl: string };

/** Normalizacja etykiet jednostek PL / EN do porównania. */
export function normalizeWorkRateUnitToken(raw: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/zł\/?/g, "")
    .replace(/pln\/?/g, "")
    .replace(/\./g, "");
  if (s === "m2" || s === "m²" || s === "m^2" || s === "sqm") return "m2";
  if (s === "mb" || s === "m.b" || s === "mbiezący" || s === "mbieżacy") return "mb";
  if (s === "szt" || s === "sztuka" || s === "pcs" || s === "pc") return "szt";
  if (s === "kpl" || s === "komplet" || s === "set") return "kpl";
  if (s === "h" || s === "godz" || s === "rbh" || s === "roboczogodzina") return "h";
  if (s === "kg") return "kg";
  if (s === "m3" || s === "m³") return "m3";
  if (s === "prob" || s === "prób" || s === "prób.") return "prob";
  if (s === "pomiar") return "pomiar";
  return s;
}

export function workRateUnitsCompatible(
  expected: WgdomCostUnit,
  observedUnitRaw: string,
): boolean {
  const a = normalizeWorkRateUnitToken(expected);
  const b = normalizeWorkRateUnitToken(observedUnitRaw);
  if (!a || !b) return false;
  return a === b;
}

/**
 * Kwalifikacja jednej obserwacji rynkowej pod OUR RATE (labor-only).
 * Nie inventuj wartości — REJECT gdy nieporównywalne.
 */
export function qualifyWorkRateObservation(input: {
  offer: WorkRateParsedOffer;
  expectedWorkId: string;
  expectedUnit: WgdomCostUnit;
  /** Opcjonalnie: tokeny nazwy do luźnego match (już w identityMatched). */
}): QualifyWorkRateObservationResult {
  const { offer, expectedUnit } = input;
  const rate = Number(offer.ratePln);
  if (!Number.isFinite(rate) || !(rate > 0)) {
    return { ok: false, reason: "invalid_rate", messagePl: "Stawka musi być > 0." };
  }
  if (offer.currency !== "PLN") {
    return { ok: false, reason: "currency_not_pln", messagePl: "Waluta ≠ PLN." };
  }
  if (!String(offer.observedAt || "").trim()) {
    return { ok: false, reason: "missing_timestamp", messagePl: "Brak timestamp." };
  }
  if (!offer.identityMatched) {
    return {
      ok: false,
      reason: "identity_mismatch",
      messagePl: "Nazwa/zakres nie pasuje do roboty.",
    };
  }
  if (!workRateUnitsCompatible(expectedUnit, offer.unit)) {
    return {
      ok: false,
      reason: "unit_mismatch",
      messagePl: "Jednostka nieporównywalna — bez przeliczania „na oko”.",
    };
  }
  if (offer.includesMaterial || !offer.laborOnly) {
    return {
      ok: false,
      reason: offer.includesMaterial ? "includes_material" : "not_labor_only",
      messagePl: "Pozycja nie jest labor-only (materiał+robocizna / kompleks).",
    };
  }
  if (offer.priceKind === "promo") {
    return { ok: false, reason: "promo_excluded", messagePl: "Cena promocyjna wykluczona." };
  }
  if (offer.priceKind === "package") {
    return { ok: false, reason: "package_excluded", messagePl: "Cena pakietowa wykluczona." };
  }
  if (offer.priceKind === "minimum") {
    return { ok: false, reason: "minimum_excluded", messagePl: "Cena minimalna wykluczona." };
  }
  if (offer.priceKind !== "regular") {
    return {
      ok: false,
      reason: "price_kind_unknown",
      messagePl: "Brak wiarygodnej ceny regularnej.",
    };
  }
  if (!WORK_RATE_REGION_FALLBACK_CHAIN.includes(offer.regionScope)) {
    return { ok: false, reason: "region_missing", messagePl: "Brak regionu obserwacji." };
  }

  return {
    ok: true,
    observation: {
      sourceId: offer.sourceId,
      workNamePl: offer.workNamePl,
      ratePln: Math.round(rate * 100) / 100,
      unit: expectedUnit,
      regionScope: offer.regionScope,
      laborOnly: true,
      sourceUrl: offer.sourceUrl,
      observedAt: offer.observedAt,
      netGross: offer.netGross,
      sourceMinPln: offer.sourceMinPln ?? null,
      sourceMaxPln: offer.sourceMaxPln ?? null,
      marketBaseKind: offer.marketBaseKind ?? "point",
    },
  };
}

export type WorkRateRepresentativeResult =
  | {
      status: "ok";
      medianPln: number;
      sampleSize: number;
      regionScope: WorkRateRegionScope;
      observations: WorkRateQualifiedObservation[];
      lowSample: boolean;
    }
  | {
      status: "gap";
      medianPln: null;
      sampleSize: 0;
      regionScope: null;
      observations: [];
      reason: "no_qualifying";
    };

function medianOf(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return NaN;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid]!;
  return (sortedAsc[mid - 1]! + sortedAsc[mid]!) / 2;
}

/**
 * Preferuj najdokładniejszy wspólny region (Wrocław → Dolny Śląsk → Polska).
 * W ramach wybranego poziomu: MEDIANA (nie MIN).
 */
export function calculateRepresentativeWorkRate(
  observations: WorkRateQualifiedObservation[],
): WorkRateRepresentativeResult {
  if (!observations.length) {
    return {
      status: "gap",
      medianPln: null,
      sampleSize: 0,
      regionScope: null,
      observations: [],
      reason: "no_qualifying",
    };
  }

  for (const region of WORK_RATE_REGION_FALLBACK_CHAIN) {
    const inRegion = observations.filter((o) => o.regionScope === region);
    if (inRegion.length === 0) continue;
    const rates = inRegion.map((o) => o.ratePln).sort((a, b) => a - b);
    const median = Math.round(medianOf(rates) * 100) / 100;
    return {
      status: "ok",
      medianPln: median,
      sampleSize: inRegion.length,
      regionScope: region,
      observations: inRegion,
      lowSample: inRegion.length < 3,
    };
  }

  // Fallback: wszystkie (różne regiony) — nadal mediana, region = najczęstszy / pierwszy w chain
  const rates = observations.map((o) => o.ratePln).sort((a, b) => a - b);
  const median = Math.round(medianOf(rates) * 100) / 100;
  let bestRegion: WorkRateRegionScope = observations[0]!.regionScope;
  for (const region of WORK_RATE_REGION_FALLBACK_CHAIN) {
    if (observations.some((o) => o.regionScope === region)) {
      bestRegion = region;
      break;
    }
  }
  return {
    status: "ok",
    medianPln: median,
    sampleSize: observations.length,
    regionScope: bestRegion,
    observations,
    lowSample: observations.length < 3,
  };
}

/** MIN nigdy nie jest reprezentantem OUR RATE. */
export function isWorkRateMinForbiddenAsRepresentative(): true {
  return true;
}
