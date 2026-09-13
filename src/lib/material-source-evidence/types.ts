/**
 * Material source evidence — durable MEK mirror (≠ OUR RATE · ≠ invent).
 * DATA_KEY: kw-wgdom-material-source-evidence
 */

export const MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY =
  "kw-wgdom-material-source-evidence" as const;
export const MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION = 1 as const;

export type MaterialSourceEvidenceObservation = {
  evidenceId: string;
  materialKey: string | null;
  materialCategory: string | null;
  kind: string;
  providerId: string | null;
  sourceUrl: string | null;
  validationState: "UNVERIFIED" | "VALIDATED" | "REJECTED" | "STATUS_ONLY";
  provenance: string;
  observedAt: string;
  payload: Record<string, unknown>;
  invent: false;
  priceAsUniversalTruth: false;
};

export type MaterialSourceEvidenceStore = {
  schemaVersion: typeof MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION;
  etag: string;
  updatedAt: string;
  observations: MaterialSourceEvidenceObservation[];
};
