/**
 * WIRE-CHIEF-SESSION-01 — public API Session.
 * App → Adapter RO → Session → Chief → Experts.
 * Bez UI · bez KV · bez OfferBoq write · bez zmian Expert/Chief/TF BC.
 */

export type { ChiefSessionOutput, ChiefSessionStatus } from "./types";
export { idleChiefSessionOutput } from "./types";

export {
  CHIEF_ORCHESTRATOR_SESSION_DEFAULT,
  CHIEF_ORCHESTRATOR_SESSION_LS_KEY,
  forceChiefOrchestratorSessionForTests,
  isChiefOrchestratorSessionEnabled,
} from "./flag";

export {
  buildChiefSessionCaseId,
  buildChiefSessionFingerprint,
  resolveStableCaseStamp,
} from "./case-id";

export type {
  ChiefSessionEngine,
  ChiefSessionRunFn,
  ChiefSessionScheduleFn,
  ChiefSessionStartParams,
} from "./engine";
export { createChiefSessionEngine } from "./engine";
