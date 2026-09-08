/**
 * OPTION B — Canonical OfferBoq lineId continuity (Bid ↔ composed/package).
 *
 * Join key for CONNECT remains OfferBoq.lineId (exact).
 * Physical provenance stays on DwellingCostSnapshotLine / provenance side-map.
 * Dwelling ownership stays outside lineId (package + G1 dwellingId).
 *
 * ZERO fuzzy · ZERO LP-only remap · fail-closed on mismatch.
 */

import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import { buildOfferBoqLineId } from "@/lib/tender-offer-boq";

export type OfferBoqLineIdContinuityReason =
  | "OK"
  | "LENGTH_MISMATCH"
  | "LP_MISMATCH"
  | "DESCRIPTION_MISMATCH"
  | "LINE_ID_MISMATCH"
  | "DUPLICATE_LINE_ID_A"
  | "DUPLICATE_LINE_ID_B"
  | "EMPTY_BOTH"
  | "EMPTY_A"
  | "EMPTY_B";

export type OfferBoqLineIdContinuityResult = {
  ok: boolean;
  reasonCodes: OfferBoqLineIdContinuityReason[];
  lengthA: number;
  lengthB: number;
  mismatchIndex: number | null;
  duplicateIdsA: string[];
  duplicateIdsB: string[];
  overlapCount: number;
};

export type OfferBoqLineIdContinuityLine = Pick<
  OfferBoqLine,
  "lineId" | "lp" | "description"
>;

function findDuplicateIds(lines: readonly OfferBoqLineIdContinuityLine[]): string[] {
  const counts = new Map<string, number>();
  for (const l of lines) {
    const id = String(l.lineId ?? "").trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

function canonicalDescription(description: string | null | undefined): string {
  return String(description ?? "").trim();
}

/**
 * Deterministic continuity gate: same length, same sequence of lp + description,
 * and identical lineId at each index. No fuzzy / no reorder heal.
 */
export function evaluateCanonicalOfferBoqLineIdContinuity(
  a: { lines?: readonly OfferBoqLineIdContinuityLine[] | null } | null | undefined,
  b: { lines?: readonly OfferBoqLineIdContinuityLine[] | null } | null | undefined,
): OfferBoqLineIdContinuityResult {
  const linesA = a?.lines ?? [];
  const linesB = b?.lines ?? [];
  const lengthA = linesA.length;
  const lengthB = linesB.length;
  const duplicateIdsA = findDuplicateIds(linesA);
  const duplicateIdsB = findDuplicateIds(linesB);
  const reasonCodes: OfferBoqLineIdContinuityReason[] = [];

  if (lengthA === 0 && lengthB === 0) {
    return {
      ok: false,
      reasonCodes: ["EMPTY_BOTH"],
      lengthA,
      lengthB,
      mismatchIndex: null,
      duplicateIdsA,
      duplicateIdsB,
      overlapCount: 0,
    };
  }
  if (lengthA === 0) {
    return {
      ok: false,
      reasonCodes: ["EMPTY_A"],
      lengthA,
      lengthB,
      mismatchIndex: null,
      duplicateIdsA,
      duplicateIdsB,
      overlapCount: 0,
    };
  }
  if (lengthB === 0) {
    return {
      ok: false,
      reasonCodes: ["EMPTY_B"],
      lengthA,
      lengthB,
      mismatchIndex: null,
      duplicateIdsA,
      duplicateIdsB,
      overlapCount: 0,
    };
  }

  if (duplicateIdsA.length > 0) reasonCodes.push("DUPLICATE_LINE_ID_A");
  if (duplicateIdsB.length > 0) reasonCodes.push("DUPLICATE_LINE_ID_B");

  if (lengthA !== lengthB) {
    reasonCodes.push("LENGTH_MISMATCH");
    return {
      ok: false,
      reasonCodes,
      lengthA,
      lengthB,
      mismatchIndex: null,
      duplicateIdsA,
      duplicateIdsB,
      overlapCount: 0,
    };
  }

  let overlapCount = 0;
  let mismatchIndex: number | null = null;

  for (let i = 0; i < lengthA; i++) {
    const la = linesA[i]!;
    const lb = linesB[i]!;
    const lpA = String(la.lp ?? "");
    const lpB = String(lb.lp ?? "");
    const descA = canonicalDescription(la.description);
    const descB = canonicalDescription(lb.description);
    const idA = String(la.lineId ?? "").trim();
    const idB = String(lb.lineId ?? "").trim();

    if (lpA !== lpB) {
      reasonCodes.push("LP_MISMATCH");
      mismatchIndex = i;
      break;
    }
    if (descA !== descB) {
      reasonCodes.push("DESCRIPTION_MISMATCH");
      mismatchIndex = i;
      break;
    }
    if (!idA || !idB || idA !== idB) {
      reasonCodes.push("LINE_ID_MISMATCH");
      mismatchIndex = i;
      break;
    }
    overlapCount += 1;
  }

  if (reasonCodes.length === 0) {
    reasonCodes.push("OK");
  }

  const ok =
    reasonCodes.length === 1
    && reasonCodes[0] === "OK"
    && overlapCount === lengthA
    && duplicateIdsA.length === 0
    && duplicateIdsB.length === 0;

  return {
    ok,
    reasonCodes: ok ? ["OK"] : reasonCodes.filter((c) => c !== "OK"),
    lengthA,
    lengthB,
    mismatchIndex,
    duplicateIdsA,
    duplicateIdsB,
    overlapCount: ok ? overlapCount : Math.min(overlapCount, lengthA),
  };
}

/**
 * Canonical Option B lineId — same builder as Bid `buildOfferBoqFromSnapshot`.
 * flattenIndex = index in canonical C2 admitted merge / Bid flatten order.
 */
export function buildCanonicalOfferBoqLineId(opts: {
  tenderId: string;
  lp: string;
  description: string;
  flattenIndex: number;
}): string {
  return buildOfferBoqLineId(
    opts.tenderId,
    opts.lp ?? "",
    opts.description ?? "",
    opts.flattenIndex,
  );
}

/** Convenience for full documents. */
export function evaluateOfferBoqDocumentsLineIdContinuity(
  bid: OfferBoqDocument | null | undefined,
  composedOrPackage: OfferBoqDocument | null | undefined,
): OfferBoqLineIdContinuityResult {
  return evaluateCanonicalOfferBoqLineIdContinuity(bid, composedOrPackage);
}
