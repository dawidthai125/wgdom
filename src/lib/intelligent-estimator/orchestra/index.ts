/**
 * W1 Orchestra — public exports (IK sequencer extraction from IkEntryHost).
 */

export type {
  IkOrchestraFlags,
  IkOrchestraHostInput,
  IkOrchestraPipelineIngest,
  IkOrchestraSnapshot,
  IkOrchestraSyncInput,
  IkOrchestraSyncSnapshot,
  IkKnrAppDiag,
  IkKnrKnowledgeDiag,
} from "./orchestra-types";

export type {
  IkIdentityContext,
  OwnerManualIdentityOverride,
} from "./ik-identity-phase";

export type { IkIdentityPersistOutcome } from "./ik-identity-persist-glue";
export { runIkIdentityPhase } from "./ik-identity-phase";
export {
  computeOfferBoqIdentityPayloadHash,
  runGatedIdentityPersist,
} from "./ik-identity-persist-glue";
export {
  hasCompleteTrustedIdentityTuple,
  preserveOfferBoqLineIfTrusted,
  TRUSTED_IDENTITY_MATCH_METHODS,
} from "../ik-identity-trusted-preserve";

export type {
  ChiefAdvisoryPort,
  IngestMergePort,
  KnrKnowledgePort,
  OncePerKeyPort,
  P2IngestPort,
  P5SettlePort,
  ParentBridgePort,
  PipelineWaitPort,
} from "./orchestra-ports";

export { resolveEffectiveItem } from "./orchestra-ports";
export { computeIkOrchestraSyncSnapshot } from "./ik-orchestra-engine";
export { useIkOrchestra } from "./use-ik-orchestra";
