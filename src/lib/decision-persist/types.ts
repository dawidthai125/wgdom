/**
 * DECISION-PERSIST-01 — append-only Decision Record types.
 * ZERO update · ZERO delete · ZERO lastModified.
 */

export const DECISION_PERSIST_LS_KEY = "kw-decision-persist-v1";

export const DECISION_PERSIST_SCHEMA_VERSION = 1 as const;

export type DecisionPersistAction = "approve" | "reject" | "needs_review";

export type DecisionPersistVerdict =
  | "validated"
  | "needs_review"
  | "blocked";

export interface DecisionPersistActor {
  userId: string;
  displayName?: string;
}

export interface DecisionPersistValidationSnapshot {
  verdict: DecisionPersistVerdict;
  hardCount: number;
  softCount: number;
}

export interface DecisionPersistAudit {
  kind: "recorded";
}

export interface DecisionPersistRecord {
  decisionId: string;
  tenderId: string;
  caseId: string;
  action: DecisionPersistAction;
  scenario: string | null;
  actor: DecisionPersistActor;
  createdAt: string;
  dossierFinishedAt: string;
  validationSnapshot: DecisionPersistValidationSnapshot;
  audit: DecisionPersistAudit;
  schemaVersion: typeof DECISION_PERSIST_SCHEMA_VERSION;
}

export interface DecisionPersistStore {
  version: 1;
  records: DecisionPersistRecord[];
}

export interface RecordDecisionInput {
  tenderId: string;
  caseId: string;
  action: DecisionPersistAction;
  scenario: string | null;
  actor: DecisionPersistActor;
  dossierFinishedAt: string;
  validationSnapshot: DecisionPersistValidationSnapshot;
}

export interface ListDecisionHistoryFilter {
  tenderId?: string;
  caseId?: string;
  dossierFinishedAt?: string;
}
