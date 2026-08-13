/**
 * OWNER-INPUT-01 — public API (create / answer / cancel / lookup).
 * TenderId REQUIRED on every write and lookup. Append-only. No pricing.
 */

import { evaluateOwnerRateQuestionGates } from "./gates";
import { buildPromptPl, isInvalidOwnerRatePrompt } from "./prompt";
import {
  appendOwnerRateEvent,
  loadOwnerRateInputStore,
  saveOwnerRateInputStore,
} from "./store";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import {
  OWNER_RATE_INPUT_SCHEMA_VERSION,
  type CancelOwnerRateQuestionInput,
  type CancelOwnerRateQuestionResult,
  type CreateOwnerRateQuestionInput,
  type CreateOwnerRateQuestionResult,
  type GetCurrentOwnerInputArgs,
  type ListOwnerInputsForTenderArgs,
  type OwnerRateAnswerSubmittedEvent,
  type OwnerRateAnswerView,
  type OwnerRateDomain,
  type OwnerRateEvent,
  type OwnerRateInputListItem,
  type OwnerRateInputStore,
  type OwnerRatePayload,
  type OwnerRateQuestionOpenedEvent,
  type OwnerRateQuestionStatus,
  type OwnerRateQuestionView,
  type SubmitOwnerRateAnswerInput,
  type SubmitOwnerRateAnswerResult,
} from "./types";

function newId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through */
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function trimReq(s: string | undefined | null): string {
  return typeof s === "string" ? s.trim() : "";
}

function buildPayload(
  input: CreateOwnerRateQuestionInput,
): OwnerRatePayload | null {
  if (input.domain === "equipment") {
    const namePl = trimReq(input.equipment?.namePl);
    if (!namePl) return null;
    const equipment: OwnerRatePayload = {
      domain: "equipment",
      equipment: {
        namePl,
        ...(input.equipment?.equipmentKey?.trim()
          ? { equipmentKey: input.equipment.equipmentKey.trim() }
          : {}),
        ...(input.equipment?.quantity != null && Number.isFinite(input.equipment.quantity)
          ? { quantity: input.equipment.quantity }
          : {}),
        ...(input.equipment?.unit?.trim()
          ? { unit: input.equipment.unit.trim() }
          : {}),
      },
    };
    return equipment;
  }
  if (input.domain === "transport") {
    const namePl = trimReq(input.transport?.namePl);
    if (!namePl) return null;
    const t = input.transport!;
    return {
      domain: "transport",
      transport: {
        namePl,
        ...(t.transportKind?.trim() ? { transportKind: t.transportKind.trim() } : {}),
        ...(t.quantity != null && Number.isFinite(t.quantity) ? { quantity: t.quantity } : {}),
        ...(t.unit?.trim() ? { unit: t.unit.trim() } : {}),
        ...(t.distanceKm != null && Number.isFinite(t.distanceKm)
          ? { distanceKm: t.distanceKm }
          : {}),
        ...(t.trips != null && Number.isFinite(t.trips) ? { trips: t.trips } : {}),
        ...(t.tonnage != null && Number.isFinite(t.tonnage) ? { tonnage: t.tonnage } : {}),
      },
    };
  }
  return null;
}

function questionOpenedEvents(store: OwnerRateInputStore): OwnerRateQuestionOpenedEvent[] {
  return store.events.filter((e): e is OwnerRateQuestionOpenedEvent => e.kind === "question_opened");
}

function answerEventsForQuestion(
  store: OwnerRateInputStore,
  tenderId: string,
  questionId: string,
): OwnerRateAnswerSubmittedEvent[] {
  return store.events.filter(
    (e): e is OwnerRateAnswerSubmittedEvent =>
      e.kind === "answer_submitted" &&
      e.tenderId === tenderId &&
      e.questionId === questionId,
  );
}

function isCancelled(
  store: OwnerRateInputStore,
  tenderId: string,
  questionId: string,
): boolean {
  return store.events.some(
    (e) =>
      e.kind === "question_cancelled" &&
      e.tenderId === tenderId &&
      e.questionId === questionId,
  );
}

