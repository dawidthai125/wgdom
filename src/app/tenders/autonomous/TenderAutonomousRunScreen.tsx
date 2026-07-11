import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { AutonomousActivityEvent } from "@/lib/tender-autonomous-run-phase";
import type { AutonomousActivityKind } from "@/lib/tender-autonomous-run-ux";
import type {
  AutonomousRunTimelineView,
  AutonomousTimelineStepStatus,
} from "@/lib/tender-autonomous-run-timeline";
import {
  AUTONOMOUS_COMPLETE_HOLD_TITLE,
  AUTONOMOUS_PARTIAL_HOLD_TITLE,
  AUTONOMOUS_PARTIAL_REASON_CHIP,
  AUTONOMOUS_TIMEOUT_BAR_LABEL,
  AUTONOMOUS_TRANSITION_BRIDGE_MESSAGE,
  AUTONOMOUS_TRANSITION_PRESENTATION_SUBTITLE,
  deriveAutonomousTimeoutProgress,
  deriveAutonomousTimeoutT30Message,
  formatAutonomousTimeoutElapsed,
  shouldAutoExpandAutonomousFaq,
  shouldHideLegacyAutonomousEta,
  shouldShowAutonomousTimeoutBar,
  type AutonomousPartialReasonLabel,
} from "@/lib/tender-autonomous-run-transition";
import { TenderAutonomousRunFaq } from "@/app/tenders/autonomous/TenderAutonomousRunFaq";
import { AUTONOMOUS_AI_AGENT_LABELS } from "@/lib/tender-autonomous-run-ux";
import {
  TEUX_FONT_CAPTION,
  TEUX_FONT_HEADLINE,
  TEUX_FONT_BODY,
} from "@/lib/tender-ux-tokens";

const ETA_EXCEEDED_MESSAGE =
  "Analiza trwa dłużej — rozbudowana dokumentacja wymaga więcej czasu.";

function TenderAutonomousTimeoutBar({ elapsedMs }: { elapsedMs: number }) {
  const { percent, elapsedSeconds, maxSeconds } = deriveAutonomousTimeoutProgress(elapsedMs);

  return (
    <div className="shrink-0 space-y-1.5" data-tender-autonomous-timeout-bar>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{AUTONOMOUS_TIMEOUT_BAR_LABEL}</p>
      <div
        className="h-1 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxSeconds}
        aria-valuenow={elapsedSeconds}
        aria-label="Czas analizy automatycznej"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground tabular-nums`}>
        {formatAutonomousTimeoutElapsed(elapsedSeconds)} / ~{formatAutonomousTimeoutElapsed(maxSeconds)}
      </p>
    </div>
  );
}

function TenderAutonomousNearLimitStatus({ message }: { message: string }) {
  return (
    <div
      className={`shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 ${TEUX_FONT_BODY} text-foreground`}
      data-tender-autonomous-timeout-t30
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

function TenderAutonomousTimelineSnapshot({
  snapshot,
}: {
  snapshot: AutonomousRunTimelineView;
}) {
  return (
    <div
      className="shrink-0 flex flex-wrap gap-1.5"
      data-tender-autonomous-timeline-snapshot
      aria-label="Podsumowanie postępu analizy"
    >
      {snapshot.macros.map((macro) => (
        <span
          key={macro.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${TEUX_FONT_CAPTION} ${
            macro.status === "done"
              ? "border-primary/40 bg-primary/10 text-foreground"
              : macro.status === "active"
                ? "border-primary/50 bg-primary/15 text-foreground font-semibold"
                : macro.status === "partial"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                  : macro.status === "skipped"
                    ? "border-border/50 bg-muted/30 text-muted-foreground line-through"
                    : "border-border/50 bg-muted/20 text-muted-foreground"
          }`}
          data-tender-autonomous-timeline-snapshot-macro={macro.id}
        >
          <span aria-hidden>{timelineStatusSymbol(macro.status)}</span>
          {macro.label}
        </span>
      ))}
    </div>
  );
}

