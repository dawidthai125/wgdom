/**
 * OWNER-INPUT-01 — tender-scoped Owner Rate Input (Option B).
 * LOCAL-ONLY · append-only events · NOT REAL_SOURCE · NOT Price Memory / OUR RATE.
 */

export const OWNER_RATE_INPUT_LS_KEY = "kw-owner-rate-input-v1";

export const OWNER_RATE_INPUT_SCHEMA_VERSION = 1 as const;

/**
 * MULTI-DWELLING-01 — absent dwellingId on legacy events normalizes to this.
 * Re-exported from multi-dwelling for a single SSOT string.
 */
export { DEFAULT_DWELLING_ID } from "@/lib/multi-dwelling/constants";

export type OwnerRateDomain = "equipment" | "transport";

export type OwnerRateQuestionStatus = "open" | "answered" | "cancelled";

export type OwnerRateAskedByRole = "cost_expert" | "chief" | "owner" | "system";

export type OwnerRateSourceClass = "owner_input";

export type OwnerRateScope = "tender_only";

export type OwnerRateCurrency = "PLN";

export interface OwnerRateActor {
  userId: string;
  displayName?: string;
}

export interface OwnerRateEquipmentPayload {
  equipmentKey?: string;
  namePl: string;
  quantity?: number;
  unit?: string;
}

export interface OwnerRateTransportPayload {
  transportKind?: string;
  namePl: string;
  quantity?: number;
  unit?: string;
  distanceKm?: number;
  trips?: number;
  tonnage?: number;
}

export type OwnerRatePayload =
  | { domain: "equipment"; equipment: OwnerRateEquipmentPayload }
  | { domain: "transport"; transport: OwnerRateTransportPayload };

export type OwnerRateNoiseGate = {
  isNoise?: boolean;
  noiseKind?: string | null;
};

export type OwnerRateLogisticsSignalKind =
  | "logistics_need"
  | "utylizacja"
  | "disposal_only"
  | "TRANSPORT_UTYLIZACJA";

export interface OwnerRateQuestionOpenedEvent {
  kind: "question_opened";
  questionId: string;
  tenderId: string;
  domain: OwnerRateDomain;
  promptPl: string;
  evidenceSummaryPl: string;
  askedByRole: OwnerRateAskedByRole;
  askedAt: string;
  createdAt: string;
  lineRef?: string;
  /** MULTI-DWELLING-01 — optional; absent ⇒ DEFAULT_DWELLING_ID on read. */
  dwellingId?: string;
  payload: OwnerRatePayload;
  schemaVersion: typeof OWNER_RATE_INPUT_SCHEMA_VERSION;
}

export interface OwnerRateAnswerSubmittedEvent {
  kind: "answer_submitted";
  answerId: string;
  questionId: string;
  tenderId: string;
  amountPlnNet: number;
  unit: string;
  currency: OwnerRateCurrency;
  notePl?: string;
  approvedBy: OwnerRateActor;
  approvedAt: string;
  sourceClass: OwnerRateSourceClass;
  scope: OwnerRateScope;
  revisionN: number;
  supersedesAnswerId?: string;
  schemaVersion: typeof OWNER_RATE_INPUT_SCHEMA_VERSION;
}

export interface OwnerRateQuestionCancelledEvent {
  kind: "question_cancelled";
  questionId: string;
  tenderId: string;
  cancelledAt: string;
  cancelledBy?: OwnerRateActor;
  schemaVersion: typeof OWNER_RATE_INPUT_SCHEMA_VERSION;
}

export type OwnerRateEvent =
  | OwnerRateQuestionOpenedEvent
  | OwnerRateAnswerSubmittedEvent
  | OwnerRateQuestionCancelledEvent;

export interface OwnerRateInputStore {
  version: 1;
  events: OwnerRateEvent[];
}

