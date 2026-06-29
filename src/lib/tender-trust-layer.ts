/**
 * NG-01.1 — Tender Trust Layer (interpretacja only, bez I/O i merge).
 * SSOT oceny zaufania danych przetargowych dla UI i intelligence.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import {
  resolvedAwardCriteria,
  resolvedCostStatus,
  resolveTenderValue,
  type ResolvedCostStatus,
} from "@/lib/tender-data-ssot";
import {
  isDocumentDiscoverySettled,
  canRunDocumentDiscovery,
} from "@/lib/tender-document-discovery";
import {
  isKosztorysProcessInProgress,
  deriveKosztorysProcessPhase,
  type KosztorysProcessSession,
} from "@/lib/tender-kosztorys-process-phase";
import {
  sevenZKosztorysMissingLine,
  tenderDossierHeavyParseDone,
} from "@/lib/tender-dossier-pipeline";
import {
  CURRENT_PARSER_VERSION,
  isDossierParserStale,
} from "@/lib/tender-dossier-parser-version";
import { buildKosztorysAthVisibilityHint } from "@/lib/tender-detail-v4-display";
import {
  resolveTenderPlatformDocumentStatus,
  type DocumentsMissingReason,
} from "@/lib/tender-platform-awareness";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { SNAPSHOT_PRICED_ROWS_CAP } from "@/lib/tenders-bzp-brief";

/** Bump przy zmianie reguł derive (nie przy zmianie parsera). */
export const TENDER_TRUST_LAYER_VERSION = 1;

export type TenderTrustLevel = "trusted" | "partial" | "blocked" | "unknown";

export type TenderTrustDimensionId =
  | "documents"
  | "parse"
  | "kosztorys"
  | "pricing"
  | "metadata"
  | "sync";

export type TenderTrustReasonSeverity = "info" | "warn" | "error";

export interface TenderTrustReason {
  code: string;
  messagePl: string;
  severity: TenderTrustReasonSeverity;
}

export interface TenderTrustDimension {
  id: TenderTrustDimensionId;
  level: TenderTrustLevel;
  labelPl: string;
  reasons: TenderTrustReason[];
}

export interface TenderTrustAssessment {
  trustVersion: number;
  computedAt: string;
  overall: TenderTrustLevel;
  overallLabelPl: string;
  dimensions: TenderTrustDimension[];
}

export interface BuildTenderTrustAssessmentInput {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  kosztorysSession?: KosztorysProcessSession;
  /** Platform awareness — bootstrap dokumentów w toku. */
  loadingDocs?: boolean;
  /** Test / determinism. */
  computedAt?: string;
}

const LEVEL_RANK: Record<TenderTrustLevel, number> = {
  trusted: 0,
  unknown: 1,
  partial: 2,
  blocked: 3,
};

const DIMENSION_LABELS: Record<TenderTrustDimensionId, string> = {
  documents: "Dokumenty",
  parse: "Analiza załączników",
  kosztorys: "Kosztorys",
  pricing: "Wycena",
  metadata: "Metadane SWZ",
  sync: "Spójność snapshotu",
};

const OVERALL_LABELS: Record<TenderTrustLevel, string> = {
  trusted: "Dane wiarygodne — można wyceniać i podejmować decyzję",
  partial: "Dane niepełne — sprawdź szczegóły przed decyzją",
  blocked: "Brak wiarygodnego kosztorysu — wymagane działanie",
  unknown: "Analiza w toku — poczekaj na zakończenie przetwarzania",
};

function reason(
  code: string,
  messagePl: string,
  severity: TenderTrustReasonSeverity = "warn",
): TenderTrustReason {
  return { code, messagePl, severity };
}

function worstLevel(levels: TenderTrustLevel[]): TenderTrustLevel {
  if (levels.length === 0) return "unknown";
  return levels.reduce(
    (worst, cur) => (LEVEL_RANK[cur] > LEVEL_RANK[worst] ? cur : worst),
    "trusted" as TenderTrustLevel,
  );
}

function isPdfOcrBlocked(item: TenderPipelineItem): boolean {
  const scan = item.tenderDossier?.scanSummary;
  const k = item.tenderDossier?.kosztorys;
  const pdfCase = k?.pdfPrzedmiarCase ?? scan?.pdfPrzedmiarCase;
  if (pdfCase === 3) return true;
  if (scan?.pdfPrzedmiarNoTextLayer || scan?.pdfPrzedmiarExtractError) return true;
  if (k?.pdfPrzedmiarNoTextLayer || k?.pdfPrzedmiarExtractError) return true;
  return false;
}