function findOpened(
  store: OwnerRateInputStore,
  tenderId: string,
  questionId: string,
): OwnerRateQuestionOpenedEvent | null {
  const matches = questionOpenedEvents(store).filter(
    (e) => e.tenderId === tenderId && e.questionId === questionId,
  );
  return matches.length ? matches[0]! : null;
}

function deriveStatus(
  store: OwnerRateInputStore,
  tenderId: string,
  questionId: string,
): OwnerRateQuestionStatus {
  if (isCancelled(store, tenderId, questionId)) return "cancelled";
  if (answerEventsForQuestion(store, tenderId, questionId).length > 0) return "answered";
  return "open";
}

function toQuestionView(
  opened: OwnerRateQuestionOpenedEvent,
  status: OwnerRateQuestionStatus,
): OwnerRateQuestionView {
  return {
    questionId: opened.questionId,
    tenderId: opened.tenderId,
    domain: opened.domain,
    status,
    promptPl: opened.promptPl,
    evidenceSummaryPl: opened.evidenceSummaryPl,
    askedByRole: opened.askedByRole,
    askedAt: opened.askedAt,
    createdAt: opened.createdAt,
    ...(opened.lineRef ? { lineRef: opened.lineRef } : {}),
    dwellingId: normalizeDwellingId(opened.dwellingId),
    payload: opened.payload,
  };
}

function toAnswerView(e: OwnerRateAnswerSubmittedEvent): OwnerRateAnswerView {
  return {
    answerId: e.answerId,
    questionId: e.questionId,
    tenderId: e.tenderId,
    amountPlnNet: e.amountPlnNet,
    unit: e.unit,
    currency: e.currency,
    ...(e.notePl ? { notePl: e.notePl } : {}),
    approvedBy: e.approvedBy,
    approvedAt: e.approvedAt,
    sourceClass: e.sourceClass,
    scope: e.scope,
    revisionN: e.revisionN,
    ...(e.supersedesAnswerId ? { supersedesAnswerId: e.supersedesAnswerId } : {}),
  };
}

function pickCurrentAnswer(
  answers: OwnerRateAnswerSubmittedEvent[],
): OwnerRateAnswerSubmittedEvent | null {
  if (!answers.length) return null;
  return answers.reduce((best, cur) => (cur.revisionN >= best.revisionN ? cur : best));
}

/**
 * Create contextual OwnerRateQuestion. Expert/Chief signal → append question_opened.
 */
export function createOwnerRateQuestion(
  input: CreateOwnerRateQuestionInput,
): CreateOwnerRateQuestionResult {
  const tenderId = trimReq(input.tenderId);
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };

  if (input.domain == null) return { ok: false, reason: "MISSING_DOMAIN" };
  if (input.domain !== "equipment" && input.domain !== "transport") {
    return { ok: false, reason: "UNSUPPORTED_DOMAIN" };
  }

  const gate = evaluateOwnerRateQuestionGates({
    noise: input.noise,
    signalKind: input.signalKind,
  });
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.reason === "NOISE_TRANSPORT" ? "NOISE_TRANSPORT" : "UTYLIZACJA_ONLY",
    };
  }

  const payload = buildPayload(input);
  if (!payload) return { ok: false, reason: "INVALID_PAYLOAD" };

  const domain: OwnerRateDomain = input.domain;
  const promptPl = trimReq(input.promptPl)
    ? trimReq(input.promptPl)
    : buildPromptPl(
        domain,
        domain === "equipment" ? payload.equipment : payload.transport,
      );

  if (isInvalidOwnerRatePrompt(promptPl)) {
    return { ok: false, reason: "INVALID_PROMPT" };
  }

  const evidenceSummaryPl = trimReq(input.evidenceSummaryPl);
  if (!evidenceSummaryPl) return { ok: false, reason: "INVALID_PAYLOAD" };

  const askedByRole = input.askedByRole;
  if (
    askedByRole !== "cost_expert" &&
    askedByRole !== "chief" &&
    askedByRole !== "owner" &&
    askedByRole !== "system"
  ) {
    return { ok: false, reason: "INVALID_PAYLOAD" };
  }

  const now = input.askedAt?.trim() || new Date().toISOString();
  const questionId = newId("orq");

  const dwellingRaw = trimReq(input.dwellingId);
  const event: OwnerRateQuestionOpenedEvent = {
    kind: "question_opened",
    questionId,
    tenderId,
    domain,
    promptPl,
    evidenceSummaryPl,
    askedByRole,
    askedAt: now,
    createdAt: now,
    ...(trimReq(input.lineRef) ? { lineRef: trimReq(input.lineRef) } : {}),
    // Persist only when caller provided scope (legacy omits → DEFAULT on read).
    ...(dwellingRaw ? { dwellingId: normalizeDwellingId(dwellingRaw) } : {}),
    payload,
    schemaVersion: OWNER_RATE_INPUT_SCHEMA_VERSION,
  };

  const store = loadOwnerRateInputStore();
  const next = appendOwnerRateEvent(store, event);
  if (!saveOwnerRateInputStore(next)) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  return { ok: true, question: toQuestionView(event, "open") };
}

