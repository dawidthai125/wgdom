/**
 * P0 — mapowanie faktur → materialKey (tylko zatwierdzone ETICS).
 * Bez masowego auto-map · gładź ≠ mat.render · ambiguous → NEEDS_REVIEW.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { PI31_APPROVED_MATERIALS } from "./etics-approved-seed";
import type {
  InvoiceMaterialMapping,
  InvoicePriceObservation,
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
): InvoiceMaterialMapping {
  const spec = tfSpec(materialKey);
  if (!spec) {
    return { status: "needs_review", reasonPl: `Brak spec TF dla ${materialKey}` };
  }
  return {
    status: "mapped",
    materialKey,
    purchaseNamePl: spec.namePl,
    purchaseUnit: spec.unit,
    purchaseUnitPricePln,
    purchaseQuantity,
    reasonPl,
  };
}

/**
 * Deterministyczne reguły ETICS (AUDIT PASS).
 * mat.render — tylko exact approved (nazwa TF / jawny tynk mineralny), NIE gładź.
 */
export function mapInvoiceProductToMaterial(
  product: NormalizedInvoiceProduct,
  opts?: { netUnitPrice: number; quantity: number },
): InvoiceMaterialMapping {
  const name = product.normalizedName;
  const unit = product.unitKey;
  const price = opts?.netUnitPrice ?? 0;
  const qty = opts?.quantity ?? 0;

  const hits: Array<{ key: string; map: InvoiceMaterialMapping }> = [];

  // --- EPS grafit fasada 0,033 ---
  const isEps =
    /\beps\b/.test(name) &&
    /\bgrafit/.test(name) &&
    (/\bfasad/.test(name) || /0\s*0?33/.test(name) || /\b033\b/.test(name));
  if (isEps) {
    if (unit === "m2") {
      hits.push({
        key: "mat.eps_graph",
        map: mapped("mat.eps_graph", price, qty, "AUDIT: EPS grafit fasada → mat.eps_graph"),
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

  // --- Siatka podtynkowa 165 / REDNET ---
  const isMesh =
    /\bsiatka\b/.test(name) &&
    (/\bpodt/.test(name) || /\brednet\b/.test(name) || /\b165\b/.test(name));
  if (isMesh) {
    if (unit === "m2") {
      hits.push({
        key: "mat.mesh",
        map: mapped("mat.mesh", price, qty, "AUDIT: siatka podtynkowa/REDNET 165 → mat.mesh"),
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

  // --- MAPEI Mapetherm do siatki ---
  const isMapetherm =
    /\bmapetherm\b/.test(name) || (/\bmapei\b/.test(name) && /\bmapetherm\b/.test(name));
  const mapethermGlue =
    isMapetherm && (/\bsiatk/.test(name) || /\bdo siatki/.test(name) || /\bklej/.test(name) || true);
  // Mapetherm brand on invoice lines for ETICS glue — require mapetherm token
  if (isMapetherm && mapethermGlue) {
    if (unit === "kg") {
      hits.push({
        key: "mat.glue_etics",
        map: mapped("mat.glue_etics", price, qty, "AUDIT: MAPETHERM → mat.glue_etics (kg)"),
      });
    } else if (unit === "szt" && /\b25\b/.test(name) && /\bkg\b/.test(name)) {
      // Worek 25 kg → Purchase kg
      const perKg = Math.round((price / 25) * 100) / 100;
      const qtyKg = Math.round(qty * 25 * 100) / 100;
      hits.push({
        key: "mat.glue_etics",
        map: mapped(
          "mat.glue_etics",
          perKg,
          qtyKg,
          "AUDIT: MAPETHERM 25 kg/szt → mat.glue_etics (konwersja szt→kg)",
        ),
      });
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

  // --- mat.render: TYLKO exact approved ---
  const exactRender =
    name === foldPolishText("Tynk mineralny") ||
    name === "tynk mineralny" ||
    (/\btynk\b/.test(name) && /\bmineraln/.test(name) && !/\bgladz/.test(name) && !/\bgładz/.test(name));
  const isGladz = /\bgladz/.test(name) || /\bgipsow/.test(name);
  if (isGladz) {
    // explicit non-mapping
    return {
      status: "unmatched",
      reasonPl: "Gładź / gips ≠ mat.render — brak auto-mapowania",
    };
  }
  if (exactRender && /\btynk\b/.test(name) && /\bmineraln/.test(name)) {
    if (unit === "kg") {
      hits.push({
        key: "mat.render",
        map: mapped("mat.render", price, qty, "Exact approved: tynk mineralny → mat.render"),
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

export function buildMappedPurchaseCandidate(
  line: ParsedInvoiceLine,
): MappedInvoicePurchaseCandidate {
  const product = normalizeInvoiceProduct(line);
  const observation = observationFromParsedLine(line, product);
  const mapping = mapInvoiceProductToMaterial(product, {
    netUnitPrice: line.netUnitPrice,
    quantity: line.quantity,
  });
  return { observation, product, mapping, parsed: line };
}

export function buildMappedPurchaseCandidates(
  lines: readonly ParsedInvoiceLine[],
): MappedInvoicePurchaseCandidate[] {
  return lines.map(buildMappedPurchaseCandidate);
}

/** Słownik rozszerzalny — P0: tylko klucze ETICS (bez masowego auto). */
export const INVOICE_ETICS_APPROVED_MATERIAL_KEYS = [
  "mat.eps_graph",
  "mat.mesh",
  "mat.glue_etics",
] as const;

export type InvoiceEticsApprovedMaterialKey =
  (typeof INVOICE_ETICS_APPROVED_MATERIAL_KEYS)[number];
