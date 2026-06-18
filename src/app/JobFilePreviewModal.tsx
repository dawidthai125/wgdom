import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Loader2, AlertTriangle, FileText, FileDown, Eye } from "lucide-react";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  fetchAndParseKosztorys,
  isPdfFilename,
  isKosztorysPreviewExt,
  kosztorysResultForDisplay,
  parseKosztorysBytes,
  type AthPreviewResult,
} from "@/lib/ath-parser";
import {
  is7zFilename,
  isDocxFilename,
  isXlsxFilename,
  isZipFilename,
  type ZipListedFile,
} from "@/lib/tenders-bzp-filename";
import {
  downloadKosztorysPdf,
  previewKosztorysPdf,
  KOSZTORYS_DISCLAIMER_BODY,
  KOSZTORYS_DISCLAIMER_TITLE,
  KOSZTORYS_DTT_CREDIT,
} from "@/lib/ath-kosztorys-pdf";
import { resolveJobFileStoragePath } from "@/lib/job-documents";
import { resolveJobAttachmentStoragePath } from "@/lib/job-attachments";
import { bytesToBlobUrl, loadTenderBzpDocumentBytes, loadTenderBzpDocumentBytesResolved, type TenderBzpDocument } from "@/lib/tenders-bzp";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";

function previewFilename(item: InspectorFileItem): string {
  if (item.kind === "imageUrl") return item.filename;
  if (item.kind === "jobFile" || item.kind === "jobAttachment") return item.file.filename;
  if (item.kind === "inspectorPhoto") return item.file.caption || "zdjecie.jpg";
  if (item.kind === "tenderBzp" || item.kind === "tenderUpload") return item.filename;
  return "plik";
}

function previewUrl(item: InspectorFileItem): string {
  if (item.kind === "imageUrl") return item.url;
  if (item.kind === "tenderUpload") return item.publicUrl;
  if (item.kind === "tenderBzp") return "";
  if (item.kind === "jobFile" || item.kind === "jobAttachment" || item.kind === "inspectorPhoto") return item.file.publicUrl;
  return "";
}

function isNoPreviewAttachmentExt(name: string): boolean {
  return /\.(dwg|zip|rar)$/i.test(name);
}

function isImageFilename(name: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(name);
}

