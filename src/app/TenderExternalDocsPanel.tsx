import { useMemo, useState } from "react";
import {
  ExternalLink, Eye, Download, Globe, Loader2, RefreshCw, FileText, Building2, ChevronDown, ChevronUp,
} from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import { discoverExternalTenderDocs } from "@/lib/tender-external-docs";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename, isZipFilename } from "@/lib/tenders-bzp-doc-parse";
import { toast } from "sonner";

function canPreview(name: string): boolean {
  return isPdfFilename(name) || isKosztorysPreviewExt(name) || isDocxFilename(name)
    || isXlsxFilename(name) || isZipFilename(name);
}

function sourceLabel(source: string): string {
  if (source === "notice") return "ogłoszenie";
  if (source === "bip_search") return "szukaj BIP";
  if (source === "crawl") return "powiązane";
  return "BIP";
}

export function TenderExternalDocsPanel({
  item,
  discovery,
  discovering,
  athPreviewEnabled,
  onDiscovery,
  onParsed,
}: {
  item: TenderPipelineItem;
  discovery?: TenderExternalDocDiscovery | null;
  discovering?: boolean;
  athPreviewEnabled?: boolean;
  onDiscovery: (d: TenderExternalDocDiscovery) => void;
  onParsed?: () => void;
}) {
  const [preview, setPreview] = useState<InspectorFileItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const noticeLinks = useMemo(
    () => (discovery?.pageLinks ?? []).filter((l) => l.source === "notice"),
    [discovery?.pageLinks],
  );
  const otherLinks = useMemo(
    () => (discovery?.pageLinks ?? []).filter((l) => l.source !== "notice"),
    [discovery?.pageLinks],
  );
  const files = discovery?.files ?? [];
  const hasContent = noticeLinks.length > 0 || otherLinks.length > 0 || files.length > 0
    || discovering || busy || discovery?.status === "failed";

  const runDiscover = async () => {
    if (!item.tenderId) {
      toast.error("Brak tenderId");
      return;
    }
    setBusy(true);
    setExpanded(true);
    try {
      const d = await discoverExternalTenderDocs({
        tenderId: item.tenderId,
        noticeHtml: item.noticeHtml,
        organizationName: item.organizationName,
        priorityBuyerId: item.priorityBuyerId,
        title: item.title,
        bzpNumber: item.bzpNumber,
      });
      onDiscovery(d);
      if (d.files.length > 0) {
        toast.success(`Pobrano ${d.files.length} plik(ów) dla tego postępowania`);
        onParsed?.();
      } else if (d.pageLinks.length > 0) {
        toast.message("Są linki z ogłoszenia — otwórz ręcznie lub wgraj SWZ");
      } else {
        toast.message("Brak linków do dokumentów w ogłoszeniu");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd pobierania dokumentów zewnętrznych");
    } finally {
      setBusy(false);
    }
  };

  if (!hasContent && !item.noticeHtml && !item.priorityBuyerId) return null;

  const summaryParts: string[] = [];
  if (files.length > 0) summaryParts.push(`${files.length} plik(ów)`);
  if (noticeLinks.length > 0) summaryParts.push(`${noticeLinks.length} link(ów) z ogłoszenia`);

  return (
    <>
      <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 overflow-hidden">
        <div className="px-3 py-2.5 flex flex-wrap items-center gap-2">
          <Building2 size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1">
              Dokumenty u zamawiającego
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </p>
            <p className="text-[10px] text-muted-foreground truncate" title={item.title}>
              {item.bzpNumber && <span className="font-mono">{item.bzpNumber} · </span>}
              {summaryParts.length > 0 ? summaryParts.join(" · ") : "linki z ogłoszenia BZP, nie cały portal"}
            </p>
          </button>
          <button
            type="button"
            disabled={busy || discovering}
            onClick={(e) => { e.stopPropagation(); void runDiscover(); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {(busy || discovering) ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {busy || discovering ? "Szukam…" : "Szukaj"}
          </button>
        </div>

        {expanded && (
          <div className="border-t border-sky-500/15 px-3 py-2 space-y-3">
            {(busy || discovering) && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                <Loader2 size={11} className="animate-spin" />
                Tylko linki z ogłoszenia i pliki pasujące do tytułu / numeru BZP…
              </p>
            )}

            {discovery?.message && !busy && !discovering && (
              <p className={`text-[10px] ${
                discovery.status === "failed" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
              }`}>
                {discovery.message}
                {discovery.builtAt && (
                  <> · {new Date(discovery.builtAt).toLocaleString("pl-PL")}</>
                )}
              </p>
            )}

            {files.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pobrane pliki ({files.length})
                </p>
                <ul className="space-y-1">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/20 bg-background/60 px-2.5 py-1.5 text-xs"
                    >
                      <FileText size={13} className="shrink-0 text-muted-foreground" />
                      {file.isSwzHint && (
                        <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1 rounded shrink-0">SWZ</span>
                      )}
                      {file.fromNotice && (
                        <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1 rounded shrink-0">ogłoszenie</span>
                      )}
                      <span className="truncate min-w-0 flex-1 font-medium" title={file.filename}>{file.filename}</span>
                      {canPreview(file.filename) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreview({
                              kind: "tenderUpload",
                              filename: file.filename,
                              publicUrl: file.publicUrl,
                              path: file.storagePath,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium shrink-0"
                        >
                          <Eye size={11} /> Podgląd
                        </button>
                      )}
                      <a
                        href={file.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] shrink-0"
                      >
                        <Download size={11} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {noticeLinks.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Globe size={10} /> Z ogłoszenia BZP ({noticeLinks.length})
                </p>
                <ul className="space-y-1">
                  {noticeLinks.slice(0, 6).map((link) => (
                    <li key={link.url} className="flex items-center gap-2 text-[10px]">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sky-700 dark:text-sky-300 hover:underline truncate min-w-0 flex-1"
                        title={link.url}
                      >
                        {link.label || link.url}
                      </a>
                      <ExternalLink size={10} className="shrink-0 text-muted-foreground" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {otherLinks.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Powiązane strony ({otherLinks.length})
                </p>
                <ul className="space-y-1">
                  {otherLinks.slice(0, 4).map((link) => (
                    <li key={link.url} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="shrink-0 w-16">{sourceLabel(link.source)}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline truncate min-w-0 flex-1"
                        title={link.url}
                      >
                        {link.label || link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!busy && !discovering && files.length === 0 && noticeLinks.length === 0 && otherLinks.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                Kliknij „Szukaj” — pobierane są wyłącznie pliki powiązane z tym postępowaniem (tytuł / numer BZP).
              </p>
            )}
          </div>
        )}
      </div>

      {preview && (
        <JobFilePreviewModal
          item={preview}
          athPreviewEnabled={athPreviewEnabled !== false}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
