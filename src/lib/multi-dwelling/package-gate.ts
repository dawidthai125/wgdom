/**
 * MULTI-DWELLING-01 — PackageGate (pure · outer AND over F5_D + document mapping).
 * Does NOT change line-level F5 semantics.
 * Document mapping required only when mode === "multi".
 */

import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import type {
  DwellingCostUnit,
  PackageGateFailReason,
  PackageGateResult,
  TenderPackage,
} from "@/lib/multi-dwelling/types";

function hasImportedBoq(unit: DwellingCostUnit): boolean {
  const lines = unit.offerBoq?.lines;
  return Array.isArray(lines) && lines.length > 0;
}

export type DwellingDocumentMappingResult = {
  ok: boolean;
  mappedCount: number;
  reasonsPl: string[];
  failReasons: PackageGateFailReason[];
};

/**
 * Pure: dwelling has ≥1 Owner-mapped source document (multi mode).
 * documentId === dwellingId is NEVER valid identity.
 */
export function validateDwellingDocumentMapping(
  pkg: TenderPackage,
  unit: DwellingCostUnit,
): DwellingDocumentMappingResult {
  const reasonsPl: string[] = [];
  const failReasons: PackageGateFailReason[] = [];
  const dwellingId = normalizeDwellingId(unit.dwellingId);
  const map = pkg.documentToDwelling ?? {};
  const sources = (unit.sourceDocumentIds ?? [])
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  if (sources.length === 0) {
    failReasons.push("DOCUMENT_MAPPING_MISSING");
    reasonsPl.push(
      `Dwelling ${dwellingId}: brak sourceDocumentIds — document mapping REQUIRED (MISSING ≠ 0 PLN).`,
    );
    return { ok: false, mappedCount: 0, reasonsPl, failReasons };
  }

  let mappedCount = 0;
  for (const documentId of sources) {
    if (documentId === dwellingId) {
      failReasons.push("DOCUMENT_MAPPING_INVALID_IDENTITY");
      reasonsPl.push(
        `Dwelling ${dwellingId}: documentId === dwellingId jest zabronione (nie identity).`,
      );
      continue;
    }
    const target = map[documentId];
    if (target == null || !String(target).trim()) {
      failReasons.push("DOCUMENT_MAPPING_UNKNOWN");
      reasonsPl.push(
        `Dwelling ${dwellingId}: documentId "${documentId}" brak w documentToDwelling.`,
      );
      continue;
    }
    if (normalizeDwellingId(target) !== dwellingId) {
      failReasons.push("DOCUMENT_MAPPING_MISMATCH");
      reasonsPl.push(
        `Dwelling ${dwellingId}: document "${documentId}" mapuje na ${normalizeDwellingId(target)}, nie na ten dwelling.`,
      );
      continue;
    }
    mappedCount += 1;
  }

  if (mappedCount < 1) {
    if (!failReasons.includes("DOCUMENT_MAPPING_MISSING")) {
      failReasons.push("DOCUMENT_MAPPING_MISSING");
    }
    reasonsPl.push(
      `Dwelling ${dwellingId}: mappedSourceDocumentIds < 1 — Package BLOCKED.`,
    );
    return { ok: false, mappedCount: 0, reasonsPl, failReasons: [...new Set(failReasons)] };
  }

  return {
    ok: failReasons.length === 0,
    mappedCount,
    reasonsPl,
    failReasons: [...new Set(failReasons)],
  };
}

/** True when dwelling has ≥1 valid Owner document mapping (for attach guard). */
export function dwellingHasValidDocumentMapping(
  pkg: TenderPackage,
  unit: DwellingCostUnit,
): boolean {
  return validateDwellingDocumentMapping(pkg, unit).ok;
}

function collectPackageDocumentMappingFailures(
  pkg: TenderPackage,
): { reasonsPl: string[]; failReasons: PackageGateFailReason[] } {
  const reasonsPl: string[] = [];
  const failReasons: PackageGateFailReason[] = [];
  const dwellings = pkg.dwellings ?? [];
  const knownDwellingIds = new Set(
    dwellings.map((d) => normalizeDwellingId(d.dwellingId)),
  );
  const map = pkg.documentToDwelling ?? {};

  for (const [documentId, rawTarget] of Object.entries(map)) {
    const doc = String(documentId ?? "").trim();
    const target = normalizeDwellingId(rawTarget);
    if (!doc) continue;
    if (doc === target) {
      failReasons.push("DOCUMENT_MAPPING_INVALID_IDENTITY");
      reasonsPl.push(
        `documentToDwelling: "${doc}" === dwellingId — zabronione jako identity.`,
      );
    }
    if (!knownDwellingIds.has(target)) {
      failReasons.push("DOCUMENT_MAPPING_ORPHAN_TARGET");
      reasonsPl.push(
        `documentToDwelling["${doc}"] → "${target}" (dwelling nie istnieje).`,
      );
    }
  }

  // Same documentId listed on two dwellings' sourceDocumentIds
  const ownerByDoc = new Map<string, string>();
  for (const d of dwellings) {
    const did = normalizeDwellingId(d.dwellingId);
    for (const raw of d.sourceDocumentIds ?? []) {
      const doc = String(raw ?? "").trim();
      if (!doc) continue;
      const prev = ownerByDoc.get(doc);
      if (prev && prev !== did) {
        failReasons.push("DOCUMENT_MAPPING_DUPLICATE");
        reasonsPl.push(
          `documentId "${doc}" w sourceDocumentIds dwelling ${prev} i ${did}.`,
        );
      } else {
        ownerByDoc.set(doc, did);
      }
    }
  }

  return {
    reasonsPl,
    failReasons: [...new Set(failReasons)],
  };
}