function isRowCapLikely(item: TenderPipelineItem): boolean {
  const k = item.tenderDossier?.kosztorys;
  if (!k?.ok) return false;
  const rowCount = k.rowCount ?? k.rows?.length ?? 0;
  const pricedRows = k.rows?.length ?? 0;
  return rowCount >= SNAPSHOT_PRICED_ROWS_CAP || pricedRows >= SNAPSHOT_PRICED_ROWS_CAP;
}

function isFoundMissingReason(mr: DocumentsMissingReason): boolean {
  return mr === "found_ezamawiajacy"
    || mr === "found_logintrade"
    || mr === "found_ezamowienia"
    || mr === "found_external"
    || mr === "found_upload"
    || mr === "found_platformazakupowa"
    || mr === "found_smartpzp";
}

function isEmptyMissingReason(mr: DocumentsMissingReason): boolean {
  return mr.startsWith("missing_") && mr.endsWith("_empty");
}

function deriveDocumentsDimension(
  item: TenderPipelineItem,
  loadingDocs?: boolean,
): TenderTrustDimension {
  const reasons: TenderTrustReason[] = [];
  const platform = resolveTenderPlatformDocumentStatus(item, { loadingDocs });
  const { missingReason, documentsFound } = platform;

  if (loadingDocs || missingReason === "loading") {
    reasons.push(reason("docs_loading", "Pobieranie listy dokumentów…", "info"));
    return {
      id: "documents",
      level: "unknown",
      labelPl: DIMENSION_LABELS.documents,
      reasons,
    };
  }

  if (missingReason === "not_fetched_yet") {
    reasons.push(reason("docs_not_fetched", "Dokumenty nie zostały jeszcze pobrane.", "info"));
    return {
      id: "documents",
      level: "unknown",
      labelPl: DIMENSION_LABELS.documents,
      reasons,
    };
  }

  if (documentsFound > 0 && isFoundMissingReason(missingReason)) {
    if (missingReason === "found_external" || missingReason === "found_upload") {
      reasons.push(
        reason(
          "docs_external_or_upload",
          platform.successMessage ?? "Dokumenty z zewnętrznego źródła lub uploadu.",
          "info",
        ),
      );
      return {
        id: "documents",
        level: "partial",
        labelPl: DIMENSION_LABELS.documents,
        reasons,
      };
    }
    reasons.push(
      reason(
        "docs_found",
        platform.successMessage ?? `Znaleziono ${documentsFound} dokument(ów).`,
        "info",
      ),
    );
    return {
      id: "documents",
      level: "trusted",
      labelPl: DIMENSION_LABELS.documents,
      reasons,
    };
  }

  if (isEmptyMissingReason(missingReason) && item.documentsFetchedAt) {
    reasons.push(
      reason(
        "docs_platform_empty",
        platform.emptyMessage ?? "Platforma zamawiającego nie zwróciła załączników.",
        "error",
      ),
    );
    return {
      id: "documents",
      level: "blocked",
      labelPl: DIMENSION_LABELS.documents,
      reasons,
    };
  }

  if (missingReason === "missing_unknown" && !item.documentsFetchedAt) {
    reasons.push(reason("docs_unknown_pending", "Brak anchor do discovery dokumentów.", "warn"));
    return {
      id: "documents",
      level: "unknown",
      labelPl: DIMENSION_LABELS.documents,
      reasons,
    };
  }

  const attachmentCount = countTenderAttachments(item);
  if (attachmentCount === 0) {
    reasons.push(reason("docs_none", "Brak załączników do analizy.", "warn"));
    return {
      id: "documents",
      level: "blocked",
      labelPl: DIMENSION_LABELS.documents,
      reasons,
    };
  }

  reasons.push(
    reason(
      "docs_partial",
      platform.emptyMessage ?? "Część dokumentów może wymagać ręcznego pobrania.",
      "warn",
    ),
  );
  return {
    id: "documents",
    level: "partial",
    labelPl: DIMENSION_LABELS.documents,
    reasons,
  };
}

