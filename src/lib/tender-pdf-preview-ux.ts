/**
 * P1A — etykiety i zachowanie podglądu PDF (frontend only, bez parsera/dossier).
 */

import { isPdfFilename } from "@/lib/ath-parser";
import { isPdfPrzedmiarCostFilename } from "@/lib/tender-cost-discovery";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { CostDocumentUiType, ResolvedCostStatus } from "@/lib/tender-data-ssot";
import {
  classifyCostDocument,
  kosztorysHasPricedValue,
  resolvedCostStatus,
} from "@/lib/tender-data-ssot";
import type { CostDocKind, DocumentSummarySource } from "@/lib/tender-document-summary-header";

export type PdfPreviewRole = "swz" | "przedmiar_pdf" | "kosztorys_pdf" | "technical_pdf";

export interface TenderBzpPreviewContext extends DocumentSummarySource {
  pdfRole?: PdfPreviewRole;
  rowCount?: number;
  pdfPrzedmiarCase?: 1 | 2 | 3;
  priced?: boolean;
  isSwzHint?: boolean;
}

function docTypeToCostDocKind(
  docType: CostDocumentUiType,
  filename: string,
  priced: boolean,
  pdfRole?: PdfPreviewRole,
): CostDocKind | undefined {
  if (pdfRole === "przedmiar_pdf" || (docType === "PDF" && !priced)) return "przedmiar_pdf";
  if (pdfRole === "kosztorys_pdf" || (docType === "PDF" && priced)) return "kosztorys_pdf";
  const base = filename.split(" → ").pop()?.toLowerCase() ?? "";
  if (/\.nor$/i.test(base)) return "nor";
  if (/\.(ath|nor|xml)$/i.test(base) || docType === "ATH" || docType === "XML") {
    return /\.nor$/i.test(base) ? "nor" : "ath";
  }
  return undefined;
}

export interface PdfPreviewLabels {
  textTabButton: string;
  textViewHeading: string;
  pdfTabButton: string;
  downloadButton: string;
}

export interface PdfPreviewModalCopy {
  title: string;
  subtitle: string | null;
  labels: PdfPreviewLabels;
}

const LABELS: Record<PdfPreviewRole, PdfPreviewLabels> = {
  swz: {
    textTabButton: "Tekst SWZ",
    textViewHeading: "Treść specyfikacji",
    pdfTabButton: "PDF",
    downloadButton: "Pobierz SWZ",
  },
  przedmiar_pdf: {
    textTabButton: "Treść przedmiaru",
    textViewHeading: "Przedmiar robót",
    pdfTabButton: "Oryginalny PDF",
    downloadButton: "Pobierz PDF",
  },
  kosztorys_pdf: {
    textTabButton: "Treść kosztorysu",
    textViewHeading: "Kosztorys",
    pdfTabButton: "Oryginalny PDF",
    downloadButton: "Pobierz PDF",
  },
  technical_pdf: {
    textTabButton: "Treść dokumentu",
    textViewHeading: "Dokument PDF",
    pdfTabButton: "PDF",
    downloadButton: "Pobierz plik",
  },
};

const TITLES: Record<PdfPreviewRole, string> = {
  swz: "Podgląd — Specyfikacja zamówienia",
  przedmiar_pdf: "Podgląd — Przedmiar robót",
  kosztorys_pdf: "Podgląd — Kosztorys PDF",
  technical_pdf: "Podgląd — Dokument PDF",
};

export function resolvePdfPreviewRole(
  filename: string,
  ctx?: TenderBzpPreviewContext | null,
): PdfPreviewRole {
  if (ctx?.pdfRole) return ctx.pdfRole;

  const base = (filename.split(" → ").pop() ?? filename).toLowerCase();

  if (ctx?.isSwzHint || /\bswz\b|specyfikac|opz\b|modyfik.*swz/i.test(base)) {
    return "swz";
  }

  if (isPdfPrzedmiarCostFilename(filename)) {
    return ctx?.priced ? "kosztorys_pdf" : "przedmiar_pdf";
  }

  if (/kosztorys/i.test(base)) {
    return "kosztorys_pdf";
  }

  if (ctx?.priced && isPdfFilename(base)) return "kosztorys_pdf";

  return "technical_pdf";
}

