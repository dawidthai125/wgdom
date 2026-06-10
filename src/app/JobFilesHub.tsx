import { useMemo } from "react";
import {
  FileText, ClipboardList, Paperclip, CheckSquare, Package, ExternalLink,
  Download, Ruler, ChevronRight,
} from "lucide-react";
import { JobFileCatalogList, type JobFileCatalogItem } from "@/app/JobAllFilesView";
import { JobGenericAttachmentsSection } from "@/app/JobGenericAttachmentsSection";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { JobAttachmentsPackSource } from "@/lib/job-attachments-pack";
import { isPdfFilename } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename } from "@/lib/tenders-bzp-filename";
import { formatJobAttachmentSize } from "@/lib/job-attachments";
import {
  collectFilesHubContractItems,
  collectFilesHubReportItems,
  collectFilesHubAttachmentItems,
  getFilesHubChecklistSummary,
  countFilesHubItems,
  type FilesHubJobSource,
} from "@/lib/files-hub-index";

function canPreviewAttachment(filename: string): boolean {
  return isPdfFilename(filename) || isDocxFilename(filename) || isXlsxFilename(filename);
}

function HubSectionHeader({
  icon: Icon,
  title,
  count,
  accent = "text-muted-foreground",
}: {
  icon: typeof FileText;
  title: string;
  count?: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className={accent}/>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{count}</span>
      )}
    </div>
  );
}

function ReadOnlyAttachmentRow({ attachment }: { attachment: { id: string; filename: string; publicUrl: string; uploadedBy: string; uploadedAt: string; sizeBytes?: number } }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3 bg-secondary/30 rounded-xl">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.filename}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {attachment.uploadedBy} · {new Date(attachment.uploadedAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          {" · "}{formatJobAttachmentSize(attachment.sizeBytes)}
        </p>
      </div>
      <a
        href={attachment.publicUrl}
        download={attachment.filename}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/90 text-primary-foreground font-medium shrink-0 min-h-[36px]"
      >
        <Download size={11}/> Pobierz
      </a>
    </div>
  );
}

