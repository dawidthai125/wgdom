import { useState } from "react";
import {
  ExternalLink, Eye, Download, Globe, Loader2, RefreshCw, FileText, Building2,
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

  const pageLinks = discovery?.pageLinks ?? [];
  const files = discovery?.files ?? [];
  const hasContent = pageLinks.length > 0 || files.length > 0 || discovering || busy
    || discovery?.status === "failed";

  const runDiscover = async () => {
    if (!item.tenderId) {
      toast.error("Brak tenderId");
      return;
    }
    setBusy(true);
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
        toast.success(`Pobrano ${d.files.length} plik(ów) u zamawiającego`);
        onParsed?.();
      } else if (d.pageLinks.length > 0) {
        toast.message("Znaleziono strony — otwórz link lub wgraj plik ręcznie");
      } else {
        toast.message("Brak linków zewnętrznych w ogłoszeniu");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd pobierania dokumentów zewnętrznych");
    } finally {
      setBusy(false);
    }
  };

  if (!hasContent && !item.noticeHtml && !item.priorityBuyerId) return null;

  return (
    <>
      <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 overflow-hidden space-y-0">
        <div className="px-3 py-2.5 border-b border-sky-500/15 flex flex-wrap items-center gap-2">
          <Building2 size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
              Dokumenty u zamawiającego (BIP / link z ogłoszenia)
            </p>
            <p className="text-[10px] text-muted-foreground">
              Poza e-Zamówieniami — auto-wyszukiwanie SWZ i kosztorysu
            </p>
          </div>
          <button
            type="button"
            disabled={busy || discovering}
            onClick={(e) => { e.stopPropagation(); void runDiscover(); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {(busy || discovering) ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {busy || discovering ? "Szukam…" : "Szukaj dokumentów"}
          </button>
        </div>

        {(busy || discovering) && (
          <p className="px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-2">
            <Loader2 size={11} className="animate-spin" />
            Linki z ogłoszenia → BIP / platforma → pobieranie plików…
          </p>
        )}

        {discovery?.message && !busy && !discovering && (
          <p className={`px-3 py-2 text-[10px] ${
            discovery.status === "failed" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          }`}>
            {discovery.message}
            {discovery.builtAt && (
              <> · {new Date(discovery.builtAt).toLocaleString("pl-PL")}</>
            )}
          </p>
        )}

        {pageLinks.length > 0 && (
          <div className="px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Globe size={10} /> Strony ({pageLinks.length})
            </p>
            <ul className="space-y-1 max-h-36 overflow-y-auto overscroll-contain">
              {pageLinks.slice(0, 12).map((link) => (
                <li key={link.url} className="flex items-start gap-2 text-[10px]">
                  <span className="shrink-0 text-muted-foreground w-14">
                    {link.source === "notice" ? "ogłoszenie" : link.source === "bip_portal" ? "BIP" : "crawl"}
                  </span>
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
                  <ExternalLink size={10} className="shrink-0 text-muted-foreground mt-0.5" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {files.length > 0 && (
          <ul className="px-3 pb-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
              Pobrane pliki ({files.length})
            </p>
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/20 bg-background/60 px-2.5 py-1.5 text-xs"
              >
                <FileText size={13} className="shrink-0 text-muted-foreground" />
                {file.isSwzHint && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1 rounded shrink-0">SWZ?</span>
                )}
                <span className="truncate min-w-0 flex-1" title={file.filename}>{file.filename}</span>
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
                  <Download size={11} /> Pobierz
                </a>
              </li>
            ))}
          </ul>
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
