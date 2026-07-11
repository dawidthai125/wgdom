import { useMemo, type CSSProperties } from "react";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";
import {
  deriveAutonomousOutcomePositives,
  deriveAutonomousOutcomeWatchouts,
} from "@/lib/tender-autonomous-run-outcome";
import {
  AUTONOMOUS_OUTCOME_CTA,
  AUTONOMOUS_OUTCOME_PARTIAL_BANNER,
  AUTONOMOUS_RECOMMENDATION_HERO,
} from "@/lib/tender-autonomous-run-ux";
import type { AutonomousGateOutcomeMode } from "@/lib/tender-autonomous-run-gate-exit";
import {
  TEUX_FONT_BODY,
  TEUX_FONT_CAPTION,
  TEUX_FONT_DISPLAY,
  TEUX_FONT_HEADLINE,
} from "@/lib/tender-ux-tokens";

const HERO_TONE_CLASS: Record<TenderDecision, string> = {
  GO: "text-emerald-700 dark:text-emerald-300",
  HOLD: "text-amber-800 dark:text-amber-200",
  "NO-GO": "text-red-700 dark:text-red-300",
};

export function TenderAutonomousOutcomeScreen({
  intelligenceCtx,
  ownerFinanceWarnings,
  tenderTitle,
  reducedMotion,
  exiting,
  outcomeMode = "complete",
  timeoutExit = false,
  discoveryPending = false,
  onCta,
}: {
  intelligenceCtx: TenderIntelligenceContext;
  ownerFinanceWarnings?: string[] | null;
  tenderTitle: string;
  reducedMotion: boolean;
  exiting?: boolean;
  outcomeMode?: AutonomousGateOutcomeMode;
  timeoutExit?: boolean;
  discoveryPending?: boolean;
  onCta: () => void;
}) {
  const decision = intelligenceCtx.overlay.displayDecision;
  const heroLabel = AUTONOMOUS_RECOMMENDATION_HERO[decision];
  const ctaLabel = AUTONOMOUS_OUTCOME_CTA[decision];
  const confidenceLabel = intelligenceCtx.overlay.confidenceLabel;

  const positives = useMemo(
    () => deriveAutonomousOutcomePositives(intelligenceCtx),
    [intelligenceCtx],
  );

  const watchouts = useMemo(
    () => deriveAutonomousOutcomeWatchouts(intelligenceCtx, ownerFinanceWarnings, {
      partialMode: outcomeMode === "partial",
      timeoutExit,
      discoveryPending,
    }),
    [intelligenceCtx, ownerFinanceWarnings, outcomeMode, timeoutExit, discoveryPending],
  );

  const motionClass = reducedMotion ? "" : "motion-safe:ng10-outcome-enter";
  const exitClass = exiting && !reducedMotion ? "ng10-outcome-exit" : "";

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-background text-foreground ${exitClass}`}
      data-tender-autonomous-outcome
      data-tender-autonomous-decision={decision}
      data-tender-autonomous-outcome-mode={outcomeMode}
      role="dialog"
      aria-modal="true"
      aria-label="Rekomendacja analizy przetargu"
    >
      <style>{`
        @keyframes ng10-outcome-hero-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes ng10-outcome-bullet-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ng10-outcome-screen-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .ng10-outcome-enter .ng10-outcome-hero {
          animation: ng10-outcome-hero-in 350ms ease-out forwards;
        }
        .ng10-outcome-enter .ng10-outcome-bullet {
          animation: ng10-outcome-bullet-in 280ms ease-out forwards;
          animation-delay: calc(var(--ng10-stagger, 0) * 60ms + 120ms);
          opacity: 0;
        }
        .ng10-outcome-exit {
          animation: ng10-outcome-screen-out 200ms ease-in forwards;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .ng10-outcome-enter .ng10-outcome-hero,
          .ng10-outcome-enter .ng10-outcome-bullet,
          .ng10-outcome-exit { animation: none; opacity: 1; }
        }
      `}</style>

      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${motionClass}`}>
        <div className="max-w-lg mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-8">
          <header className="text-center space-y-3 ng10-outcome-hero">
            <p
              className={`${TEUX_FONT_DISPLAY} sm:text-3xl leading-tight tracking-tight ${HERO_TONE_CLASS[decision]}`}
              data-tender-autonomous-outcome-hero
            >
              {heroLabel}
            </p>
            {tenderTitle.trim() && (
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground line-clamp-2`}>
                {tenderTitle}
              </p>
            )}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5"
              data-tender-autonomous-outcome-confidence
            >
              <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                Pewność rekomendacji
              </span>
              <span className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
                {confidenceLabel}
              </span>
            </div>
          </header>

          {outcomeMode === "partial" && (
            <p
              className={`${TEUX_FONT_BODY} text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 text-center`}
              data-tender-autonomous-outcome-partial-banner
            >
              {AUTONOMOUS_OUTCOME_PARTIAL_BANNER}
            </p>
          )}

          {positives.length > 0 && (
            <section data-tender-autonomous-outcome-positives>
              <h2 className={`${TEUX_FONT_HEADLINE} text-foreground mb-3`}>Dlaczego</h2>
              <ul className="space-y-2">
                {positives.map((line, i) => (
                  <li
                    key={line}
                    className={`flex items-start gap-2.5 ${TEUX_FONT_BODY} text-foreground ng10-outcome-bullet`}
                    style={{ "--ng10-stagger": i } as CSSProperties}
                  >
                    <span className="shrink-0 text-primary font-bold mt-0.5" aria-hidden>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {watchouts.length > 0 && (
            <section data-tender-autonomous-outcome-watchouts>
              <h2 className={`${TEUX_FONT_HEADLINE} text-foreground mb-3`}>Na co zwrócić uwagę</h2>
              <ul className="space-y-2">
                {watchouts.map((line, i) => (
                  <li
                    key={line}
                    className={`flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 ${TEUX_FONT_BODY} text-foreground ng10-outcome-bullet`}
                    style={{ "--ng10-stagger": i + positives.length } as CSSProperties}
                  >
                    <span className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden>!</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border px-4 sm:px-6 py-4 safe-area-bottom bg-background/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={onCta}
            className={`w-full inline-flex items-center justify-center min-h-11 px-4 rounded-lg bg-primary text-primary-foreground ${TEUX_FONT_BODY} font-semibold touch-manipulation hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            data-tender-autonomous-outcome-cta
          >
            {ctaLabel}
          </button>
        </div>
      </footer>
    </div>
  );
}