/**
 * PackageGate PASS only when expected dwellings exist, each has:
 * (multi) document mapping + OfferBoq + F5_D.pass
 * Missing mapping / BOQ ≠ 0 PLN — fails gate.
 * legacy_single: document mapping NOT required.
 */
export function evaluatePackageGate(pkg: TenderPackage): PackageGateResult {
  const reasonsPl: string[] = [];
  const failReasons: PackageGateFailReason[] = [];
  const expected = pkg.expectedDwellingCount;
  const requireDocMap = pkg.mode === "multi";

  if (!(expected > 0) || !Number.isFinite(expected) || !Number.isInteger(expected)) {
    failReasons.push("EXPECTED_COUNT_INVALID");
    reasonsPl.push("expectedDwellingCount musi być dodatnią liczbą całkowitą (Owner-confirmed).");
    return {
      pass: false,
      expectedDwellingCount: expected,
      uniqueDwellingCount: 0,
      completeDwellingCount: 0,
      reasonsPl,
      failReasons,
    };
  }

  const dwellings = pkg.dwellings ?? [];
  if (dwellings.length === 0) {
    failReasons.push("NO_DWELLINGS");
    reasonsPl.push("Brak DwellingCostUnit — Package BLOCKED.");
    return {
      pass: false,
      expectedDwellingCount: expected,
      uniqueDwellingCount: 0,
      completeDwellingCount: 0,
      reasonsPl,
      failReasons,
    };
  }

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const d of dwellings) {
    const id = normalizeDwellingId(d.dwellingId);
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  const uniqueDwellingCount = seen.size;

  if (duplicates.size > 0) {
    failReasons.push("DUPLICATE_DWELLING");
    reasonsPl.push(
      `Duplikat dwellingId: ${[...duplicates].join(", ")} — Package BLOCKED.`,
    );
  }

  if (uniqueDwellingCount !== expected) {
    failReasons.push("COUNT_MISMATCH");
    reasonsPl.push(
      `uniqueDwellingCount (${uniqueDwellingCount}) ≠ expectedDwellingCount (${expected}).`,
    );
  }

  if (requireDocMap) {
    const pkgMapFails = collectPackageDocumentMappingFailures(pkg);
    failReasons.push(...pkgMapFails.failReasons);
    reasonsPl.push(...pkgMapFails.reasonsPl);
  }

  let completeDwellingCount = 0;
  for (const d of dwellings) {
    const id = normalizeDwellingId(d.dwellingId);
    if (!id) {
      failReasons.push("MISSING_DWELLING");
      reasonsPl.push("Pusty dwellingId — Package BLOCKED.");
      continue;
    }

    if (requireDocMap) {
      const mapResult = validateDwellingDocumentMapping(pkg, d);
      if (!mapResult.ok) {
        failReasons.push(...mapResult.failReasons);
        reasonsPl.push(...mapResult.reasonsPl);
        // Continue to still report BOQ/F5 gaps, but dwelling is not complete.
      }
    }

    if (!hasImportedBoq(d)) {
      failReasons.push("BOQ_NOT_IMPORTED");
      failReasons.push("EMPTY_REQUIRED_DWELLING");
      reasonsPl.push(
        `Dwelling ${id} (${d.labelPl || "—"}): brak zaimportowanego OfferBoq — MISSING ≠ 0 PLN.`,
      );
      continue;
    }

    if (!d.f5Gate) {
      failReasons.push("F5_FAIL");
      reasonsPl.push(`Dwelling ${id}: brak F5_D (nie oceniono Position Cost).`);
      continue;
    }

    if (!d.f5Gate.pass) {
      failReasons.push("F5_FAIL");
      const gapHint =
        d.f5Gate.equipmentGapCount > 0
          ? `EQUIPMENT GAP×${d.f5Gate.equipmentGapCount}`
          : d.f5Gate.transportGapCount > 0
            ? `TRANSPORT GAP×${d.f5Gate.transportGapCount}`
            : d.f5Gate.reasonsPl[0] ?? "F5 FAIL";
      reasonsPl.push(`Dwelling ${id}: ${gapHint}`);
      continue;
    }

    if (requireDocMap && !validateDwellingDocumentMapping(pkg, d).ok) {
      continue;
    }

    completeDwellingCount += 1;
  }

  if (uniqueDwellingCount < expected && !failReasons.includes("COUNT_MISMATCH")) {
    failReasons.push("MISSING_DWELLING");
    reasonsPl.push(
      `Brakuje mieszkań: expected ${expected}, unique ${uniqueDwellingCount}.`,
    );
  }

  const uniqueFails = [...new Set(failReasons)];
  const pass =
    uniqueFails.length === 0 &&
    uniqueDwellingCount === expected &&
    completeDwellingCount === expected &&
    completeDwellingCount === dwellings.length;

  if (!pass && reasonsPl.length === 0) {
    reasonsPl.push("PACKAGE GATE FAIL.");
  }

  return {
    pass,
    expectedDwellingCount: expected,
    uniqueDwellingCount,
    completeDwellingCount,
    reasonsPl,
    failReasons: uniqueFails,
  };
}