function deriveParseDimension(
  item: TenderPipelineItem,
  session: KosztorysProcessSession,
): TenderTrustDimension {
  const reasons: TenderTrustReason[] = [];
  const phase = deriveKosztorysProcessPhase(item, session);
  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const scan = item.tenderDossier?.scanSummary;

  if (session.dossierParseFailed || phase.id === "failed") {
    const msg = session.parseErrorMessage ?? phase.hint ?? "Analiza załączników została przerwana.";
    reasons.push(reason("parse_failed", msg, "error"));
    return {
      id: "parse",
      level: "blocked",
      labelPl: DIMENSION_LABELS.parse,
      reasons,
    };
  }

  if (isKosztorysProcessInProgress(phase) || phase.id === "waiting_data") {
    reasons.push(reason("parse_in_progress", phase.label, "info"));
    return {
      id: "parse",
      level: "unknown",
      labelPl: DIMENSION_LABELS.parse,
      reasons,
    };
  }

  if (!heavyDone && (item.bzpDocuments?.length ?? 0) > 0) {
    reasons.push(
      reason(
        "parse_pending",
        "Załączniki oczekują na ciężkie przetwarzanie (lazy dossier).",
        "info",
      ),
    );
    return {
      id: "parse",
      level: "unknown",
      labelPl: DIMENSION_LABELS.parse,
      reasons,
    };
  }

  if (heavyDone && isPdfOcrBlocked(item)) {
    reasons.push(
      reason(
        "parse_pdf_ocr",
        "PDF wymaga OCR lub pliku ATH/XLS — brak warstwy tekstowej.",
        "error",
      ),
    );
    return {
      id: "parse",
      level: "blocked",
      labelPl: DIMENSION_LABELS.parse,
      reasons,
    };
  }

  if (scan) {
    const sevenZLine = sevenZKosztorysMissingLine(scan);
    if (sevenZLine) {
      reasons.push(reason("parse_7z_missing", sevenZLine, "warn"));
      return {
        id: "parse",
        level: "partial",
        labelPl: DIMENSION_LABELS.parse,
        reasons,
      };
    }
  }

  if (heavyDone && phase.id === "not_found") {
    reasons.push(
      reason(
        "parse_no_kosztorys",
        phase.hint ?? "Przeskanowano załączniki — brak kosztorysu.",
        "warn",
      ),
    );
    return {
      id: "parse",
      level: "partial",
      labelPl: DIMENSION_LABELS.parse,
      reasons,
    };
  }

  if (heavyDone) {
    reasons.push(reason("parse_complete", "Analiza załączników zakończona.", "info"));
    return {
      id: "parse",
      level: "trusted",
      labelPl: DIMENSION_LABELS.parse,
      reasons,
    };
  }

  reasons.push(reason("parse_idle", "Brak danych o stanie analizy.", "info"));
  return {
    id: "parse",
    level: "unknown",
    labelPl: DIMENSION_LABELS.parse,
    reasons,
  };
}

function deriveKosztorysDimension(
  item: TenderPipelineItem,
  session: KosztorysProcessSession,
  parseLevel: TenderTrustLevel,
): TenderTrustDimension {
  const reasons: TenderTrustReason[] = [];
  const costStatus: ResolvedCostStatus = resolvedCostStatus(item);
  const phase = deriveKosztorysProcessPhase(item, session);

  if (parseLevel === "unknown" || isKosztorysProcessInProgress(phase)) {
    reasons.push(reason("kosztorys_pending", "Kosztorys oczekuje na zakończenie analizy.", "info"));
    return {
      id: "kosztorys",
      level: "unknown",
      labelPl: DIMENSION_LABELS.kosztorys,
      reasons,
    };
  }

  if (parseLevel === "blocked" || isPdfOcrBlocked(item)) {
    reasons.push(
      reason(
        "kosztorys_pdf_blocked",
        "Nie można zbudować kosztorysu z PDF (skan / brak tekstu).",
        "error",
      ),
    );
    return {
      id: "kosztorys",
      level: "blocked",
      labelPl: DIMENSION_LABELS.kosztorys,
      reasons,
    };
  }

  if (costStatus === "NOT_FOUND") {
    reasons.push(reason("kosztorys_not_found", "Nie znaleziono dokumentu kosztorysowego.", "error"));
    return {
      id: "kosztorys",
      level: "blocked",
      labelPl: DIMENSION_LABELS.kosztorys,
      reasons,
    };
  }

  const athHint = buildKosztorysAthVisibilityHint(item);
  if (athHint) {
    reasons.push(reason("kosztorys_ath_cap_ui", athHint.replace(/\n/g, " "), "warn"));
  }

  if (isRowCapLikely(item)) {
    reasons.push(
      reason(
        "kosztorys_row_cap",
        `Snapshot może być obcięty do ${SNAPSHOT_PRICED_ROWS_CAP} pozycji — sprawdź pełny ATH.`,
        "warn",
      ),
    );
  }

  if (costStatus === "FOUND_NO_VALUE") {
    reasons.push(
      reason(
        "kosztorys_no_prices",
        "Przedmiar bez cen — zakres robót bez wyceny w pliku.",
        "warn",
      ),
    );
    return {
      id: "kosztorys",
      level: "partial",
      labelPl: DIMENSION_LABELS.kosztorys,
      reasons,
    };
  }

  if (athHint || isRowCapLikely(item)) {
    reasons.push(reason("kosztorys_priced_partial", "Kosztorys wyceniony, ale widok może być niepełny.", "info"));
    return {
      id: "kosztorys",
      level: "partial",
      labelPl: DIMENSION_LABELS.kosztorys,
      reasons,
    };
  }

  reasons.push(reason("kosztorys_ok", "Kosztorys wyceniony i kompletny w snapshot.", "info"));
  return {
    id: "kosztorys",
    level: "trusted",
    labelPl: DIMENSION_LABELS.kosztorys,
    reasons,
  };
}