/** Derived question view (not persisted as mutable row). */
export interface OwnerRateQuestionView {
  questionId: string;
  tenderId: string;
  domain: OwnerRateDomain;
  status: OwnerRateQuestionStatus;
  promptPl: string;
  evidenceSummaryPl: string;
  askedByRole: OwnerRateAskedByRole;
  askedAt: string;
  createdAt: string;
  lineRef?: string;
  /** Normalized dwelling scope (DEFAULT_DWELLING_ID when legacy). */
  dwellingId?: string;
  payload: OwnerRatePayload;
}

/** Current / historical answer view. */
export interface OwnerRateAnswerView {
  answerId: string;
  questionId: string;
  tenderId: string;
  amountPlnNet: number;
  unit: string;
  currency: OwnerRateCurrency;
  notePl?: string;
  approvedBy: OwnerRateActor;
  approvedAt: string;
  sourceClass: OwnerRateSourceClass;
  scope: OwnerRateScope;
  revisionN: number;
  supersedesAnswerId?: string;
}

export interface CreateOwnerRateQuestionInput {
  tenderId: string;
  domain: OwnerRateDomain;
  evidenceSummaryPl: string;
  askedByRole: OwnerRateAskedByRole;
  lineRef?: string;
  /** MULTI-DWELLING-01 — optional dwelling scope. */
  dwellingId?: string;
  /** Domain payload fields (without outer discriminant). */
  equipment?: OwnerRateEquipmentPayload;
  transport?: OwnerRateTransportPayload;
  /** Optional pre-built prompt; otherwise buildPromptPl. */
  promptPl?: string;
  askedAt?: string;
  noise?: OwnerRateNoiseGate;
  signalKind?: OwnerRateLogisticsSignalKind;
}

export type CreateOwnerRateQuestionFailureReason =
  | "MISSING_TENDER_ID"
  | "MISSING_DOMAIN"
  | "UNSUPPORTED_DOMAIN"
  | "INVALID_PAYLOAD"
  | "NOISE_TRANSPORT"
  | "UTYLIZACJA_ONLY"
  | "INVALID_PROMPT"
  | "STORAGE_UNAVAILABLE";

export type CreateOwnerRateQuestionResult =
  | { ok: true; question: OwnerRateQuestionView }
  | { ok: false; reason: CreateOwnerRateQuestionFailureReason };

export interface SubmitOwnerRateAnswerInput {
  tenderId: string;
  questionId: string;
  amountPlnNet: number;
  unit: string;
  currency?: OwnerRateCurrency;
  notePl?: string;
  approvedBy: OwnerRateActor;
  approvedAt?: string;
}

export type SubmitOwnerRateAnswerFailureReason =
  | "MISSING_TENDER_ID"
  | "MISSING_QUESTION_ID"
  | "QUESTION_NOT_FOUND"
  | "TENDER_MISMATCH"
  | "QUESTION_CANCELLED"
  | "INVALID_AMOUNT"
  | "INVALID_UNIT"
  | "INVALID_CURRENCY"
  | "INVALID_ACTOR"
  | "STORAGE_UNAVAILABLE";

export type SubmitOwnerRateAnswerResult =
  | { ok: true; answer: OwnerRateAnswerView }
  | { ok: false; reason: SubmitOwnerRateAnswerFailureReason };

export interface CancelOwnerRateQuestionInput {
  tenderId: string;
  questionId: string;
  cancelledBy?: OwnerRateActor;
  cancelledAt?: string;
}

export type CancelOwnerRateQuestionFailureReason =
  | "MISSING_TENDER_ID"
  | "MISSING_QUESTION_ID"
  | "QUESTION_NOT_FOUND"
  | "TENDER_MISMATCH"
  | "ALREADY_CANCELLED"
  | "STORAGE_UNAVAILABLE";

export type CancelOwnerRateQuestionResult =
  | { ok: true; question: OwnerRateQuestionView }
  | { ok: false; reason: CancelOwnerRateQuestionFailureReason };

export interface GetCurrentOwnerInputArgs {
  tenderId: string;
  questionId: string;
}

export interface ListOwnerInputsForTenderArgs {
  tenderId: string;
  domain?: OwnerRateDomain;
}

export interface OwnerRateInputListItem {
  question: OwnerRateQuestionView;
  currentAnswer: OwnerRateAnswerView | null;
}
