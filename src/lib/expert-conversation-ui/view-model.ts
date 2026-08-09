/**
 * Inteligentny Kosztorysant UX — thin conversation ViewModel.
 * IN: ChiefDossierViewModel only · ZERO analyze* / re-price / Persist.
 */

import type { ChiefDossierViewModel, ChiefTaskRowView, ChiefTraceSlotView } from "@/lib/chief-dossier-ui";
import { formatRecommendedOfferPln } from "@/lib/tender-recommendation-result";
import {
  EXPERT_CONVERSATION_ACTOR_CHIEF_PL,
  EXPERT_CONVERSATION_ACTOR_COST_PL,
  EXPERT_CONVERSATION_ACTOR_EE_PL,
  EXPERT_CONVERSATION_ACTOR_ME_PL,
  EXPERT_CONVERSATION_ACTOR_OFFER_PL,
  EXPERT_CONVERSATION_ACTOR_PE_PL,
  EXPERT_CONVERSATION_SUBTITLE_PL,
  EXPERT_CONVERSATION_TITLE_PL,
  labelConversationStatusPl,
} from "./labels";
import type {
  ExpertConversationStepKind,
  ExpertConversationStepStatus,
  ExpertConversationStepView,
  ExpertConversationViewModel,
} from "./types";

function taskById(
  rows: readonly ChiefTaskRowView[],
  id: string,
): ChiefTaskRowView | null {
  return rows.find((r) => r.id === id) ?? null;
}

function traceByRole(
  slots: readonly ChiefTraceSlotView[],
  role: ChiefTraceSlotView["role"],
): ChiefTraceSlotView | null {
  return slots.find((s) => s.role === role) ?? null;
}

function mapTaskStatus(
  task: ChiefTaskRowView | null,
  opts: {
    uiPhase: string;
    hasContract: boolean;
    preferActiveWhenRunning: boolean;
  },
): ExpertConversationStepStatus {
  const st = task?.status ?? "";
  if (st === "failed") return "blocked";
  if (st === "skipped") return "skipped";
  if (st === "done") return "done";
  if (st === "running") return "active";
  if (opts.preferActiveWhenRunning && (opts.uiPhase === "running" || opts.uiPhase === "checking")) {
    if (st === "pending" || !task) {
      // Only mark first pending as active when session running — caller decides order.
      return "pending";
    }
  }
  if (opts.hasContract && (opts.uiPhase === "ready" || opts.uiPhase === "blocked" || opts.uiPhase === "finished_other")) {
    return opts.uiPhase === "blocked" && !task ? "blocked" : "done";
  }
  if (opts.uiPhase === "ready" && opts.hasContract) return "done";
  if (opts.uiPhase === "no_case" || opts.uiPhase === "not_ready") return "pending";
  return st === "pending" ? "pending" : "pending";
}

function messageWeight(text: string): number {
  return text.trim().length;
}

function buildExpertStep(opts: {
  id: ExpertConversationStepKind;
  actorLabelPl: string;
  task: ChiefTaskRowView | null;
  slot: ChiefTraceSlotView | null;
  uiPhase: string;
  offerPricePln?: number | null;
}): ExpertConversationStepView {
  const contract = opts.slot?.contract ?? null;
  const hasContract = contract != null && Boolean(contract.co?.trim());
  let status = mapTaskStatus(opts.task, {
    uiPhase: opts.uiPhase,
    hasContract,
    preferActiveWhenRunning: true,
  });

  // Prefer Trace message; never invent. Fallback to task fail / empty label.
  let messagePl = "";
  let detailPl: string | null = null;

  if (hasContract && contract) {
    messagePl = contract.co.trim();
    const why = contract.dlaczego?.trim();
    detailPl = why ? why : null;
    if (status === "pending" && (opts.uiPhase === "ready" || opts.uiPhase === "blocked" || opts.uiPhase === "finished_other")) {
      status = opts.uiPhase === "blocked" && opts.task?.status === "failed" ? "blocked" : "done";
    }
  } else if (opts.task?.status === "failed" && opts.task.failReasonPl?.trim()) {
    messagePl = opts.task.failReasonPl.trim();
    status = "blocked";
  } else if (opts.task?.status === "running") {
    messagePl = opts.task.statusLabelPl;
    status = "active";
  } else if (opts.task?.status === "skipped") {
    messagePl = opts.task.statusLabelPl;
    status = "skipped";
  } else if (opts.slot?.emptyLabelPl) {
    messagePl = opts.slot.emptyLabelPl;
  } else {
    messagePl = opts.task?.statusLabelPl || "—";
  }

  const offerPricePln =
    opts.id === "offer" &&
    opts.offerPricePln != null &&
    Number.isFinite(opts.offerPricePln)
      ? opts.offerPricePln
      : null;

  return {
    id: opts.id,
    actorLabelPl: opts.actorLabelPl,
    status,
    statusLabelPl: labelConversationStatusPl(status),
    messagePl,
    detailPl,
    offerPricePln,
    offerPriceDisplayPl:
      offerPricePln != null ? formatRecommendedOfferPln(offerPricePln) : null,
    iconKey: opts.slot?.iconKey ?? opts.task?.statusIconKey ?? "flag",
    messageWeight: messageWeight(messagePl),
  };
}

