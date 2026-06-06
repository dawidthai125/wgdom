import { useMemo, useState, type ReactNode } from "react";
import {
  FileText, Download, Mail, Eye, ClipboardList, Camera, Upload, Package, Trash2,
} from "lucide-react";
import type { JobFileAttachment } from "@/lib/job-documents";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import type { EmailContact } from "@/lib/email-contacts";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename } from "@/lib/tenders-bzp-filename";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { JobFilesEmailModal } from "@/app/JobFilesEmailModal";
import { downloadJobDocumentsPack, type JobPackSource } from "@/lib/job-documents-pack";

export type InspectorFileItem =
  | { kind: "jobFile"; file: JobFileAttachment }
  | { kind: "inspectorPhoto"; file: InspectorPhotoEntry }
  | { kind: "imageUrl"; url: string; filename: string }
  | { kind: "tenderBzp"; tenderId: string; documentIndex: number; filename: string; contentType?: string; zipInnerPath?: string }
  | { kind: "tenderUpload"; filename: string; publicUrl: string; path: string };

function fileLabel(item: InspectorFileItem): string {
  if (item.kind === "jobFile") {
    return item.file.kind === "zlecenie" ? "Zlecenie" : "Kosztorys";
  }
  if (item.kind === "inspectorPhoto") return "Zdjęcie inspektora";
  return "Zdjęcie";
}

function fileIcon(item: InspectorFileItem) {
  if (item.kind === "inspectorPhoto" || item.kind === "imageUrl") return Camera;
  if (item.kind === "jobFile" && item.file.kind === "kosztorys") return ClipboardList;
  return FileText;
}

function itemFilename(item: InspectorFileItem): string {
  if (item.kind === "jobFile") return item.file.filename;
  if (item.kind === "inspectorPhoto") return item.file.caption || "zdjecie-inspektora.jpg";
  if (item.kind === "tenderBzp" || item.kind === "tenderUpload") return item.filename;
  return item.filename;
}

function itemUploadedBy(item: InspectorFileItem): string {
  if (item.kind === "jobFile") return item.file.uploadedBy;
  if (item.kind === "inspectorPhoto") return item.file.uploadedBy;
  return "—";
}

function itemUploadedAt(item: InspectorFileItem): string {
  if (item.kind === "jobFile") return item.file.uploadedAt;
  if (item.kind === "inspectorPhoto") return item.file.uploadedAt;
  return "";
}

function itemUrl(item: InspectorFileItem): string {
  if (item.kind === "imageUrl") return item.url;
  if (item.kind === "tenderUpload") return item.publicUrl;
  if (item.kind === "tenderBzp") return "";
  return item.file.publicUrl;
}

