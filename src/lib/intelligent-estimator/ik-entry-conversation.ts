/**
 * IK-MIGRATION-01 P1/P2 — Expert Conversation VM from Document Expert facts.
 * ZERO pricing claims · ZERO NG-10 labels · ZERO fake extraction.
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
import { collectIkEntryPipelineFacts } from "./ik-entry-pipeline-facts";
import {
  przedmiarBranchLabelPl,
  runIkDocumentExpert,
  type IkDocumentExpertReport,
  type IkDocumentExpertStatus,
} from "./ik-document-expert";
import type { TenderPackage } from "@/lib/multi-dwelling/types";

function messageWeight(text: string): number {
  return text.trim().length;
}

function statusFromExpert(s: IkDocumentExpertStatus): ExpertConversationStepStatus {
  switch (s) {
    case "ready": return "done";
    case "partial": return "partial";
    case "hold": return "hold";
    case "gap": return "gap";
    default: return "pending";
  }
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
  pkg?: TenderPackage | null,
): ExpertConversationViewModel {
  const facts = collectIkEntryPipelineFacts(item);
  const report: IkDocumentExpertReport = runIkDocumentExpert({ item, package: pkg });
  const steps: ExpertConversationStepView[] = [];
  const tenderRef = (extra: Record<string, unknown>, kind: ExpertConversationSourceRef["kind"] = "document"): ExpertConversationSourceRef => ({
    kind,
    tenderId: report.tenderId || facts.tenderId,
    documentId: report.documents[0]?.documentId ?? facts.documentIds[0],
    artifact: extra,
  });

  if (facts.discoverySettled && facts.attachmentCount > 0) {
    steps.push(
      step({
        id: "documents",
        event: "DOCUMENTS_DISCOVERED",
        status: "done",
        messagePl: `Znaleziono dokumentację przetargową (${facts.attachmentCount}).`,
        detailPl: report.documents
          .slice(0, 8)
          .map((d) => `${d.filename} (${d.roleLabelPl})`)
          .join("; ") || `Źródło: załączniki (${facts.attachmentCount}).`,
        sourceRef: tenderRef({
          attachmentCount: facts.attachmentCount,
          documentIds: report.documents.map((d) => d.documentId),
          discoverySettled: facts.discoverySettled,
        }),
      }),
    );
  } else if (facts.discoverySettled && facts.attachmentCount === 0) {
    steps.push(
      step({
        id: "documents",
        event: "DOCUMENTS_EMPTY",
        status: "partial",
        messagePl: "Discovery dokumentów zakończone — brak załączników.",
        detailPl: "Przedmiar nie został jeszcze znaleziony w runtime. To nie zamyka kosztorysowania.",
        sourceRef: tenderRef({
          attachmentCount: 0,
          discoverySettled: true,
          reason: "GAP_NO_DOCUMENTS",
        }),
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
        sourceRef: tenderRef({ discoverySettled: false }),
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
        sourceRef: tenderRef({
          swzPresent: true,
          swzDocumentId: facts.swzDocumentId,
        }),
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
        sourceRef: tenderRef({ swzPresent: false }),
      }),
    );
  }

  const costN = report.costDocuments.length;
  steps.push(
    step({
      id: "cost_docs",
      event: costN > 0 ? "COST_DOCUMENTS_IDENTIFIED" : "COST_DOCUMENTS_NONE",
      status: costN > 0 ? "done" : report.status === "pending" ? "pending" : "gap",
      messagePl: costN > 0
        ? `Znalazłem ${costN} ${costN === 1 ? "dokument kosztorysowy" : "dokumenty kosztorysowe"}.`
        : "Nie zidentyfikowano dokumentu kosztorysowego w aktualnym runtime.",
      detailPl: costN > 0
        ? report.costDocuments.map((d) => `${d.filename} (${d.costType})`).join("; ")
        : report.reasons.find((r) => r.startsWith("GAP_")) ?? "GAP — diagnostyka, nie happy-path HOLD.",
      sourceRef: tenderRef({
        costDocumentIds: report.costDocuments.map((d) => d.documentId),
        costCount: costN,
      }),
    }),
  );

  const prz = report.przedmiary;
  if (prz.length > 0) {
    steps.push(
      step({
        id: "przedmiary",
        event: "PRZEDMIARY_DISCOVERED",
        status: "done",
        messagePl: `Zidentyfikowałem ${prz.length} ${prz.length === 1 ? "przedmiar" : "przedmiary"}.`,
        detailPl: prz
          .map((p, i) => `Przedmiar ${i + 1}: ${przedmiarBranchLabelPl(p.branchHint)} (${p.filename}).`)
          .join(" "),
        sourceRef: tenderRef({
          przedmiarIds: prz.map((p) => p.documentId),
          branches: prz.map((p) => p.branchHint),
        }),
      }),
    );
  }

  if (report.extraction.executed) {
    steps.push(
      step({
        id: "extraction",
        event: "BOQ_EXTRACTED",
        status: report.extraction.gaps.length || report.extraction.validCount === 0
          ? "partial"
          : "done",
        messagePl: report.extraction.extractedCount > 0
          ? `Wyodrębniłem ${report.extraction.extractedCount} pozycji (${report.extraction.validCount} z ilością i jednostką).`
          : "Extraction uruchomione — 0 pozycji w runtime.",
        detailPl: [
          `detected=${report.extraction.detectedRowCount}`,
          ...report.extraction.gaps,
        ].join("; ") || null,
        sourceRef: tenderRef({
          detectedRowCount: report.extraction.detectedRowCount,
          extractedCount: report.extraction.extractedCount,
          validCount: report.extraction.validCount,
          gaps: report.extraction.gaps,
        }, "extraction"),
      }),
    );
  }

  if (report.extraction.extractedCount > 0) {
    steps.push(
      step({
        id: "validation",
        event: "BOQ_VALIDATED",
        status:
          report.validation.missingQuantity
          || report.validation.missingUnit
          || report.validation.missingDescription
          || report.validation.duplicateSuspicion
            ? "partial"
            : "done",
        messagePl: report.validation.reasons.length === 0
          ? "Walidacja: opis, ilość, jednostka i lineage w porządku."
          : `Walidacja: ${report.validation.reasons.slice(0, 4).join("; ")}.`,
        detailPl: `qty_miss=${report.validation.missingQuantity} unit_miss=${report.validation.missingUnit} dup=${report.validation.duplicateSuspicion}`,
        sourceRef: tenderRef({ validation: report.validation }, "extraction"),
      }),
    );
  }

  const master = report.masterBoq;
  if (master.readyForExperts) {
    steps.push(
      step({
        id: "boq_status",
        event: "BOQ_READY",
        status: "done",
        messagePl: `Master BOQ gotowy do przekazania ekspertom — ${master.lineCount} pozycji.`,
        detailPl: [
          `schema=v${master.schemaVersion ?? "?"}`,
          `sources=${master.sourceCount}`,
          master.dwellingCount ? `lokale=${master.dwellingCount}` : null,
          master.branchCount ? `branże=${master.branchCount}` : null,
          master.hasLineProvenance ? "lineProvenance=tak" : "lineProvenance=brak side-map",
        ].filter(Boolean).join(" · "),
        sourceRef: tenderRef({
          lineCount: master.lineCount,
          sourceCount: master.sourceCount,
          dwellingCount: master.dwellingCount,
          branchCount: master.branchCount,
          schemaVersion: master.schemaVersion,
        }, "boq_ready"),
      }),
    );
  } else if (report.status === "hold") {
    steps.push(
      step({
        id: "boq_status",
        event: "BOQ_STATUS",
        status: "hold",
        messagePl: "HOLD — problem techniczny lub konflikt danych. Kosztorys nie jest wykonany.",
        detailPl: report.reasons.slice(0, 4).join("; "),
        sourceRef: tenderRef({ reasons: report.reasons, rowCount: master.lineCount }, "hold"),
      }),
    );
  } else {
    steps.push(
      step({
        id: "boq_status",
        event: "BOQ_STATUS",
        status: statusFromExpert(report.status === "gap" ? "gap" : "partial"),
        messagePl: master.lineCount === 0
          ? "BOQ NOT READY — brak wiarygodnego Master BOQ w runtime."
          : `BOQ PARTIAL — ${master.lineCount} pozycji, nie READY FOR EXPERTS.`,
        detailPl: report.reasons.slice(0, 4).join("; ") || `rowCount=${master.lineCount}. Kosztorys nie jest wykonany.`,
        sourceRef: tenderRef({
          rowCount: master.lineCount,
          detectedRowCount: report.extraction.detectedRowCount,
          extractedCount: report.extraction.extractedCount,
          status: report.status,
          reasons: report.reasons,
        }, report.status === "gap" ? "hold" : "extraction"),
      }),
    );
  }

  return {
    visible: true,
    titlePl: EXPERT_CONVERSATION_TITLE_PL,
    subtitlePl: EXPERT_CONVERSATION_SUBTITLE_IK_PL,
    uiPhase: "ik_entry",
    caseIdShort: (report.tenderId || facts.tenderId).slice(0, 8) || null,
    steps,
    readyForDecision: false,
    hasBlocked: steps.some((s) => s.status === "blocked" || s.status === "hold"),
  };
}