function TenderAutonomousTransitionPanel({
  mode,
  exitSummary,
  partialReasonLabel,
  timelineSnapshot,
}: {
  mode: "complete_hold" | "partial_hold" | "outcome_bridge";
  exitSummary: string[] | null;
  partialReasonLabel: AutonomousPartialReasonLabel | null;
  timelineSnapshot: AutonomousRunTimelineView | null;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto overscroll-contain" data-tender-autonomous-transition>
      {mode === "partial_hold" && partialReasonLabel != null && (
        <span
          className={`inline-flex w-fit items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 ${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-100`}
          data-tender-autonomous-partial-reason={partialReasonLabel}
        >
          {AUTONOMOUS_PARTIAL_REASON_CHIP[partialReasonLabel]}
        </span>
      )}
      {exitSummary != null && exitSummary.length > 0 && (
        <ul className="space-y-2" data-tender-autonomous-exit-summary role="list">
          {exitSummary.map((line) => (
            <li
              key={line}
              className={`flex items-start gap-2 ${TEUX_FONT_BODY} text-foreground`}
            >
              <span className="text-primary font-semibold shrink-0" aria-hidden>✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      {timelineSnapshot != null && (
        <TenderAutonomousTimelineSnapshot snapshot={timelineSnapshot} />
      )}
    </div>
  );
}

function timelineStatusSymbol(status: AutonomousTimelineStepStatus): string {
  switch (status) {
    case "done":
      return "✓";
    case "active":
      return "●";
    case "partial":
      return "◐";
    case "skipped":
      return "—";
    default:
      return "○";
  }
}

function feedEntrySymbol(kind: AutonomousActivityKind): string {
  switch (kind) {
    case "achievement":
      return "✓";
    case "live":
      return "●";
    case "status":
      return "·";
    default:
      return "·";
  }
}

function feedEntryClass(kind: AutonomousActivityKind): string {
  switch (kind) {
    case "live":
      return "border-primary/50 bg-primary/10 text-foreground font-medium";
    case "status":
      return "border-border/50 bg-muted/30 text-muted-foreground";
    case "thought":
      return "border-border/40 bg-muted/20 text-muted-foreground italic";
    default:
      return "border-border/60 bg-secondary/30 text-foreground";
  }
}

function TenderAutonomousActivityLog({
  feed,
  reducedMotion,
}: {
  feed: AutonomousActivityEvent[];
  reducedMotion: boolean;
}) {
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const end = feedEndRef.current;
    if (!end) return;
    end.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [feed.length, feed[feed.length - 1]?.message, reducedMotion]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <p className={`${TEUX_FONT_CAPTION} font-semibold uppercase tracking-wide text-muted-foreground mb-2`}>
        Dziennik analizy
      </p>
      <div
        ref={feedScrollRef}
        className="flex-1 min-h-0 max-h-[40vh] lg:max-h-none overflow-y-auto overscroll-contain space-y-2 pr-1"
        data-tender-autonomous-feed
        aria-live="polite"
        aria-relevant="additions"
      >
        {feed.map((entry) => (
          <div
            key={`${entry.id}-${entry.kind}-${entry.message}`}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${TEUX_FONT_BODY} ng10-feed-item-enter ${feedEntryClass(entry.kind)}`}
            data-tender-autonomous-feed-entry={entry.id}
            data-tender-autonomous-feed-kind={entry.kind}
            data-tender-autonomous-agent={entry.agentId}
          >
            <span
              className={`shrink-0 w-4 text-center ${entry.kind === "achievement" ? "text-primary font-semibold" : entry.kind === "live" ? "text-primary" : "text-muted-foreground"}`}
              aria-hidden
            >
              {feedEntrySymbol(entry.kind)}
            </span>
            <div className="min-w-0">
              <p>{entry.message.replace(/^✓\s*/, "")}</p>
              {entry.kind !== "status" && (
                <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
                  {AUTONOMOUS_AI_AGENT_LABELS[entry.agentId]}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={feedEndRef} className="h-px shrink-0" aria-hidden />
      </div>
    </div>
  );
}

function TenderAutonomousDynamicStatus({ message }: { message: string }) {
  return (
    <div
      className={`sticky top-0 z-10 shrink-0 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 ${TEUX_FONT_BODY} text-foreground shadow-sm`}
      data-tender-autonomous-dynamic-status
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

function timelineStatusClass(status: AutonomousTimelineStepStatus): string {
  switch (status) {
    case "done":
      return "text-primary font-semibold";
    case "active":
      return "text-foreground font-semibold";
    case "partial":
      return "text-amber-700 dark:text-amber-300";
    case "skipped":
      return "text-muted-foreground line-through";
    default:
      return "text-muted-foreground";
  }
}

function TenderAutonomousTimelinePanel({
  timelineView,
  reducedMotion,
  compact,
}: {
  timelineView: AutonomousRunTimelineView;
  reducedMotion: boolean;
  compact?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeMacro = timelineView.macros.find((m) => m.id === timelineView.activeMacroId);

  const stepList = (
    <ol
      className="space-y-1.5"
      role="list"
      data-tender-autonomous-timeline-steps
    >
      {timelineView.steps.map((step) => (
        <li
          key={step.id}
          role="listitem"
          aria-current={step.status === "active" ? "step" : undefined}
          className={`flex items-start gap-2 ${TEUX_FONT_CAPTION} ${timelineStatusClass(step.status)}`}
          data-tender-autonomous-timeline-step={step.id}
          data-tender-autonomous-timeline-status={step.status}
        >
          <span className="shrink-0 w-4 text-center tabular-nums" aria-hidden>
            {timelineStatusSymbol(step.status)}
          </span>
          <span className="min-w-0 leading-snug">{step.label}</span>
        </li>
      ))}
    </ol>
  );

  const macroChips = (
    <div
      className="flex flex-wrap gap-1.5 justify-center lg:justify-start"
      data-tender-autonomous-timeline-macros
    >
      {timelineView.macros.map((macro) => (
        <span
          key={macro.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${TEUX_FONT_CAPTION} ${
            macro.status === "active"
              ? "border-primary/50 bg-primary/10 text-foreground font-semibold"
              : macro.status === "done"
                ? "border-border/60 bg-secondary/40 text-muted-foreground"
                : macro.status === "partial"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                  : "border-border/50 bg-muted/30 text-muted-foreground"
          }`}
          data-tender-autonomous-timeline-macro={macro.id}
          data-tender-autonomous-timeline-macro-status={macro.status}
        >
          <span aria-hidden>{timelineStatusSymbol(macro.status)}</span>
          {macro.label}
        </span>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="shrink-0" data-tender-autonomous-timeline>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={`w-full flex items-center justify-between gap-2 min-h-11 px-3 py-2 rounded-lg border border-border bg-card/80 touch-manipulation ${TEUX_FONT_CAPTION} font-semibold text-foreground`}
          aria-expanded={mobileOpen}
          data-tender-autonomous-timeline-toggle
        >
          <span>Postęp analizy</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
            {activeMacro && (
              <span className="text-primary">{activeMacro.label}</span>
            )}
            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform ${mobileOpen ? "rotate-180" : ""} ${reducedMotion ? "" : "duration-200"}`}
              aria-hidden
            />
          </span>
        </button>
        {mobileOpen && (
          <div className="mt-2 rounded-lg border border-border bg-card/60 px-3 py-3 max-h-[40vh] overflow-y-auto overscroll-contain">
            {stepList}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-0" data-tender-autonomous-timeline>
      <p className={`${TEUX_FONT_CAPTION} font-semibold uppercase tracking-wide text-muted-foreground`}>
        Postęp analizy
      </p>
      {macroChips}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
        {stepList}
      </div>
    </div>
  );
}

export type TenderAutonomousRunScreenMode =
  | "running"
  | "complete_hold"
  | "partial_hold"
  | "outcome_bridge";

export function TenderAutonomousRunScreen({
  tenderTitle,
  mode,
  activeLiveMessage,
  feed,
  statusMessage,
  timelineView,
  etaLabel,
  etaExceeded,
  elapsedMs,
  runComplete,
  exitSummary,
  partialReasonLabel,
  timelineSnapshot,
  reducedMotion,
  onBack,
}: {
  tenderTitle: string;
  mode: TenderAutonomousRunScreenMode;
  activeLiveMessage: string | null;
  feed: AutonomousActivityEvent[];
  statusMessage: string | null;
  timelineView: AutonomousRunTimelineView | null;
  etaLabel: string | null;
  etaExceeded: boolean;
  elapsedMs: number;
  runComplete: boolean;
  exitSummary: string[] | null;
  partialReasonLabel: AutonomousPartialReasonLabel | null;
  timelineSnapshot: AutonomousRunTimelineView | null;
  reducedMotion: boolean;
  onBack: () => void;
}) {
  const showTimeline = mode === "running" && timelineView != null;
  const showDynamicStatus = mode === "running" && statusMessage != null && statusMessage.trim().length > 0;
  const showTimeoutBar = mode === "running" && shouldShowAutonomousTimeoutBar(elapsedMs, runComplete);
  const nearLimitMessage = mode === "running"
    ? deriveAutonomousTimeoutT30Message(elapsedMs, runComplete)
    : null;
  const hideLegacyEta = shouldHideLegacyAutonomousEta({
    showTimeline,
    elapsedMs,
    runComplete,
  });
  const faqAutoExpand = mode === "running" && shouldAutoExpandAutonomousFaq(elapsedMs, runComplete);
  const isTransitionMode = mode === "complete_hold" || mode === "partial_hold" || mode === "outcome_bridge";

  const handleBack = () => {
    const ok = window.confirm(
      "Analiza jest w toku. Czy na pewno chcesz wrócić do listy przetargów?",
    );
    if (ok) onBack();
  };

  const displayMessage = mode === "complete_hold"
    ? AUTONOMOUS_COMPLETE_HOLD_TITLE
    : mode === "partial_hold"
      ? AUTONOMOUS_PARTIAL_HOLD_TITLE
      : mode === "outcome_bridge"
        ? AUTONOMOUS_TRANSITION_BRIDGE_MESSAGE
        : (activeLiveMessage ?? "Analizuję przetarg…");

  const showEta = mode === "running" && etaLabel != null && !etaExceeded && !hideLegacyEta;
  const showEtaExceeded = mode === "running" && etaExceeded && !hideLegacyEta;
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
          {showTimeline && (
            <div className="hidden lg:block w-full">
              <div className="flex flex-wrap gap-1.5" data-tender-autonomous-timeline-macros-desktop>
                {timelineView.macros.map((macro) => (
                  <span
                    key={macro.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${TEUX_FONT_CAPTION} ${
                      macro.status === "active"
                        ? "border-primary/50 bg-primary/10 text-foreground font-semibold"
                        : "border-border/50 text-muted-foreground"
                    }`}
                    data-tender-autonomous-timeline-macro={macro.id}
                  >
                    <span aria-hidden>{timelineStatusSymbol(macro.status)}</span>
                    {macro.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {showEta && (
            <p
              className={`${TEUX_FONT_CAPTION} font-medium text-muted-foreground tabular-nums text-center lg:text-left`}
              data-tender-autonomous-eta
            >
              {etaLabel}
            </p>
          )}
          {showEtaExceeded && (
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
            className={`rounded-xl border border-border bg-card/80 px-4 py-3 min-h-[3.5rem] flex flex-col justify-center gap-1 ${TEUX_FONT_BODY} font-medium text-foreground`}
            data-tender-autonomous-live
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{displayMessage}</span>
            {(mode === "complete_hold" || mode === "partial_hold") && (
              <span
                className={`${TEUX_FONT_CAPTION} font-normal text-muted-foreground`}
                data-tender-autonomous-transition-subtitle
              >
                {AUTONOMOUS_TRANSITION_PRESENTATION_SUBTITLE}
              </span>
            )}
          </div>

          {showTimeoutBar && <TenderAutonomousTimeoutBar elapsedMs={elapsedMs} />}

          {nearLimitMessage != null && (
            <TenderAutonomousNearLimitStatus message={nearLimitMessage} />
          )}

          {showTimeline && (
            <div className="lg:hidden">
              <TenderAutonomousTimelinePanel
                timelineView={timelineView}
                reducedMotion={reducedMotion}
                compact
              />
            </div>
          )}

          {showDynamicStatus && (
            <TenderAutonomousDynamicStatus message={statusMessage} />
          )}

          {mode === "running" && (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
              {showTimeline && (
                <div className="hidden lg:flex lg:w-[42%] lg:shrink-0 min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/40 px-3 py-3">
                  <TenderAutonomousTimelinePanel
                    timelineView={timelineView}
                    reducedMotion={reducedMotion}
                  />
                </div>
              )}
              <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
                <TenderAutonomousActivityLog feed={feed} reducedMotion={reducedMotion} />
                <TenderAutonomousRunFaq autoExpand={faqAutoExpand} />
              </div>
            </div>
          )}

          {isTransitionMode && (
            <TenderAutonomousTransitionPanel
              mode={mode as "complete_hold" | "partial_hold" | "outcome_bridge"}
              exitSummary={exitSummary}
              partialReasonLabel={partialReasonLabel}
              timelineSnapshot={timelineSnapshot}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { ETA_EXCEEDED_MESSAGE, AUTONOMOUS_COMPLETE_HOLD_TITLE as COMPLETE_HOLD_MESSAGE };