export function JobFilesHub({
  job,
  mode = "full",
  contractItems,
  onPreviewContract,
  onDeleteContract,
  contractDeleteBusyId,
  contractUploadSlot,
  contractUploadMsg,
  packBusy,
  onDownloadDocumentsPack,
  emailPanel,
  uploadedBy,
  athPreviewEnabled,
  onJobUpdated,
  onGoToReports,
  onGoToDocuments,
  onOpenJob,
}: {
  job: FilesHubJobSource;
  mode?: "full" | "readonly";
  contractItems?: JobFileCatalogItem[];
  onPreviewContract?: (item: JobFileCatalogItem) => void;
  onDeleteContract?: (item: JobFileCatalogItem) => void;
  contractDeleteBusyId?: string | null;
  contractUploadSlot?: React.ReactNode;
  contractUploadMsg?: string;
  packBusy?: boolean;
  onDownloadDocumentsPack?: () => void | Promise<void>;
  emailPanel?: React.ReactNode;
  uploadedBy?: string;
  athPreviewEnabled?: boolean;
  onJobUpdated?: (next: JobAttachmentsPackSource & { id: string }, activity?: { text: string }) => void;
  onGoToReports?: (reportId?: string) => void;
  onGoToDocuments?: () => void;
  onOpenJob?: () => void;
}) {
  const isReadonly = mode === "readonly";

  const contract = useMemo(
    () => contractItems ?? collectFilesHubContractItems(job),
    [contractItems, job],
  );
  const reports = useMemo(() => collectFilesHubReportItems(job), [job]);
  const attachments = useMemo(() => collectFilesHubAttachmentItems(job), [job]);
  const checklist = useMemo(() => getFilesHubChecklistSummary(job), [job]);
  const hubTotal = useMemo(() => countFilesHubItems(job), [job]);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-emerald-500/25 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-emerald-600 dark:text-emerald-400"/>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pliki roboty</span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{hubTotal}</span>
          </div>
          {!isReadonly && onDownloadDocumentsPack && (
            <button
              type="button"
              disabled={packBusy}
              onClick={() => void onDownloadDocumentsPack()}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/90 text-white font-medium disabled:opacity-50"
            >
              <Package size={12}/>{packBusy ? "Pakowanie…" : "Dokumenty ZIP"}
            </button>
          )}
          {isReadonly && onOpenJob && (
            <button
              type="button"
              onClick={onOpenJob}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/90 text-white font-medium"
            >
              <ExternalLink size={12}/> Otwórz robotę
            </button>
          )}
        </div>

        {/* 1. Dokumenty kontraktowe */}
        <div className="border-b border-border">
          <div className="px-5 py-3 bg-secondary/10 border-b border-border">
            <HubSectionHeader icon={FileText} title="Dokumenty kontraktowe" count={contract.length} accent="text-emerald-600 dark:text-emerald-400"/>
            <p className="text-[10px] text-muted-foreground mt-1">Zlecenie · Kosztorys · Plan techniczny</p>
          </div>
          {!isReadonly && contractUploadSlot && (
            <div className="px-5 py-3 border-b border-border bg-secondary/20">
              {contractUploadSlot}
              {contractUploadMsg && <p className="text-xs text-destructive mt-2">{contractUploadMsg}</p>}
            </div>
          )}
          {contract.length > 0 && onPreviewContract ? (
            <JobFileCatalogList
              items={contract}
              onPreview={(item) => onPreviewContract(item)}
              onDelete={!isReadonly && onDeleteContract ? (item) => onDeleteContract(item) : undefined}
              deleteBusyId={contractDeleteBusyId}
            />
          ) : contract.length > 0 ? (
            <div className="divide-y divide-border">
              {contract.map((item) => (
                <div key={item.id} className="px-5 py-3 text-xs text-muted-foreground truncate">{item.filename}</div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-4 text-xs text-muted-foreground">
              {isReadonly ? "Brak dokumentów kontraktowych." : "Brak dokumentów — wgraj zlecenie, kosztorys lub plan techniczny."}
            </p>
          )}
        </div>

        {/* 2. Dokumentacja robót */}
        <div className="border-b border-border">
          <div className="px-5 py-3 bg-violet-500/5 border-b border-border">
            <HubSectionHeader icon={ClipboardList} title="Dokumentacja robót" count={reports.length} accent="text-violet-500"/>
            <p className="text-[10px] text-muted-foreground mt-1">Zakres prac · Wymiary · Obrys lokalu</p>
          </div>
          {reports.length === 0 ? (
            <p className="px-5 py-4 text-xs text-muted-foreground">Brak zapisanej dokumentacji ekipy.</p>
          ) : (
            <div className="divide-y divide-border">
              {reports.map((report) => (
                <div key={report.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{report.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {report.author} · {report.dateLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {report.hasScope && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium">Zakres</span>
                      )}
                      {report.roomCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-0.5">
                          <Ruler size={9}/>{report.roomCount} pom.
                        </span>
                      )}
                      {report.hasSketch && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">Obrys</span>
                      )}
                    </div>
                    {/* PDF export hook: downloadWorkerReportPdf(toWorkerReportPdfSource(job, report)) — 20.5A.12C */}
                  </div>
                  {onGoToReports && (
                    <button
                      type="button"
                      onClick={() => onGoToReports(report.id)}
                      className="flex items-center gap-1 text-[11px] px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 font-medium shrink-0 min-h-[36px]"
                    >
                      Przejdź do dokumentacji<ChevronRight size={12}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Załączniki ogólne */}
        <div className="border-b border-border">
          <div className="px-5 py-3 bg-secondary/10 border-b border-border">
            <HubSectionHeader icon={Paperclip} title="Załączniki ogólne" count={attachments.length}/>
            <p className="text-[10px] text-muted-foreground mt-1">PDF · DOCX · XLSX · DWG · ZIP · RAR · TXT</p>
          </div>
          {!isReadonly && uploadedBy && onJobUpdated && athPreviewEnabled !== undefined ? (
            <JobGenericAttachmentsSection
              job={job as JobAttachmentsPackSource & { id: string }}
              uploadedBy={uploadedBy}
              athPreviewEnabled={athPreviewEnabled}
              onJobUpdated={onJobUpdated}
              embedded
            />
          ) : attachments.length === 0 ? (
            <p className="px-5 py-4 text-xs text-muted-foreground">Brak załączników ogólnych.</p>
          ) : (
            <div className="px-5 py-3 space-y-2">
              {attachments.map((a) => (
                <ReadOnlyAttachmentRow key={a.id} attachment={a}/>
              ))}
            </div>
          )}
        </div>

        {/* 4. Checklista odbiorowa — informacja only */}
        <div className="px-5 py-4 bg-secondary/5">
          <HubSectionHeader icon={CheckSquare} title="Checklista odbiorowa"/>
          <p className="text-sm mt-2">
            Dokumenty odbiorowe:{" "}
            <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {checklist.checked} / {checklist.total}
            </span>
          </p>
          {onGoToDocuments && (
            <button
              type="button"
              onClick={onGoToDocuments}
              className="mt-3 flex items-center gap-1 text-[11px] px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
            >
              Przejdź do dokumentów<ChevronRight size={12}/>
            </button>
          )}
        </div>

        {!isReadonly && emailPanel && (
          <div className="border-t border-border">{emailPanel}</div>
        )}
      </div>
    </div>
  );
}