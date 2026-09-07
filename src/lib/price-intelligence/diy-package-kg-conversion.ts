/**
 * Phase C — Legal PACKAGE → kg conversion (Material Research).
 *
 * Fail-closed: incomplete / inferred / cross-URL / multipack / promo →
 * PACKAGE_PRICE_NO_CONVERSION_SSOT.
 *
 * ZERO invent · ZERO auto-Accept · ZERO PM / OUR RATE / margin write.
 */

import { MMR_02_PACKAGE_UNITS } from "./market-material-research-02-config";
import { normalizeResearchUnit } from "./market-material-research-provider";

/** Production runtime marker (Phase C). */
export const IK_PHASE_C_PACKAGE_TO_KG = "PHASE_C_PACKAGE_TO_KG" as const;

export type PackageMassEvidenceKind =
  | "label_explicit"
  | "structured_attr"
  | "title_explicit_confirmed";

export const PACKAGE_PRICE_NO_CONVERSION_SSOT = "PACKAGE_PRICE_NO_CONVERSION_SSOT" as const;

export type PackageToKgEvidenceInput = {
  productIdentityMatched: boolean;
  packagePricePln: number | null;
  packageMassKg: number | null;
  massEvidence: PackageMassEvidenceKind | null;
  sourceUrl: string | null;
  sku: string | null;
  /** Price + mass must originate from the same observation/PDP. */
  sameObservation: boolean;
  priceType?: "regular" | "promo" | "unknown" | null;
  /** Promo / unclear package price. */
  priceAmbiguous?: boolean;
  multipackAmbiguous?: boolean;
  requestUnit: string;
  /** Observed retail unit on PDP (szt/opak/…). */
  observedUnit?: string | null;
};

export type PackageToKgConversionOk = {
  ok: true;
  pricePerKg: number;
  packagePricePln: number;
  packageMassKg: number;
  massEvidence: PackageMassEvidenceKind;
  requestUnit: "kg";
  sourceUrl: string;
  sku: string | null;
  autoAccepted: false;
};

export type PackageToKgConversionFail = {
  ok: false;
  gap: typeof PACKAGE_PRICE_NO_CONVERSION_SSOT;
  autoAccepted: false;
};

export type PackageToKgConversionResult =
  | PackageToKgConversionOk
  | PackageToKgConversionFail;

function fail(): PackageToKgConversionFail {
  return {
    ok: false,
    gap: PACKAGE_PRICE_NO_CONVERSION_SSOT,
    autoAccepted: false,
  };
}

/** Round PLN/kg to 2 decimal places (52.98/20 → 2.65). */
export function roundPricePerKg(packagePricePln: number, packageMassKg: number): number {
  return Math.round((packagePricePln / packageMassKg) * 100) / 100;
}

/**
 * Legal package → kg conversion.
 * ALLOW only when the full evidence tuple is present and unambiguous.
 */
export function tryConvertPackagePriceToKg(
  input: PackageToKgEvidenceInput,
): PackageToKgConversionResult {
  const requestUnit = normalizeResearchUnit(input.requestUnit);
  if (requestUnit !== "kg") return fail();

  if (input.productIdentityMatched !== true) return fail();
  if (input.sameObservation !== true) return fail();
  if (input.multipackAmbiguous === true) return fail();
  if (input.priceAmbiguous === true) return fail();
  if (input.priceType === "promo") return fail();

  const price = input.packagePricePln;
  const mass = input.packageMassKg;
  if (!(typeof price === "number" && Number.isFinite(price) && price > 0)) return fail();
  if (!(typeof mass === "number" && Number.isFinite(mass) && mass > 0)) return fail();
  if (!input.massEvidence) return fail();

  const url = String(input.sourceUrl || "").trim();
  if (!url) return fail();

  const observed = normalizeResearchUnit(input.observedUnit || "");
  if (observed && MMR_02_PACKAGE_UNITS.has(observed) && !input.massEvidence) {
    return fail();
  }

  return {
    ok: true,
    pricePerKg: roundPricePerKg(price, mass),
    packagePricePln: price,
    packageMassKg: mass,
    massEvidence: input.massEvidence,
    requestUnit: "kg",
    sourceUrl: url,
    sku: input.sku ? String(input.sku).trim() || null : null,
    autoAccepted: false,
  };
}

