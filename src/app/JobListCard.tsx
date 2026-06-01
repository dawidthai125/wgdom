import { FileText, ClipboardList, KeyRound, Trash2, X, CheckSquare, Square } from "lucide-react";
import { JobListPrimaryBadge } from "@/app/JobListStatus";
import { JobMetaBadges } from "@/app/JobMetaPickers";
import { JobWmPlannedBadge } from "@/app/JobWmPanel";
import {
  inferJobPhase,
  jobMissingRequiredDocs,
  type JobListStatusJob,
} from "@/lib/job-list-status";
import { DOC_LABELS, DOCUMENT_TYPES, REQUIRED_DOCS } from "@/lib/job-documents";
import { countJobFiles } from "@/lib/job-files-index";

type JobListCardJob = JobListStatusJob & {
  id: string;
  workEntries: { directoryId?: string; employeeName: string }[];
};

export function JobListCard({
  job,
  selected,
  isDuplicate,
  workerCount,
  totalHoursLabel,
  costLabel,
  bulkMode,
  bulkSelected,
  onBulkToggle,
  onSelect,
  onDeleteRequest,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  deleteBusy,
}: {
  job: JobListCardJob;
  selected: boolean;
  isDuplicate: boolean;
  workerCount: number;
  totalHoursLabel: string;
  costLabel: string | null;
  bulkMode?: boolean;
  bulkSelected?: boolean;
  onBulkToggle?: () => void;
  onSelect: () => void;
  onDeleteRequest: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  deleteBusy?: boolean;
}) {
  const docsCount = DOCUMENT_TYPES.filter((d) => job.documents[d]).length;
  const missingDocs = jobMissingRequiredDocs(job);
  const jobPhase = inferJobPhase(job);
  const fileCount = countJobFiles(job);

  return (
    <div className={`flex items-stretch border-b border-border transition-colors ${
      selected ? "bg-primary/8 border-l-2 border-l-primary" : ""
    } ${isDuplicate ? "bg-amber-500/5" : ""} ${bulkSelected ? "bg-destructive/5" : ""}`}>
      {bulkMode && (
        <div className="flex items-center pl-3 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBulkToggle?.(); }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            aria-label={bulkSelected ? "Odznacz robotę" : "Zaznacz robotę"}
            aria-pressed={bulkSelected}
          >
            {bulkSelected ? <CheckSquare size={16} className="text-destructive"/> : <Square size={16}/>}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left px-4 py-3.5 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight">
              {job.address || <span className="italic text-muted-foreground">Bez adresu</span>}
              {job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{job.client || "—"}</p>
          </div>
          <JobListPrimaryBadge job={job}/>
        </div>

        {jobPhase === "handover" && missingDocs.length > 0 && (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mb-2 leading-snug">
            Brakuje: {missingDocs.map((d) => DOC_LABELS[d]).join(", ")}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <JobMetaBadges job={job}/>
          <JobWmPlannedBadge job={job}/>
          {job.keysHandedOver && (
            <span title="Klucze zdane"><KeyRound size={11} className="text-blue-400"/></span>
          )}
          {fileCount > 0 && (
            <span className="text-[10px] bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              {fileCount} pl.
            </span>
          )}
          {isDuplicate && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Duplikat</span>
          )}
          {workerCount > 0 && (
            <span className="text-[10px] text-muted-foreground">{workerCount} os. · {totalHoursLabel}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${docsCount === REQUIRED_DOCS.length ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${(docsCount / REQUIRED_DOCS.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{docsCount}/{REQUIRED_DOCS.length}</span>
          </div>
          {costLabel && (
            <span className="text-[10px] font-semibold text-primary shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {costLabel}
            </span>
          )}
        </div>

        {(!job.documents.zlecenie || !job.documents.kosztorys) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {!job.documents.zlecenie && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 font-medium">
                <FileText size={9}/> Brak zlecenia
              </span>
            )}
            {!job.documents.kosztorys && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 font-medium">
                <ClipboardList size={9}/> Brak kosztorysu
              </span>
            )}
          </div>
        )}
      </button>
      <div className="flex items-center pr-2 shrink-0">
        {!bulkMode && (deleteConfirm ? (
          <div className="flex flex-col items-end gap-1 py-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] text-muted-foreground text-right leading-tight max-w-[72px]">Usunąć?</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={deleteBusy} onClick={onDeleteConfirm} className="text-[10px] bg-destructive text-white px-2.5 py-1.5 rounded font-medium min-h-[32px] disabled:opacity-50">{deleteBusy ? "…" : "Usuń"}</button>
              <button type="button" onClick={onDeleteCancel} className="text-[10px] text-muted-foreground px-1 min-h-[32px]"><X size={12}/></button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
            title="Usuń robotę"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 size={14}/>
          </button>
        ))}
      </div>
    </div>
  );
}
