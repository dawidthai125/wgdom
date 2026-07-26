import { KeyRound, Trash2, X, CheckSquare, Square } from "lucide-react";
import { JobListPrimaryBadge } from "@/app/JobListStatus";
import {
  inferJobPhase,
  jobMissingRequiredDocs,
  type JobListStatusJob,
} from "@/lib/job-list-status";
import { resolveWorkerContractDateLabel } from "@/app/app-domain";
import { jobOpsIsBzpContract } from "@/lib/job-list-ops";
import { DOC_LABELS, DOCUMENT_TYPES, REQUIRED_DOCS } from "@/lib/job-documents";
import { countJobFiles } from "@/lib/job-files-index";
import { fmtPlannedHandover } from "@/lib/job-wm";
import {
  GAS_FURNACE_STATUS_LABELS,
  GAS_FURNACE_STATUSES,
  HOUSING_TYPE_LABELS,
  STOVE_TYPE_LABELS_FULL,
  STOVE_TYPES,
  isJobHousingSet,
  type GasFurnaceStatus,
  type StoveType,
} from "@/lib/job-meta";
import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_HOVER, WG_FOCUS_RING, WG_RADIUS_MD } from "@/lib/wg-ui-tokens";

type JobListCardJob = JobListStatusJob & {
  id: string;
  linkedTenderId?: string;
  endDate?: string;
  startDate: string;
  plannedHandoverDate?: string;
  workEntries: { directoryId?: string; employeeName: string }[];
  executionAssigneeDirectoryIds?: string[];
};

/** Fixed rails — LIST-DF-12 */
const BADGE_RAIL = "w-[7.5rem] shrink-0";
const PROGRESS_BLOCK = "w-[10.25rem] shrink-0";
const COST_RAIL = "w-[4.75rem] shrink-0";
const DELETE_RAIL = "w-11 shrink-0";

const META_SEP = " · ";

function shortenMeta(value: string, max = 32): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

