/**
 * AP2-S1 — SSOT kompletności dokumentacji + gotowość wyceny + stats z dossier.
 * REUSE: roles, cost status, canPrepareValuation, scanSummary, categories — bez nowego parsera.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import {
  canPrepareValuation,
  resolvedCostStatus,
} from "@/lib/tender-data-ssot";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import {
  classifyDocumentRoleWithHints,
  DOCUMENT_ROLE_LABEL_PL,
  type DocumentRole,
  type DocumentRoleContentHints,
} from "@/lib/tender-document-role";
import { classifyTenderDocumentDisplayTier } from "@/lib/tender-workspace-ux";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";

export type DocCompletenessPresence =
  | "found"
  | "not_found"
  | "not_applicable"
  | "unknown";

export type DocCompletenessSlotId =
  | "swz"
  | "opz"
  | "stwior"
  | "przedmiar"
  | "kosztorys_inwestorski"
  | "projekt"
  | "rysunki"
  | "umowa"
  | "formularz"
  | "oswiadczenia"
  | "zalacznik_formalny"
  | "odpowiedzi_pytania"
  | "zmiany_swz"
  | "aneksy";

export type ValuationReadinessLevel = "ready" | "risk" | "insufficient";

export interface DocCompletenessSlot {
  id: DocCompletenessSlotId;
  label: string;
  presence: DocCompletenessPresence;
  /** Krótki tekst UI (np. „nieudostępniony”). */
  detailPl?: string;
  sourceFilenames: string[];
}

export interface DocumentationAnalysisStats {
  documentCount: number;
  /** null gdy parser nie podaje stron w dossier. */
  pageCount: number | null;
  branchCount: number;
  branchLabels: string[];
  sectionCount: number;
  sectionLabels: string[];
  przedmiarRowCount: number;
  attachmentCount: number;
  detectedRoles: DocumentRole[];
}

export interface DocumentationCompletenessView {
  slots: DocCompletenessSlot[];
  valuationReadiness: {
    level: ValuationReadinessLevel;
    labelPl: string;
    hint?: string;
  };
  stats: DocumentationAnalysisStats;
  highlights: {
    found: string[];
    missing: string[];
    info: string[];
  };
}

const SLOT_DEFS: { id: DocCompletenessSlotId; label: string }[] = [
  { id: "swz", label: "SWZ" },
  { id: "opz", label: "OPZ" },
  { id: "stwior", label: "STWiOR" },
  { id: "przedmiar", label: "Przedmiar" },
  { id: "kosztorys_inwestorski", label: "Kosztorys inwestorski" },
  { id: "projekt", label: "Projekt" },
  { id: "rysunki", label: "Rysunki" },
  { id: "umowa", label: "Umowa" },
  { id: "formularz", label: "Formularz ofertowy" },
  { id: "oswiadczenia", label: "Oświadczenia" },
  { id: "zalacznik_formalny", label: "Załączniki formalne" },
  { id: "odpowiedzi_pytania", label: "Odpowiedzi na pytania" },
  { id: "zmiany_swz", label: "Zmiany SWZ" },
  { id: "aneksy", label: "Aneksy" },
];

type DocRef = { filename: string; isSwzHint?: boolean; role: DocumentRole };

function buildContentHints(item: TenderPipelineItem, swz?: TenderSwzAnalysis | null): DocumentRoleContentHints {
  const costStatus = resolvedCostStatus(item);
  const scan = item.tenderDossier?.scanSummary;
  return {
    costDiscoverySource: scan?.costDiscovery?.source ?? item.tenderDossier?.kosztorys?.sourceFilename ?? null,
    costDiscoveryType: scan?.costDiscovery?.type ?? null,
    pricedKosztorys: costStatus === "FOUND_WITH_VALUE",
    przedmiarParsed: costStatus === "FOUND_NO_VALUE"
      || /pdf_przedmiar/.test(scan?.costDiscovery?.type ?? ""),
    hasSwzAnalysis: Boolean(swz?.parsedAt || swz?.source || item.swzAnalysis?.parsedAt),
  };
}

