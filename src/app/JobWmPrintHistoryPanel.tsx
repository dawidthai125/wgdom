import { ExternalLink, Printer } from "lucide-react";
import type { Job } from "@/app/app-domain";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import {
  filterWmPrintHistoryForJob,
  formatWmPrintHistoryTimestamp,
  wmPrintHistoryOutputTypeLabel,
} from "@/lib/wm-print/history";

const JOB_WM_PRINT_HISTORY_MAX = 8;

export function JobWmPrintHistoryPanel({
  job,
  history,
  onOpenModule,
}: {
  job: Job;
  history: WmPrintHistoryEntry[];
  onOpenModule: () => void;
}) {
  const linked = filterWmPrintHistoryForJob(history, job.id);
  const visible = linked.slice(0, JOB_WM_PRINT_HISTORY_MAX);

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Printer size={14} className="text-primary shrink-0" />
          Historia WM Druk
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Kto i kiedy generował dokumenty odbiorowe dla tej roboty — bez kopii plików.
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak wygenerowanych dokumentów WM Druk dla tej roboty.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border px-3 py-2 text-left"
            >
              <p className="text-sm font-medium truncate">{entry.templateName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {entry.userName} · {formatWmPrintHistoryTimestamp(entry.timestamp)} ·{" "}
                {wmPrintHistoryOutputTypeLabel(entry.outputType)}
              </p>
            </li>
          ))}
          {linked.length > JOB_WM_PRINT_HISTORY_MAX && (
            <p className="text-[10px] text-muted-foreground">
              + {linked.length - JOB_WM_PRINT_HISTORY_MAX} więcej w module WM Druk
            </p>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={onOpenModule}
        className="text-xs text-primary flex items-center gap-1 hover:underline"
      >
        <ExternalLink size={11} />
        Zobacz pełną historię
      </button>
    </div>
  );
}