/**
 * Submit answer = explicit approval. Append-only revision.
 */
export function submitOwnerRateAnswer(
  input: SubmitOwnerRateAnswerInput,
): SubmitOwnerRateAnswerResult {
  const tenderId = trimReq(input.tenderId);
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  const questionId = trimReq(input.questionId);
  if (!questionId) return { ok: false, reason: "MISSING_QUESTION_ID" };

  const amount = input.amountPlnNet;
  if (typeof amount !== "number" || !Number.isFinite(amount) || !(amount > 0)) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }

  const unit = trimReq(input.unit);
  if (!unit) return { ok: false, reason: "INVALID_UNIT" };

  const currency = input.currency ?? "PLN";
  if (currency !== "PLN") return { ok: false, reason: "INVALID_CURRENCY" };

  const userId = trimReq(input.approvedBy?.userId);
  if (!userId) return { ok: false, reason: "INVALID_ACTOR" };

  const store = loadOwnerRateInputStore();
  const opened = findOpened(store, tenderId, questionId);
  if (!opened) {
    // Distinguish missing vs tender mismatch if question exists under other tender.
    const any = questionOpenedEvents(store).find((e) => e.questionId === questionId);
    if (any && any.tenderId !== tenderId) {
      return { ok: false, reason: "TENDER_MISMATCH" };
    }
    return { ok: false, reason: "QUESTION_NOT_FOUND" };
  }

  if (isCancelled(store, tenderId, questionId)) {
    return { ok: false, reason: "QUESTION_CANCELLED" };
  }

  const prior = answerEventsForQuestion(store, tenderId, questionId);
  const current = pickCurrentAnswer(prior);
  const revisionN = current ? current.revisionN + 1 : 1;
  const approvedAt = input.approvedAt?.trim() || new Date().toISOString();

  const event: OwnerRateAnswerSubmittedEvent = {
    kind: "answer_submitted",
    answerId: newId("ora"),
    questionId,
    tenderId,
    amountPlnNet: amount,
    unit,
    currency: "PLN",
    ...(trimReq(input.notePl) ? { notePl: trimReq(input.notePl) } : {}),
    approvedBy: {
      userId,
      ...(trimReq(input.approvedBy.displayName)
        ? { displayName: trimReq(input.approvedBy.displayName) }
        : {}),
    },
    approvedAt,
    sourceClass: "owner_input",
    scope: "tender_only",
    revisionN,
    ...(current ? { supersedesAnswerId: current.answerId } : {}),
    schemaVersion: OWNER_RATE_INPUT_SCHEMA_VERSION,
  };

  const next = appendOwnerRateEvent(store, event);
  if (!saveOwnerRateInputStore(next)) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  return { ok: true, answer: toAnswerView(event) };
}