function collectClassifiedRefs(
  item: TenderPipelineItem,
  hints: DocumentRoleContentHints,
): DocRef[] {
  const refs: DocRef[] = [];
  for (const doc of item.bzpDocuments ?? []) {
    refs.push({
      filename: doc.filename,
      isSwzHint: doc.isSwzHint,
      role: classifyDocumentRoleWithHints(doc.filename, { ...hints, isSwzHint: doc.isSwzHint }),
    });
  }
  for (const file of item.externalDocDiscovery?.files ?? []) {
    refs.push({
      filename: file.filename,
      isSwzHint: file.isSwzHint,
      role: classifyDocumentRoleWithHints(file.filename, { ...hints, isSwzHint: file.isSwzHint }),
    });
  }
  if (item.uploadedFile?.filename) {
    refs.push({
      filename: item.uploadedFile.filename,
      role: classifyDocumentRoleWithHints(item.uploadedFile.filename, hints),
    });
  }
  return refs;
}

function filenamesForRoles(refs: DocRef[], roles: DocumentRole[]): string[] {
  return refs.filter((r) => roles.includes(r.role)).map((r) => r.filename);
}

function filenamesForTier(
  refs: DocRef[],
  tiers: Array<ReturnType<typeof classifyTenderDocumentDisplayTier>>,
): string[] {
  return refs
    .filter((r) => tiers.includes(classifyTenderDocumentDisplayTier(r.filename, { isSwzHint: r.isSwzHint })))
    .map((r) => r.filename);
}