function parseMassNumber(raw: string): number | null {
  const n = Number(String(raw || "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 1000 ? n : null;
}

function hasMultipackAmbiguity(hay: string): boolean {
  return (
    /\b\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*kg\b/i.test(hay)
    || /\b\d+\s*szt\.?\s*[x×]?\s*\d+(?:[.,]\d+)?\s*kg\b/i.test(hay)
    || /\b\d+\s*opak\.?\s*[x×]?\s*\d+(?:[.,]\d+)?\s*kg\b/i.test(hay)
  );
}

export type ExtractPackageMassResult = {
  packageMassKg: number;
  massEvidence: PackageMassEvidenceKind;
  multipackAmbiguous: false;
} | {
  packageMassKg: null;
  massEvidence: null;
  multipackAmbiguous: true;
} | null;

/**
 * Explicit package mass only — no market-typical invent (e.g. “gladź = 20kg”).
 */
export function extractExplicitPackageMassKg(opts: {
  productName: string;
  html: string;
}): ExtractPackageMassResult {
  const productName = String(opts.productName || "");
  const html = String(opts.html || "");
  const hay = `${productName}\n${html}`;

  if (hasMultipackAmbiguity(hay)) {
    return {
      packageMassKg: null,
      massEvidence: null,
      multipackAmbiguous: true,
    };
  }

  // structured_attr — JSON-LD / itemprop weight (kg / KGM)
  const jsonLd =
    html.match(
      /"weight"\s*:\s*\{[^}]*?"value"\s*:\s*"?(\d+(?:[.,]\d+)?)"?[^}]*?"unitCode"\s*:\s*"(?:KGM|kg)"/i,
    )
    || html.match(
      /"weight"\s*:\s*\{[^}]*?"unitCode"\s*:\s*"(?:KGM|kg)"[^}]*?"value"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/i,
    )
    || html.match(
      /itemprop=["']weight["'][^>]*content=["'](\d+(?:[.,]\d+)?)\s*(?:kg)?["']/i,
    )
    || html.match(
      /data-(?:weight|masa|net-?weight)=["'](\d+(?:[.,]\d+)?)\s*(?:kg)?["']/i,
    );
  if (jsonLd?.[1]) {
    const mass = parseMassNumber(jsonLd[1]);
    if (mass != null) {
      return {
        packageMassKg: mass,
        massEvidence: "structured_attr",
        multipackAmbiguous: false,
      };
    }
  }

  // label_explicit — masa/waga netto
  const label = hay.match(
    /(?:masa|waga)\s*netto\s*[:.]?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i,
  );
  if (label?.[1]) {
    const mass = parseMassNumber(label[1]);
    if (mass != null) {
      return {
        packageMassKg: mass,
        massEvidence: "label_explicit",
        multipackAmbiguous: false,
      };
    }
  }

  // title_explicit_confirmed — single N kg in product title (not body invent)
  const titleHits = [...productName.matchAll(/(\d+(?:[.,]\d+)?)\s*kg\b/gi)];
  if (titleHits.length === 1) {
    const mass = parseMassNumber(titleHits[0]![1]!);
    if (mass != null) {
      return {
        packageMassKg: mass,
        massEvidence: "title_explicit_confirmed",
        multipackAmbiguous: false,
      };
    }
  }

  return null;
}

/** True when PDP looks like package retail without safe per-kg SSOT. */
export function looksLikePackageRetailUnit(unit: string | null | undefined): boolean {
  const u = normalizeResearchUnit(unit || "");
  return MMR_02_PACKAGE_UNITS.has(u);
}