export function JobInspectorFilesPanel({
  jobId,
  jobAddress,
  jobFlat,
  jobFiles,
  inspectorPhotos,
  athPreviewEnabled,
  contacts,
  onEmailSent,
  onDeleteFile,
  packSource,
  title = "Pliki roboty",
  uploadSlot,
  readOnly = false,
}: {
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  jobFiles: JobFileAttachment[];
  inspectorPhotos: InspectorPhotoEntry[];
  athPreviewEnabled: boolean;
  contacts: EmailContact[];
  onEmailSent?: (to: string) => void;
  onDeleteFile?: (item: InspectorFileItem) => void | Promise<void>;
  packSource?: JobPackSource;
  title?: string;
  uploadSlot?: ReactNode;
  /** Inspektor: tylko podgląd i pobieranie (bez email, zaznaczania, usuwania). */
  readOnly?: boolean;
}) {
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [emailItems, setEmailItems] = useState<InspectorFileItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [packBusy, setPackBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);

  const items = useMemo((): InspectorFileItem[] => {
    const list: InspectorFileItem[] = [];
    for (const f of jobFiles || []) {
      if (isMediaAttachmentAvailable(f)) list.push({ kind: "jobFile", file: f });
    }
    for (const p of inspectorPhotos || []) {
      if (isMediaAttachmentAvailable(p)) list.push({ kind: "inspectorPhoto", file: p });
    }
    return list.sort((a, b) => itemUploadedAt(b).localeCompare(itemUploadedAt(a)));
  }, [jobFiles, inspectorPhotos]);

  const itemKey = (item: InspectorFileItem) => {
    if (item.kind === "jobFile") return `jf:${item.file.id}`;
    if (item.kind === "inspectorPhoto") return `ip:${item.file.id}`;
    if (item.kind === "tenderBzp") return `tbzp:${item.tenderId}:${item.documentIndex}`;
    if (item.kind === "tenderUpload") return `tup:${item.path}`;
    return `img:${item.url}`;
  };

  const canPreview = (item: InspectorFileItem): boolean => {
    const name = itemFilename(item);
    if (isPdfFilename(name)) return true;
    if (item.kind === "inspectorPhoto" || item.kind === "imageUrl") return true;
    if (item.kind === "tenderBzp" || item.kind === "tenderUpload") {
      if (isKosztorysPreviewExt(name)) return true;
      if (/\.(jpe?g|png|gif|webp)$/i.test(name)) return true;
      if (isPdfFilename(name)) return true;
      if (isDocxFilename(name)) return true;
      if (isXlsxFilename(name)) return true;
      return false;
    }
    if (isKosztorysPreviewExt(name)) return true;
    return false;
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Upload size={13} className="text-muted-foreground"/>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {uploadSlot}
            {packSource && (
            <button
              type="button"
              disabled={packBusy}
              onClick={async () => {
                setPackBusy(true);
                try {
                  await downloadJobDocumentsPack(packSource);
                } finally {
                  setPackBusy(false);
                }
              }}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/90 text-white font-medium disabled:opacity-50"
            >
              <Package size={12}/>{packBusy ? "Pakowanie…" : "Pakiet ZIP"}
            </button>
            )}
          </div>
        </div>
        {uploadSlot && <div className="px-5 py-3 border-b border-border">{uploadSlot}</div>}
        <p className="px-5 py-4 text-xs text-muted-foreground">Brak wgranych plików — dodaj zlecenie, kosztorys lub zdjęcia.</p>
      </div>
    );
  }

  const selectedItems = items.filter((i) => selected.has(itemKey(i)));

  return (
    <>
      <div className="bg-card rounded-xl border border-emerald-500/25 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Upload size={13} className="text-emerald-600 dark:text-emerald-400"/>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{items.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {packSource && (
              <button
                type="button"
                disabled={packBusy}
                onClick={async () => {
                  setPackBusy(true);
                  try {
                    await downloadJobDocumentsPack(packSource);
                  } finally {
                    setPackBusy(false);
                  }
                }}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/90 text-white font-medium disabled:opacity-50"
              >
                <Package size={12}/>{packBusy ? "Pakowanie…" : "Pakiet ZIP"}
              </button>
            )}
            {selectedItems.length > 0 && !readOnly && (
              <button
                type="button"
                onClick={() => setEmailItems(selectedItems)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Mail size={12}/> Wyślij zaznaczone ({selectedItems.length})
              </button>
            )}
          </div>
        </div>
        {uploadSlot && <div className="px-5 py-3 border-b border-border bg-secondary/20">{uploadSlot}</div>}
        <div className="divide-y divide-border">
          {items.map((item) => {
            const key = itemKey(item);
            const Icon = fileIcon(item);
            const filename = itemFilename(item);
            const uploadedBy = itemUploadedBy(item);
            const uploadedAt = itemUploadedAt(item);
            const url = itemUrl(item);
            const previewOk = canPreview(item);
            return (
              <div key={key} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                {!readOnly ? (
                <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggleSelect(key)}
                    className="mt-1 shrink-0"
                  />
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item.kind === "inspectorPhoto" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                    <Icon size={14}/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fileLabel(item)} · {filename}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {uploadedBy} · {new Date(uploadedAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </label>
                ) : (
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item.kind === "inspectorPhoto" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                    <Icon size={14}/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fileLabel(item)} · {filename}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {uploadedBy} · {new Date(uploadedAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                )}
                <div className={`flex items-center gap-1.5 shrink-0 ${readOnly ? "" : "pl-7 sm:pl-0"}`}>
                  {previewOk ? (
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
                    >
                      <Eye size={12}/> Podgląd
                    </button>
                  ) : null}
                  <a
                    href={url}
                    download={filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
                  >
                    <Download size={12}/> Pobierz
                  </a>
                  {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setEmailItems([item])}
                    disabled={item.kind === "imageUrl"}
                    title={item.kind === "imageUrl" ? "Email dostępny tylko dla zlecenia/kosztorysu i zdjęć inspektora" : undefined}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary font-medium disabled:opacity-40"
                  >
                    <Mail size={12}/> Email
                  </button>
                  )}
                  {onDeleteFile && !readOnly && (
                    <button
                      type="button"
                      disabled={deleteBusy === key}
                      onClick={async () => {
                        setDeleteBusy(key);
                        try {
                          await onDeleteFile(item);
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.delete(key);
                            return next;
                          });
                        } finally {
                          setDeleteBusy(null);
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 font-medium disabled:opacity-50"
                    >
                      <Trash2 size={12}/> {deleteBusy === key ? "…" : "Usuń"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {emailItems && (
        <JobFilesEmailModal
          jobId={jobId}
          jobAddress={jobAddress}
          jobFlat={jobFlat}
          items={emailItems}
          contacts={contacts}
          onClose={() => setEmailItems(null)}
          onSent={onEmailSent}
        />
      )}
    </>
  );
}
