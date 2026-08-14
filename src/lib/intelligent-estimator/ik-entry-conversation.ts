/**
 * IK-MIGRATION-01 P1 — thin Expert Conversation VM from pipeline facts.
 * ZERO pricing · ZERO labor/material execution claims · ZERO NG-10 labels.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type {
  ExpertConversationSourceRef,
  ExpertConversationStepStatus,
  ExpertConversationStepView,
  ExpertConversationViewModel,
} from "@/lib/expert-conversation-ui";
import {
  EXPERT_CONVERSATION_ACTOR_DOCUMENT_PL,
  EXPERT_CONVERSATION_SUBTITLE_IK_PL,
  EXPERT_CONVERSATION_TITLE_PL,
  labelConversationStatusPl,
} from "@/lib/expert-conversation-ui";
import {
  collectIkEntryPipelineFacts,
  type IkEntryPipelineFacts,
} from "./ik-entry-pipeline-facts";

function messageWeight(text: string): number {
  return text.trim().length;
}

function documentSourceRef(facts: IkEntryPipelineFacts): ExpertConversationSourceRef {
  return {
    kind: "document",
    tenderId: facts.tenderId,
    documentId: facts.documentIds[0],
    artifact: {
      attachmentCount: facts.attachmentCount,
      bzpDocumentCount: facts.bzpDocumentCount,
      documentIds: facts.documentIds,
      discoverySettled: facts.discoverySettled,
    },
  };
}

function swzSourceRef(facts: IkEntryPipelineFacts): ExpertConversationSourceRef {
  return {
    kind: "document",
    tenderId: facts.tenderId,
    documentId: facts.swzDocumentId ?? undefined,
    artifact: {
      swzPresent: facts.swzPresent,
      swzDocumentId: facts.swzDocumentId,
      hasSwzAnalysis: facts.hasSwzAnalysis,
    },
  };
}

function boqSourceRef(facts: IkEntryPipelineFacts): ExpertConversationSourceRef {
  const ready = facts.boqReadiness === "ready";
  return {
    kind: ready ? "boq_ready" : facts.boqReadiness === "partial" ? "extraction" : "hold",
    tenderId: facts.tenderId,
    artifact: {
      rowCount: facts.boqRowCount,
      sourceFilename: facts.boqSourceFilename,
      dossierPresent: facts.dossierPresent,
      boqReadiness: facts.boqReadiness,
    },
  };
}

function step(opts: {
  id: ExpertConversationStepView["id"];
  event: string;
  status: ExpertConversationStepStatus;
  messagePl: string;
  detailPl: string | null;
  sourceRef: ExpertConversationSourceRef;
}): ExpertConversationStepView {
  return {
    id: opts.id,
    actorLabelPl: EXPERT_CONVERSATION_ACTOR_DOCUMENT_PL,
    status: opts.status,
    statusLabelPl: labelConversationStatusPl(opts.status),
    messagePl: opts.messagePl,
    detailPl: opts.detailPl,
    event: opts.event,
    offerPricePln: null,
    offerPriceDisplayPl: null,
    iconKey: "flag",
    messageWeight: messageWeight(opts.messagePl),
    sourceRef: opts.sourceRef,
  };
}

export function buildIkEntryConversationViewModel(
  item: TenderPipelineItem,
): ExpertConversationViewModel {
  const facts = collectIkEntryPipelineFacts(item);
  const steps: ExpertConversationStepView[] = [];

  if (facts.discoverySettled && facts.attachmentCount > 0) {
    steps.push(
      step({
        id: "documents",
        event: "DOCUMENTS_DISCOVERED",
        status: "done",
        messagePl: `Znaleziono dokumentację przetargową (${facts.attachmentCount}).`,
        detailPl:
          facts.bzpDocumentCount > 0
            ? `Źródło: załączniki BZP (${facts.bzpDocumentCount}).`
            : `Źródło: załączniki przetargu (${facts.attachmentCount}).`,
        sourceRef: documentSourceRef(facts),
      }),
    );
  } else if (facts.discoverySettled && facts.attachmentCount === 0) {
    steps.push(
      step({
        id: "documents",
        event: "DOCUMENTS_EMPTY",
        status: "partial",
        messagePl: "Discovery dokumentów zakończone — brak załączników.",
        detailPl: "Przedmiar nie został jeszcze znaleziony w runtime.",
        sourceRef: documentSourceRef(facts),
      }),
    );
  } else {
    steps.push(
      step({
        id: "documents",
        event: "DOCUMENTS_PENDING",
        status: "pending",
        messagePl: "Oczekiwanie na discovery dokumentów.",
        detailPl: "Pipeline nie oznaczył discovery jako zakończonego.",
        sourceRef: documentSourceRef(facts),
      }),
    );
  }

  if (facts.swzPresent) {
    steps.push(
      step({
        id: "swz",
        event: "SWZ_PRESENT",
        status: "done",
        messagePl: facts.hasSwzAnalysis
          ? "Wykryto SWZ / analizę ogłoszenia."
          : "Wykryto dokument SWZ w załącznikach.",
        detailPl: facts.swzDocumentId
          ? `sourceRef dokumentu: ${facts.swzDocumentId}`
          : "Analiza SWZ dostępna w pipeline.",
        sourceRef: swzSourceRef(facts),
      }),
    );
  } else {
    steps.push(
      step({
        id: "swz",
        event: "SWZ_ABSENT",
        status: "partial",
        messagePl: "Brak potwierdzonego SWZ w aktualnym runtime.",
        detailPl: "Nie oznacza to, że kosztorysowanie jest zamknięte.",
        sourceRef: swzSourceRef(facts),
      }),
    );
  }

  if (facts.boqReadiness === "ready") {
    steps.push(
      step({
        id: "boq_status",
        event: "BOQ_STATUS",
        status: "done",
        messagePl: `Przedmiar odczytany — ${facts.boqRowCount} pozycji.`,
        detailPl: facts.boqSourceFilename
          ? `Źródło snapshot: ${facts.boqSourceFilename}`
          : "Źródło: tenderDossier.kosztorys",
        sourceRef: boqSourceRef(facts),
      }),
    );
  } else if (facts.boqReadiness === "partial") {
    steps.push(
      step({
        id: "boq_status",
        event: "BOQ_STATUS",
        status: "partial",
        messagePl: "BOQ NOT READY — extraction niepełny lub 0 pozycji.",
        detailPl: `rowCount=${facts.boqRowCount}. Kosztorys nie jest wykonany.`,
        sourceRef: boqSourceRef(facts),
      }),
    );
  } else {
    steps.push(
      step({
        id: "boq_status",
        event: "BOQ_STATUS",
        status: "partial",
        messagePl: "BOQ NOT READY — brak snapshotu przedmiaru w runtime.",
        detailPl: "P2 wykona Document Expert → extraction. To nie jest HOLD na zawsze.",
        sourceRef: boqSourceRef(facts),
      }),
    );
  }

  return {
    visible: true,
    titlePl: EXPERT_CONVERSATION_TITLE_PL,
    subtitlePl: EXPERT_CONVERSATION_SUBTITLE_IK_PL,
    uiPhase: "ik_entry",
    caseIdShort: facts.tenderId.slice(0, 8) || null,
    steps,
    readyForDecision: false,
    hasBlocked: steps.some((s) => s.status === "blocked"),
  };
}