export function JobFilePreviewModal({
  item,
  athPreviewEnabled,
  onClose,
  bzpDocuments,
}: {
  item: InspectorFileItem;
  athPreviewEnabled: boolean;
  onClose: () => void;
  bzpDocuments?: TenderBzpDocument[];
}) {
  const filename = previewFilename(item);
  const url = previewUrl(item);
  const storagePath = useMemo(() => {
    if (item.kind === "jobFile") return resolveJobFileStoragePath(item.file);
    if (item.kind === "jobAttachment") return resolveJobAttachmentStoragePath(item.file);
    if (item.kind === "tenderUpload") return item.path;
    return undefined;
  }, [item]);

  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<AthPreviewResult | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "pdf" | "text">("table");
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [zipEntries, setZipEntries] = useState<ZipListedFile[]>([]);
  const [pdfTextPreview, setPdfTextPreview] = useState<string | null>(null);
  const [pdfScanWarning, setPdfScanWarning] = useState<string | null>(null);
  const [effectiveFilename, setEffectiveFilename] = useState(filename);

  const isPdf = isPdfFilename(effectiveFilename);
  const isPhoto =
    item.kind === "inspectorPhoto"
    || item.kind === "imageUrl"
    || isImageFilename(effectiveFilename);
  const isKosztorys =
    (item.kind === "jobFile" && item.file.kind === "kosztorys")
    || ((item.kind === "tenderBzp" || item.kind === "tenderUpload") && isKosztorysPreviewExt(effectiveFilename));

  useEffect(() => {
    let cancelled = false;
    let revokeMedia: string | null = null;

    const reset = () => {
      setParseResult(null);
      setPdfPreviewUrl(null);
      setViewMode("table");
      setMediaBlobUrl(null);
      setZipEntries([]);
      setPdfTextPreview(null);
      setPdfScanWarning(null);
      setEffectiveFilename(filename);
    };

    reset();

    const load = async () => {
      if (item.kind === "jobAttachment") {
        const name = item.file.filename;
        if (isNoPreviewAttachmentExt(name)) {
          setParseResult({
            ok: false,
            format: "unknown",
            rows: [],
            warnings: ["Brak podglądu — pobierz plik."],
          });
          return;
        }
        if (isDocxFilename(name) || isXlsxFilename(name)) {
          setLoading(true);
          try {
            const {
              extractDocxText,
              parseDocumentToKosztorys,
            } = await import("@/lib/tenders-bzp-doc-parse");
            const res = await fetch(item.file.publicUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const bytes = new Uint8Array(await res.arrayBuffer());
            if (cancelled) return;
            if (isXlsxFilename(name)) {
              const xlsxResult = await parseDocumentToKosztorys(bytes, name);
              if (xlsxResult) setParseResult(kosztorysResultForDisplay(xlsxResult));
            } else {
              const text = await extractDocxText(bytes);
              setParseResult({
                ok: text.length >= 40,
                format: "text",
                rows: [],
                title: name,
                warnings: text.length < 80 ? ["DOCX — bardzo krótki tekst."] : [],
                rawPreview: text.slice(0, 120_000) || "Brak tekstu w dokumencie.",
              });
              setViewMode("text");
            }
          } catch (e) {
            if (!cancelled) {
              setParseResult({
                ok: false,
                format: "unknown",
                rows: [],
                warnings: [e instanceof Error ? e.message : "Nie udało się załadować podglądu"],
              });
            }
          } finally {
            if (!cancelled) setLoading(false);
          }
        }
        return;
      }

      if (item.kind === "tenderBzp") {
        setLoading(true);
        try {
          const {
            extractDocxText,
            extractPdfText,
            list7zFiles,
            listZipFiles,
            parseDocumentToKosztorys,
            read7zEntry,
            readZipEntry,
            resolveDocumentBytes,
          } = await import("@/lib/tenders-bzp-doc-parse");
          const loadTenderBytes = (docIndex: number, fallbackDownloadUrl?: string) => {
            if (bzpDocuments?.length) {
              return loadTenderBzpDocumentBytesResolved(item.tenderId, docIndex, bzpDocuments);
            }
            return loadTenderBzpDocumentBytes(
              item.tenderId,
              docIndex,
              fallbackDownloadUrl ?? item.downloadUrl,
              item.sourcePageUrl,
            );
          };
          const { bytes: outerBytes, filename: serverName, contentType } = await loadTenderBytes(
            item.documentIndex,
            item.downloadUrl,
          );
          if (cancelled) return;
          const innerFilename = item.filename || serverName;
          const outerArchiveFilename = item.outerArchiveFilename ?? serverName;
          const zipInner = item.kind === "tenderBzp" ? item.zipInnerPath : undefined;

          const loadBytes = async (idx: number) => {
            if (idx === item.documentIndex) return outerBytes;
            const r = await loadTenderBytes(idx, item.downloadUrl);
            return r.bytes;
          };
          let bytes = await resolveDocumentBytes(
            loadBytes,
            item.documentIndex,
            innerFilename,
            zipInner,
            zipInner ? outerArchiveFilename : undefined,
          );
          let name = zipInner ? innerFilename : innerFilename;

          if (isZipFilename(outerArchiveFilename) && !zipInner) {
            const entries = await listZipFiles(outerBytes);
            if (!cancelled) setZipEntries(entries);
            if (entries.length > 0) {
              const inner = await readZipEntry(outerBytes, entries[0].path);
              if (inner) {
                bytes = inner;
                name = entries[0].filename;
              }
            }
          } else if (is7zFilename(outerArchiveFilename) && !zipInner) {
            const entries = await list7zFiles(outerBytes);
            if (!cancelled) setZipEntries(entries);
            if (entries.length > 0) {
              const inner = await read7zEntry(outerBytes, entries[0].path);
              if (inner) {
                bytes = inner;
                name = entries[0].filename;
              }
            }
          }
          if (!cancelled) setEffectiveFilename(name);

          if (isPdfFilename(name)) {
            const blobUrl = bytesToBlobUrl(bytes, contentType);
            revokeMedia = blobUrl;
            setMediaBlobUrl(blobUrl);
            const { text, likelyScan, pageCount } = await extractPdfText(bytes);
            if (!cancelled) {
              if (text.length >= 80) setPdfTextPreview(text.slice(0, 120_000));
              if (likelyScan) {
                setPdfScanWarning(`PDF (${pageCount} str.) — mało tekstu; możliwy skan bez OCR.`);
              }
            }
          } else if (isKosztorysPreviewExt(name)) {
            if (!athPreviewEnabled) {
              setParseResult({
                ok: false,
                format: "unknown",
                rows: [],
                warnings: ["Podgląd kosztorysów ATH/NOR/XML jest wyłączony w ustawieniach."],
              });
            } else {
              setParseResult(kosztorysResultForDisplay(parseKosztorysBytes(bytes, name)));
            }
          } else if (isXlsxFilename(name)) {
            const xlsxResult = await parseDocumentToKosztorys(bytes, name);
            if (xlsxResult) setParseResult(kosztorysResultForDisplay(xlsxResult));
          } else if (isDocxFilename(name)) {
            const text = await extractDocxText(bytes);
            setParseResult({
              ok: text.length >= 40,
              format: "text",
              rows: [],
              title: name,
              warnings: text.length < 80 ? ["DOCX — bardzo krótki tekst."] : [],
              rawPreview: text.slice(0, 120_000) || "Brak tekstu w dokumencie.",
            });
            setViewMode("text");
          } else if (isImageFilename(name)) {
            const blobUrl = bytesToBlobUrl(bytes, contentType);
            revokeMedia = blobUrl;
            setMediaBlobUrl(blobUrl);
          } else {
            const blobUrl = bytesToBlobUrl(bytes, contentType);
            revokeMedia = blobUrl;
            setParseResult({
              ok: false,
              format: "unknown",
              rows: [],
              warnings: [`Brak podglądu dla tego typu pliku. Pobierz: ${name}`],
            });
            setMediaBlobUrl(blobUrl);
          }
        } catch (e) {
          if (!cancelled) {
            setParseResult({
              ok: false,
              format: "unknown",
              rows: [],
              warnings: [e instanceof Error ? e.message : "Nie udało się pobrać załącznika"],
            });
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (isPdf || isPhoto) return;

      if (!isKosztorysPreviewExt(filename)) return;
      if (!athPreviewEnabled) {
        setParseResult({
          ok: false,
          format: "unknown",
          rows: [],
          warnings: ["Podgląd kosztorysów ATH/NOR/XML jest wyłączony w ustawieniach."],
        });
        return;
      }

      setLoading(true);
      try {
        const fileRef = item.kind === "jobFile" ? item.file : undefined;
        const result = await fetchAndParseKosztorys(url, filename, storagePath, fileRef);
        if (!cancelled) setParseResult(result);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (revokeMedia) URL.revokeObjectURL(revokeMedia);
    };
  }, [item, url, filename, storagePath, isPdf, isPhoto, athPreviewEnabled]);

  useEffect(() => () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
  }, [pdfPreviewUrl]);

  const displayUrl = mediaBlobUrl || url;
  const showPdf = isPdf && Boolean(displayUrl);
  const showPhoto = isPhoto && Boolean(displayUrl);
  const canExportPdf = parseResult?.ok && parseResult.rows.length > 0;
  const hasTextPreview = Boolean(parseResult?.rawPreview) || Boolean(pdfTextPreview);
  const showTextView = viewMode === "text" && hasTextPreview;

  const handlePdfPreview = useCallback(async () => {
    if (!parseResult) return;
    setPdfBusy(true);
    try {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const blobUrl = await previewKosztorysPdf(parseResult, filename);
      setPdfPreviewUrl(blobUrl);
      setViewMode("pdf");
    } catch {
      window.alert("Nie udało się wygenerować PDF. Spróbuj ponownie.");
    } finally {
      setPdfBusy(false);
    }
  }, [parseResult, filename, pdfPreviewUrl]);

  const handlePdfDownload = useCallback(async () => {
    if (!parseResult) return;
    setPdfBusy(true);
    try {
      await downloadKosztorysPdf(parseResult, filename);
    } catch {
      window.alert("Nie udało się pobrać PDF.");
    } finally {
      setPdfBusy(false);
    }
  }, [parseResult, filename]);

  const przedmiarRows = parseResult?.rows.filter((r) => r.przedmiar && r.przedmiar.length > 0) ?? [];

  const kosztorysBranding = isKosztorys && !isPdf ? (
    <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border bg-card">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-9 w-auto shrink-0 object-contain"/>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">W&G DOM</p>
          <p className="text-[11px] text-muted-foreground">Przeglądarka kosztorysów — wyłącznie do użytku wewnętrznego</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-medium text-foreground/90">{KOSZTORYS_DISCLAIMER_TITLE}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{KOSZTORYS_DISCLAIMER_BODY}</p>
        <p className="text-[10px] italic text-muted-foreground border-t border-border/60 pt-2">{KOSZTORYS_DTT_CREDIT}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Podgląd — {filename}</p>
            {isKosztorys && !isPdf && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Podgląd wewnętrzny kosztorysu (.ath / .nor / .xml) — PDF z logo W&G DOM i klauzulą użytku wewnętrznego.
                </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canExportPdf && viewMode === "pdf" && (
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80"
              >
                Tabela
              </button>
            )}
            {showPdf && pdfTextPreview && viewMode !== "text" && (
              <button
                type="button"
                onClick={() => setViewMode("text")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80"
              >
                Tekst SWZ
              </button>
            )}
            {(showTextView || (viewMode === "text" && hasTextPreview)) && (showPdf || isDocxFilename(effectiveFilename)) && (
              <button
                type="button"
                onClick={() => setViewMode(showPdf ? "pdf" : "table")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80"
              >
                {showPdf ? "PDF" : "Wróć"}
              </button>
            )}
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <X size={16}/>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          {zipEntries.length > 0 && item.kind === "tenderBzp" && !item.zipInnerPath && (
            <div className="mb-4 rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pliki w archiwum ZIP ({zipEntries.length})
                </p>
              </div>
              <ul className="divide-y divide-border/60 max-h-40 overflow-y-auto">
                {zipEntries.map((entry) => (
                  <li key={entry.path} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                    <span className="truncate min-w-0" title={entry.path}>{entry.filename}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">score {entry.score}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground px-3 py-2 border-t border-border">
                Podgląd automatycznie otwiera najlepszy plik (ATH/PDF/XLSX). Pełna lista powyżej.
              </p>
            </div>
          )}

          {loading && item.kind === "tenderBzp" && (isPdf || isPhoto) && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 size={20} className="animate-spin"/>
              <span className="text-sm">Pobieram załącznik z BZP…</span>
            </div>
          )}

          {showPdf && !(loading && item.kind === "tenderBzp") && viewMode !== "text" && (
            <div className="space-y-2">
              {pdfScanWarning && (
                <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                  {pdfScanWarning}
                </div>
              )}
              <iframe
                title={filename}
                src={displayUrl}
                className="w-full h-[70dvh] rounded-lg border border-border bg-white"
              />
            </div>
          )}

          {showTextView && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <FileText size={13}/> Tekst dokumentu (pdf.js / DOCX)
              </p>
              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-words max-h-[70dvh] overflow-auto font-mono leading-relaxed">
                {pdfTextPreview || parseResult?.rawPreview}
              </pre>
            </div>
          )}

          {showPhoto && !(loading && item.kind === "tenderBzp") && (
            <img src={displayUrl} alt={filename} className="max-w-full max-h-[70dvh] mx-auto rounded-lg"/>
          )}

          {!showPdf && !showPhoto && !showTextView && (
            <>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 size={20} className="animate-spin"/>
                  <span className="text-sm">Analizuję plik…</span>
                </div>
              )}

              {!loading && !parseResult && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nie udało się załadować podglądu. Pobierz plik i otwórz w NORMA lub PDF.
                </p>
              )}

              {!loading && parseResult && viewMode === "pdf" && pdfPreviewUrl && (
                <div className="space-y-3">
                  {kosztorysBranding}
                  <iframe
                    title="Podgląd PDF kosztorysu"
                    src={pdfPreviewUrl}
                    className="w-full h-[62dvh] rounded-lg border border-border bg-white"
                  />
                </div>
              )}

              {!loading && parseResult && viewMode === "table" && (
                <div className="space-y-4">
                  {kosztorysBranding}
                  <div className="space-y-1">
                    {parseResult.documentType && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{parseResult.documentType}</p>
                    )}
                    {parseResult.title && (
                      <p className="text-sm font-semibold">{parseResult.title}</p>
                    )}
                    {parseResult.subtitle && (
                      <p className="text-xs text-muted-foreground">{parseResult.subtitle}</p>
                    )}
                    {parseResult.summary && (
                      <p className="text-xs font-medium text-foreground/90 mt-1">{parseResult.summary}</p>
                    )}
                  </div>

                  {parseResult.warnings.map((w) => (
                    <div key={w} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                      {w}
                    </div>
                  ))}

                  {parseResult.summaryLines && parseResult.summaryLines.length > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Podsumowanie kosztorysu</p>
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {parseResult.summaryLines.map((line, i) => (
                            <tr key={i} className={`border-t border-border/60 ${line.bold ? "bg-primary/5" : ""}`}>
                              <td
                                className={`px-3 py-2 ${line.bold ? "font-semibold" : "text-muted-foreground"}`}
                                style={{ paddingLeft: `${12 + (line.indent ?? 0) * 14}px` }}
                              >
                                {line.label}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono whitespace-nowrap ${line.bold ? "font-bold text-primary" : ""}`}>
                                {line.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {parseResult.rows.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pozycje kosztorysu</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-secondary/30 text-left">
                            <th className="px-2 py-2 font-medium">Lp</th>
                            <th className="px-2 py-2 font-medium">Podstawa</th>
                            <th className="px-2 py-2 font-medium min-w-[200px]">Opis pozycji</th>
                            <th className="px-2 py-2 font-medium">j.m.</th>
                            <th className="px-2 py-2 font-medium text-right">Ilość</th>
                            <th className="px-2 py-2 font-medium text-right">Cena j.</th>
                            <th className="px-2 py-2 font-medium text-right">Wartość</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const out: ReactNode[] = [];
                            let lastCat = "";
                            for (const row of parseResult.rows) {
                              const catKey = row.categoryLp ? `${row.categoryLp}|${row.category}` : row.category || "";
                              if (catKey && catKey !== lastCat) {
                                lastCat = catKey;
                                out.push(
                                  <tr key={`cat-${catKey}`} className="bg-emerald-500/10 border-t border-border">
                                    <td colSpan={7} className="px-2 py-2 font-semibold text-emerald-800 dark:text-emerald-300">
                                      {row.categoryLp ? `${row.categoryLp} · ` : ""}{row.category}
                                    </td>
                                  </tr>,
                                );
                              }
                              out.push(
                                <tr key={`${row.lp}-${row.description.slice(0, 20)}`} className="border-t border-border hover:bg-secondary/30">
                                  <td className="px-2 py-1.5">{row.lp}</td>
                                  <td className="px-2 py-1.5 font-mono text-[10px]">{row.code}</td>
                                  <td className="px-2 py-1.5">{row.description}</td>
                                  <td className="px-2 py-1.5">{row.unit}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{row.quantity}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{row.unitPrice}</td>
                                  <td className="px-2 py-1.5 text-right font-mono font-medium">{row.total}</td>
                                </tr>,
                              );
                            }
                            return out;
                          })()}
                        </tbody>
                      </table>
                      <p className="text-[10px] text-muted-foreground px-3 py-2 border-t border-border">
                        {parseResult.rows.length} pozycji
                        {parseResult.totalValue ? ` · wartość całkowita wg pliku: ${parseResult.totalValue} ${parseResult.currency || "PLN"}` : ""}
                      </p>
                    </div>
                  ) : parseResult.rawPreview ? (
                    <div className="bg-secondary/30 rounded-xl p-4">
                      <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                        <FileText size={13}/> Fragment pliku (tekst)
                      </p>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all max-h-[50dvh] overflow-auto font-mono leading-relaxed">
                        {parseResult.rawPreview}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nie udało się odczytać struktury kosztorysu. Pobierz plik i otwórz w NORMA, lub poproś o PDF.
                    </p>
                  )}

                  {przedmiarRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Przedmiar / obmiar</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-secondary/30 text-left">
                            <th className="px-2 py-2 font-medium">Lp</th>
                            <th className="px-2 py-2 font-medium min-w-[180px]">Opis pozycji</th>
                            <th className="px-2 py-2 font-medium text-right">Ilość</th>
                            <th className="px-2 py-2 font-medium min-w-[140px]">Obmiar / wzór</th>
                          </tr>
                        </thead>
                        <tbody>
                          {przedmiarRows.flatMap((row) =>
                            row.przedmiar!.map((pm, i) => (
                              <tr key={`${row.lp}-pm-${i}`} className="border-t border-border hover:bg-secondary/30">
                                <td className="px-2 py-1.5">{i === 0 ? row.lp : ""}</td>
                                <td className="px-2 py-1.5">{i === 0 ? row.description : ""}</td>
                                <td className="px-2 py-1.5 text-right font-mono">{pm.quantity}</td>
                                <td className="px-2 py-1.5 text-muted-foreground font-mono text-[10px]">{pm.formula || "—"}</td>
                              </tr>
                            )),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 flex flex-wrap justify-end gap-2">
          {canExportPdf && (
            <>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => void handlePdfPreview()}
                className="px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {pdfBusy ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>}
                Podgląd PDF
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => void handlePdfDownload()}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {pdfBusy ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14}/>}
                Pobierz PDF
              </button>
            </>
          )}
          {displayUrl ? (
            <a
              href={displayUrl}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80"
            >
              Pobierz plik
            </a>
          ) : null}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
