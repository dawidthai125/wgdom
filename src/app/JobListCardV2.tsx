import { FileText, ClipboardList, KeyRound, Trash2, X, CheckSquare, Square } from "lucide-react";
import { JobListPrimaryBadge } from "@/app/JobListStatus";
import { JobMetaBadges } from "@/app/JobMetaPickers";
import { JobWmPlannedBadge } from "@/app/JobWmPanel";
import {
  inferJobPhase,
  jobMissingRequiredDocs,
  type JobListStatusJob,
} from "@/lib/job-list-status";
import { resolveWorkerContractDateLabel } from "@/app/app-domain";
import { jobOpsIsBzpContract } from "@/lib/job-list-ops";
import { DOC_LABELS, DOCUMENT_TYPES, REQUIRED_DOCS } from "@/lib/job-documents";
import { countJobFiles } from "@/lib/job-files-index";

type JobListCardJob = JobListStatusJob & {
  id: string;
  linkedTenderId?: string;
  endDate?: string;
  startDate: string;
  workEntries: { directoryId?: string; employeeName: string }[];
  executionAssigneeDirectoryIds?: string[];
};

/** Roboty 2.1B MIN — ten sam kontrakt i reguły co JobListCard; wyłącznie układ wizualny. */
export function JobListCardV2({
  job,
  selected,
  isDuplicate,
  workerCount,
  activeTodayCount = 0,
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
  recoverableUnsettledCount,
  recoverableToRecoverAmount,
  leadName,
}: {
  job: JobListCardJob;
  selected: boolean;
  isDuplicate: boolean;
  workerCount: number;
  /** Unikalni pracownicy z wpisów czasu na dziś (0 = badge ukryty). */
  activeTodayCount?: number;
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
  recoverableUnsettledCount?: number;
  recoverableToRecoverAmount?: number;
  leadName?: string | null;
}) {
  const docsCount = DOCUMENT_TYPES.filter((d) => job.documents[d]).length;
  const missingDocs = jobMissingRequiredDocs(job);
  const jobPhase = inferJobPhase(job);
  const fileCount = countJobFiles(job);
  const contractDateLabel = resolveWorkerContractDateLabel(job);
  const clientLine = [job.client?.trim() || null, contractDateLabel, leadName ? `Lider: ${leadName}` : null]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`flex items-stretch mx-2 my-1.5 rounded-xl border transition-colors ${
        selected
          ? "border-primary/50 bg-primary/8 shadow-sm ring-1 ring-primary/20"
          : "border-border/80 bg-card hover:border-border"
      } ${isDuplicate && !selected ? "border-amber-500/25 bg-amber-500/5" : ""} ${
        bulkSelected ? "border-destructive/30 bg-destructive/5" : ""
      }`}
    >
      {bulkMode && (
        <div className="flex items-center pl-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBulkToggle?.();
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            aria-label={bulkSelected ? "Odznacz robotę" : "Zaznacz robotę"}
            aria-pressed={bulkSelected}
          >
            {bulkSelected ? <CheckSquare size={16} className="text-destructive" /> : <Square size={16} />}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left px-3 py-2.5 hover:bg-secondary/30 rounded-xl transition-colors"
      >
        {/* Nagłówek: adres + status */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold truncate leading-tight min-w-0 flex-1">
            {job.address || <span className="italic text-muted-foreground">Bez adresu</span>}
            {job.flatNumber && (
              <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>
            )}
          </p>
          <JobListPrimaryBadge job={job} />
        </div>

        {/* Druga linia: klient + termin */}
        {clientLine && (
          <p className="text-xs text-muted-foreground truncate mb-2">{clientLine}</p>
        )}

        {/* Trzecia linia: BZP | Aktywni dziś | WM | Meta | Klucze | Pliki */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5 min-h-[1.25rem]">
          {jobOpsIsBzpContract(job) && (
            <span className="text-[10px] bg-violet-500/12 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded-full font-semibold">
              BZP
            </span>
          )}
          {activeTodayCount > 0 && (
            <span
              title="Unikalni pracownicy z wpisem czasu na dziś"
              className="text-[10px] bg-teal-500/12 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded-full font-medium"
            >
              Aktywni dziś: {activeTodayCount}
            </span>
          )}
          <JobWmPlannedBadge job={job} />
          <JobMetaBadges job={job} />
          {job.keysHandedOver && (
            <span title="Klucze zdane" className="inline-flex items-center">
              <KeyRound size={11} className="text-blue-400" />
            </span>
          )}
          {fileCount > 0 && (
            <span className="text-[10px] bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              {fileCount} pl.
            </span>
          )}
          {(recoverableUnsettledCount ?? 0) > 0 && (
            <span
              title={
                (recoverableToRecoverAmount ?? 0) > 0
                  ? `Do odzyskania:\n${recoverableToRecoverAmount!.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} PLN`
                  : undefined
              }
              className="text-[10px] bg-amber-500/12 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium shrink-0"
            >
              💰 {recoverableUnsettledCount}
            </span>
          )}
          {isDuplicate && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Duplikat</span>
          )}
          {workerCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {workerCount} os. · {totalHoursLabel}
            </span>
          )}
        </div>

        {/* Stopka: postęp dokumentów + koszt */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden max-w-[8rem]">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  docsCount === REQUIRED_DOCS.length ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${(docsCount / REQUIRED_DOCS.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
              {docsCount}/{REQUIRED_DOCS.length}
            </span>
          </div>
          {costLabel && (
            <span
              className="text-[10px] font-semibold text-primary shrink-0"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {costLabel}
            </span>
          )}
        </div>

        {/* Alerty — jak V1 */}
        {jobPhase === "handover" && missingDocs.length > 0 && (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-2 leading-snug">
            Brakuje: {missingDocs.map((d) => DOC_LABELS[d]).join(", ")}
          </p>
        )}

        {(!job.documents.zlecenie || !job.documents.kosztorys) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {!job.documents.zlecenie && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 font-medium">
                <FileText size={9} /> Brak zlecenia
              </span>
            )}
            {!job.documents.kosztorys && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 font-medium">
                <ClipboardList size={9} /> Brak kosztorysu
              </span>
            )}
          </div>
        )}
      </button>
      <div className="flex items-center pr-1.5 shrink-0">
        {!bulkMode &&
          (deleteConfirm ? (
            <div className="flex flex-col items-end gap-1 py-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-muted-foreground text-right leading-tight max-w-[72px]">
                Usunąć?
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={onDeleteConfirm}
                  className="text-[10px] bg-destructive text-white px-2.5 py-1.5 rounded font-medium min-h-[32px] disabled:opacity-50"
                >
                  {deleteBusy ? "…" : "Usuń"}
                </button>
                <button type="button" onClick={onDeleteCancel} className="text-[10px] text-muted-foreground px-1 min-h-[32px]">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRequest();
              }}
              title="Usuń robotę"
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          ))}
      </div>
    </div>
  );
}