function buildChiefStart(vm: ChiefDossierViewModel): ExpertConversationStepView {
  const phase = vm.uiPhase;
  let status: ExpertConversationStepStatus = "pending";
  let messagePl = vm.emptyMessagePl?.trim() || vm.sessionStatusLabelPl;

  if (phase === "checking" || phase === "running") {
    status = "active";
    messagePl = vm.emptyMessagePl?.trim() || vm.sessionStatusLabelPl;
  } else if (phase === "blocked") {
    status = "blocked";
    messagePl =
      vm.blockersPl[0]?.trim() ||
      vm.emptyMessagePl?.trim() ||
      vm.sessionStatusLabelPl;
  } else if (
    phase === "ready" ||
    phase === "finished_other" ||
    phase === "cancelled" ||
    phase === "error"
  ) {
    status = phase === "cancelled" || phase === "error" ? "blocked" : "done";
    const note = vm.orchestrationNotesPl[0]?.trim();
    messagePl =
      note ||
      vm.sessionStatusLabelPl ||
      (phase === "ready" ? "Orkiestracja zakończona." : vm.emptyMessagePl?.trim() || "—");
  } else if (phase === "not_ready" || phase === "no_case") {
    status = "pending";
    messagePl = vm.emptyMessagePl?.trim() || vm.sessionStatusLabelPl;
  }

  return {
    id: "chief_start",
    actorLabelPl: EXPERT_CONVERSATION_ACTOR_CHIEF_PL,
    status,
    statusLabelPl: labelConversationStatusPl(status),
    messagePl,
    detailPl: vm.caseIdShort ? `Case ${vm.caseIdShort}` : null,
    offerPricePln: null,
    offerPriceDisplayPl: null,
    iconKey: vm.statusIconKey,
    messageWeight: messageWeight(messagePl),
  };
}

function buildChiefFinal(vm: ChiefDossierViewModel): ExpertConversationStepView {
  const phase = vm.uiPhase;
  let status: ExpertConversationStepStatus = "pending";
  let messagePl = "—";

  if (phase === "ready") {
    status = "done";
    messagePl =
      vm.caseStatusLabelPl?.trim() ||
      vm.sessionStatusLabelPl ||
      "Gotowe dla Decydenta";
  } else if (phase === "blocked") {
    status = "blocked";
    messagePl =
      vm.blockersPl[0]?.trim() ||
      vm.emptyMessagePl?.trim() ||
      "Case zablokowany";
  } else if (phase === "running" || phase === "checking") {
    status = "pending";
    messagePl = "Oczekiwanie na zakończenie orkiestracji…";
  } else if (phase === "finished_other") {
    status = "done";
    messagePl = vm.emptyMessagePl?.trim() || vm.sessionStatusLabelPl;
  } else if (phase === "cancelled" || phase === "error") {
    status = "blocked";
    messagePl = vm.emptyMessagePl?.trim() || vm.sessionStatusLabelPl;
  } else {
    status = "pending";
    messagePl = vm.emptyMessagePl?.trim() || vm.sessionStatusLabelPl;
  }

  const lastNote = [...vm.orchestrationNotesPl].reverse().find((n) => n.trim());
  const detailPl = lastNote?.trim() || null;

  return {
    id: "chief_final",
    actorLabelPl: EXPERT_CONVERSATION_ACTOR_CHIEF_PL,
    status,
    statusLabelPl: labelConversationStatusPl(status),
    messagePl,
    detailPl,
    offerPricePln: null,
    offerPriceDisplayPl: null,
    iconKey: vm.statusIconKey,
    messageWeight: messageWeight(messagePl),
  };
}