/** Kontekst podglądu z istniejącego snapshotu (Owner quick access / dossier). */
export function buildPreviewContextFromPipelineItem(
  item: TenderPipelineItem,
): TenderBzpPreviewContext | undefined {
  const k = item.tenderDossier?.kosztorys;
  if (!k?.ok) return undefined;

  const classified = classifyCostDocument(item);
  const costStatus = resolvedCostStatus(item);
  const priced = classified?.priced ?? kosztorysHasPricedValue(k);
  const docType = classified?.type ?? "ATH";
  const filename = k.sourceFilename ?? "";
  const scan = item.tenderDossier?.scanSummary;
  const costType = scan?.costDiscovery?.type ?? "";

  let pdfRole: PdfPreviewRole | undefined;
  if (classified?.type === "PDF" || /pdf_przedmiar/i.test(costType)) {
    pdfRole = priced ? "kosztorys_pdf" : "przedmiar_pdf";
  } else if (isPdfPrzedmiarCostFilename(filename)) {
    pdfRole = priced ? "kosztorys_pdf" : "przedmiar_pdf";
  } else if (/\.pdf$/i.test(filename) && priced) {
    pdfRole = "kosztorys_pdf";
  }

  const costDocKind = docTypeToCostDocKind(docType, filename, priced, pdfRole);
  if (!pdfRole && !costDocKind) return undefined;

  const outerDoc = k.sourceDocumentIndex != null
    ? item.bzpDocuments?.find((d) => d.index === k.sourceDocumentIndex)
    : undefined;
  const outerName = outerDoc?.filename?.split(" → ")[0] ?? outerDoc?.filename;
  const sourceLabel = k.zipInnerPath && outerName
    ? outerName
    : (filename.split(" → ").pop() ?? filename);

  const pln = parsePlnFromKosztorysTotal(k.totalValue, k.currency);
  const totalValueDisplay = pln != null
    ? fmtPln(pln)
    : (k.totalValue?.trim() || null);

  const categories = k.categories?.filter((c) => c.name?.trim()) ?? [];
  const categoryCount = categories.length;

  const catalogDescriptions = k.catalogQuantities
    ?.map((q) => q.description?.trim())
    .filter((d): d is string => Boolean(d)) ?? [];

  const rowDescriptions = k.rows
    ?.map((r) => r.description?.trim())
    .filter((d): d is string => Boolean(d)) ?? [];

  const scopeDescription = item.tenderDossier?.brief?.scopeDescription ?? null;

  return {
    pdfRole,
    rowCount: k.rowCount,
    pdfPrzedmiarCase: k.pdfPrzedmiarCase,
    priced,
    costStatus,
    docType,
    costDocKind,
    totalValueDisplay: priced ? totalValueDisplay : null,
    sourceLabel,
    categoryCount: categoryCount > 0 ? categoryCount : undefined,
    categoryNames: categoryCount > 0 ? categories.map((c) => c.name) : undefined,
    catalogDescriptions: catalogDescriptions.length > 0 ? catalogDescriptions : undefined,
    rowDescriptions: rowDescriptions.length > 0 ? rowDescriptions : undefined,
    scopeDescription: scopeDescription?.trim() || undefined,
  };
}

export function buildPreviewContextFromBzpDoc(
  doc: { filename: string; isSwzHint?: boolean },
  filename: string,
): TenderBzpPreviewContext | undefined {
  if (!isPdfFilename(filename)) return undefined;

  if (doc.isSwzHint || /\bswz\b|specyfikac|opz\b/i.test(filename.toLowerCase())) {
    return { pdfRole: "swz", isSwzHint: true };
  }

  if (isPdfPrzedmiarCostFilename(filename)) {
    return { pdfRole: "przedmiar_pdf" };
  }

  if (/kosztorys/i.test(filename.toLowerCase())) {
    return { pdfRole: "kosztorys_pdf" };
  }

  return { pdfRole: "technical_pdf" };
}

export function buildPdfPreviewModalCopy(
  filename: string,
  ctx?: TenderBzpPreviewContext | null,
): PdfPreviewModalCopy {
  const role = resolvePdfPreviewRole(filename, ctx);
  const shortName = filename.split(" → ").pop() ?? filename;
  const title = role === "technical_pdf"
    ? `Podgląd — ${shortName}`
    : TITLES[role];
  const subtitle = role === "technical_pdf" ? null : shortName;
  return { title, subtitle, labels: LABELS[role] };
}

export function pdfPreviewDefaultViewMode(
  role: PdfPreviewRole,
): "table" | "pdf" | "text" {
  if (role === "przedmiar_pdf") return "text";
  return "table";
}

export const PDF_PRZEDMIAR_CAD_BANNER =
  "To jest techniczny przedmiar PDF.\n"
  + "Niektóre eksporty CAD mogą nie wyświetlać się poprawnie.\n"
  + "Treść dokumentu znajduje się poniżej.";

export function shouldShowPrzedmiarCadBanner(opts: {
  role: PdfPreviewRole;
  pdfTextPreview?: string | null;
  pdfPrzedmiarCase?: 1 | 2 | 3;
  pdfScanWarning?: string | null;
}): boolean {
  if (opts.role === "przedmiar_pdf") return true;
  if (opts.pdfPrzedmiarCase != null && opts.pdfPrzedmiarCase >= 2) return true;
  if (opts.pdfTextPreview && opts.pdfScanWarning) return true;
  return false;
}

export function resolvePdfDownloadFilename(
  displayFilename: string,
  effectiveFilename: string,
): string {
  return effectiveFilename || displayFilename || "dokument.pdf";
}

export function triggerBlobDownload(blobUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
