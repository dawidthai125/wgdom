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
  EXPERT_CONVERSATION_ACTOR_LABOR_PL,
  EXPERT_CONVERSATION_ACTOR_MATERIAL_PL,
  EXPERT_CONVERSATION_ACTOR_IDENTITY_PL,
  EXPERT_CONVERSATION_ACTOR_COST_PL,
  EXPERT_CONVERSATION_ACTOR_OFFER_PL,
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
import { runIkMasterBoqClassification, type IkClassificationReport } from "./ik-classification";
import type { IkLaborExpertReport } from "./ik-labor-expert";
import type { IkMaterialExpertReport } from "./ik-material-expert";
import type { IkIdentityCoverageReport } from "./ik-identity-coverage";
import type { IkMaterialIdentityP59Report } from "./ik-material-identity-p59";
import type { IkP7PositionCostBidReport } from "./ik-p7-position-cost-bid";
import type { IkNg02IngestBridgeResult } from "./ik-ng02-ingest-bridge";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { enforceIkConversationTruth } from "./ik-conversation-event";

export interface IkEntryConversationOpts {
  package?: TenderPackage | null;
  /** P2.5 — facts from existing NG-02 heavy bridge (optional). */
  ingest?: IkNg02IngestBridgeResult | null;
  /** Pipeline heavy flags from useTenderPipelineRuntime (optional). */
  pipelineIngest?: {
    dossierBuilding?: boolean;
    dossierEnriching?: boolean;
    heavyDone?: boolean;
  } | null;
  /** P3 — precomputed classification (optional; otherwise run when Master BOQ READY). */
  classification?: IkClassificationReport | null;
  /** P5 — Labor Expert report (async; pass when ready — never invent). */
  labor?: IkLaborExpertReport | null;
  /** P6 — Material Expert report (async; pass when ready — never invent). */
  material?: IkMaterialExpertReport | null;
  /** P5.5 — Identity Coverage audit (sync; never invent). */
  identityCoverage?: IkIdentityCoverageReport | null;
  /** P5.9 — Material identity blockers (identity only · no pricing). */
  materialIdentityP59?: IkMaterialIdentityP59Report | null;
  /** P7 — Position Cost → F5 → Bid → SUM (REUSE engines; never invent). */
  positionCostBid?: IkP7PositionCostBidReport | null;
}

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
  actorLabelPl?: string;
}): ExpertConversationStepView {
  return {
    id: opts.id,
    actorLabelPl: opts.actorLabelPl ?? EXPERT_CONVERSATION_ACTOR_DOCUMENT_PL,
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
  pkgOrOpts?: TenderPackage | null | IkEntryConversationOpts,
): ExpertConversationViewModel {
  const opts: IkEntryConversationOpts =
    pkgOrOpts
    && typeof pkgOrOpts === "object"
    && (
      "package" in pkgOrOpts
      || "ingest" in pkgOrOpts
      || "pipelineIngest" in pkgOrOpts
      ||       "classification" in pkgOrOpts
      ||       "labor" in pkgOrOpts
      || "material" in pkgOrOpts
      || "identityCoverage" in pkgOrOpts
      || "materialIdentityP59" in pkgOrOpts
      || "positionCostBid" in pkgOrOpts
    )
      ? pkgOrOpts
      : { package: (pkgOrOpts as TenderPackage | null | undefined) ?? null };
  const pkg = opts.package ?? null;
  const facts = collectIkEntryPipelineFacts(item);
  const report: IkDocumentExpertReport =
    opts.ingest?.expert
    ?? runIkDocumentExpert({ item, package: pkg });
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

  const ingest = opts.ingest;
  const pipe = opts.pipelineIngest;
  if (ingest?.started && !ingest.completed && ingest.phase !== "blocked") {
    steps.push(
      step({
        id: "ingest",
        event: "INGEST_STARTED",
        status: "active",
        messagePl: "Uruchamiam istniejący NG-02 heavy parse (ZIP → ATH/XLS/PDF).",
        detailPl: `docs=${ingest.documentsUsed}`,
        sourceRef: tenderRef({
          phase: ingest.phase,
          documentsUsed: ingest.documentsUsed,
          zipEvidence: ingest.zipEvidence,
        }, "extraction"),
      }),
    );
  } else if (pipe?.dossierBuilding || pipe?.dossierEnriching) {
    steps.push(
      step({
        id: "ingest",
        event: "INGEST_STARTED",
        status: "active",
        messagePl: pipe.dossierEnriching
          ? "NG-02: wzbogacanie dossier (metadata)."
          : "NG-02: heavy parse w toku.",
        detailPl: null,
        sourceRef: tenderRef({
          dossierBuilding: Boolean(pipe.dossierBuilding),
          dossierEnriching: Boolean(pipe.dossierEnriching),
        }, "extraction"),
      }),
    );
  }

  if (ingest?.completed || (ingest?.started && ingest.extractedLineCount > 0)) {
    steps.push(
      step({
        id: "ingest",
        event: "INGEST_COMPLETED",
        status: ingest.extractedLineCount > 0 ? "done" : "partial",
        messagePl: ingest.extractedLineCount > 0
          ? `NG-02 ingest zakończony — ${ingest.extractedLineCount} pozycji z parsera.`
          : "NG-02 ingest zakończony bez linii — BLOCKED.",
        detailPl: [
          ingest.primarySourceFilename ? `primary=${ingest.primarySourceFilename}` : null,
          `artifacts=${ingest.artifactCount}`,
          ...ingest.zipEvidence.map((z) => `${z.zipFilename}: inner=${z.innerCount}`),
          ...ingest.reasons.slice(0, 3),
        ].filter(Boolean).join(" · "),
        sourceRef: tenderRef({
          extractedLineCount: ingest.extractedLineCount,
          artifactCount: ingest.artifactCount,
          zipEvidence: ingest.zipEvidence,
          parsersReused: ingest.parsersReused,
          reasons: ingest.reasons,
        }, "extraction"),
      }),
    );
    if (ingest.artifactCount > 0 || ingest.extractedLineCount > 0) {
      steps.push(
        step({
          id: "extraction",
          event: "COST_DOCUMENTS_PARSED",
          status: "done",
          messagePl: `Sparsowano artefakty kosztowe (${ingest.artifactCount} źródeł).`,
          detailPl: ingest.parsersReused.join(", "),
          sourceRef: tenderRef({
            artifactCount: ingest.artifactCount,
            parsersReused: ingest.parsersReused,
          }, "extraction"),
        }),
      );
      if (ingest.extractedLineCount > 0) {
        steps.push(
          step({
            id: "extraction",
            event: "PRZEDMIAR_EXTRACTED",
            status: "done",
            messagePl: `Przedmiar wyodrębniony: ${ingest.extractedLineCount} pozycji z istniejących parserów.`,
            detailPl: ingest.primarySourceFilename,
            sourceRef: tenderRef({
              extractedLineCount: ingest.extractedLineCount,
              primarySourceFilename: ingest.primarySourceFilename,
            }, "extraction"),
          }),
        );
      }
    }
  } else if (ingest?.phase === "blocked" && ingest.started) {
    steps.push(
      step({
        id: "ingest",
        event: "INGEST_COMPLETED",
        status: "gap",
        messagePl: "NG-02 ingest nie zwrócił linii BOQ.",
        detailPl: ingest.reasons.join("; "),
        sourceRef: tenderRef({ reasons: ingest.reasons, zipEvidence: ingest.zipEvidence }, "hold"),
      }),
    );
  }

  if (report.extraction.executed && !steps.some((s) => s.event === "PRZEDMIAR_EXTRACTED")) {
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

  const map = report.dwellingMapping;
  if (map.artifactCount > 1 || map.ownerMapRequired || map.allMapped) {
    const mapStatus: ExpertConversationStepStatus = map.allMapped
      ? "done"
      : map.ownerMapRequired
        ? "partial"
        : "pending";
    steps.push(
      step({
        id: "validation",
        event: map.allMapped ? "DWELLING_MAP_COMPLETE" : "DWELLING_MAP_REQUIRED",
        status: mapStatus,
        messagePl: map.allMapped
          ? `Przypisałem artefakty do ${map.dwellings.length || report.masterBoq.dwellingCount} lokali (Owner map).`
          : `Wymagana mapa Owner document→lokal — ${map.unmappedCount}/${map.artifactCount} bez mapowania.`,
        detailPl: [
          `mapped=${map.mappedCount}`,
          `unmapped=${map.unmappedCount}`,
          map.sharedCandidateCount ? `shared_candidates=${map.sharedCandidateCount}` : null,
          map.ambiguousCount ? `ambiguous=${map.ambiguousCount}` : null,
          "filename≠SSOT",
          ...map.reasons.slice(0, 3),
        ].filter(Boolean).join(" · "),
        sourceRef: tenderRef({
          dwellingMapping: {
            artifactCount: map.artifactCount,
            mappedCount: map.mappedCount,
            unmappedCount: map.unmappedCount,
            allMapped: map.allMapped,
            sharedCandidateCount: map.sharedCandidateCount,
            coverage: map.coverage.map((c) => ({
              documentId: c.documentId,
              mapped: c.mapped,
              dwellingId: c.dwellingId,
              kind: c.kind,
            })),
          },
        }, "document"),
      }),
    );
  }

  const integrity = report.lineIntegrity;
  if (map.allMapped && report.extraction.extractedCount > 0) {
    steps.push(
      step({
        id: "validation",
        event: integrity.ok ? "LINE_INTEGRITY_VALIDATED" : "LINE_INTEGRITY_FAIL",
        status: integrity.ok ? "done" : "hold",
        messagePl: integrity.ok
          ? `${integrity.sourceLineCount} pozycji źródłowych zachowuje przypisanie (composed=${integrity.composedLineCount}).`
          : `Integralność linii: unexplained loss=${integrity.unexplainedLoss}, dup=${integrity.unexplainedDuplication}.`,
        detailPl: integrity.reasons.join("; ") || null,
        sourceRef: tenderRef({ lineIntegrity: integrity }, "extraction"),
      }),
    );
  }

  const master = report.masterBoq;
  if (master.readyForExperts) {
    steps.push(
      step({
        id: "boq_status",
        event: "MASTER_BOQ_READY",
        status: "done",
        messagePl: `Master BOQ gotowy do klasyfikacji — ${master.lineCount} pozycji.`,
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

  // P3 — Classification Gate (only when Master BOQ READY; ZERO research/pricing claims).
  if (master.readyForExperts) {
    const classification: IkClassificationReport =
      opts.classification
      ?? runIkMasterBoqClassification({ item, package: pkg, expert: report });

    steps.push(
      step({
        id: "classification",
        event: "CLASSIFICATION_STARTED",
        status: "done",
        messagePl: `Klasyfikacja Master BOQ — wejście ${classification.inputLineCount} pozycji.`,
        detailPl: "classifyEstimatorPricingPlane (A1) · ZERO research · ZERO wyceny",
        sourceRef: tenderRef({
          inputLineCount: classification.inputLineCount,
          masterReady: true,
        }, "classification"),
      }),
    );

    const c = classification.counts;
    steps.push(
      step({
        id: "classification",
        event: "CLASSIFICATION_COMPLETED",
        status: classification.reconciliation.ok ? "done" : "hold",
        messagePl: classification.reconciliation.ok
          ? `Klasyfikacja zakończona — ${classification.outputLineCount} linii (1:1).`
          : `Klasyfikacja PARTIAL — reconcilacja nie zgadza się (loss/dup).`,
        detailPl: [
          `LABOR=${c.LABOR}`,
          `MATERIAL=${c.MATERIAL}`,
          `COMPOUND(BOTH)=${c.COMPOUND}`,
          `UNKNOWN(UNRESOLVED)=${c.UNKNOWN}`,
          `recon=${classification.reconciliation.ok ? "PASS" : "FAIL"}`,
        ].join(" · "),
        sourceRef: tenderRef({
          outputLineCount: classification.outputLineCount,
          counts: c,
          reconciliation: classification.reconciliation,
          researchExecuted: classification.researchExecuted,
          pricingExecuted: classification.pricingExecuted,
          autoAcceptExecuted: classification.autoAcceptExecuted,
        }, "classification"),
      }),
    );

    if (c.LABOR > 0) {
      steps.push(
        step({
          id: "classification",
          event: "LABOR_LINES_IDENTIFIED",
          status: "done",
          messagePl: `Labor: ${c.LABOR} pozycji z plane LABOR (gotowe do eksperta — bez research).`,
          detailPl: `handoff=LABOR_READY_FOR_EXPERT · identity=Owner seed only`,
          sourceRef: tenderRef({ laborCount: c.LABOR, plane: "LABOR" }, "classification"),
        }),
      );
    }
    if (c.MATERIAL > 0) {
      steps.push(
        step({
          id: "classification",
          event: "MATERIAL_LINES_IDENTIFIED",
          status: "done",
          messagePl: `Materiał: ${c.MATERIAL} pozycji z plane MATERIAL (gotowe do eksperta — bez research).`,
          detailPl: `handoff=MATERIAL_READY_FOR_EXPERT · identity=Owner seed / mat.* only`,
          sourceRef: tenderRef({ materialCount: c.MATERIAL, plane: "MATERIAL" }, "classification"),
        }),
      );
    }
    if (c.UNKNOWN > 0 || c.COMPOUND > 0) {
      steps.push(
        step({
          id: "classification",
          event: "UNRESOLVED_LINES",
          status: c.UNKNOWN === classification.outputLineCount && c.LABOR === 0 && c.MATERIAL === 0
            ? "partial"
            : "done",
          messagePl: `Nierozstrzygnięte / HOLD: UNKNOWN=${c.UNKNOWN}, COMPOUND(BOTH HOLD)=${c.COMPOUND}.`,
          detailPl: "A1: brak invent z namePl — UNRESOLVED lepsze niż błędna plane",
          sourceRef: tenderRef({
            unknownCount: c.UNKNOWN,
            compoundCount: c.COMPOUND,
          }, "classification"),
        }),
      );
    }

    steps.push(
      step({
        id: "classification",
        event: "CLASSIFICATION_STATUS",
        status: classification.status === "ready" && classification.reconciliation.ok
          ? "done"
          : classification.status === "blocked"
            ? "hold"
            : "partial",
        messagePl: `Status klasyfikacji: ${classification.status.toUpperCase()}.`,
        detailPl: [
          `dwelling=${classification.dwellingPreservation ? "OK" : "FAIL"}`,
          `branch=${classification.branchPreservation ? "OK" : "FAIL"}`,
          `provenance=${classification.provenancePreservation ? "OK" : "FAIL"}`,
          `qty/unit=${classification.quantityUnitPreservation ? "OK" : "FAIL"}`,
          "research=NO",
          "pricing=NO",
          "autoAccept=NO",
        ].join(" · "),
        sourceRef: tenderRef({
          status: classification.status,
          dwellingPreservation: classification.dwellingPreservation,
          branchPreservation: classification.branchPreservation,
          provenancePreservation: classification.provenancePreservation,
          quantityUnitPreservation: classification.quantityUnitPreservation,
          researchExecuted: false,
          pricingExecuted: false,
          autoAcceptExecuted: false,
        }, "classification"),
      }),
    );
  }

  // P4 — Labor Expert (only when report provided — async path; ZERO invent).
  const labor = opts.labor ?? null;
  if (labor && labor.counts.inputLineCount > 0) {
    const lc = labor.counts;
    const laborStep = (
      event: string,
      status: ExpertConversationStepStatus,
      messagePl: string,
      detailPl: string | null,
      kind: ExpertConversationSourceRef["kind"],
      artifact: Record<string, unknown>,
    ) =>
      step({
        id: "labor",
        event,
        status,
        messagePl,
        detailPl,
        actorLabelPl: EXPERT_CONVERSATION_ACTOR_LABOR_PL,
        sourceRef: tenderRef(artifact, kind),
      });

    if (lc.workIdentityResolved > 0) {
      steps.push(
        laborStep(
          "WORK_IDENTITY_RESOLVED",
          "done",
          `Work identity: ${lc.workIdentityResolved}/${lc.outputLineCount} pozycji (Product Mapper + trusted match).`,
          `labor=${lc.labor} · nonLabor=${lc.nonLabor} · both=${lc.both} · unresolved=${lc.unresolved}`,
          "identity",
          {
            workIdentityResolved: lc.workIdentityResolved,
            labor: lc.labor,
            nonLabor: lc.nonLabor,
            both: lc.both,
            unresolved: lc.unresolved,
            nonCost: lc.nonCost,
          },
        ),
      );
    }

    if (lc.currentOurRateHit > 0) {
      steps.push(
        laborStep(
          "LABOR_CURRENT_HIT",
          "done",
          `OUR RATE CURRENT: ${lc.currentOurRateHit} (REUSE, bez research).`,
          "lookupWorkRate → CURRENT",
          "labor_lookup",
          { currentOurRateHit: lc.currentOurRateHit },
        ),
      );
    }

    if (lc.ourRateMiss > 0) {
      steps.push(
        laborStep(
          "LABOR_RATE_MISS",
          "partial",
          `OUR RATE MISS: ${lc.ourRateMiss} pozycji labor bez aktualnej stawki.`,
          `researchCalls=${lc.researchCalls} (dedupe workId|unit)`,
          "labor_lookup",
          { ourRateMiss: lc.ourRateMiss, researchCalls: lc.researchCalls },
        ),
      );
    }

    if (lc.researchCalls > 0) {
      steps.push(
        laborStep(
          "LABOR_RESEARCH_STARTED",
          "done",
          `Labor research: ${lc.researchCalls} unikalnych workId|unit (tylko LABOR + MISS).`,
          "runIkLaborGapResearch · ZERO research dla UNRESOLVED",
          "labor_research",
          { researchKeys: labor.researchKeys, researchCalls: lc.researchCalls },
        ),
      );
    }

    if (lc.evidenceCandidates > 0) {
      steps.push(
        laborStep(
          "LABOR_EVIDENCE_FOUND",
          "done",
          `Evidence / candidate: ${lc.evidenceCandidates}.`,
          "selective research → WorkRateResearchCandidate",
          "evidence",
          { evidenceCandidates: lc.evidenceCandidates },
        ),
      );
      steps.push(
        laborStep(
          "LABOR_CANDIDATE_READY",
          "done",
          `Kandydaci gotowi: ${lc.evidenceCandidates}.`,
          null,
          "candidate",
          { candidates: lc.evidenceCandidates },
        ),
      );
      steps.push(
        laborStep(
          "LABOR_OWNER_ACCEPT_REQUIRED",
          "partial",
          `Owner Accept wymagany: ${lc.ownerAcceptRequired} (ZERO auto-Accept).`,
          "acceptIkLaborResearchAndNotify — nie uruchomiony w P4",
          "candidate",
          {
            ownerAcceptRequired: lc.ownerAcceptRequired,
            acceptedOurRate: lc.acceptedOurRate,
            autoAcceptExecuted: false,
          },
        ),
      );
    }

    if (lc.acceptedOurRate > 0) {
      steps.push(
        laborStep(
          "LABOR_RATE_ACCEPTED",
          "done",
          `Zaakceptowane OUR RATE: ${lc.acceptedOurRate}.`,
          null,
          "candidate",
          { acceptedOurRate: lc.acceptedOurRate },
        ),
      );
    }

    if (lc.unresolved > 0) {
      steps.push(
        laborStep(
          "LABOR_UNRESOLVED",
          "partial",
          `Nadal UNRESOLVED: ${lc.unresolved} (brak trusted work identity lub plane UNKNOWN).`,
          "nie wymuszam LABOR · nie research",
          "identity",
          { unresolved: lc.unresolved },
        ),
      );
    }
  }

  // P5 — Material Expert (only when report provided — async path; ZERO invent).
  const material = opts.material ?? null;
  if (material && material.counts.inputLineCount > 0) {
    const mc = material.counts;
    const materialStep = (
      event: string,
      status: ExpertConversationStepStatus,
      messagePl: string,
      detailPl: string | null,
      kind: ExpertConversationSourceRef["kind"],
      artifact: Record<string, unknown>,
    ) =>
      step({
        id: "material",
        event,
        status,
        messagePl,
        detailPl,
        actorLabelPl: EXPERT_CONVERSATION_ACTOR_MATERIAL_PL,
        sourceRef: tenderRef(artifact, kind),
      });

    if (mc.materialIdentityResolved > 0) {
      steps.push(
        materialStep(
          "MATERIAL_IDENTITY_RESOLVED",
          "done",
          `Material identity: ${mc.materialIdentityResolved}/${mc.outputLineCount} (exact map / alias · 0 invent).`,
          `material=${mc.material} · labor=${mc.labor} · both=${mc.both} · unresolved=${mc.unresolved}`,
          "identity",
          {
            materialIdentityResolved: mc.materialIdentityResolved,
            material: mc.material,
            labor: mc.labor,
            both: mc.both,
            unresolved: mc.unresolved,
            nonCost: mc.nonCost,
          },
        ),
      );
    }

    if (mc.priceMemoryHit > 0) {
      steps.push(
        materialStep(
          "MATERIAL_PRICE_MEMORY_HIT",
          "done",
          `Price Memory HIT: ${mc.priceMemoryHit} (REUSE, bez research).`,
          "evaluateMaterialCache → CURRENT",
          "material_lookup",
          { priceMemoryHit: mc.priceMemoryHit },
        ),
      );
    }

    if (mc.priceMemoryMiss > 0) {
      steps.push(
        materialStep(
          "MATERIAL_PRICE_MEMORY_MISS",
          "partial",
          `Price Memory MISS: ${mc.priceMemoryMiss} (tylko trusted material identity).`,
          `researchCalls=${mc.researchCalls} (dedupe materialKey|region)`,
          "material_lookup",
          { priceMemoryMiss: mc.priceMemoryMiss, researchCalls: mc.researchCalls },
        ),
      );
    }

    if (mc.researchCalls > 0) {
      steps.push(
        materialStep(
          "MATERIAL_RESEARCH_STARTED",
          "done",
          `Material research: ${mc.researchCalls} unikalnych materialKey|region (tylko identity + MISS).`,
          "executeMaterialResearchPhase2 · ZERO research dla UNKNOWN",
          "material_research",
          { researchKeys: material.researchKeys, researchCalls: mc.researchCalls },
        ),
      );
    }

    if (mc.concreteProducts > 0) {
      steps.push(
        materialStep(
          "MATERIAL_PRODUCT_FOUND",
          "done",
          `Konkretny produkt / źródło: ${mc.concreteProducts}.`,
          "Phase2 candidate · real provider/mock_test harness",
          "evidence",
          { concreteProducts: mc.concreteProducts },
        ),
      );
    }

    if (mc.evidence > 0) {
      steps.push(
        materialStep(
          "MATERIAL_EVIDENCE_FOUND",
          "done",
          `Evidence: ${mc.evidence}.`,
          "PriceCandidate provenance",
          "evidence",
          { evidence: mc.evidence },
        ),
      );
      steps.push(
        materialStep(
          "MATERIAL_CANDIDATE_READY",
          "done",
          `Kandydaci cenowi: ${mc.candidates}.`,
          "CANDIDATE ≠ ACCEPTED",
          "candidate",
          { candidates: mc.candidates },
        ),
      );
      steps.push(
        materialStep(
          "MATERIAL_OWNER_ACCEPT_REQUIRED",
          "partial",
          `Owner Accept wymagany: ${mc.ownerAcceptRequired} (ZERO auto-Accept).`,
          "acceptIkMaterialResearchCandidate — nie uruchomiony automatycznie",
          "candidate",
          {
            ownerAcceptRequired: mc.ownerAcceptRequired,
            accepted: mc.accepted,
            autoAcceptExecuted: false,
          },
        ),
      );
    }

    if (mc.accepted > 0) {
      steps.push(
        materialStep(
          "MATERIAL_PRICE_ACCEPTED",
          "done",
          `Zaakceptowane ceny materiałów: ${mc.accepted}.`,
          "Price Memory persist po Owner Accept",
          "candidate",
          { accepted: mc.accepted },
        ),
      );
    }

    if (mc.unresolved > 0 && mc.materialIdentityResolved === 0) {
      steps.push(
        materialStep(
          "MATERIAL_UNRESOLVED",
          "partial",
          `Material UNRESOLVED: ${mc.unresolved} (brak trusted material identity — bez research).`,
          "nie zgaduję produktu z namePl",
          "identity",
          { unresolved: mc.unresolved, materialIdentityResolved: mc.materialIdentityResolved },
        ),
      );
    }
  }

  // P5.9 — Material identity blockers (IDENTITY ONLY · ZERO pricing / research / invent).
  const materialIdentityP59 = opts.materialIdentityP59 ?? null;
  if (materialIdentityP59 && materialIdentityP59.counts.inputLineCount > 0) {
    const pc = materialIdentityP59.counts;
    const p59Step = (
      event: string,
      status: ExpertConversationStepStatus,
      messagePl: string,
      detailPl: string | null,
      artifact: Record<string, unknown>,
    ) =>
      step({
        id: "material",
        event,
        status,
        messagePl,
        detailPl,
        actorLabelPl: EXPERT_CONVERSATION_ACTOR_MATERIAL_PL,
        sourceRef: tenderRef(artifact, "identity"),
      });

    if (pc.trustedMaterialIdentity > 0) {
      steps.push(
        p59Step(
          "MATERIAL_IDENTITY_RESOLVED",
          "done",
          `P5.9 trusted material identity: ${pc.trustedMaterialIdentity}/${pc.inputLineCount}.`,
          "existing Product Mapper / Wave1 pack only · 0 invent",
          {
            trustedMaterialIdentity: pc.trustedMaterialIdentity,
            technologyPackAfter: pc.technologyPackAfter,
          },
        ),
      );
    }
    if (pc.pendingOwnerNorm > 0) {
      steps.push(
        p59Step(
          "MATERIAL_IDENTITY_GAP",
          "partial",
          `P5.9 PENDING_OWNER_NORM: ${pc.pendingOwnerNorm} (brak materialKey + qtyFactor).`,
          "Wave1 MATERIALS_REQUIRED — bez invent normy · TechnologyPack nie zarejestrowany",
          {
            pendingOwnerNorm: pc.pendingOwnerNorm,
            missing: ["materialKey", "qtyFactor"],
            inventedMaterialKeys: 0,
            inventedQtyFactors: 0,
          },
        ),
      );
    }
    if (pc.productIdentityGap > 0) {
      steps.push(
        p59Step(
          "OWNER_MATERIAL_MAPPING_REQUIRED",
          "partial",
          `P5.9 PRODUCT_IDENTITY_GAP: ${pc.productIdentityGap} (Work bez mat.*/cw.product.*).`,
          "bez invent produktu · bez Castorama/LM/OBI",
          {
            productIdentityGap: pc.productIdentityGap,
            inventedProducts: 0,
          },
        ),
      );
    }
    if (pc.ownerReviewRequired > 0) {
      steps.push(
        p59Step(
          "OWNER_MATERIAL_MAPPING_REQUIRED",
          "hold",
          `P5.9 OWNER_REVIEW_REQUIRED: ${pc.ownerReviewRequired} (ambiguous — no silent pick).`,
          "Owner must choose among existing mappings",
          { ownerReviewRequired: pc.ownerReviewRequired },
        ),
      );
    }
  }

  // P5.5 — Identity Coverage (audit only · ZERO invent / pricing / research).
  const identityCoverage = opts.identityCoverage ?? null;
  if (identityCoverage && identityCoverage.counts.inputLineCount > 0) {
    const ic = identityCoverage.counts;
    const idStep = (
      event: string,
      status: ExpertConversationStepStatus,
      messagePl: string,
      detailPl: string | null,
      kind: ExpertConversationSourceRef["kind"],
      artifact: Record<string, unknown>,
    ) =>
      step({
        id: "identity_coverage",
        event,
        status,
        messagePl,
        detailPl,
        actorLabelPl: EXPERT_CONVERSATION_ACTOR_IDENTITY_PL,
        sourceRef: tenderRef(artifact, kind),
      });

    steps.push(
      idStep(
        "IDENTITY_COVERAGE_STARTED",
        "done",
        `Identity Coverage: ${ic.outputLineCount} linii Master BOQ (audit only).`,
        "REUSE Product Mapper · Alias Pack · Material exact · ZERO invent",
        "identity_coverage",
        {
          inputLineCount: ic.inputLineCount,
          outputLineCount: ic.outputLineCount,
          pricingExecuted: false,
          researchExecuted: false,
        },
      ),
    );

    if (ic.trustedWorkIdentity > 0) {
      steps.push(
        idStep(
          "WORK_IDENTITY_FOUND",
          "done",
          `Trusted Work Identity: ${ic.trustedWorkIdentity}.`,
          "Product Mapper TRUSTED_MATCH only",
          "identity",
          { trustedWorkIdentity: ic.trustedWorkIdentity },
        ),
      );
    }

    if (ic.trustedMaterialIdentity > 0) {
      steps.push(
        idStep(
          "MATERIAL_IDENTITY_FOUND",
          "done",
          `Trusted Material Identity: ${ic.trustedMaterialIdentity}.`,
          "resolveDemandProductIdentityExact only",
          "identity",
          { trustedMaterialIdentity: ic.trustedMaterialIdentity },
        ),
      );
    }

    if (ic.approvedAlias > 0) {
      steps.push(
        idStep(
          "IDENTITY_REUSE_HIT",
          "partial",
          `Approved Alias Pack trafień: ${ic.approvedAlias} (tekst; bind zależy od Quotes/work).`,
          "Catalog Coverage Alias · Owner-approved rules",
          "identity_coverage",
          { approvedAlias: ic.approvedAlias, ownerMappingPossible: ic.ownerMappingPossible },
        ),
      );
    }

    if (ic.ownerMappingPossible > 0) {
      steps.push(
        idStep(
          "IDENTITY_MAPPING_REQUIRED",
          "partial",
          `Owner mapping możliwy: ${ic.ownerMappingPossible} (Pack hit · brak work/Quotes).`,
          "nie auto-bind · nie invent",
          "identity_coverage",
          { ownerMappingPossible: ic.ownerMappingPossible },
        ),
      );
    }

    const seed = identityCoverage.wave2SeedAudit;
    steps.push(
      idStep(
        "IDENTITY_SEED_COMPLETED",
        seed.seedEligibleMissingWork === 0 && seed.duplicateWorkIds.length === 0
          ? "done"
          : "partial",
        seed.seedEligibleMissingWork === 0
          ? `Wave 2 seed: brak nowych entries (seedCreated=0) · W2 w katalogu ${seed.wave2IdsPresentInCatalog}/${seed.wave2IdsExpected}.`
          : `Wave 2 seed: ${seed.seedEligibleMissingWork} Pack hits bez work — OWNER_REVIEW (bez auto-seed).`,
        `source=${seed.source} · no fake works · Quotes OPS = existing catalog-wave-2-ops`,
        "identity_coverage",
        {
          seedCreated: seed.seedCreated,
          seedEligibleMissingWork: seed.seedEligibleMissingWork,
          alreadyPresentProductIds: seed.alreadyPresentProductIds,
          wave2IdsPresentInCatalog: seed.wave2IdsPresentInCatalog,
          invalidUnitAliasHits: seed.invalidUnitAliasHits,
          duplicateWorkIds: seed.duplicateWorkIds,
        },
      ),
    );

    if (ic.trustedWorkIdentity > 0) {
      steps.push(
        idStep(
          "WORK_IDENTITY_COVERAGE_CHANGED",
          "done",
          `Trusted Work Identity po Wave 2 catalog: ${ic.trustedWorkIdentity}.`,
          "REUSE existing Work Catalog · alias→TRUSTED_MATCH only when unit OK",
          "identity",
          {
            trustedWorkIdentity: ic.trustedWorkIdentity,
            identityGap: ic.identityGap,
            source: seed.source,
          },
        ),
      );
    }

    if (seed.invalidUnitAliasHits > 0) {
      steps.push(
        idStep(
          "OWNER_REVIEW_REQUIRED",
          "partial",
          `Owner review: ${seed.invalidUnitAliasHits} Pack hits z INVALID_UNIT (np. otw./aparat ≠ szt).`,
          "nie auto-map unit · nie invent work",
          "identity_coverage",
          { invalidUnitAliasHits: seed.invalidUnitAliasHits },
        ),
      );
    }

    if (seed.unitCompatibilityConfirmed > 0) {
      const confirmedLines = identityCoverage.lines
        .filter((l) => l.ownerUnitCompatibilityConfirmed)
        .slice(0, 12)
        .map((l) => ({
          lineId: l.lineId,
          dwellingId: l.dwellingId,
          sourceUnit: l.unit,
          catalogUnit: l.workIdentity.ownerUnitCompatibility?.catalogUnit ?? null,
          workId: l.workIdentity.workId,
          groupId: l.ownerUnitCompatibilityGroupId,
          quantity: l.quantity,
        }));
      steps.push(
        idStep(
          "UNIT_COMPATIBILITY_CONFIRMED",
          "done",
          `Owner unit compatibility: ${seed.unitCompatibilityConfirmed} linii (G1 otw.↔szt / G2 aparat↔szt).`,
          "qty unchanged · sourceUnit preserved · nie PRICE ACCEPTED",
          "identity_coverage",
          {
            unitCompatibilityConfirmed: seed.unitCompatibilityConfirmed,
            pricingAccepted: false,
            lines: confirmedLines,
          },
        ),
      );
    }

    if (ic.identityGap > 0 || ic.unresolved > 0) {
      steps.push(
        idStep(
          "IDENTITY_GAP",
          "partial",
          `Identity GAP: ${ic.identityGap} · UNRESOLVED (bez trusted): ${ic.unresolved}.`,
          identityCoverage.unresolvedExamples
            .slice(0, 3)
            .map((e) => `${e.lineId}: ${e.description.slice(0, 48)}`)
            .join(" · ") || "brak trusted path",
          "identity_coverage",
          {
            identityGap: ic.identityGap,
            unresolved: ic.unresolved,
            ambiguous: ic.ambiguous,
            examples: identityCoverage.unresolvedExamples.slice(0, 5),
          },
        ),
      );
    }

    steps.push(
      idStep(
        "IDENTITY_COVERAGE_COMPLETED",
        identityCoverage.reconciliation.ok ? "done" : "partial",
        `Coverage: work=${ic.trustedWorkIdentity} · material=${ic.trustedMaterialIdentity} · alias=${ic.approvedAlias} · gap=${ic.identityGap}.`,
        `lineCoverage=${identityCoverage.reconciliation.ok ? "PASS" : "FAIL"} · pricing=NO · research=NO · invent=NO · seedCreated=${seed.seedCreated}`,
        "identity_coverage",
        {
          ...ic.byStatus,
          reconciliationOk: identityCoverage.reconciliation.ok,
          pricingExecuted: false,
          researchExecuted: false,
          autoAcceptExecuted: false,
          identityInvention: false,
          seedCreated: seed.seedCreated,
        },
      ),
    );
  }

  // P7 — Position Cost → F5 → Bid → SUM (only when report provided; ZERO invent / research).
  const p7 = opts.positionCostBid ?? null;
  if (p7) {
    const p7Status = ((): ExpertConversationStepStatus => {
      switch (p7.status) {
        case "ready": return "done";
        case "partial": return "partial";
        case "gap": return "gap";
        case "blocked": return "blocked";
        default: return "hold";
      }
    })();
    const srcKind = p7.provenance.sourceRefKind;
    const costArtifact: Record<string, unknown> = {
      mode: p7.mode,
      cutoverGatePass: p7.cutoverGatePass,
      packageGatePass: p7.packageGatePass,
      billableLineCount: p7.billableLineCount,
      completeLineCount: p7.completeLineCount,
      gapLineCount: p7.gapLineCount,
      laborCostPln: p7.laborCostPln,
      materialCostPln: p7.materialCostPln,
      directPln: p7.directPln,
      rateSources: p7.provenance.rateSources,
      researchExecuted: p7.researchExecuted,
      httpCalls: p7.httpCalls,
      catalogWorkWrite: p7.catalogWorkWrite,
      priceMemoryWrite: p7.priceMemoryWrite,
      gapCodes: p7.gapCodes.slice(0, 12),
    };

    steps.push(
      step({
        id: "cost",
        event: "POSITION_COST_F5",
        status: p7Status,
        messagePl: p7.cutoverGatePass
          ? `Position Cost (F5): COMPLETE ${p7.completeLineCount}/${p7.billableLineCount} · labor=${p7.laborCostPln ?? "—"} · mat=${p7.materialCostPln ?? "—"} PLN.`
          : `Position Cost (F5): GAP/BLOCK — complete ${p7.completeLineCount}/${p7.billableLineCount} · gaps=${p7.gapLineCount}.`,
        detailPl: [
          `mode=${p7.mode}`,
          `research=${p7.researchExecuted}`,
          `http=${p7.httpCalls}`,
          `rates=${p7.provenance.rateSources.join("+")}`,
          p7.reasonsPl.slice(0, 2).join(" · ") || null,
        ].filter(Boolean).join(" · "),
        actorLabelPl: EXPERT_CONVERSATION_ACTOR_COST_PL,
        sourceRef: tenderRef(costArtifact, srcKind),
      }),
    );

    if (p7.provenance.packageSumUsed) {
      steps.push(
        step({
          id: "pricing",
          event: "PACKAGE_SUM",
          status: p7.packageGatePass === true ? "done" : "blocked",
          messagePl: p7.packageGatePass === true
            ? `PackageGate PASS · SUM dwellings = package direct ${p7.directPln ?? "—"} PLN.`
            : `PackageGate BLOCK — Final Bid zablokowany (MISSING ≠ 0 PLN).`,
          detailPl: p7.packageGate?.reasonsPl?.slice(0, 3).join(" · ") ?? null,
          actorLabelPl: EXPERT_CONVERSATION_ACTOR_COST_PL,
          sourceRef: tenderRef({
            packageGatePass: p7.packageGatePass,
            packageSumUsed: true,
            directPln: p7.directPln,
            researchExecuted: false,
          }, p7.packageGatePass === true ? "evidence" : "hold"),
        }),
      );
    }

    steps.push(
      step({
        id: "offer",
        event: "BID_PROPOSAL",
        status: p7.bidOk && p7.recommendedBidPln != null ? "done" : (p7Status === "gap" ? "gap" : "hold"),
        messagePl: p7.bidOk && p7.recommendedBidPln != null
          ? `Bid (REUSE computeTenderBidProposal): rekomendowana ${p7.recommendedBidPln.toLocaleString("pl-PL")} PLN.`
          : `Bid: brak recommendedBid (cutover/PackageGate FAIL — ZERO invent).`,
        detailPl: [
          `bidOk=${p7.bidOk}`,
          `catalogWrite=${p7.catalogWorkWrite}`,
          `pmWrite=${p7.priceMemoryWrite}`,
          p7.proposal?.sourceLabelPl ?? null,
        ].filter(Boolean).join(" · "),
        actorLabelPl: EXPERT_CONVERSATION_ACTOR_OFFER_PL,
        sourceRef: tenderRef({
          recommendedBidPln: p7.recommendedBidPln,
          bidOk: p7.bidOk,
          directPln: p7.directPln,
          researchExecuted: false,
          httpCalls: 0,
        }, p7.bidOk ? "evidence" : "hold"),
      }),
    );
  }

  const truthSteps = enforceIkConversationTruth(steps);
  return {
    visible: true,
    titlePl: EXPERT_CONVERSATION_TITLE_PL,
    subtitlePl: EXPERT_CONVERSATION_SUBTITLE_IK_PL,
    uiPhase: "ik_entry",
    caseIdShort: (report.tenderId || facts.tenderId).slice(0, 8) || null,
    steps: truthSteps,
    readyForDecision: false,
    hasBlocked: truthSteps.some((s) => s.status === "blocked" || s.status === "hold"),
  };
}