export function cancelOwnerRateQuestion(
  input: CancelOwnerRateQuestionInput,
): CancelOwnerRateQuestionResult {
  const tenderId = trimReq(input.tenderId);
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  const questionId = trimReq(input.questionId);
  if (!questionId) return { ok: false, reason: "MISSING_QUESTION_ID" };

  const store = loadOwnerRateInputStore();
  const opened = findOpened(store, tenderId, questionId);
  if (!opened) {
    const any = questionOpenedEvents(store).find((e) => e.questionId === questionId);
    if (any && any.tenderId !== tenderId) {
      return { ok: false, reason: "TENDER_MISMATCH" };
    }
    return { ok: false, reason: "QUESTION_NOT_FOUND" };
  }

  if (isCancelled(store, tenderId, questionId)) {
    return { ok: false, reason: "ALREADY_CANCELLED" };
  }

  const cancelledAt = input.cancelledAt?.trim() || new Date().toISOString();
  const event: OwnerRateEvent = {
    kind: "question_cancelled",
    questionId,
    tenderId,
    cancelledAt,
    ...(input.cancelledBy?.userId?.trim()
      ? {
          cancelledBy: {
            userId: input.cancelledBy.userId.trim(),
            ...(input.cancelledBy.displayName?.trim()
              ? { displayName: input.cancelledBy.displayName.trim() }
              : {}),
          },
        }
      : {}),
    schemaVersion: OWNER_RATE_INPUT_SCHEMA_VERSION,
  };

  const next = appendOwnerRateEvent(store, event);
  if (!saveOwnerRateInputStore(next)) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  return { ok: true, question: toQuestionView(opened, "cancelled") };
}

/**
 * Current OWNER_INPUT for tender+question. Cancelled → null. No answer → null.
 * tenderId REQUIRED — never lookup by questionId alone.
 */
export function getCurrentOwnerInput(
  args: GetCurrentOwnerInputArgs,
): OwnerRateAnswerView | null {
  const tenderId = trimReq(args?.tenderId);
  const questionId = trimReq(args?.questionId);
  if (!tenderId || !questionId) return null;

  const store = loadOwnerRateInputStore();
  const opened = findOpened(store, tenderId, questionId);
  if (!opened) return null;
  if (isCancelled(store, tenderId, questionId)) return null;

  const current = pickCurrentAnswer(answerEventsForQuestion(store, tenderId, questionId));
  return current ? toAnswerView(current) : null;
}

/** Alias — unanswered / cancelled ⇒ null (NOT 0 PLN). */
export function getCurrentAnswer(
  args: GetCurrentOwnerInputArgs,
): OwnerRateAnswerView | null {
  return getCurrentOwnerInput(args);
}

export function listAnswerHistory(args: GetCurrentOwnerInputArgs): OwnerRateAnswerView[] {
  const tenderId = trimReq(args?.tenderId);
  const questionId = trimReq(args?.questionId);
  if (!tenderId || !questionId) return [];

  const store = loadOwnerRateInputStore();
  if (!findOpened(store, tenderId, questionId)) return [];

  return answerEventsForQuestion(store, tenderId, questionId)
    .slice()
    .sort((a, b) => a.revisionN - b.revisionN)
    .map(toAnswerView);
}

export function getOwnerRateQuestion(
  args: GetCurrentOwnerInputArgs,
): OwnerRateQuestionView | null {
  const tenderId = trimReq(args?.tenderId);
  const questionId = trimReq(args?.questionId);
  if (!tenderId || !questionId) return null;

  const store = loadOwnerRateInputStore();
  const opened = findOpened(store, tenderId, questionId);
  if (!opened) return null;
  return toQuestionView(opened, deriveStatus(store, tenderId, questionId));
}

export function listOwnerInputsForTender(
  args: ListOwnerInputsForTenderArgs,
): OwnerRateInputListItem[] {
  const tenderId = trimReq(args?.tenderId);
  if (!tenderId) return [];

  const store = loadOwnerRateInputStore();
  const domain = args.domain;

  const out: OwnerRateInputListItem[] = [];
  for (const opened of questionOpenedEvents(store)) {
    if (opened.tenderId !== tenderId) continue;
    if (domain && opened.domain !== domain) continue;
    const status = deriveStatus(store, tenderId, opened.questionId);
    const currentAnswer =
      status === "cancelled"
        ? null
        : (() => {
            const cur = pickCurrentAnswer(
              answerEventsForQuestion(store, tenderId, opened.questionId),
            );
            return cur ? toAnswerView(cur) : null;
          })();
    out.push({
      question: toQuestionView(opened, status),
      currentAnswer,
    });
  }
  return out;
}

/** Key/name-only lookups without tenderId are intentionally not provided. */
