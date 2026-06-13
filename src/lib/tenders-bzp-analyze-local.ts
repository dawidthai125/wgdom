import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { parseSwzPlainText, stripHtmlToText } from "@/lib/tenders-bzp-swz";
import { enrichSwzFromText } from "@/lib/tenders-bzp-swz-enrich";
import { displayTenderFilename, pickBestSwzDocumentForAnalysis } from "@/lib/tenders-bzp-filename";
import {
  analyzeTenderSwz,
  fetchTenderNoticeDetails,
  loadTenderBzpDocumentBytes,
  resolveTenderDocumentDownload,
  type TenderBzpDocument,
} from "@/lib/tenders-bzp";
import { mergeSwzAnalysis } from "@/lib/tender-document-resolver";
import { traceSwzPipeline } from "@/lib/tender-swz-trace";

export { enrichSwzFromText } from "@/lib/tenders-bzp-swz-enrich";

async function analyzeFromDocumentIndex(opts: {
  tenderId: string;
  documentIndex: number;
  bzpDocuments?: TenderBzpDocument[];
  ourEstimatePln?: number | null;
}): Promise<{ analysis: TenderSwzAnalysis; warnings: string[] } | null> {
  const doc = opts.bzpDocuments?.find((d) => d.index === opts.documentIndex);
  const filename = doc
    ? displayTenderFilename(doc.filename, {
      index: doc.index,
      contentType: doc.contentType,
      url: doc.downloadUrl,
    })
    : `Załącznik ${opts.documentIndex}`;
  const access = resolveTenderDocumentDownload(opts.bzpDocuments, opts.documentIndex);
  const downloadUrl = access?.downloadUrl;

  try {
    const { bytes } = await loadTenderBzpDocumentBytes(
      opts.tenderId,
      opts.documentIndex,
      downloadUrl,
      access?.sourcePageUrl,
    );
    traceSwzPipeline("document_download", {
      documentIndex: opts.documentIndex,
      filename,
      platform: access?.platform ?? "ezamowienia",
      bytes: bytes.byteLength,
    });

    const { parseDocumentToSwzText } = await import("@/lib/tenders-bzp-doc-parse");
    const parsed = await parseDocumentToSwzText(bytes, filename);
    traceSwzPipeline("pdf_parsed", {
      source: parsed.source,
      textLength: parsed.text.length,
      warnings: parsed.warnings,
    });

    const warnings = [...parsed.warnings];
    if (parsed.text.length < 80) return null;

    const base = parseSwzPlainText(parsed.text, {
      source: parsed.source,
      sourceFilename: filename,
      ourEstimatePln: opts.ourEstimatePln ?? null,
    });
    const analysis = enrichSwzFromText(parsed.text, base);
    traceSwzPipeline("metadata_extracted", {
      estimatedValuePln: analysis.estimatedValuePln,
      wadiumPln: analysis.wadiumPln,
      wadiumPercent: analysis.wadiumPercent,
      implementationDays: analysis.implementationDays,
    });
    return { analysis, warnings };
  } catch (e) {
    traceSwzPipeline("document_download", {
      documentIndex: opts.documentIndex,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
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

  const docIndex = opts.documentIndex
    ?? (opts.tenderId && opts.bzpDocuments?.length
      ? pickBestSwzDocumentForAnalysis(opts.bzpDocuments)?.index
      : undefined);

  if (docIndex && opts.tenderId) {
    const fromDoc = await analyzeFromDocumentIndex({
      tenderId: opts.tenderId,
      documentIndex: docIndex,
      bzpDocuments: opts.bzpDocuments,
      ourEstimatePln: opts.ourEstimatePln ?? null,
    });
    if (fromDoc) {
      analysis = fromDoc.analysis;
      warnings.push(...fromDoc.warnings);
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
  traceSwzPipeline("tender_updated", {
    estimatedValuePln: merged?.estimatedValuePln,
    wadiumPln: merged?.wadiumPln,
    wadiumRaw: merged?.wadiumRaw,
    source: merged?.source,
  });
  return { analysis: merged!, warnings };
}
