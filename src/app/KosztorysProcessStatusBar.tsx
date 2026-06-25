import { AlertCircle, CheckCircle2, Circle, RefreshCw, XCircle } from "lucide-react";
import type { KosztorysProcessPhaseView } from "@/lib/tender-kosztorys-process-phase";

function toneClasses(tone: KosztorysProcessPhaseView["tone"]): string {
  switch (tone) {
    case "success":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/25";
    case "warning":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/25";
    case "error":
      return "bg-red-500/15 text-red-800 dark:text-red-400 border-red-500/25";
    case "progress":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-300 border-sky-500/25";
    default:
      return "bg-secondary/80 text-muted-foreground border-border";
  }
}

function PhaseIcon({ phase }: { phase: KosztorysProcessPhaseView }) {
  const size = 14;
  switch (phase.tone) {
    case "success":
      return <CheckCircle2 size={size} aria-hidden />;
    case "warning":
      return <AlertCircle size={size} aria-hidden />;
    case "error":
      return <XCircle size={size} aria-hidden />;
    default:
      return <Circle size={size} aria-hidden className="opacity-70" />;
  }
}

export function KosztorysProcessStatusBar({
  phase,
  onRetry,
  retryBusy,
}: {
  phase: KosztorysProcessPhaseView;
  onRetry?: () => void;
  retryBusy?: boolean;
}) {
  return (
    <div className="space-y-2" data-kosztorys-process-phase={phase.id} data-kosztorys-technical-phase={phase.technicalId ?? undefined} data-kosztorys-e6-sub={phase.e6Sub ?? undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${toneClasses(phase.tone)}`}
          role="status"
          aria-live="polite"
        >
          <PhaseIcon phase={phase} />
          <span>{phase.label}</span>
        </div>

        {phase.showRetry && onRetry && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-secondary/60 disabled:opacity-60"
            onClick={onRetry}
            disabled={retryBusy}
            data-kosztorys-process-retry
          >
            <RefreshCw size={14} className={retryBusy ? "animate-spin" : ""} />
            Spróbuj ponownie
          </button>
        )}
      </div>

      {phase.hint && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{phase.hint}</p>
      )}
    </div>
  );
}
