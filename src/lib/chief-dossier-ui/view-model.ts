/**
 * WIRE-CHIEF-UI-DOSSIER-01 — buildChiefDossierViewModel (thin presentational).
 * IN: ChiefSessionOutput only · ZERO domain calc.
 */

import type { ChiefTaskRecord } from "@/lib/chief-orchestrator";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import {
  CHIEF_DOSSIER_SURFACE_SUBTITLE_PL,
  CHIEF_DOSSIER_SURFACE_TITLE_PL,
  labelCaseStatusPl,
  labelPewnoscPl,
  labelSessionErrorPl,
  labelSessionStatusPl,
  labelTaskIdPl,
  labelTaskStatusPl,
  labelTraceRolePl,
  labelZgodnoscPl,
  phaseStatusColor,
  phaseStatusIconKey,
  taskStatusColor,
  taskStatusIconKey,
  traceRoleIconKey,
} from "./labels";
import type {
  ChiefDossierUiPhase,
  ChiefDossierViewModel,
  ChiefTaskRowView,
  ChiefTraceContractView,
  ChiefTraceRole,
  ChiefTraceSlotView,
} from "./types";

const TRACE_ROLES: readonly ChiefTraceRole[] = [
  "execution",
  "materials",
  "pricing",
  "cost",
  "offer",
] as const;

const NOT_READY_ERRORS = new Set([
  "not_ready_for_chief_input",
  "pricing_not_ready",
]);

function shortCaseId(caseId: string | null): string | null {
  if (!caseId) return null;
  if (caseId.length <= 24) return caseId;
  return `${caseId.slice(0, 12)}…${caseId.slice(-6)}`;
}

function resolveUiPhase(output: ChiefSessionOutput): ChiefDossierUiPhase {
  const { status, caseState, error, running, readyForDecision, caseId, dossier } =
    output;

  if (status === "checking") return "checking";
  if (running || status === "running") return "running";
  if (status === "blocked" || caseState === "blocked" || dossier?.status === "blocked") {
    return "blocked";
  }
  if (readyForDecision || status === "ready_for_decydent") return "ready";
  if (status === "cancelled") return "cancelled";
  if (error && NOT_READY_ERRORS.has(error)) return "not_ready";
  if (status === "finished" && error) return "error";
  if (status === "finished") return "finished_other";
  if (status === "waiting") return "running";
  if (
    status === "idle" &&
    !caseId &&
    !dossier &&
    !error
  ) {
    return "no_case";
  }
  if (status === "idle" && error && NOT_READY_ERRORS.has(error)) return "not_ready";
  if (status === "idle" && error) return "error";
  if (status === "idle") return "no_case";
  return "finished_other";
}

type TraceContractLike = {
  co?: string;
  dlaczego?: string;
  naPodstawieCzego?: string;
  pewnosc?: string;
  blokery?: ReadonlyArray<{ code?: string; messagePl?: string }>;
  zgodnoscZRozumieniemWykonania?: string;
  zgodnoscOpisPl?: string;
};

function mapContract(
  contract: TraceContractLike | null | undefined,
): ChiefTraceContractView | null {
  if (!contract) return null;
  const pewnosc = String(contract.pewnosc ?? "");
  const zgodnosc = String(contract.zgodnoscZRozumieniemWykonania ?? "");
  const blokeryRaw = Array.isArray(contract.blokery) ? contract.blokery : [];
  return {
    co: String(contract.co ?? ""),
    dlaczego: String(contract.dlaczego ?? ""),
    naPodstawieCzego: String(contract.naPodstawieCzego ?? ""),
    pewnosc,
    pewnoscLabelPl: labelPewnoscPl(pewnosc),
    blokery: blokeryRaw.map((b) => ({
      code: String(b?.code ?? ""),
      messagePl: String(b?.messagePl ?? ""),
    })),
    zgodnosc,
    zgodnoscLabelPl: labelZgodnoscPl(zgodnosc),
    zgodnoscOpisPl: String(contract.zgodnoscOpisPl ?? ""),
  };
}

function buildTaskRows(
  tasks: ChiefTaskRecord[] | null | undefined,
): ChiefTaskRowView[] {
  if (!tasks || tasks.length === 0) return [];
  return tasks.map((t) => ({
    id: t.id,
    labelPl: labelTaskIdPl(t.id),
    status: t.status,
    statusLabelPl: labelTaskStatusPl(t.status),
    statusColor: taskStatusColor(t.status),
    statusIconKey: taskStatusIconKey(t.status),
    failReasonPl: t.failReasonPl,
    startedAt: t.startedAt,
    finishedAt: t.finishedAt,
  }));
}

