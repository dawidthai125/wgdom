import { useEffect, useState, type ReactNode } from "react";
import { X, Loader2, AlertTriangle, FileText } from "lucide-react";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  fetchAndParseKosztorys,
  isPdfFilename,
  isKosztorysPreviewExt,
  type AthPreviewResult,
} from "@/lib/ath-parser";
import { resolveJobFileStoragePath } from "@/lib/job-documents";

export function JobFilePreviewModal({
  item,
  athPreviewEnabled,
  onClose,
}: {
  item: InspectorFileItem;
  athPreviewEnabled: boolean;
  onClose: () => void;
}) {
  const url = item.kind === "jobFile" ? item.file.publicUrl : item.file.publicUrl;
  const filename = item.kind === "jobFile" ? item.file.filename : "zdjecie.jpg";
  const storagePath = item.kind === "jobFile" ? resolveJobFileStoragePath(item.file) : undefined;
  const isPdf = isPdfFilename(filename);
  const isPhoto = item.kind === "inspectorPhoto";
  const isKosztorys = item.kind === "jobFile" && item.file.kind === "kosztorys";

  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<AthPreviewResult | null>(null);

  useEffect(() => {
    if (isPdf || isPhoto) return;
    if (!isKosztorysPreviewExt(filename)) return;
    setLoading(true);
    setParseResult(null);
    fetchAndParseKosztorys(url, filename, storagePath, item.kind === "jobFile" ? item.file : undefined)
      .then(setParseResult)
      .finally(() => setLoading(false));
  }, [url, filename, storagePath, isPdf, isPhoto, item]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Podgląd — {filename}</p>
            {isKosztorys && !isPdf && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kosztorys ATH/NOR — odczyt sekcji pozycji. Pełny widok: NORMA lub PDF.
                </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={16}/>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          {isPdf && (
            <iframe
              title={filename}
              src={url}
              className="w-full h-[70dvh] rounded-lg border border-border bg-white"
            />
          )}

          {isPhoto && (
            <img src={url} alt={filename} className="max-w-full max-h-[70dvh] mx-auto rounded-lg"/>
          )}

          {!isPdf && !isPhoto && (
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

              {!loading && parseResult && (
                <div className="space-y-4">
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
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end gap-2">
          <a
            href={url}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80"
          >
            Pobierz plik
          </a>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
