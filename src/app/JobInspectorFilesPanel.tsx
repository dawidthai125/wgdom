import { useMemo, useState } from "react";
import {
  FileText, Download, Mail, Eye, ClipboardList, Camera, Upload, Package,
} from "lucide-react";
import type { JobFileAttachment } from "@/lib/job-documents";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import type { EmailContact } from "@/lib/email-contacts";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { JobFilesEmailModal } from "@/app/JobFilesEmailModal";
import { downloadJobDocumentsPack, type JobPackSource } from "@/lib/job-documents-pack";

export type InspectorFileItem =
  | { kind: "jobFile"; file: JobFileAttachment }
  | { kind: "inspectorPhoto"; file: InspectorPhotoEntry };

function fileLabel(item: InspectorFileItem): string {
  if (item.kind === "jobFile") {
    return item.file.kind === "zlecenie" ? "Zlecenie" : "Kosztorys";
  }
  return "Zdjęcie inspektora";
}

function fileIcon(item: InspectorFileItem) {
  if (item.kind === "inspectorPhoto") return Camera;
  if (item.kind === "jobFile" && item.file.kind === "kosztorys") return ClipboardList;
  return FileText;
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
  packSource,
}: {
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  jobFiles: JobFileAttachment[];
  inspectorPhotos: InspectorPhotoEntry[];
  athPreviewEnabled: boolean;
  contacts: EmailContact[];
  onEmailSent?: (to: string) => void;
  packSource?: JobPackSource;
}) {
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [emailItems, setEmailItems] = useState<InspectorFileItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [packBusy, setPackBusy] = useState(false);

  const items = useMemo((): InspectorFileItem[] => {
    const list: InspectorFileItem[] = [];
    for (const f of jobFiles || []) {
      if (f.publicUrl) list.push({ kind: "jobFile", file: f });
    }
    for (const p of inspectorPhotos || []) {
      if (p.publicUrl) list.push({ kind: "inspectorPhoto", file: p });
    }
    return list.sort((a, b) => {
      const at = a.kind === "jobFile" ? a.file.uploadedAt : a.file.uploadedAt;
      const bt = b.kind === "jobFile" ? b.file.uploadedAt : b.file.uploadedAt;
      return bt.localeCompare(at);
    });
  }, [jobFiles, inspectorPhotos]);

  const itemKey = (item: InspectorFileItem) =>
    item.kind === "jobFile" ? `jf:${item.file.id}` : `ip:${item.file.id}`;

  const canPreview = (item: InspectorFileItem): boolean => {
    const name = item.kind === "jobFile" ? item.file.filename : "photo.jpg";
    if (isPdfFilename(name)) return true;
    if (item.kind === "inspectorPhoto") return true;
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
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pliki inspektora</span>
          </div>
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
        <p className="px-5 py-4 text-xs text-muted-foreground">Brak wgranych plików — inspektor może dodać zlecenie, kosztorys lub zdjęcia.</p>
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
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pliki inspektora</span>
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
            {selectedItems.length > 0 && (
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
        <div className="divide-y divide-border">
          {items.map((item) => {
            const key = itemKey(item);
            const Icon = fileIcon(item);
            const filename = item.kind === "jobFile" ? item.file.filename : (item.file.caption || "zdjęcie-inspektora.jpg");
            const uploadedBy = item.kind === "jobFile" ? item.file.uploadedBy : item.file.uploadedBy;
            const uploadedAt = item.kind === "jobFile" ? item.file.uploadedAt : item.file.uploadedAt;
            const url = item.kind === "jobFile" ? item.file.publicUrl : item.file.publicUrl;
            const previewOk = canPreview(item);
            return (
              <div key={key} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
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
                <div className="flex items-center gap-1.5 shrink-0 pl-7 sm:pl-0">
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
                  <button
                    type="button"
                    onClick={() => setEmailItems([item])}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary font-medium"
                  >
                    <Mail size={12}/> Email
                  </button>
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
