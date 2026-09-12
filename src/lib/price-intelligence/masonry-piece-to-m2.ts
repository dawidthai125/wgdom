/**
 * Explicit masonry piece → m² conversion from PDP dimensions.
 * ZERO invent: requires height+length evidence AND required wall thickness match.
 */

import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";

export type MasonryPieceToM2Conversion = {
  heightM: number;
  lengthM: number;
  thicknessM: number;
  faceAreaM2: number;
  piecesPerM2: number;
  priceNetPerM2: number;
  priceBasis: "piece_to_m2_explicit_face_dims";
  evidenceSnippet: string;
  invent: false;
};

function parseDimToMeters(raw: string, unitHint: "mm" | "cm" | null): number | null {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unitHint === "mm") return n / 1000;
  if (unitHint === "cm") return n / 100;
  // bare numbers in brick titles are usually mm when ≥40
  if (n >= 40) return n / 1000;
  if (n <= 40) return n / 100;
  return null;
}

/**
 * Extract H×L×thickness from title/HTML when thickness matches requiredCm.
 * Face for wall m² = height × length (not thickness).
 */
export function tryConvertMasonryPiecePriceToM2(input: {
  productName: string;
  html?: string | null;
  priceGrossPln: number;
  requiredThicknessCm: number;
}): MasonryPieceToM2Conversion | null {
  const hay = `${input.productName}\n${input.html || ""}`;
  const requiredM = input.requiredThicknessCm / 100;
  if (!(requiredM > 0) || !(input.priceGrossPln > 0)) return null;

  // Prefer explicit table dims: Wysokość / Szerokość / Głębokość
  const hCm = hay.match(/Wysoko[sś][cć]\s*[|:]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  const wCm = hay.match(/Szeroko[sś][cć]\s*[|:]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  const dCm = hay.match(/G[lł][eę]boko[sś][cć]\s*[|:]\s*(\d+(?:[.,]\d+)?)\s*cm/i);

  let heightM: number | null = null;
  let lengthM: number | null = null;
  let thicknessM: number | null = null;
  let snippet = "";

  if (hCm && wCm && dCm) {
    heightM = parseDimToMeters(hCm[1]!, "cm");
    lengthM = parseDimToMeters(wCm[1]!, "cm");
    thicknessM = parseDimToMeters(dCm[1]!, "cm");
    snippet = `H=${hCm[1]}cm W=${wCm[1]}cm D=${dCm[1]}cm`;
  } else {
    // Title pattern: 65x250x120 mm (H×L×thickness) — thickness must equal required
    const trip = hay.match(
      /\b(\d{2,3})\s*[x×]\s*(\d{2,3})\s*[x×]\s*(\d{2,3})\s*(mm|cm)?\b/i,
    );
    if (!trip) return null;
    const unit = (trip[4]?.toLowerCase() as "mm" | "cm" | undefined) || "mm";
    const a = parseDimToMeters(trip[1]!, unit);
    const b = parseDimToMeters(trip[2]!, unit);
    const c = parseDimToMeters(trip[3]!, unit);
    if (a == null || b == null || c == null) return null;
    const dims = [a, b, c];
    const thickIdx = dims.findIndex((d) => Math.abs(d - requiredM) < 0.0015);
    if (thickIdx < 0) return null;
    thicknessM = dims[thickIdx]!;
    const face = dims.filter((_, i) => i !== thickIdx);
    heightM = face[0]!;
    lengthM = face[1]!;
    snippet = trip[0];
  }

  if (heightM == null || lengthM == null || thicknessM == null) return null;
  if (Math.abs(thicknessM - requiredM) > 0.0015) return null;

  const faceAreaM2 = heightM * lengthM;
  if (!(faceAreaM2 > 0.001) || faceAreaM2 > 0.5) return null;
  const piecesPerM2 = 1 / faceAreaM2;
  if (!(piecesPerM2 > 1) || piecesPerM2 > 500) return null;

  return {
    heightM,
    lengthM,
    thicknessM,
    faceAreaM2,
    piecesPerM2,
    priceNetPerM2: roundMarketPricePln(input.priceGrossPln * piecesPerM2),
    priceBasis: "piece_to_m2_explicit_face_dims",
    evidenceSnippet: snippet,
    invent: false,
  };
}
