import { useMemo, useState } from "react";
import {
  Eye, Download, Loader2, RefreshCw, FileText, ClipboardList, Paperclip, ChevronDown, Archive,
} from "lucide-react";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { TenderBzpDocument, TenderPipelineItem, TenderUploadedFile } from "@/lib/tenders-bzp";
import { loadTenderBzpDocumentBytes } from "@/lib/tenders-bzp";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import {
  isDocxFilename,
  isXlsxFilename,
  isZipFilename,
  displayTenderFilename,
  type ZipListedFile,
} from "@/lib/tenders-bzp-filename";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import {
  detectTenderDocumentPlatform,
  resolveTenderPlatformDocumentStatus,
  type TenderPlatformDocumentStatus,
} from "@/lib/tender-platform-awareness";
import { Building2, ExternalLink, Globe } from "lucide-react";

function docIcon(filename: string) {
  if (isZipFilename(filename)) return Archive;
  if (isKosztorysPreviewExt(filename)) return ClipboardList;
  return FileText;
}

function canPreviewFilename(name: string): boolean {
  if (isPdfFilename(name)) return true;
  if (isKosztorysPreviewExt(name)) return true;
  if (isDocxFilename(name)) return true;
  if (isXlsxFilename(name)) return true;
  if (isZipFilename(name)) return true;
  if (/\.(jpe?g|png|gif|webp)$/i.test(name)) return true;
  return false;
}

function previewItemForDoc(
  tenderId: string,
  doc: TenderBzpDocument,
  opts?: { zipInnerPath?: string; displayName?: string },
): InspectorFileItem {
  return {
    kind: "tenderBzp",
    tenderId,
    documentIndex: doc.index,
    filename: opts?.displayName ?? doc.filename,
    contentType: doc.contentType,
    zipInnerPath: opts?.zipInnerPath,
  };
}

function previewItemForUpload(file: TenderUploadedFile): InspectorFileItem {
  return {
    kind: "tenderUpload",
    filename: file.filename,
    publicUrl: file.publicUrl,
    path: file.path,
  };
}

