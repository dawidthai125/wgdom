/**
 * IK-KNR-EXPERT Slice C2 — KNR conversation adapter (PRESENTATION ONLY).
 *
 * IkKnrExpertReport → aggregated laik steps (max 3 + max 3 examplesHold).
 *
 * ZERO host / chrome / Hub / event-actor union.
 * ZERO write catalogWorkId / knrHint / Master BOQ.
 * ZERO mapper / A1 / Research / Owner map / CatalogWork lookup.
 *
 * C3 will map these steps onto ExpertConversationSurface.
 */

import { INTELIGENTNY_KOSZTORYSANT_TITLE_PL } from "@/lib/expert-conversation-ui/labels";
import type { IkKnrExpertLineResult, IkKnrExpertReport } from "./ik-knr-expert";

/** Local C2 actor labels — event-actor union stays untouched until C3. */
export const IK_KNR_CONVERSATION_LEAD_LABEL_PL = INTELIGENTNY_KOSZTORYSANT_TITLE_PL;

export const IK_KNR_CONVERSATION_EXPERT_LABEL_PL = "Ekspert od oznaczeń katalogowych";

export type IkKnrConversationStepId = "knr_lead" | "knr" | "knr_wrap" | "knr_blocked";

export type IkKnrConversationEvent =
  | "KNR_LEAD"
  | "KNR_REPORT"
  | "KNR_WRAP"
  | "KNR_BLOCKED";

export type IkKnrConversationActor = "lead" | "knr";

export type IkKnrConversationStepStatus = "done" | "blocked";

/** Existing IK sourceRef kinds only — no new bus. */
export type IkKnrConversationSourceRefKind = "evidence" | "candidate" | "hold" | "boq_ready";

export type IkKnrConversationSourceRef = {
  kind: IkKnrConversationSourceRefKind;
  tenderId: string;
  artifact: Record<string, unknown>;
};

export type IkKnrConversationStep = {
  id: IkKnrConversationStepId;
  event: IkKnrConversationEvent;
  actor: IkKnrConversationActor;
  actorLabelPl: string;
  status: IkKnrConversationStepStatus;
  statusLabelPl: string;
  messagePl: string;
  detailPl: string | null;
  sourceRef: IkKnrConversationSourceRef;
};

export type IkKnrConversationView = {
  tenderId: string;
  steps: IkKnrConversationStep[];
};

const STATUS_DONE_PL = "Gotowe";
const STATUS_BLOCKED_PL = "Czekam na przedmiar";

const BLOCKED_MESSAGE_PL =
  "Czekam na przedmiar. Bez tego nie sprawdzę oznaczeń.";

const LEAD_MESSAGE_PL = "Sprawdźmy najpierw oznaczenia katalogowe.";

const WRAP_HOLD_PL = "Nie zgadujemy. Niepewne zostaje do potwierdzenia.";

const WRAP_EMPTY_PL = "Brak oznaczeń katalogowych w danych.";

const WRAP_MARKINGS_PL =
  "Znaleziono oznaczenia katalogowe. Potwierdzenie zostawiamy na później.";

const WRAP_CONFLICT_PL = "Kilka odczytów wymaga potwierdzenia.";

function tenderIdOf(report: IkKnrExpertReport | null | undefined): string {
  return String(report?.tenderId ?? "").trim();
}

function sourceRef(
  tenderId: string,
  kind: IkKnrConversationSourceRefKind,
  artifact: Record<string, unknown>,
): IkKnrConversationSourceRef {
  return {
    kind,
    tenderId,
    artifact: { ...artifact },
  };
}

function formatHoldExample(row: IkKnrExpertLineResult): string {
  const lp = row.lp == null ? "" : String(row.lp).trim();
  return lp ? `Pozycja ${lp}: do sprawdzenia` : "Pozycja do sprawdzenia";
}

function holdExamplesDetail(report: IkKnrExpertReport): string | null {
  if (report.counts.hold <= 0) return null;
  const rows = (report.examplesHold ?? []).slice(0, 3);
  if (rows.length === 0) return null;
  return rows.map(formatHoldExample).join("; ");
}

function isCompleted(report: IkKnrExpertReport | null | undefined): boolean {
  return report?.status === "COMPLETED";
}

function blockedView(report: IkKnrExpertReport | null | undefined): IkKnrConversationView {
  const tenderId = tenderIdOf(report);
  return {
    tenderId,
    steps: [
      {
        id: "knr_blocked",
        event: "KNR_BLOCKED",
        actor: "lead",
        actorLabelPl: IK_KNR_CONVERSATION_LEAD_LABEL_PL,
        status: "blocked",
        statusLabelPl: STATUS_BLOCKED_PL,
        messagePl: BLOCKED_MESSAGE_PL,
        detailPl: null,
        sourceRef: sourceRef(tenderId, "boq_ready", {
          inputLineCount: report?.inputLineCount ?? 0,
          ready: false,
        }),
      },
    ],
  };
}

const WRAP_HIST_CONFLICT_PL =
  "Historyczne warianty KNR są sprzeczne. Nie wybieramy automatycznie — to nie jest norma.";

