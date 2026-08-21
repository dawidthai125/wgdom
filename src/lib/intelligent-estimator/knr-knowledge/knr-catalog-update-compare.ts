/**
 * KL-7-P1 — offline compare current KNR vs proposed (NO HTTP · NO auto-VERIFIED).
 * Family KNR ≠ KNR-W — never rewrite.
 */

import { buildKnrNormContentHash } from "./knr-content-hash";
import type { KnrCatalogEntry, KnrNormBundle, KnrNormLine } from "./knr-catalog-entry-types";
import type { KnrCatalogDiffFlags } from "./knr-catalog-history";

export type KnrCatalogCompareStatus = "SAME_HASH" | "DIFF_REVIEW" | "CONFLICT";

export type KnrCatalogCompareResult = {
  status: KnrCatalogCompareStatus;
  currentContentHash: string;
  proposedContentHash: string;
  diffFlags: KnrCatalogDiffFlags;
  reasonsPl: string[];
};

function fold(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function entryHash(entry: KnrCatalogEntry): string {
  const h = String(entry.contentHash ?? "").trim();
  if (h) return h;
  return buildKnrNormContentHash(entry.norms);
}

function normsFingerprint(lines: readonly KnrNormLine[]): string {
  return lines
    .map(
      (l) =>
        `${fold(l.kind)}|${fold(l.code)}|${fold(l.unit)}|${Number(l.quantity)}|${fold(l.description)}`,
    )
    .sort()
    .join(";");
}

function bundleChanged(
  a: KnrNormBundle,
  b: KnrNormBundle,
): { r: boolean; m: boolean; s: boolean } {
  return {
    r: normsFingerprint(a.laborNorms) !== normsFingerprint(b.laborNorms),
    m: normsFingerprint(a.materialNorms) !== normsFingerprint(b.materialNorms),
    s: normsFingerprint(a.equipmentNorms) !== normsFingerprint(b.equipmentNorms),
  };
}

/**
 * Compare current catalog entry vs proposed candidate.
 * CONFLICT on family / identityKey / incompatible evidenceKey / unit empty→nonempty mismatches that break identity.
 */
export function compareKnrCatalogUpdate(
  current: KnrCatalogEntry,
  proposed: KnrCatalogEntry,
): KnrCatalogCompareResult {
  const currentContentHash = entryHash(current);
  const proposedContentHash = entryHash(proposed);
  const reasonsPl: string[] = [];
  const diffFlags: KnrCatalogDiffFlags = {};

  if (currentContentHash === proposedContentHash) {
    return {
      status: "SAME_HASH",
      currentContentHash,
      proposedContentHash,
      diffFlags: {},
      reasonsPl: ["Identyczny contentHash — brak zmian normatywnych."],
    };
  }

  const curFamily = fold(current.identity.family);
  const propFamily = fold(proposed.identity.family);
  if (curFamily && propFamily && curFamily !== propFamily) {
    diffFlags.family = true;
    diffFlags.identity = true;
    reasonsPl.push(
      `Konflikt family: ${current.identity.family ?? "—"} ≠ ${proposed.identity.family ?? "—"} (zakaz KNR↔KNR-W rewrite).`,
    );
  }

  if (fold(current.identityKeyV2) !== fold(proposed.identityKeyV2)) {
    diffFlags.identity = true;
    reasonsPl.push("identityKeyV2 różni się — brak auto-reconcile.");
  }

  // evidenceKey family segment safety: KNR|… vs KNR-W|…
  const curEv = String(current.evidenceKeyV1 ?? "").trim();
  const propEv = String(proposed.evidenceKeyV1 ?? "").trim();
  const curEvFam = fold(curEv.split("|")[0]);
  const propEvFam = fold(propEv.split("|")[0]);
  if (curEvFam && propEvFam && curEvFam !== propEvFam) {
    diffFlags.family = true;
    reasonsPl.push(
      `Konflikt evidenceKey family: ${curEvFam} ≠ ${propEvFam}.`,
    );
  }
  if (curEv && propEv && fold(curEv) !== fold(propEv)) {
    diffFlags.identity = true;
    reasonsPl.push("evidenceKeyV1 różni się.");
  }

  const curUnit = fold(current.unit);
  const propUnit = fold(proposed.unit);
  if (curUnit && propUnit && curUnit !== propUnit) {
    diffFlags.unit = true;
    reasonsPl.push(`Konflikt jednostki: ${current.unit} ≠ ${proposed.unit}.`);
  }

  const nb = bundleChanged(current.norms, proposed.norms);
  if (nb.r) {
    diffFlags.normsR = true;
    reasonsPl.push("Zmiana norm R.");
  }
  if (nb.m) {
    diffFlags.normsM = true;
    reasonsPl.push("Zmiana norm M.");
  }
  if (nb.s) {
    diffFlags.normsS = true;
    reasonsPl.push("Zmiana norm S.");
  }

  if (fold(current.description) !== fold(proposed.description)) {
    reasonsPl.push("Zmiana opisu.");
  }

  const curSrc = fold(current.provenance.sourceIdentifier);
  const propSrc = fold(proposed.provenance.sourceIdentifier);
  if (curSrc !== propSrc) {
    diffFlags.source = true;
    reasonsPl.push("Zmiana źródła (sourceIdentifier).");
  }

  if (
    fold(current.identity.publisher) !== fold(proposed.identity.publisher)
    || fold(current.identity.edition) !== fold(proposed.identity.edition)
  ) {
    diffFlags.identity = true;
    reasonsPl.push("Zmiana publisher/edition.");
  }

  const hardConflict =
    diffFlags.family === true
    || (diffFlags.identity === true
      && fold(current.identityKeyV2) !== fold(proposed.identityKeyV2))
    || (diffFlags.unit === true && !!curUnit && !!propUnit);

  if (hardConflict) {
    return {
      status: "CONFLICT",
      currentContentHash,
      proposedContentHash,
      diffFlags,
      reasonsPl:
        reasonsPl.length > 0 ? reasonsPl : ["Konflikt strukturalny — wymagany Owner review."],
    };
  }

  return {
    status: "DIFF_REVIEW",
    currentContentHash,
    proposedContentHash,
    diffFlags,
    reasonsPl:
      reasonsPl.length > 0 ? reasonsPl : ["Wykryto różnice — przegląd Ownera wymagany."],
  };
}

/** Strip authority — proposed must never carry VERIFIED into review bag. */
export function asNonAuthorityProposedEntry(entry: KnrCatalogEntry): KnrCatalogEntry {
  return {
    ...entry,
    verificationStatus:
      entry.verificationStatus === "VERIFIED" || entry.verificationStatus === "STALE"
        ? "PENDING_VERIFY"
        : entry.verificationStatus,
    verifiedAt: null,
    verifiedBy: null,
    lifecycleState: "ACTIVE",
  };
}
