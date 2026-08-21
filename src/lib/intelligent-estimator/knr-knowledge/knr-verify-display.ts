/**
 * IK-KNR KL-6 — Owner VERIFY display model (norms only · never PLN authority).
 */

import type { KnrCatalogEntry, KnrNormLine } from "./knr-catalog-entry-types";

const PLN_DENY = [
  "kj",
  "cj",
  "ce",
  "cw",
  "wn",
  "ourRatePln",
  "unitPrice",
  "marketQuotes",
] as const;

export type KnrVerifyNormRow = {
  kind: "R" | "M" | "S";
  code: string;
  description: string;
  unit: string;
  quantity: number;
};

export type KnrVerifyCandidateViewModel = {
  displayCode: string;
  originalSourceCode: string;
  description: string;
  unit: string;
  identityKeyV2: string;
  evidenceKeyV1: string;
  publisher: string;
  edition: string;
  chapter: string;
  table: string;
  column: string;
  verificationStatus: string;
  validationState: string;
  legalOriginId: string;
  licenceId: string;
  parserVersion: string;
  sourceProgram: string;
  sourceFilename: string;
  evidenceRefId: string;
  evidenceContentHash: string;
  contentHash: string;
  laborNorms: KnrVerifyNormRow[];
  materialNorms: KnrVerifyNormRow[];
  equipmentNorms: KnrVerifyNormRow[];
  plnAuthorityFields: readonly string[];
};

function mapLines(kind: "R" | "M" | "S", lines: KnrNormLine[]): KnrVerifyNormRow[] {
  return lines.map((line) => ({
    kind,
    code: line.code,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
  }));
}

export function listForbiddenPlnKeysOnCandidate(candidate: KnrCatalogEntry): string[] {
  const raw = candidate as unknown as Record<string, unknown>;
  return PLN_DENY.filter((key) => Object.prototype.hasOwnProperty.call(raw, key));
}

export function buildKnrVerifyCandidateViewModel(
  candidate: KnrCatalogEntry,
  evidenceContentHash?: string | null,
): KnrVerifyCandidateViewModel {
  const identity = candidate.identity;
  return {
    displayCode: candidate.displayCode,
    originalSourceCode: candidate.originalSourceCode,
    description: candidate.description,
    unit: candidate.unit,
    identityKeyV2: candidate.identityKeyV2,
    evidenceKeyV1: candidate.evidenceKeyV1,
    publisher: identity.publisher ?? "",
    edition: identity.edition ?? "",
    chapter: identity.chapter ?? "",
    table: identity.table ?? "",
    column: identity.column ?? "",
    verificationStatus: candidate.verificationStatus,
    validationState: candidate.validationState,
    legalOriginId: candidate.provenance.originId ?? "",
    licenceId: candidate.provenance.licenceId ?? "",
    parserVersion: candidate.provenance.parserVersion,
    sourceProgram: candidate.provenance.sourceProgram ?? "",
    sourceFilename: candidate.provenance.rawEvidenceRef?.sourceFilename ?? "",
    evidenceRefId: candidate.provenance.rawEvidenceRef?.refId ?? "",
    evidenceContentHash: evidenceContentHash ?? candidate.provenance.contentHash,
    contentHash: candidate.contentHash,
    laborNorms: mapLines("R", candidate.norms.laborNorms),
    materialNorms: mapLines("M", candidate.norms.materialNorms),
    equipmentNorms: mapLines("S", candidate.norms.equipmentNorms),
    plnAuthorityFields: listForbiddenPlnKeysOnCandidate(candidate),
  };
}