function collectBlockersPl(output: ChiefSessionOutput): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (msg: string | null | undefined) => {
    const m = (msg ?? "").trim();
    if (!m || seen.has(m)) return;
    seen.add(m);
    out.push(m);
  };

  const dossier = output.dossier;
  if (dossier) {
    for (const b of dossier.handoffBlockersPl ?? []) push(b);
    for (const t of dossier.tasks ?? []) {
      if (t.status === "failed") push(t.failReasonPl);
    }
    const traces = dossier.traces;
    for (const role of TRACE_ROLES) {
      const c = traces?.[role];
      if (c?.blokery) {
        for (const b of c.blokery) push(b.messagePl);
      }
    }
  } else if (output.taskStates) {
    for (const t of output.taskStates) {
      if (t.status === "failed") push(t.failReasonPl);
    }
  }
  return out;
}

function buildTraceSlots(
  output: ChiefSessionOutput,
  uiPhase: ChiefDossierUiPhase,
): ChiefTraceSlotView[] {
  const traces = output.dossier?.traces;
  return TRACE_ROLES.map((role) => {
    const contract = mapContract(traces?.[role] ?? null);
    const defaultOpen =
      role === "offer" && uiPhase === "ready" && contract != null;
    return {
      role,
      roleLabelPl: labelTraceRolePl(role),
      iconKey: traceRoleIconKey(role),
      contract,
      emptyLabelPl: "Brak wyniku",
      defaultOpen,
    };
  });
}

function emptyMessageForPhase(
  phase: ChiefDossierUiPhase,
  output: ChiefSessionOutput,
): string | null {
  switch (phase) {
    case "no_case":
      return "Brak aktywnego Case Chief.";
    case "not_ready":
      return (
        labelSessionErrorPl(output.error) ??
        "Sesja ekspertów nie jest jeszcze gotowa do startu."
      );
    case "cancelled":
      return labelSessionErrorPl(output.error) ?? "Sesja anulowana — dane Case nieważne.";
    case "error":
      return labelSessionErrorPl(output.error) ?? "Błąd sesji Chief.";
    case "checking":
      return "Sprawdzanie gotowości orkiestracji…";
    case "running":
      return "Trwa orkiestracja ekspertów…";
    case "finished_other":
      return "Case zakończony bez sygnału gotowości dla Decydenta.";
    default:
      return null;
  }
}

/**
 * Thin presentational mapper. Does not compute prices or re-run experts.
 */
export function buildChiefDossierViewModel(
  output: ChiefSessionOutput,
): ChiefDossierViewModel {
  const uiPhase = resolveUiPhase(output);
  const dossier = output.dossier;
  const tasksSource: ChiefTaskRecord[] | null =
    dossier?.tasks ?? output.taskStates ?? null;

  const showTimeline =
    uiPhase !== "running" &&
    uiPhase !== "checking" &&
    uiPhase !== "no_case" &&
    uiPhase !== "not_ready" &&
    uiPhase !== "cancelled" &&
    (tasksSource?.length ?? 0) > 0;

  const showTraces =
    dossier != null &&
    (uiPhase === "ready" ||
      uiPhase === "blocked" ||
      uiPhase === "finished_other");

  const primary = dossier?.primaryRecommendation ?? null;
  const showOffer = primary != null;

  const blockersPl = collectBlockersPl(output);
  const showBlockers =
    uiPhase === "blocked" || blockersPl.length > 0;

  const loopCount = dossier?.loopCount ?? output.loopCount ?? 0;
  const returnFlags = dossier?.returnFlags ?? {
    returnToMaterialExpert: false,
    requiresReanalysis: false,
  };
  const notes = dossier?.orchestrationNotesPl ?? [];
  const showLoopReturn =
    loopCount > 0 ||
    returnFlags.returnToMaterialExpert ||
    returnFlags.requiresReanalysis ||
    notes.some((n) => /LOOP|RETURN/i.test(n));

  return {
    uiPhase,
    titlePl: CHIEF_DOSSIER_SURFACE_TITLE_PL,
    subtitlePl: CHIEF_DOSSIER_SURFACE_SUBTITLE_PL,
    caseId: output.caseId,
    caseIdShort: shortCaseId(output.caseId),
    sessionStatus: output.status,
    sessionStatusLabelPl: labelSessionStatusPl(output.status),
    caseStatus: output.caseState,
    caseStatusLabelPl: output.caseState
      ? labelCaseStatusPl(output.caseState)
      : null,
    statusIconKey: phaseStatusIconKey(uiPhase),
    statusColor: phaseStatusColor(uiPhase),
    emptyMessagePl: emptyMessageForPhase(uiPhase, output),
    showTimeline,
    showTraces,
    showOffer,
    showBlockers,
    showLoopReturn,
    taskRows: buildTaskRows(tasksSource),
    traceSlots: buildTraceSlots(output, uiPhase),
    blockersPl,
    loopCount,
    returnToMaterialExpert: returnFlags.returnToMaterialExpert,
    requiresReanalysis: returnFlags.requiresReanalysis,
    orchestrationNotesPl: notes,
    primaryRecommendation: primary,
    scenarios: dossier?.scenarios ?? [],
    decisionMakerPayload: dossier?.decisionMakerPayload ?? null,
    offerHandoffPayload: dossier?.offerHandoffPayload ?? null,
  };
}