function resolveSlotPresence(
  id: DocCompletenessSlotId,
  refs: DocRef[],
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  hints: DocumentRoleContentHints,
  docsSettled: boolean,
): Pick<DocCompletenessSlot, "presence" | "detailPl" | "sourceFilenames"> {
  const costStatus = resolvedCostStatus(item);
  const valuationOk = canPrepareValuation(item);

  switch (id) {
    case "swz": {
      const files = [
        ...filenamesForRoles(refs, ["swz", "swz_modification"]),
        ...filenamesForTier(refs, ["swz"]),
      ];
      const unique = [...new Set(files)];
      if (hints.hasSwzAnalysis || unique.length > 0) {
        return { presence: "found", sourceFilenames: unique };
      }
      return {
        presence: docsSettled ? "not_found" : "unknown",
        sourceFilenames: [],
      };
    }
    case "opz": {
      const files = filenamesForRoles(refs, ["opz"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "stwior": {
      const files = filenamesForRoles(refs, ["stwior"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "przedmiar": {
      const files = filenamesForRoles(refs, ["przedmiar", "obmiar"]);
      if (costStatus === "FOUND_NO_VALUE" || hints.przedmiarParsed || files.length > 0) {
        const rowCount = item.tenderDossier?.kosztorys?.rowCount ?? 0;
        return {
          presence: "found",
          sourceFilenames: files.length
            ? files
            : (item.tenderDossier?.kosztorys?.sourceFilename
              ? [item.tenderDossier.kosztorys.sourceFilename]
              : []),
          detailPl: rowCount > 0 ? `${rowCount} pozycji` : undefined,
        };
      }
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "kosztorys_inwestorski": {
      if (costStatus === "FOUND_WITH_VALUE") {
        const src = item.tenderDossier?.kosztorys?.sourceFilename;
        return {
          presence: "found",
          sourceFilenames: src ? [src] : filenamesForRoles(refs, ["kosztorys"]),
        };
      }
      if (valuationOk) {
        return {
          presence: "not_applicable",
          detailPl: "nieudostępniony",
          sourceFilenames: [],
        };
      }
      const files = filenamesForRoles(refs, ["kosztorys"]);
      if (files.length) {
        return {
          presence: "found",
          detailPl: "wykryty plik — bez cen",
          sourceFilenames: files,
        };
      }
      return {
        presence: docsSettled ? "not_found" : "unknown",
        detailPl: docsSettled ? "nieudostępniony" : undefined,
        sourceFilenames: [],
      };
    }
    case "projekt": {
      const files = filenamesForRoles(refs, [
        "projekt_wykonawczy",
        "projekt_budowlany",
        "dokumentacja_techniczna",
      ]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "rysunki": {
      const files = filenamesForRoles(refs, ["rysunki"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "umowa": {
      const files = [
        ...filenamesForRoles(refs, ["umowa"]),
        ...filenamesForTier(refs, ["wzor_umowy"]),
      ];
      const unique = [...new Set(files)];
      if (unique.length) return { presence: "found", sourceFilenames: unique };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "formularz": {
      const files = [
        ...filenamesForRoles(refs, ["formularz", "kosztorys_ofertowy"]),
        ...filenamesForTier(refs, ["formularz_ofertowy"]),
      ];
      const unique = [...new Set(files)];
      if (unique.length) return { presence: "found", sourceFilenames: unique };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "oswiadczenia": {
      const files = filenamesForRoles(refs, ["oswiadczenia"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "zalacznik_formalny": {
      const files = [
        ...filenamesForRoles(refs, ["zalacznik_formalny"]),
        ...filenamesForTier(refs, ["zalacznik_formalny"]),
      ];
      const unique = [...new Set(files)];
      if (unique.length) return { presence: "found", sourceFilenames: unique };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "odpowiedzi_pytania": {
      const files = filenamesForRoles(refs, ["odpowiedzi_pytania"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "zmiany_swz": {
      const files = filenamesForRoles(refs, ["swz_modification"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      // Brak zmian SWZ jest typowy — N/A gdy są docs
      if (docsSettled && refs.length > 0) {
        return { presence: "not_applicable", detailPl: "brak zmian", sourceFilenames: [] };
      }
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    case "aneksy": {
      const files = filenamesForRoles(refs, ["aneks"]);
      if (files.length) return { presence: "found", sourceFilenames: files };
      if (docsSettled && refs.length > 0) {
        return { presence: "not_applicable", detailPl: "brak aneksów", sourceFilenames: [] };
      }
      return { presence: docsSettled ? "not_found" : "unknown", sourceFilenames: [] };
    }
    default:
      return { presence: "unknown", sourceFilenames: [] };
  }
}

function buildStats(
  item: TenderPipelineItem,
  refs: DocRef[],
): DocumentationAnalysisStats {
  const k = item.tenderDossier?.kosztorys;
  const categories = (k?.categories ?? []).map((c) => c.name).filter(Boolean);
  const branchLabels = [...new Set(categories)].slice(0, 12);
  const sectionLabels = branchLabels;
  const roles = [...new Set(refs.map((r) => r.role).filter((r) => r !== "unknown"))];
  const scan = item.tenderDossier?.scanSummary;
  const attachmentCount = scan?.totalDocuments
    ?? countTenderAttachments(item);

  return {
    documentCount: refs.length,
    pageCount: null,
    branchCount: branchLabels.length,
    branchLabels,
    sectionCount: sectionLabels.length,
    sectionLabels,
    przedmiarRowCount: k?.rowCount ?? 0,
    attachmentCount,
    detectedRoles: roles,
  };
}

function resolveValuationReadiness(
  item: TenderPipelineItem,
  slots: DocCompletenessSlot[],
): DocumentationCompletenessView["valuationReadiness"] {
  const valuationOk = canPrepareValuation(item);
  const rowCount = item.tenderDossier?.kosztorys?.rowCount ?? 0;
  const swzFound = slots.find((s) => s.id === "swz")?.presence === "found";
  const opzFound = slots.find((s) => s.id === "opz")?.presence === "found";
  const przedmiarFound = slots.find((s) => s.id === "przedmiar")?.presence === "found";
  const formalOk = swzFound || opzFound;

  if (valuationOk && rowCount > 0 && formalOk) {
    return {
      level: "ready",
      labelPl: "Gotowy do wyceny",
      hint: "Przedmiar z pozycjami oraz dokumentacja formalna (SWZ/OPZ).",
    };
  }
  if (valuationOk || (przedmiarFound && formalOk)) {
    return {
      level: "risk",
      labelPl: "Możliwa wycena z ryzykiem",
      hint: !formalOk
        ? "Brak jasnego SWZ/OPZ — zweryfikuj dokumenty formalne."
        : rowCount === 0
          ? "Przedmiar wykryty, ale pozycje niepełne lub bez parsowania ilości."
          : "Dokumentacja pozwala na wycenę — uzupełnij brakujące załączniki.",
    };
  }
  if (przedmiarFound || valuationOk) {
    return {
      level: "risk",
      labelPl: "Możliwa wycena z ryzykiem",
      hint: "Materiał ilościowy częściowy — brak pełnej kompletności formalnej.",
    };
  }
  return {
    level: "insufficient",
    labelPl: "Dokumentacja niewystarczająca",
    hint: "Brak przedmiaru/kosztorysu z ilościami — nie można przygotować wyceny automatycznie.",
  };
}

function buildHighlights(slots: DocCompletenessSlot[]): DocumentationCompletenessView["highlights"] {
  const found: string[] = [];
  const missing: string[] = [];
  const info: string[] = [];
  for (const s of slots) {
    if (s.presence === "found") found.push(s.label);
    else if (s.presence === "not_found") missing.push(s.label);
    else if (s.presence === "not_applicable") {
      info.push(s.detailPl ? `${s.label} (${s.detailPl})` : s.label);
    }
  }
  return {
    found: found.slice(0, 6),
    missing: missing.slice(0, 6),
    info: info.slice(0, 4),
  };
}

export function presenceLabelPl(presence: DocCompletenessPresence): string {
  switch (presence) {
    case "found":
      return "znaleziony";
    case "not_found":
      return "nie znaleziony";
    case "not_applicable":
      return "nie dotyczy";
    default:
      return "nie można określić";
  }
}

export function presenceSymbol(presence: DocCompletenessPresence): string {
  switch (presence) {
    case "found":
      return "✅";
    case "not_found":
      return "❌";
    case "not_applicable":
      return "ℹ️";
    default:
      return "❔";
  }
}

export function valuationReadinessToneClass(level: ValuationReadinessLevel): string {
  switch (level) {
    case "ready":
      return "text-emerald-700 dark:text-emerald-400";
    case "risk":
      return "text-amber-700 dark:text-amber-400";
    default:
      return "text-red-700 dark:text-red-400";
  }
}

export function valuationReadinessBadge(level: ValuationReadinessLevel): string {
  switch (level) {
    case "ready":
      return "🟢";
    case "risk":
      return "🟡";
    default:
      return "🔴";
  }
}

/** AP2-S1 — główny builder kompletności. */
export function buildDocumentationCompleteness(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
}): DocumentationCompletenessView {
  const { item, swz } = opts;
  const hints = buildContentHints(item, swz);
  const refs = collectClassifiedRefs(item, hints);
  const docsSettled = refs.length > 0
    || Boolean(item.documentsFetchedAt)
    || tenderDossierHeavyParseDone(item.tenderDossier);

  const slots: DocCompletenessSlot[] = SLOT_DEFS.map((def) => {
    const resolved = resolveSlotPresence(def.id, refs, item, swz, hints, docsSettled);
    return {
      id: def.id,
      label: def.label,
      presence: resolved.presence,
      detailPl: resolved.detailPl,
      sourceFilenames: resolved.sourceFilenames,
    };
  });

  const stats = buildStats(item, refs);
  const valuationReadiness = resolveValuationReadiness(item, slots);
  const highlights = buildHighlights(slots);

  return { slots, valuationReadiness, stats, highlights };
}

export function formatDetectedRolesSummary(roles: DocumentRole[], max = 8): string {
  if (roles.length === 0) return "Brak sklasyfikowanych ról";
  const labels = roles.slice(0, max).map((r) => DOCUMENT_ROLE_LABEL_PL[r]);
  return roles.length > max ? `${labels.join(" · ")} +${roles.length - max}` : labels.join(" · ");
}
