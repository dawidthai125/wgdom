/**
 * DECISION-PERSIST-01 — public surface.
 */

export {
  DECISION_PERSIST_LS_KEY,
  DECISION_PERSIST_SCHEMA_VERSION,
  type DecisionPersistAction,
  type DecisionPersistActor,
  type DecisionPersistAudit,
  type DecisionPersistRecord,
  type DecisionPersistStore,
  type DecisionPersistValidationSnapshot,
  type DecisionPersistVerdict,
  type ListDecisionHistoryFilter,
  type RecordDecisionInput,
} from "./types";

export {
  recordDecision,
  hydrateDecision,
  listDecisionHistory,
  buildValidationSnapshot,
} from "./api";

export { loadDecisionPersistStore, emptyDecisionPersistStore } from "./store";
