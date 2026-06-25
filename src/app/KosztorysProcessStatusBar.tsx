import { AlertCircle, CheckCircle2, Circle, RefreshCw, XCircle } from "lucide-react";
import type { KosztorysProcessPhaseView } from "@/lib/tender-kosztorys-process-phase";
import type { KosztorysProcessHealthView } from "@/lib/tender-kosztorys-process-health";

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
  health,
  onRetry,
  retryBusy,
}: {
  phase: KosztorysProcessPhaseView;
  health?: KosztorysProcessHealthView | null;
  onRetry?: () => void;
  retryBusy?: boolean;
}) {
  const showRetry = phase.showRetry || health?.showRetry;
  const displayPhase = health?.currentPhase ?? phase;

  return (
    <div
      className="space-y-2"
      data-kosztorys-process-phase={displayPhase.id}
      data-kosztorys-technical-phase={displayPhase.technicalId ?? undefined}
      data-kosztorys-e6-sub={displayPhase.e6Sub ?? undefined}
      data-kosztorys-health={health?.status ?? "healthy"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${toneClasses(displayPhase.tone)}`}
          role="status"
          aria-live="polite"
        >
          <PhaseIcon phase={displayPhase} />
          <span>{displayPhase.label}</span>
        </div>

        {showRetry && onRetry && (
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

      {displayPhase.hint && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{displayPhase.hint}</p>
      )}
    </div>
  );
}