function derivePricingDimension(
  kosztorysLevel: TenderTrustLevel,
  item: TenderPipelineItem,
): TenderTrustDimension {
  const reasons: TenderTrustReason[] = [];

  if (kosztorysLevel === "unknown") {
    reasons.push(reason("pricing_pending", "Wycena oczekuje na gotowy kosztorys.", "info"));
    return {
      id: "pricing",
      level: "unknown",
      labelPl: DIMENSION_LABELS.pricing,
      reasons,
    };
  }

  if (kosztorysLevel === "blocked") {
    reasons.push(reason("pricing_blocked", "Wycena zablokowana — brak kosztorysu.", "error"));
    return {
      id: "pricing",
      level: "blocked",
      labelPl: DIMENSION_LABELS.pricing,
      reasons,
    };
  }

  const costStatus = resolvedCostStatus(item);
  const proposal = item.tenderDossier?.bidProposal;

  if (kosztorysLevel === "partial" || costStatus === "FOUND_NO_VALUE") {
    reasons.push(
      reason(
        "pricing_partial",
        "Możliwa wycena katalogowa z ilości — bez cen jednostkowych z przedmiaru.",
        "warn",
      ),
    );
    return {
      id: "pricing",
      level: "partial",
      labelPl: DIMENSION_LABELS.pricing,
      reasons,
    };
  }

  if (proposal?.ok && proposal.recommendedBidPln != null) {
    reasons.push(reason("pricing_proposal", "Kalkulator wyceny wygenerował propozycję.", "info"));
    return {
      id: "pricing",
      level: "trusted",
      labelPl: DIMENSION_LABELS.pricing,
      reasons,
    };
  }

  if (item.ourEstimatePln != null) {
    reasons.push(reason("pricing_estimate", "Zapisany szacunek własny (PLN).", "info"));
    return {
      id: "pricing",
      level: "trusted",
      labelPl: DIMENSION_LABELS.pricing,
      reasons,
    };
  }

  reasons.push(
    reason(
      "pricing_ready",
      "Kosztorys gotowy — uruchom kalkulator na zakładce Ceny.",
      "info",
    ),
  );
  return {
    id: "pricing",
    level: "trusted",
    labelPl: DIMENSION_LABELS.pricing,
    reasons,
  };
}

function deriveMetadataDimension(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): TenderTrustDimension {
  const reasons: TenderTrustReason[] = [];
  const mergedSwz = swz ?? item.swzAnalysis ?? null;
  const value = resolveTenderValue(item, mergedSwz);
  const criteria = resolvedAwardCriteria(mergedSwz);
  const hasFormal = (mergedSwz?.formalRequirements?.length ?? 0) > 0
    || (mergedSwz?.participationRequirements?.length ?? 0) > 0;

  if (!mergedSwz && !item.noticeHtml?.trim()) {
    reasons.push(reason("metadata_missing", "Brak analizy SWZ i treści ogłoszenia.", "warn"));
    return {
      id: "metadata",
      level: "unknown",
      labelPl: DIMENSION_LABELS.metadata,
      reasons,
    };
  }

  const hasValue = value.pln != null;
  const hasCriteria = criteria.length > 0;

  if (hasValue && hasCriteria) {
    reasons.push(reason("metadata_full", "Wykryto wartość zamówienia i kryteria oceny.", "info"));
    return {
      id: "metadata",
      level: "trusted",
      labelPl: DIMENSION_LABELS.metadata,
      reasons,
    };
  }

  if (hasValue || hasCriteria || hasFormal) {
    if (!hasValue) {
      reasons.push(reason("metadata_no_value", value.display, "warn"));
    }
    if (!hasCriteria) {
      reasons.push(reason("metadata_no_criteria", "Kryteria oceny nie zostały wykryte.", "warn"));
    }
    return {
      id: "metadata",
      level: "partial",
      labelPl: DIMENSION_LABELS.metadata,
      reasons,
    };
  }

  reasons.push(reason("metadata_minimal", "Minimalna ekstrakcja metadanych z ogłoszenia.", "warn"));
  return {
    id: "metadata",
    level: "partial",
    labelPl: DIMENSION_LABELS.metadata,
    reasons,
  };
}