function wrapForCompleted(report: IkKnrExpertReport): {
  messagePl: string;
  kind: IkKnrConversationSourceRefKind;
  artifact: Record<string, unknown>;
} {
  const { hold, withBasis, candidate, conflict } = report.counts;
  const histConflict = report.counts.historicalConflict ?? 0;
  if (histConflict > 0) {
    return {
      messagePl: WRAP_HIST_CONFLICT_PL,
      kind: "hold",
      artifact: {
        historicalConflict: histConflict,
        authority: false,
      },
    };
  }
  if (hold > 0) {
    return {
      messagePl: WRAP_HOLD_PL,
      kind: "hold",
      artifact: { hold, withBasis },
    };
  }
  if (withBasis === 0) {
    return {
      messagePl: WRAP_EMPTY_PL,
      kind: "evidence",
      artifact: { withBasis: 0 },
    };
  }
  if (conflict > 0) {
    return {
      messagePl: WRAP_CONFLICT_PL,
      kind: "hold",
      artifact: { conflict },
    };
  }
  if (candidate > 0) {
    return {
      messagePl: WRAP_MARKINGS_PL,
      kind: "candidate",
      artifact: { candidate, withBasis },
    };
  }
  return {
    messagePl: WRAP_EMPTY_PL,
    kind: "evidence",
    artifact: { withBasis },
  };
}

function historicalReportSuffix(report: IkKnrExpertReport): string {
  const c = report.counts;
  const exact = (c.historicalExactRms ?? 0) + (c.historicalExact ?? 0);
  const family = c.historicalFamily ?? 0;
  const conflict = c.historicalConflict ?? 0;
  const miss = c.historicalMiss ?? 0;
  const parts: string[] = [];
  if (exact > 0) {
    parts.push(
      c.historicalExactRms > 0
        ? `Historyczne wykonania WGDOM: ${exact} exact (w tym ${c.historicalExactRms} z pełnym R/M/S).`
        : `Historyczne wykonania WGDOM: ${exact} exact occurrences.`,
    );
  }
  if (family > 0) {
    parts.push(
      `Historyczna rodzina KNR występuje dla ${family} pozycji, ale brak exact identity.`,
    );
  }
  if (conflict > 0) {
    parts.push(
      `Historyczne realizacje zawierają konflikt wariantów na ${conflict} pozycjach — bez auto-wyboru.`,
    );
  }
  if (miss > 0 && exact === 0 && family === 0 && conflict === 0) {
    parts.push(
      `Nie znaleziono historycznych odpowiedników WGDOM (${miss} pozycji). Brak historii nie oznacza błędu.`,
    );
  } else if (miss > 0) {
    parts.push(`Bez historii: ${miss}.`);
  }
  return parts.join(" ");
}

function knrReportMessage(report: IkKnrExpertReport): string {
  const { withBasis, hold, none, candidate, conflict } = report.counts;
  const parts = [
    `Przejrzałem ${report.inputLineCount} pozycji.`,
    `Oznaczenia katalogowe: ${withBasis}.`,
    `Do sprawdzenia: ${hold}.`,
    `Bez wystarczających danych: ${none}.`,
  ];
  if (candidate > 0) {
    parts.push("Znaleziono oznaczenia katalogowe.");
  }
  if (conflict > 0) {
    parts.push("Kilka odczytów wymaga potwierdzenia.");
  }
  const hist = historicalReportSuffix(report);
  if (hist) parts.push(hist);
  return parts.join(" ");
}

/**
 * Pure read-only adapter. Does not mutate `report`.
 * BLOCKED / missing / non-COMPLETED → one blocked step (no fake COMPLETED narrative).
 */
export function buildIkKnrConversation(
  report: IkKnrExpertReport | null | undefined,
): IkKnrConversationView {
  if (!isCompleted(report) || !report) {
    return blockedView(report);
  }

  const tenderId = tenderIdOf(report);
  const wrap = wrapForCompleted(report);
  const counts = report.counts;

  const steps: IkKnrConversationStep[] = [
    {
      id: "knr_lead",
      event: "KNR_LEAD",
      actor: "lead",
      actorLabelPl: IK_KNR_CONVERSATION_LEAD_LABEL_PL,
      status: "done",
      statusLabelPl: STATUS_DONE_PL,
      messagePl: LEAD_MESSAGE_PL,
      detailPl: null,
      sourceRef: sourceRef(tenderId, "boq_ready", {
        inputLineCount: report.inputLineCount,
      }),
    },
    {
      id: "knr",
      event: "KNR_REPORT",
      actor: "knr",
      actorLabelPl: IK_KNR_CONVERSATION_EXPERT_LABEL_PL,
      status: "done",
      statusLabelPl: STATUS_DONE_PL,
      messagePl: knrReportMessage(report),
      detailPl: holdExamplesDetail(report),
      sourceRef: sourceRef(tenderId, "evidence", {
        inputLineCount: report.inputLineCount,
        outputLineCount: report.outputLineCount,
        withBasis: counts.withBasis,
        withoutBasis: counts.withoutBasis,
        recognized: counts.recognized,
        candidate: counts.candidate,
        hold: counts.hold,
        conflict: counts.conflict,
        none: counts.none,
        resolved: counts.resolved,
        historicalExactRms: counts.historicalExactRms ?? 0,
        historicalExact: counts.historicalExact ?? 0,
        historicalFamily: counts.historicalFamily ?? 0,
        historicalConflict: counts.historicalConflict ?? 0,
        historicalMiss: counts.historicalMiss ?? 0,
        authority: false,
      }),
    },
    {
      id: "knr_wrap",
      event: "KNR_WRAP",
      actor: "lead",
      actorLabelPl: IK_KNR_CONVERSATION_LEAD_LABEL_PL,
      status: "done",
      statusLabelPl: STATUS_DONE_PL,
      messagePl: wrap.messagePl,
      detailPl: null,
      sourceRef: sourceRef(tenderId, wrap.kind, wrap.artifact),
    },
  ];

  return { tenderId, steps };
}
