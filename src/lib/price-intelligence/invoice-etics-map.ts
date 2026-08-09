/**
 * PROVIDERS-01 P0/P1 — mapowanie faktur → materialKey.
 * Hierarchy: approved dictionary → P0 deterministic ETICS fallback → review/unmatched.
 * Bez fuzzy / LLM · dictionary przed regex · gładź ≠ mat.render.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { PI31_APPROVED_MATERIALS } from "./etics-approved-seed";
import {
  getInvoiceApprovedMapEntries,
  lookupInvoiceApprovedMap,
  type InvoiceApprovedMapEntry,
} from "./invoice-approved-map";
import {
  applyInvoiceUnitConversion,
  MAPETHERM_SZT_25KG_CONVERSION_ID,
} from "./invoice-unit-conversion";
import type {
  InvoiceMaterialMapping,
  MappedInvoicePurchaseCandidate,
  NormalizedInvoiceProduct,
  ParsedInvoiceLine,
} from "./invoice-types";
import { observationFromParsedLine } from "./invoice-history";
import { normalizeInvoiceProduct } from "./invoice-normalize";

function tfSpec(materialKey: string) {
  return PI31_APPROVED_MATERIALS.find((m) => m.materialKey === materialKey);
}

function mapped(
  materialKey: string,
  purchaseUnitPricePln: number,
  purchaseQuantity: number,
  reasonPl: string,
  purchaseNamePl?: string,
  purchaseUnit?: string,
): InvoiceMaterialMapping {
  const spec = tfSpec(materialKey);
  const namePl = purchaseNamePl ?? spec?.namePl;
  const unit = purchaseUnit ?? spec?.unit;
  if (!namePl || !unit) {
    return { status: "needs_review", reasonPl: `Brak spec TF/dict dla ${materialKey}` };
  }
  return {
    status: "mapped",
    materialKey,
    purchaseNamePl: namePl,
    purchaseUnit: unit,
    purchaseUnitPricePln,
    purchaseQuantity,
    reasonPl,
  };
}

function mappingFromApprovedEntry(
  entry: InvoiceApprovedMapEntry,
  product: NormalizedInvoiceProduct,
  price: number,
  qty: number,
): InvoiceMaterialMapping {
  if (entry.conversionId) {
    const conv = applyInvoiceUnitConversion({
      conversionId: entry.conversionId,
      fromUnit: product.unitKey,
      toUnit: entry.purchaseUnit,
      quantity: qty,
      netUnitPrice: price,
      normalizedName: product.normalizedName,
    });
    if (!conv.ok) {
      return {
        status: "needs_review",
        materialKey: entry.materialKey,
        reasonPl: conv.reasonPl,
      };
    }
    return mapped(
      entry.materialKey,
      conv.netUnitPrice,
      conv.quantity,
      `P1 approved dict + conversion ${entry.conversionId}`,
      entry.purchaseNamePl,
      entry.purchaseUnit,
    );
  }

  if (product.unitKey !== entry.purchaseUnit) {
    return {
      status: "needs_review",
      materialKey: entry.materialKey,
      reasonPl: `Approved dict: jednostka faktury «${product.unitKey}» ≠ purchase «${entry.purchaseUnit}» bez conversion`,
    };
  }

  return mapped(
    entry.materialKey,
    price,
    qty,
    `P1 approved dict · ${entry.provenance}`,
    entry.purchaseNamePl,
    entry.purchaseUnit,
  );
}

/** P0 deterministic ETICS fallback (po dictionary). Bez || true. */
function mapEticsFallback(
  product: NormalizedInvoiceProduct,
  price: number,
  qty: number,
): InvoiceMaterialMapping {
  const name = product.normalizedName;
  const unit = product.unitKey;
  const hits: Array<{ key: string; map: InvoiceMaterialMapping }> = [];

  const isGladz = /\bgladz/.test(name) || /\bgipsow/.test(name);
  if (isGladz) {
    return {
      status: "unmatched",
      reasonPl: "Gładź / gips ≠ mat.render — brak auto-mapowania",
    };
  }

  const isEps =
    /\beps\b/.test(name) &&
    /\bgrafit/.test(name) &&
    (/\bfasad/.test(name) || /0\s*0?33/.test(name) || /\b033\b/.test(name));
  if (isEps) {
    if (unit === "m2") {
      hits.push({
        key: "mat.eps_graph",
        map: mapped("mat.eps_graph", price, qty, "P0 fallback: EPS grafit fasada → mat.eps_graph"),
      });
    } else {
      hits.push({
        key: "mat.eps_graph",
        map: {
          status: "needs_review",
          materialKey: "mat.eps_graph",
          reasonPl: `EPS grafit wykryty, ale jednostka "${unit}" ≠ m2 — NEEDS REVIEW`,
        },
      });
    }
  }

  const isMesh =
    /\bsiatka\b/.test(name) &&
    (/\bpodt/.test(name) || /\brednet\b/.test(name) || /\b165\b/.test(name));
  if (isMesh) {
    if (unit === "m2") {
      hits.push({
        key: "mat.mesh",
        map: mapped("mat.mesh", price, qty, "P0 fallback: siatka podtynkowa/REDNET 165 → mat.mesh"),
      });
    } else {
      hits.push({
        key: "mat.mesh",
        map: {
          status: "needs_review",
          materialKey: "mat.mesh",
          reasonPl: `Siatka wykryta, jednostka "${unit}" ≠ m2 — NEEDS REVIEW`,
        },
      });
    }
  } else if (/\bsiatka\b/.test(name) && !/\bpodt/.test(name) && !/\brednet\b/.test(name)) {
    hits.push({
      key: "mat.mesh?",
      map: {
        status: "needs_review",
        reasonPl: "Ambiguous: «siatka» bez podtynkowa/REDNET/165 — NEEDS REVIEW",
      },
    });
  }

  // Mapetherm — wymaga tokenu mapetherm (nie mapei alone, nie || true)
  if (/\bmapetherm\b/.test(name)) {
    if (unit === "kg") {
      hits.push({
        key: "mat.glue_etics",
        map: mapped("mat.glue_etics", price, qty, "P0 fallback: MAPETHERM → mat.glue_etics (kg)"),
      });
    } else if (unit === "szt") {
      const conv = applyInvoiceUnitConversion({
        conversionId: MAPETHERM_SZT_25KG_CONVERSION_ID,
        fromUnit: "szt",
        toUnit: "kg",
        quantity: qty,
        netUnitPrice: price,
        normalizedName: name,
      });
      if (conv.ok) {
        hits.push({
          key: "mat.glue_etics",
          map: mapped(
            "mat.glue_etics",
            conv.netUnitPrice,
            conv.quantity,
            "P0 fallback: MAPETHERM szt→kg factor 25",
          ),
        });
      } else {
        hits.push({
          key: "mat.glue_etics",
          map: {
            status: "needs_review",
            materialKey: "mat.glue_etics",
            reasonPl: conv.reasonPl,
          },
        });
      }
    } else {
      hits.push({
        key: "mat.glue_etics",
        map: {
          status: "needs_review",
          materialKey: "mat.glue_etics",
          reasonPl: `MAPETHERM wykryty, jednostka "${unit}" bez reguły konwersji — NEEDS REVIEW`,
        },
      });
    }
  }

  const exactRender =
    name === foldPolishText("Tynk mineralny") ||
    name === "tynk mineralny" ||
    (/\btynk\b/.test(name) && /\bmineraln/.test(name));
  if (exactRender && /\btynk\b/.test(name) && /\bmineraln/.test(name)) {
    if (unit === "kg") {
      hits.push({
        key: "mat.render",
        map: mapped("mat.render", price, qty, "P0 fallback: exact tynk mineralny → mat.render"),
      });
    } else {
      hits.push({
        key: "mat.render",
        map: {
          status: "needs_review",
          materialKey: "mat.render",
          reasonPl: `Tynk mineralny, jednostka "${unit}" ≠ kg — NEEDS REVIEW`,
        },
      });
    }
  }

  const mappedHits = hits.filter((h) => h.map.status === "mapped");
  const reviewHits = hits.filter((h) => h.map.status === "needs_review");

  if (mappedHits.length > 1) {
    return {
      status: "needs_review",
      reasonPl: `Ambiguous: wiele reguł (${mappedHits.map((h) => h.key).join(", ")}) — NEEDS REVIEW`,
    };
  }
  if (mappedHits.length === 1) return mappedHits[0]!.map;
  if (reviewHits.length >= 1) return reviewHits[0]!.map;

  return {
    status: "unmatched",
    reasonPl: "Brak zatwierdzonego mapowania ETICS — słownik/UNMATCHED",
  };
}

