/**
 * OWNER-INPUT-01 + Bid bridge (GO-1 Equipment) — tender-scoped Owner Rate Input.
 * Cloud Sync OFF · REAL SOURCE OUT.
 */

export {
  OWNER_RATE_INPUT_LS_KEY,
  OWNER_RATE_INPUT_SCHEMA_VERSION,
  DEFAULT_DWELLING_ID,
} from "./types";

export type {
  OwnerRateDomain,
  OwnerRateQuestionStatus,
  OwnerRateAskedByRole,
  OwnerRateSourceClass,
  OwnerRateScope,
  OwnerRateCurrency,
  OwnerRateActor,
  OwnerRateEquipmentPayload,
  OwnerRateTransportPayload,
  OwnerRatePayload,
  OwnerRateNoiseGate,
  OwnerRateLogisticsSignalKind,
  OwnerRateQuestionOpenedEvent,
  OwnerRateAnswerSubmittedEvent,
  OwnerRateQuestionCancelledEvent,
  OwnerRateEvent,
  OwnerRateInputStore,
  OwnerRateQuestionView,
  OwnerRateAnswerView,
  CreateOwnerRateQuestionInput,
  CreateOwnerRateQuestionFailureReason,
  CreateOwnerRateQuestionResult,
  SubmitOwnerRateAnswerInput,
  SubmitOwnerRateAnswerFailureReason,
  SubmitOwnerRateAnswerResult,
  CancelOwnerRateQuestionInput,
  CancelOwnerRateQuestionFailureReason,
  CancelOwnerRateQuestionResult,
  GetCurrentOwnerInputArgs,
  ListOwnerInputsForTenderArgs,
  OwnerRateInputListItem,
} from "./types";

export {
  emptyOwnerRateInputStore,
  loadOwnerRateInputStore,
  saveOwnerRateInputStore,
  appendOwnerRateEvent,
  clearOwnerRateInputStore,
} from "./store";

export {
  evaluateNoiseTransportGate,
  evaluateUtylizacjaGate,
  evaluateOwnerRateQuestionGates,
} from "./gates";

export type { OwnerRateGateRejectReason, OwnerRateGateResult } from "./gates";

export {
  buildPromptPl,
  buildEquipmentPromptPl,
  buildTransportPromptPl,
  isInvalidOwnerRatePrompt,
} from "./prompt";

export {
  createOwnerRateQuestion,
  submitOwnerRateAnswer,
  cancelOwnerRateQuestion,
  getCurrentOwnerInput,
  getCurrentAnswer,
  listAnswerHistory,
  getOwnerRateQuestion,
  listOwnerInputsForTender,
} from "./api";

export {
  normalizeOwnerRateUnit,
  areOwnerRateUnitsCompatible,
} from "./units";

export {
  findOwnerInputForLine,
  ensureOwnerRateQuestionForGap,
} from "./bridge";

export type {
  FindOwnerInputForLineArgs,
  EnsureOwnerRateQuestionForGapInput,
  EnsureOwnerRateQuestionForGapResult,
} from "./bridge";
