import { useMemo, useRef, useState } from "react";
import {
  FileText, Download, Eye, Trash2, Upload, Loader2, Package, Paperclip,
} from "lucide-react";
import type { JobAttachment } from "@/lib/job-attachments";
import { formatJobAttachmentSize, appendJobAttachment } from "@/lib/job-attachments";
import { uploadJobAttachment } from "@/lib/job-attachment-upload";
import {
  collectActiveJobAttachments,
  downloadJobAttachmentsZip,
  jobAttachmentsPackHasFiles,
  type JobAttachmentsPackSource,
} from "@/lib/job-attachments-pack";
import { isPdfFilename } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename } from "@/lib/tenders-bzp-filename";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";

function canPreviewAttachment(filename: string): boolean {
  return isPdfFilename(filename) || isDocxFilename(filename) || isXlsxFilename(filename);
}

export function JobGenericAttachmentsSection({
  job,
  uploadedBy,
  athPreviewEnabled,
  onJobUpdated,
}: {
  job: JobAttachmentsPackSource & { id: string };
  uploadedBy: string;
  athPreviewEnabled: boolean;
  onJobUpdated: (next: JobAttachmentsPackSource & { id: string }, activity?: { text: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);

  const attachments = useMemo(
    () => collectActiveJobAttachments(job),
    [job.jobAttachments, job.deletedJobAttachmentTombstones],
  );

  const handlePick = async (file: File) => {
    setUploadMsg("");
    setUploadBusy(true);
    try {
      const { attachment, error } = await uploadJobAttachment(job.id, file, uploadedBy);
      if (!attachment) {
        setUploadMsg(error || "Nie udało się wgrać pliku.");
        return;
      }
      const now = new Date().toISOString();
      onJobUpdated(
        appendJobAttachment(
          { ...job, updatedAt: now },
          attachment,
        ),
        { text: `Dodano załącznik ogólny: ${file.name}` },
      );
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attachment: JobAttachment) => {
    if (!window.confirm(`Usunąć załącznik „${attachment.filename}"?\n\nPlik zostanie usunięty ze storage.`)) {
      return;
    }
    setDeleteBusy(attachment.id);
    try {
      const { removeJobAttachmentWithTombstone, deleteJobAttachmentStorage } = await import("@/lib/job-attachments");
      const now = new Date().toISOString();
      void deleteJobAttachmentStorage(attachment);
      onJobUpdated(
        removeJobAttachmentWithTombstone(
          { ...job, updatedAt: now },
          attachment.id,
          { deletedBy: uploadedBy },
        ),
        { text: `Usunięto załącznik ogólny: ${attachment.filename}` },
      );
    } finally {
      setDeleteBusy(null);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden mt-4">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Paperclip size={13} className="text-muted-foreground"/>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Załączniki ogólne</span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{attachments.length}</span>
          </div>
          {jobAttachmentsPackHasFiles(job) && (
            <button
              type="button"
              disabled={packBusy}
              onClick={async () => {
                setPackBusy(true);
                try {
                  const result = await downloadJobAttachmentsZip(job);
                  if (!result.ok) setUploadMsg(result.error);
                } finally {
                  setPackBusy(false);
                }
              }}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium disabled:opacity-50"
            >
              <Package size={12}/>{packBusy ? "Pakowanie…" : "Załączniki ZIP"}
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-b border-border bg-secondary/20">
          <p className="text-[11px] text-muted-foreground mb-2">
            PDF, DOC, DOCX, XLS, XLSX, ZIP, RAR, DWG, TXT — max 25 MB. Zdjęcia wrzucaj w zakładkę Zdjęcia.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.dwg,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePick(f);
            }}
          />
          <button
            type="button"
            disabled={uploadBusy}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {uploadBusy ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
            {uploadBusy ? "Wgrywam…" : "Dodaj załącznik"}
          </button>
          {uploadMsg && <p className="text-xs text-destructive mt-2">{uploadMsg}</p>}
        </div>

        {attachments.length === 0 ? (
          <p className="px-5 py-4 text-xs text-muted-foreground">Brak załączników ogólnych.</p>
        ) : (
          <div className="divide-y divide-border">
            {attachments.map((a) => {
              const previewOk = canPreviewAttachment(a.filename);
              return (
                <div key={a.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground">
                      <FileText size={14}/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.filename}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.uploadedBy} · {new Date(a.uploadedAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{formatJobAttachmentSize(a.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-11 sm:pl-0">
                    {previewOk && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem({ kind: "jobAttachment", file: a })}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
                      >
                        <Eye size={12}/> Podgląd
                      </button>
                    )}
                    <a
                      href={a.publicUrl}
                      download={a.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
                    >
                      <Download size={12}/> Pobierz
                    </a>
                    <button
                      type="button"
                      disabled={deleteBusy === a.id}
                      onClick={() => void handleDelete(a)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 font-medium disabled:opacity-50"
                    >
                      <Trash2 size={12}/> {deleteBusy === a.id ? "…" : "Usuń"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  );
}