function ZipInnerList({
  tenderId,
  doc,
  onPreview,
}: {
  tenderId: string;
  doc: TenderBzpDocument;
  onPreview: (item: InspectorFileItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<ZipListedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (entries) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { bytes } = await loadTenderBzpDocumentBytes(tenderId, doc.index);
      const { listZipFiles } = await import("@/lib/tenders-bzp-doc-parse");
      const list = await listZipFiles(bytes);
      setEntries(list);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się odczytać ZIP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full basis-full mt-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void load(); }}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <ChevronDown size={10} className={open ? "rotate-180" : ""} />}
        {open ? "Ukryj pliki w ZIP" : "Pokaż pliki w ZIP"}
      </button>
      {error && <p className="text-[10px] text-amber-600 mt-0.5">{error}</p>}
      {open && entries && (
        <ul className="mt-1 space-y-1 pl-2 border-l-2 border-border">
          {entries.length === 0 && (
            <li className="text-[10px] text-muted-foreground">Brak rozpoznanych plików (ATH/PDF/DOCX/XLSX).</li>
          )}
          {entries.map((entry) => (
            <li key={entry.path} className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="truncate min-w-0 flex-1" title={entry.path}>{entry.filename}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(previewItemForDoc(tenderId, doc, {
                    zipInnerPath: entry.path,
                    displayName: `${doc.filename} → ${entry.filename}`,
                  }));
                }}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
              >
                <Eye size={9} />
                Podgląd
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TenderAttachmentsPanel({
  item,
  athPreviewEnabled,
  loadingDocs,
  onRefresh,
  onAnalyze,
  analyzing,
  externalDiscovery,
  externalDiscovering,
  onSearchExternal,
}: {
  item: TenderPipelineItem;
  athPreviewEnabled?: boolean;
  loadingDocs?: boolean;
  onRefresh?: () => void;
  onAnalyze?: (documentIndex: number) => void;
  analyzing?: boolean;
  externalDiscovery?: TenderExternalDocDiscovery | null;
  externalDiscovering?: boolean;
  onSearchExternal?: () => void;
}) {
  const [preview, setPreview] = useState<InspectorFileItem | null>(null);

  const docs = item.bzpDocuments ?? [];
  const externalFiles = externalDiscovery?.files ?? [];
  const noticeLinks = (externalDiscovery?.pageLinks ?? []).filter((l) => l.source === "notice");
  const hasUpload = Boolean(item.uploadedFile);
  const totalCount = docs.length + externalFiles.length + (hasUpload ? 1 : 0);

  const sortedDocs = useMemo(
    () => [...docs].sort((a, b) => a.index - b.index),
    [docs],
  );

  const platformStatus = useMemo(
    () => resolveTenderPlatformDocumentStatus(item, { loadingDocs }),
    [item, loadingDocs],
  );

  const displayName = (filename: string, opts: { index?: number; contentType?: string; url?: string }) =>
    displayTenderFilename(filename, opts);

  const showEmptyPlatformState = !loadingDocs
    && docs.length === 0
    && !hasUpload
    && externalFiles.length === 0
    && (item.documentsFetchedAt || detectTenderDocumentPlatform(item) !== "unknown" || Boolean(item.noticeHtml));

  if (!item.tenderId && !hasUpload && externalFiles.length === 0 && !item.noticeHtml) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Paperclip size={11} />
            Dokumenty
            {totalCount > 0 && (
              <span className="text-[10px] font-normal normal-case text-muted-foreground/80">
                ({totalCount})
              </span>
            )}
          </p>
          {platformStatus.badge && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                platformStatus.badge.tone === "success"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : platformStatus.badge.tone === "warn"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
              }`}
            >
              {platformStatus.badge.text}
            </span>
          )}
          {onRefresh && item.tenderId && (
            <button
              type="button"
              disabled={loadingDocs}
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {loadingDocs ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              Odśwież BZP
            </button>
          )}
          {onSearchExternal && item.tenderId && (
            <button
              type="button"
              disabled={externalDiscovering}
              onClick={(e) => { e.stopPropagation(); onSearchExternal(); }}
              className="inline-flex items-center gap-1 text-[10px] text-sky-700 dark:text-sky-300 hover:underline disabled:opacity-50"
            >
              {(externalDiscovering) ? <Loader2 size={10} className="animate-spin" /> : <Building2 size={10} />}
              {externalDiscovering ? "Szukam…" : "Szukaj u zamawiającego"}
            </button>
          )}
        </div>

        {loadingDocs && docs.length === 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Skanowanie załączników BZP…
          </p>
        )}

        {!loadingDocs && platformStatus.successMessage && totalCount > 0 && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">{platformStatus.successMessage}</p>
        )}

        {showEmptyPlatformState && (
          <PlatformDocumentEmptyState
            status={platformStatus}
            onSearchExternal={onSearchExternal}
            externalDiscovering={externalDiscovering}
          />
        )}

        <ul className="space-y-1.5">
          {sortedDocs.map((doc) => {
            const name = displayName(doc.filename, { index: doc.index, contentType: doc.contentType, url: doc.downloadUrl });
            const Icon = docIcon(name);
            const canPreview = canPreviewFilename(name);
            const isZip = isZipFilename(name);
            return (
              <li
                key={doc.documentId}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-1.5 text-xs"
              >
                <Icon size={13} className="shrink-0 text-muted-foreground" />
                {doc.isSwzHint && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1 rounded shrink-0">
                    SWZ
                  </span>
                )}
                <span className="truncate min-w-0 flex-1 font-medium" title={name}>
                  {name}
                </span>
                {canPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview(previewItemForDoc(item.tenderId, doc));
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium shrink-0"
                  >
                    <Eye size={11} />
                    Podgląd
                  </button>
                )}
                <a
                  href={doc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] shrink-0"
                >
                  <Download size={11} />
                  Pobierz
                </a>
                {onAnalyze && (
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={(e) => { e.stopPropagation(); onAnalyze(doc.index); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline shrink-0 disabled:opacity-50"
                  >
                    analiza
                  </button>
                )}
                {isZip && item.tenderId && (
                  <ZipInnerList
                    tenderId={item.tenderId}
                    doc={{ ...doc, filename: name }}
                    onPreview={setPreview}
                  />
                )}
              </li>
            );
          })}

          {externalFiles.map((file, idx) => {
            const name = displayName(file.filename, { index: idx + 1, url: file.publicUrl, prefix: "BIP" });
            const canPreview = canPreviewFilename(name);
            return (
              <li
                key={file.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-2.5 py-1.5 text-xs"
              >
                <FileText size={13} className="shrink-0 text-muted-foreground" />
                <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1 rounded shrink-0">BIP</span>
                {file.isSwzHint && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1 rounded shrink-0">SWZ</span>
                )}
                <span className="truncate min-w-0 flex-1 font-medium" title={name}>{name}</span>
                {canPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview({
                        kind: "tenderUpload",
                        filename: name,
                        publicUrl: file.publicUrl,
                        path: file.storagePath,
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium shrink-0"
                  >
                    <Eye size={11} />
                    Podgląd
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
            );
          })}

          {item.uploadedFile && (
            <li className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5 text-xs">
              <UploadIcon filename={item.uploadedFile.filename} />
              <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1 rounded shrink-0">
                Wgrany
              </span>
              <span className="truncate min-w-0 flex-1" title={item.uploadedFile.filename}>
                {item.uploadedFile.filename}
              </span>
              {canPreviewFilename(item.uploadedFile.filename) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview(previewItemForUpload(item.uploadedFile!));
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium shrink-0"
                >
                  <Eye size={11} />
                  Podgląd
                </button>
              )}
              <a
                href={item.uploadedFile.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] shrink-0"
              >
                <Download size={11} />
                Pobierz
              </a>
            </li>
          )}
        </ul>

        {noticeLinks.length > 0 && (
          <div className="pt-1 space-y-1">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Globe size={10} /> Linki z ogłoszenia
            </p>
            {noticeLinks.slice(0, 3).map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[10px] text-sky-700 dark:text-sky-300 hover:underline truncate"
                title={link.url}
              >
                <ExternalLink size={10} className="shrink-0" />
                <span className="truncate">{link.label || link.url}</span>
              </a>
            ))}
          </div>
        )}

        {athPreviewEnabled === false && sortedDocs.some((d) => isKosztorysPreviewExt(displayName(d.filename, { index: d.index, contentType: d.contentType, url: d.downloadUrl }))) && (
          <p className="text-[10px] text-muted-foreground">
            Podgląd ATH/NOR/XML wymaga włączonej opcji „Przeglądarka kosztorysów” w ustawieniach.
          </p>
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

function UploadIcon({ filename }: { filename: string }) {
  const Icon = isKosztorysPreviewExt(filename) ? ClipboardList : FileText;
  return <Icon size={13} className="shrink-0 text-muted-foreground" />;
}

function PlatformDocumentEmptyState({
  status,
  onSearchExternal,
  externalDiscovering,
}: {
  status: TenderPlatformDocumentStatus;
  onSearchExternal?: () => void;
  externalDiscovering?: boolean;
}) {
  if (status.missingReason === "not_fetched_yet" && !status.emptyMessage && !status.detailLines?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/70 bg-secondary/25 px-3 py-2.5 space-y-2">
      {status.emptyMessage && (
        <p className="text-xs font-medium text-foreground">{status.emptyMessage}</p>
      )}
      {status.detailLines?.map((line) => (
        <p key={line} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
      ))}
      {status.proceedingUrl && status.proceedingButtonLabel && (
        <a
          href={status.proceedingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
        >
          <ExternalLink size={12} />
          {status.proceedingButtonLabel}
        </a>
      )}
      {status.showSearchExternalHint && onSearchExternal && (
        <button
          type="button"
          disabled={externalDiscovering}
          onClick={(e) => { e.stopPropagation(); onSearchExternal(); }}
          className="inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300 hover:underline disabled:opacity-50"
        >
          {externalDiscovering ? <Loader2 size={11} className="animate-spin" /> : <Building2 size={11} />}
          {externalDiscovering ? "Szukam…" : "Szukaj u zamawiającego"}
        </button>
      )}
    </div>
  );
}
