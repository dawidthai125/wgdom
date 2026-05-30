import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { parseSwzPlainText, stripHtmlToText, extractTableHints } from "@/lib/tenders-bzp-swz";
import { extractAwardCriteria } from "@/lib/tenders-bzp-fit";
import { extractWadiumPercent } from "@/lib/tenders-wadium";
import {
  parseDocumentToSwzText,
  displayTenderFilename,
} from "@/lib/tenders-bzp-doc-parse";
import {
  analyzeTenderSwz,
  fetchTenderNoticeDetails,
  loadTenderBzpDocumentBytes,
  type TenderBzpDocument,
} from "@/lib/tenders-bzp";
import { mergeSwzAnalysis } from "@/lib/tender-document-resolver";

function enrichSwzFromText(
  text: string,
  base: TenderSwzAnalysis,
): TenderSwzAnalysis {
  const awardCriteria = extractAwardCriteria(text);
  const wadiumPercent = extractWadiumPercent(text);
  let wadiumPln = base.wadiumPln;
  if (wadiumPln == null && wadiumPercent != null && base.estimatedValuePln != null) {
    wadiumPln = Math.round(base.estimatedValuePln * wadiumPercent / 100);
  }
  return {
    ...base,
    awardCriteria: awardCriteria.length > 0 ? awardCriteria : base.awardCriteria,
    wadiumPercent: wadiumPercent ?? base.wadiumPercent,
    wadiumPln,
    tableExtracts: base.tableExtracts.length > 0 ? base.tableExtracts : extractTableHints(text),
  };
}

/** Analiza SWZ po stronie klienta — pdf.js dla PDF, pełniejsze kryteria i wadium. */
export async function analyzeTenderSwzEnhanced(opts: {
  noticeNumber?: string;
  tenderId?: string;
  documentIndex?: number;
  bzpDocuments?: TenderBzpDocument[];
  noticeHtml?: string | null;
  ourEstimatePln?: number | null;
  existing?: TenderSwzAnalysis | null;
}): Promise<{ analysis: TenderSwzAnalysis; warnings: string[] }> {
  const warnings: string[] = [];
  let analysis: TenderSwzAnalysis | null = null;

  if (opts.documentIndex && opts.tenderId) {
    const doc = opts.bzpDocuments?.find((d) => d.index === opts.documentIndex);
    const filename = doc
      ? displayTenderFilename(doc.filename, {
        index: doc.index,
        contentType: doc.contentType,
        url: doc.downloadUrl,
      })
      : `Załącznik ${opts.documentIndex}`;
    const bytes = await loadTenderBzpDocumentBytes(opts.tenderId, opts.documentIndex);
    const parsed = await parseDocumentToSwzText(bytes, filename);
    warnings.push(...parsed.warnings);
    if (parsed.text.length >= 80) {
      const base = parseSwzPlainText(parsed.text, {
        source: parsed.source,
        sourceFilename: filename,
        ourEstimatePln: opts.ourEstimatePln ?? null,
      });
      analysis = enrichSwzFromText(parsed.text, base);
    }
  }

  if (!analysis && opts.noticeHtml) {
    const text = stripHtmlToText(opts.noticeHtml);
    if (text.length >= 80) {
      const base = parseSwzPlainText(text, {
        source: "html",
        ourEstimatePln: opts.ourEstimatePln ?? null,
      });
      analysis = enrichSwzFromText(text, base);
    }
  }

  if (!analysis && opts.noticeNumber) {
    try {
      const det = await fetchTenderNoticeDetails(opts.noticeNumber);
      const html = det.htmlBody || opts.noticeHtml || "";
      const text = stripHtmlToText(html);
      if (text.length >= 80) {
        const base = parseSwzPlainText(text, {
          source: "html",
          ourEstimatePln: opts.ourEstimatePln ?? null,
        });
        analysis = enrichSwzFromText(text, base);
      }
    } catch {
      warnings.push("Nie udało się pobrać HTML ogłoszenia.");
    }
  }

  if (!analysis && opts.tenderId && opts.bzpDocuments?.length) {
    const doc = opts.bzpDocuments.find((d) => d.isSwzHint) ?? opts.bzpDocuments[0];
    if (doc) {
      return analyzeTenderSwzEnhanced({
        ...opts,
        documentIndex: doc.index,
      });
    }
  }

  if (!analysis && opts.noticeNumber) {
    try {
      analysis = await analyzeTenderSwz({
        noticeNumber: opts.noticeNumber,
        ourEstimatePln: opts.ourEstimatePln ?? null,
      });
      if (analysis) {
        warnings.push("Analiza serwerowa (HTML) — PDF może mieć więcej danych.");
      }
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : "Błąd analizy serwerowej");
    }
  }

  if (!analysis) {
    throw new Error("Brak tekstu do analizy — pobierz załączniki lub ogłoszenie BZP");
  }

  const merged = mergeSwzAnalysis(opts.existing ?? null, analysis);
  return { analysis: merged, warnings };
}
