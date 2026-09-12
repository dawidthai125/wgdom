/**
 * GO38 — IdentityCandidate fingerprint (immutable after create).
 */

import type { IdentityCandidateEvidenceSnapshot, IdentityCandidateParentContext } from "@/lib/work-catalog/identity-candidate-types";

export type FingerprintInputs = {
  parentContext: IdentityCandidateParentContext;
  intendedPlane: string;
  unit: string;
  technology: string | null;
  scope: string;
  knrEvidence: IdentityCandidateEvidenceSnapshot["knrEvidence"];
  negativeEvidence: IdentityCandidateEvidenceSnapshot["negativeEvidence"];
  semanticDefinition?: string;
};

function norm(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function knrKeys(ev: IdentityCandidateEvidenceSnapshot["knrEvidence"]): string {
  return [...ev.map((k) => `${norm(k.code)}:${norm(k.role)}`)].sort().join(",");
}

function rejectSet(ev: IdentityCandidateEvidenceSnapshot["negativeEvidence"]): string {
  return [...ev.map((n) => `${norm(n.kind)}:${norm(n.detail)}`)].sort().join("|");
}

/**
 * Deterministic fingerprint string — not a CatalogWork.id.
 */
export function computeIdentityCandidateFingerprint(input: FingerprintInputs): string {
  const parent = input.parentContext.parentWorkId ?? "null";
  const parts = [
    `parent:${norm(parent)}`,
    `kind:${norm(input.parentContext.parentKind)}`,
    `plane:${norm(input.intendedPlane)}`,
    `unit:${norm(input.unit)}`,
    `tech:${norm(input.technology)}`,
    `scope:${norm(input.scope)}`,
    `knr:${knrKeys(input.knrEvidence)}`,
    `neg:${rejectSet(input.negativeEvidence)}`,
    `sem:${norm(input.semanticDefinition ?? "")}`,
  ];
  return `fp:ic:${parts.join("|")}`;
}

/** Deterministic candidateId from fingerprint (namespace ic:). */
export function candidateIdFromFingerprint(fingerprint: string): string {
  const safe = fingerprint.replace(/[^a-zA-Z0-9:_|-]/g, "").slice(0, 180);
  return `ic:${safe.length > 3 ? safe : fingerprint.length}`;
}
