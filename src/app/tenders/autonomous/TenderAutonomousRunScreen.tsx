import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import type { AutonomousActivityEvent } from "@/lib/tender-autonomous-run-phase";
import { AUTONOMOUS_AI_AGENT_LABELS } from "@/lib/tender-autonomous-run-ux";
import {
  TEUX_FONT_CAPTION,
  TEUX_FONT_HEADLINE,
  TEUX_FONT_BODY,
} from "@/lib/tender-ux-tokens";

const ETA_EXCEEDED_MESSAGE =
  "Analiza trwa dłużej — rozbudowana dokumentacja wymaga więcej czasu.";

const COMPLETE_HOLD_MESSAGE = "✓ Analiza zakończona";

export type TenderAutonomousRunScreenMode = "running" | "complete_hold" | "outcome_bridge";

export function TenderAutonomousRunScreen({
  tenderTitle,
  mode,
  activeLiveMessage,
  achievements,
  etaLabel,
  etaExceeded,
  reducedMotion,
  onBack,
}: {
  tenderTitle: string;
  mode: TenderAutonomousRunScreenMode;
  activeLiveMessage: string | null;
  achievements: AutonomousActivityEvent[];
  etaLabel: string | null;
  etaExceeded: boolean;
  reducedMotion: boolean;
  onBack: () => void;
}) {
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "complete_hold" || mode === "outcome_bridge") return;
    const el = feedScrollRef.current;
    const end = feedEndRef.current;
    if (!el || !end) return;
    end.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [achievements.length, activeLiveMessage, mode, reducedMotion]);

  const handleBack = () => {
    const ok = window.confirm(
      "Analiza jest w toku. Czy na pewno chcesz wrócić do listy przetargów?",
    );
    if (ok) onBack();
  };

  const displayMessage = mode === "complete_hold"
    ? COMPLETE_HOLD_MESSAGE
    : mode === "outcome_bridge"
      ? "Przygotowuję rekomendację…"
      : (activeLiveMessage ?? "Analizuję przetarg…");

  const showEta = mode === "running" && etaLabel != null && !etaExceeded;
  const pulseClass = reducedMotion
    ? ""
    : "motion-safe:animate-[ng10-agent-breathe_2.4s_ease-in-out_infinite]";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground"
      data-tender-autonomous-run
      data-tender-autonomous-mode={mode}
      role="dialog"
      aria-modal="true"
      aria-label="Autonomiczna analiza przetargu"
    >
      <style>{`
        @keyframes ng10-agent-breathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes ng10-feed-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .ng10-feed-item-enter {
          animation: ng10-feed-in 220ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .ng10-feed-item-enter { animation: none; }
        }
      `}</style>

      <header className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border safe-area-top">
        <button
          type="button"
          onClick={handleBack}
          className={`inline-flex items-center gap-2 min-h-11 px-2 rounded-md ${TEUX_FONT_CAPTION} font-semibold text-muted-foreground hover:text-foreground touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
          data-tender-autonomous-back
        >
          <ArrowLeft size={18} aria-hidden />
          Powrót do listy
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full overflow-hidden">
        <div className="flex flex-col items-center lg:items-start lg:w-[220px] shrink-0 gap-4">
          <div className="relative flex items-center justify-center w-24 h-24" aria-hidden>
            <span
              className={`absolute inset-0 rounded-full bg-primary/15 ${pulseClass}`}
            />
            <span
              className={`absolute inset-2 rounded-full bg-primary/25 ${pulseClass}`}
              style={reducedMotion ? undefined : { animationDelay: "0.4s" }}
            />
            <span className="relative z-10 w-12 h-12 rounded-full bg-primary/90 shadow-[0_0_24px_rgba(var(--primary),0.35)]" />
          </div>
          <div className="text-center lg:text-left space-y-1 min-w-0">
            <p className={`${TEUX_FONT_HEADLINE} text-foreground`}>Analiza przetargu</p>
            {tenderTitle.trim() && (
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground line-clamp-2`}>{tenderTitle}</p>
            )}
          </div>
          {showEta && (
            <p
              className={`${TEUX_FONT_CAPTION} font-medium text-muted-foreground tabular-nums text-center lg:text-left`}
              data-tender-autonomous-eta
            >
              {etaLabel}
            </p>
          )}
          {mode === "running" && etaExceeded && (
            <p
              className={`${TEUX_FONT_BODY} text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2`}
              data-tender-autonomous-eta-exceeded
            >
              {ETA_EXCEEDED_MESSAGE}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          <div
            className={`rounded-xl border border-border bg-card/80 px-4 py-3 min-h-[3.5rem] flex items-center ${TEUX_FONT_BODY} font-medium text-foreground`}
            data-tender-autonomous-live
            aria-live="polite"
            aria-atomic="true"
          >
            {displayMessage}
          </div>

          {mode === "running" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <p className={`${TEUX_FONT_CAPTION} font-semibold uppercase tracking-wide text-muted-foreground mb-2`}>
                Dotychczas
              </p>
              <div
                ref={feedScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1"
                data-tender-autonomous-feed
              >
                {achievements.map((entry) => (
                  <div
                    key={`${entry.id}-${entry.message}`}
                    className={`flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 ${TEUX_FONT_BODY} text-foreground ng10-feed-item-enter`}
                    data-tender-autonomous-achievement={entry.id}
                    data-tender-autonomous-agent={entry.agentId}
                  >
                    <span className="shrink-0 text-primary font-semibold" aria-hidden>✓</span>
                    <div className="min-w-0">
                      <p>{entry.message.replace(/^✓\s*/, "")}</p>
                      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
                        {AUTONOMOUS_AI_AGENT_LABELS[entry.agentId]}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={feedEndRef} className="h-px shrink-0" aria-hidden />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ETA_EXCEEDED_MESSAGE, COMPLETE_HOLD_MESSAGE };