/**
 * WGDOM-UI-01D-A-LIST-02 — final list visual polish (hierarchy / rhythm / progress block).
 * Same handlers/props — presentation only.
 */
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
  const docsComplete = docsCount === REQUIRED_DOCS.length;

  const missingCritical: string[] = [];
  if (!job.documents.zlecenie) missingCritical.push("zlecenie");
  if (!job.documents.kosztorys) missingCritical.push("kosztorys");

  let exposedChip: { key: string; label: string; title?: string; warn?: boolean } | null = null;
  if (jobOpsIsBzpContract(job)) {
    exposedChip = { key: "bzp", label: "BZP" };
  } else if (activeTodayCount > 0) {
    exposedChip = {
      key: "active",
      label: `Aktywni dziś: ${activeTodayCount}`,
      title: "Unikalni pracownicy z wpisem czasu na dziś",
    };
  } else if (missingCritical.length > 0) {
    exposedChip = {
      key: "docs",
      label: missingCritical.length === 2 ? "Brak zlecenia / kosztorysu" : `Brak ${missingCritical[0]}`,
      warn: true,
    };
  }

  const metaParts: string[] = [];
  if (job.client?.trim()) metaParts.push(shortenMeta(job.client, 28));
  if (contractDateLabel) metaParts.push(shortenMeta(contractDateLabel, 24));
  if (leadName) metaParts.push(shortenMeta(`Lider: ${leadName}`, 28));
  if (job.plannedHandoverDate) metaParts.push(`WM ${fmtPlannedHandover(job.plannedHandoverDate)}`);
  if (isJobHousingSet(job)) metaParts.push(HOUSING_TYPE_LABELS[job.housingType]);
  if (job.stoveType && STOVE_TYPES.includes(job.stoveType as StoveType)) {
    metaParts.push(shortenMeta(STOVE_TYPE_LABELS_FULL[job.stoveType as StoveType], 22));
  }
  if (job.gasFurnaceStatus && GAS_FURNACE_STATUSES.includes(job.gasFurnaceStatus as GasFurnaceStatus)) {
    metaParts.push(
      shortenMeta(`Piec: ${GAS_FURNACE_STATUS_LABELS[job.gasFurnaceStatus as GasFurnaceStatus]}`, 24),
    );
  }
  if (job.keysHandedOver) metaParts.push("Klucze");
  if (fileCount > 0) metaParts.push(`${fileCount} pl.`);
  if ((recoverableUnsettledCount ?? 0) > 0) {
    const amount =
      (recoverableToRecoverAmount ?? 0) > 0
        ? recoverableToRecoverAmount!.toLocaleString("pl-PL", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })
        : null;
    metaParts.push(amount ? `Odzysk: ${amount} PLN` : `Odzysk: ${recoverableUnsettledCount}`);
  }
  if (isDuplicate) metaParts.push("Duplikat");
  if (workerCount > 0) metaParts.push(`${workerCount} os.${META_SEP}${totalHoursLabel}`);

  const metaLine = metaParts.join(META_SEP);
  const metaTitle = metaParts.length
    ? [
        job.client?.trim(),
        contractDateLabel,
        leadName ? `Lider: ${leadName}` : null,
      ]
        .filter(Boolean)
        .join(META_SEP) || metaLine
    : undefined;

  const handoverAlert =
    jobPhase === "handover" && missingDocs.length > 0
      ? `Brakuje: ${missingDocs.map((d) => DOC_LABELS[d]).join(", ")}`
      : null;

  return (
    <div
      className={cn(
        "flex items-stretch mx-2 my-2.5 border",
        WG_RADIUS_MD,
        `transition-colors ${WG_DURATION_HOVER}`,
        "motion-reduce:transition-none",
        "min-h-[7.75rem]",
        selected
          ? "border-primary/30 bg-primary/10"
          : "border-border/70 bg-card hover:bg-secondary/20",
        isDuplicate && !selected && "border-amber-500/25 bg-amber-500/5",
        bulkSelected && "border-destructive/30 bg-destructive/5",
      )}
    >
      {bulkMode && (
        <div className="flex items-center pl-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBulkToggle?.();
            }}
            className={cn(
              "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              `transition-colors ${WG_DURATION_HOVER}`,
              "motion-reduce:transition-none",
              WG_FOCUS_RING,
            )}
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
        aria-pressed={selected}
        className={cn(
          "flex-1 min-w-0 text-left px-3.5 py-3.5 flex flex-col",
          WG_RADIUS_MD,
          `transition-colors ${WG_DURATION_HOVER}`,
          "motion-reduce:transition-none",
          WG_FOCUS_RING,
        )}
      >
        {/* Adres dominant — LIST-02 */}
        <div className="flex items-start gap-2.5 min-w-0">
          <p className="text-base font-semibold tracking-tight truncate leading-snug min-w-0 flex-1 text-foreground">
            {job.address || <span className="italic text-muted-foreground font-medium text-sm">Bez adresu</span>}
            {job.flatNumber && (
              <span className="text-muted-foreground/80 font-normal text-sm"> m.{job.flatNumber}</span>
            )}
          </p>
          <div className={cn(BADGE_RAIL, "flex justify-end pt-0.5 [&_span]:max-w-full [&_span]:truncate [&_span]:rounded-md")}>
            <JobListPrimaryBadge job={job} />
          </div>
        </div>

        {/* Meta — większy odstęp, niższy kontrast, max 2 linie */}
        <p
          className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2 mt-2.5 min-h-[2.5rem]"
          title={metaTitle}
        >
          {metaLine || "\u00A0"}
        </p>

        <div className="mt-2 min-h-[1.5rem] flex items-center gap-1.5">
          {exposedChip ? (
            <span
              title={exposedChip.title}
              className={cn(
                "inline-flex items-center text-[11px] font-medium px-1.5 h-5 rounded-md tabular-nums",
                exposedChip.warn
                  ? "bg-destructive/10 text-destructive"
                  : exposedChip.key === "bzp"
                    ? "bg-violet-500/10 text-violet-700/90 dark:text-violet-400/90"
                    : "bg-teal-500/10 text-teal-800/90 dark:text-teal-300/90",
              )}
            >
              {exposedChip.label}
            </span>
          ) : job.keysHandedOver ? (
            <span title="Klucze zdane" className="inline-flex text-muted-foreground/60">
              <KeyRound size={12} aria-hidden />
            </span>
          ) : null}
        </div>

        {/* Progress = jeden zintegrowany blok + koszt */}
        <div className="mt-auto pt-3 flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              PROGRESS_BLOCK,
              "flex items-center gap-2 rounded-md bg-secondary/35 dark:bg-secondary/25 px-2 py-1.5",
            )}
          >
            <div className="flex-1 bg-border/80 rounded-full h-1.5 overflow-hidden min-w-0">
              <div
                className={cn("h-1.5 rounded-full", docsComplete ? "bg-emerald-500" : "bg-primary/80")}
                style={{ width: `${(docsCount / REQUIRED_DOCS.length) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground/80 shrink-0 tabular-nums tracking-tight">
              {docsCount}/{REQUIRED_DOCS.length}
            </span>
          </div>
          <div
            className={cn(
              COST_RAIL,
              "text-right text-xs font-semibold text-primary/90 tabular-nums truncate ml-auto",
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            title={costLabel ?? undefined}
          >
            {costLabel || "\u00A0"}
          </div>
        </div>

        {handoverAlert ? (
          <p
            className="text-[11px] text-orange-600/90 dark:text-orange-400/90 mt-2 leading-snug line-clamp-1"
            title={handoverAlert}
          >
            {handoverAlert}
          </p>
        ) : (
          <div className="mt-2 min-h-[1rem]" aria-hidden />
        )}
      </button>

      <div className={cn(DELETE_RAIL, "flex items-center justify-center pr-1")}>
        {!bulkMode &&
          (deleteConfirm ? (
            <div className="flex flex-col items-end gap-1 py-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-muted-foreground text-right leading-tight">Usunąć?</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={onDeleteConfirm}
                  aria-label="Potwierdź usunięcie roboty"
                  className={cn(
                    "text-[10px] bg-destructive text-white px-2 py-1 rounded font-medium min-h-[32px] disabled:opacity-50",
                    WG_FOCUS_RING,
                  )}
                >
                  {deleteBusy ? "…" : "Usuń"}
                </button>
                <button
                  type="button"
                  onClick={onDeleteCancel}
                  className={cn(
                    "text-[10px] text-muted-foreground px-1 min-h-[32px]",
                    WG_FOCUS_RING,
                  )}
                  aria-label="Anuluj usuwanie"
                >
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
              aria-label="Usuń robotę"
              className={cn(
                "p-2 min-h-[40px] min-w-[40px] flex items-center justify-center",
                "text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg",
                `transition-colors ${WG_DURATION_HOVER}`,
                "motion-reduce:transition-none",
                WG_FOCUS_RING,
              )}
            >
              <Trash2 size={14} />
            </button>
          ))}
      </div>
    </div>
  );
}