function deriveSyncDimension(item: TenderPipelineItem): TenderTrustDimension {
  const reasons: TenderTrustReason[] = [];
  const dossier = item.tenderDossier;
  const parserVersion = dossier?.parserVersion;
  const heavyDone = tenderDossierHeavyParseDone(dossier);
  const stale = isDossierParserStale(dossier);
  const discoverySettled = isDocumentDiscoverySettled(item);
  const canDiscover = canRunDocumentDiscovery(item);

  if (stale) {
    reasons.push(
      reason(
        "sync_parser_stale",
        `Snapshot parsera v${parserVersion ?? "?"} — wymagany reskan (aktualny v${CURRENT_PARSER_VERSION}).`,
        "warn",
      ),
    );
    return {
      id: "sync",
      level: "partial",
      labelPl: DIMENSION_LABELS.sync,
      reasons,
    };
  }

  if (!discoverySettled && canDiscover) {
    reasons.push(
      reason(
        "sync_discovery_retry",
        "HTML ogłoszenia nowszy niż ostatni fetch dokumentów — możliwy retry discovery.",
        "warn",
      ),
    );
    return {
      id: "sync",
      level: "partial",
      labelPl: DIMENSION_LABELS.sync,
      reasons,
    };
  }

  if (heavyDone && parserVersion === CURRENT_PARSER_VERSION) {
    reasons.push(
      reason(
        "sync_snapshot_ok",
        `Snapshot dossier aktualny (parser v${CURRENT_PARSER_VERSION}).`,
        "info",
      ),
    );
    return {
      id: "sync",
      level: "trusted",
      labelPl: DIMENSION_LABELS.sync,
      reasons,
    };
  }

  if (dossier?.builtAt && !heavyDone) {
    reasons.push(reason("sync_incomplete", "Dossier w pamięci — ciężki parse nie zakończony.", "info"));
    return {
      id: "sync",
      level: "unknown",
      labelPl: DIMENSION_LABELS.sync,
      reasons,
    };
  }

  reasons.push(reason("sync_no_snapshot", "Brak snapshotu dossier w stanie KV.", "info"));
  return {
    id: "sync",
    level: "unknown",
    labelPl: DIMENSION_LABELS.sync,
    reasons,
  };
}

/** Jedyny entry point Trust Layer — czysta interpretacja SSOT. */
export function buildTenderTrustAssessment(
  input: BuildTenderTrustAssessmentInput,
): TenderTrustAssessment {
  const session = input.kosztorysSession ?? {};
  const documents = deriveDocumentsDimension(input.item, input.loadingDocs);
  const parse = deriveParseDimension(input.item, session);
  const kosztorys = deriveKosztorysDimension(input.item, session, parse.level);
  const pricing = derivePricingDimension(kosztorys.level, input.item);
  const metadata = deriveMetadataDimension(input.item, input.swz);
  const sync = deriveSyncDimension(input.item);

  const dimensions: TenderTrustDimension[] = [
    documents,
    parse,
    kosztorys,
    pricing,
    metadata,
    sync,
  ];

  const overall = worstLevel(dimensions.map((d) => d.level));

  return {
    trustVersion: TENDER_TRUST_LAYER_VERSION,
    computedAt: input.computedAt ?? new Date().toISOString(),
    overall,
    overallLabelPl: OVERALL_LABELS[overall],
    dimensions,
  };
}

/** Pomocniczo — wymiar po id (UI drill-down). */
export function findTrustDimension(
  assessment: TenderTrustAssessment,
  id: TenderTrustDimensionId,
): TenderTrustDimension | undefined {
  return assessment.dimensions.find((d) => d.id === id);
}