/**
 * Mark exactly one pending expert as active when uiPhase is running
 * (first pending in EE→Offer order).
 */
function promoteActiveWhileRunning(
  steps: ExpertConversationStepView[],
  uiPhase: string,
): ExpertConversationStepView[] {
  if (uiPhase !== "running" && uiPhase !== "checking") return steps;
  const expertIds: ExpertConversationStepKind[] = [
    "execution",
    "materials",
    "pricing",
    "cost",
    "offer",
  ];
  const hasActive = steps.some((s) => s.status === "active");
  if (hasActive) return steps;
  const idx = steps.findIndex(
    (s) => expertIds.includes(s.id) && s.status === "pending",
  );
  if (idx < 0) return steps;
  return steps.map((s, i) =>
    i === idx
      ? {
          ...s,
          status: "active" as const,
          statusLabelPl: labelConversationStatusPl("active"),
        }
      : s,
  );
}

/**
 * Thin presentational mapper from existing Chief Dossier VM.
 */
export function buildExpertConversationViewModel(
  dossierVm: ChiefDossierViewModel | null | undefined,
): ExpertConversationViewModel {
  if (dossierVm == null) {
    return {
      visible: false,
      titlePl: EXPERT_CONVERSATION_TITLE_PL,
      subtitlePl: EXPERT_CONVERSATION_SUBTITLE_PL,
      uiPhase: "hidden",
      caseIdShort: null,
      steps: [],
      readyForDecision: false,
      hasBlocked: false,
    };
  }

  const rows = dossierVm.taskRows;
  const slots = dossierVm.traceSlots;
  const offerPln = dossierVm.primaryRecommendation?.offerPricePln ?? null;

  const steps: ExpertConversationStepView[] = [
    buildChiefStart(dossierVm),
    buildExpertStep({
      id: "execution",
      actorLabelPl: EXPERT_CONVERSATION_ACTOR_EE_PL,
      task: taskById(rows, "T1_execution"),
      slot: traceByRole(slots, "execution"),
      uiPhase: dossierVm.uiPhase,
    }),
    buildExpertStep({
      id: "materials",
      actorLabelPl: EXPERT_CONVERSATION_ACTOR_ME_PL,
      task: taskById(rows, "T2_materials"),
      slot: traceByRole(slots, "materials"),
      uiPhase: dossierVm.uiPhase,
    }),
    buildExpertStep({
      id: "pricing",
      actorLabelPl: EXPERT_CONVERSATION_ACTOR_PE_PL,
      task: taskById(rows, "T3_pricing"),
      slot: traceByRole(slots, "pricing"),
      uiPhase: dossierVm.uiPhase,
    }),
    buildExpertStep({
      id: "cost",
      actorLabelPl: EXPERT_CONVERSATION_ACTOR_COST_PL,
      task: taskById(rows, "T4_cost"),
      slot: traceByRole(slots, "cost"),
      uiPhase: dossierVm.uiPhase,
    }),
    buildExpertStep({
      id: "offer",
      actorLabelPl: EXPERT_CONVERSATION_ACTOR_OFFER_PL,
      task: taskById(rows, "T5_offer"),
      slot: traceByRole(slots, "offer"),
      uiPhase: dossierVm.uiPhase,
      offerPricePln: offerPln,
    }),
    buildChiefFinal(dossierVm),
  ];

  const promoted = promoteActiveWhileRunning(steps, dossierVm.uiPhase);

  return {
    visible: true,
    titlePl: EXPERT_CONVERSATION_TITLE_PL,
    subtitlePl: EXPERT_CONVERSATION_SUBTITLE_PL,
    uiPhase: dossierVm.uiPhase,
    caseIdShort: dossierVm.caseIdShort,
    steps: promoted,
    readyForDecision: dossierVm.uiPhase === "ready",
    hasBlocked:
      dossierVm.uiPhase === "blocked" ||
      promoted.some((s) => s.status === "blocked"),
  };
}