export interface MapInvoiceProductOpts {
  netUnitPrice: number;
  quantity: number;
  /** Opcjonalny override dict (testy); domyślnie getInvoiceApprovedMapEntries(). */
  approvedEntries?: readonly InvoiceApprovedMapEntry[];
}

/**
 * Hierarchy: 1–3 dictionary → 4 ETICS fallback → 5 review/unmatched.
 */
export function mapInvoiceProductToMaterial(
  product: NormalizedInvoiceProduct,
  opts?: MapInvoiceProductOpts,
): InvoiceMaterialMapping {
  const price = opts?.netUnitPrice ?? 0;
  const qty = opts?.quantity ?? 0;
  const entries = opts?.approvedEntries ?? getInvoiceApprovedMapEntries();

  const approved = lookupInvoiceApprovedMap(product, entries);
  if (approved) {
    return mappingFromApprovedEntry(approved, product, price, qty);
  }

  return mapEticsFallback(product, price, qty);
}

export function buildMappedPurchaseCandidate(
  line: ParsedInvoiceLine,
  approvedEntries?: readonly InvoiceApprovedMapEntry[],
): MappedInvoicePurchaseCandidate {
  const product = normalizeInvoiceProduct(line);
  const observation = observationFromParsedLine(line, product);
  const mapping = mapInvoiceProductToMaterial(product, {
    netUnitPrice: line.netUnitPrice,
    quantity: line.quantity,
    approvedEntries,
  });
  return { observation, product, mapping, parsed: line };
}

export function buildMappedPurchaseCandidates(
  lines: readonly ParsedInvoiceLine[],
  approvedEntries?: readonly InvoiceApprovedMapEntry[],
): MappedInvoicePurchaseCandidate[] {
  return lines.map((line) => buildMappedPurchaseCandidate(line, approvedEntries));
}

/** Allowlista materialKey — fallback ETICS (bez masowego auto). */
export const INVOICE_ETICS_APPROVED_MATERIAL_KEYS = [
  "mat.eps_graph",
  "mat.mesh",
  "mat.glue_etics",
  "mat.render",
] as const;

export type InvoiceEticsApprovedMaterialKey =
  (typeof INVOICE_ETICS_APPROVED_MATERIAL_KEYS)[number];
