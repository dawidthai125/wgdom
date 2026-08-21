/**
 * Expert Conversation Surface — presentation timeline over existing Dossier/Trace.
 * ZERO engine delay · Skip / Continue · reduced-motion aware.
 *
 * DESIGN FREEZE (Historical EC observability):
 *   structuralSignature → may restart progressive reveal
 *   contentSignature (messagePl / messageWeight) → in-place update · NO reveal reset
 * Reveal-reset effect MUST NOT depend on `steps` (ARCH REVIEW hard requirement).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ExpertConversationStepView,
  ExpertConversationViewModel,
} from "@/lib/expert-conversation-ui";
import {
  EXPERT_CONVERSATION_CONTINUE_PL,
  EXPERT_CONVERSATION_SKIP_PL,
  conversationStepDelayMs,
  prefersReducedMotion,
  scaleConversationDelays,
} from "@/lib/expert-conversation-ui";
import { TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { ExpertConversationStepCard } from "./ExpertConversationStepCard";

/** Structural only — id/status/length/phase. Excludes messageWeight / messagePl. */
export function buildExpertConversationStructuralSignature(
  uiPhase: string,
  caseIdShort: string | null | undefined,
  steps: readonly Pick<ExpertConversationStepView, "id" | "status">[],
): string {
  return `${uiPhase}|${caseIdShort ?? ""}|${steps.map((s) => `${s.id}:${s.status}`).join(",")}|len=${steps.length}`;
}

/** Content fingerprint — messageWeight only (presentation). Not a reveal-reset trigger. */
export function buildExpertConversationContentSignature(
  steps: readonly Pick<ExpertConversationStepView, "id" | "messageWeight">[],
): string {
  return steps.map((s) => `${s.id}:${s.messageWeight}`).join(",");
}

function scrollToDecision(): void {
  const el =
    document.getElementById("decision-workspace-surface") ??
    document.querySelector("[data-decision-workspace-surface]");
  if (el && "scrollIntoView" in el) {
    (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function ExpertConversationSurface({
  vm,
}: {
  vm: ExpertConversationViewModel;
}) {
  const steps = vm.steps;
  const stepCount = steps.length;
  const [revealedCount, setRevealedCount] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const userScrolledRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  /** Latest steps for structural effect body — effect MUST NOT list `steps` in deps. */
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const revealAll = useCallback(() => {
    clearTimers();
    setSkipped(true);
    setRevealedCount(stepCount);
  }, [clearTimers, stepCount]);

  const structuralSignature = useMemo(
    () =>
      buildExpertConversationStructuralSignature(
        vm.uiPhase,
        vm.caseIdShort,
        steps,
      ),
    [vm.uiPhase, vm.caseIdShort, steps],
  );

  // Content fingerprint: documents messagePl weight changes (e.g. late historicalIndex).
  // Intentionally unused by reveal-reset effect — in-place React re-render only.
  const contentSignature = useMemo(
    () => buildExpertConversationContentSignature(steps),
    [steps],
  );
  void contentSignature;

  // Restart progressive reveal ONLY on structural changes (not messageWeight / content).
  useEffect(() => {
    clearTimers();
    setSkipped(false);
    userScrolledRef.current = false;

    const currentSteps = stepsRef.current;
    const n = currentSteps.length;

    if (!vm.visible || n === 0) {
      setRevealedCount(0);
      return;
    }

    if (prefersReducedMotion()) {
      setRevealedCount(n);
      setSkipped(true);
      return;
    }

    // Instant full reveal when already terminal and all experts done/blocked/skipped
    const terminal =
      vm.uiPhase === "ready" ||
      vm.uiPhase === "blocked" ||
      vm.uiPhase === "finished_other" ||
      vm.uiPhase === "cancelled" ||
      vm.uiPhase === "error";
    const allSettled = currentSteps.every(
      (s) =>
        s.status === "done" ||
        s.status === "blocked" ||
        s.status === "skipped",
    );

    // Still animate presentation for terminal (Owner: show process) unless reduced motion
    const delays = scaleConversationDelays(
      currentSteps.map((s) => conversationStepDelayMs(s.messageWeight, "normal")),
      "normal",
    );

    setRevealedCount(1);
    let acc = 0;
    for (let i = 1; i < n; i++) {
      acc += delays[i - 1] ?? 350;
      const handle = window.setTimeout(() => {
        setRevealedCount((c) => Math.max(c, i + 1));
      }, acc);
      timersRef.current.push(handle);
    }

    // Cap: if terminal+settled, keep animation but already scaled ≤4s
    void terminal;
    void allSettled;

    return () => clearTimers();
    // ARCH: do NOT add `steps` / contentSignature / stepCount — late historicalIndex
    // rebuilds steps array + messageWeight and would restart reveal (same bug).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- structuralSignature encodes len/ids/status/phase
  }, [structuralSignature, vm.visible, clearTimers]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      userScrolledRef.current = true;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!vm.visible) return null;

  const currentIndex = Math.min(revealedCount, stepCount) - 1;
  const fullyRevealed = revealedCount >= stepCount;

  return (
    <section
      id="expert-conversation-surface"
      data-expert-conversation-surface
      data-expert-conversation-phase={vm.uiPhase}
      data-expert-conversation-skipped={skipped ? "1" : "0"}
      className="rounded-xl border border-border bg-card overflow-hidden"
      aria-label={vm.titlePl}
      data-ik-mobile-ready="1"
    >
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className={`${TEUX_SECTION_TITLE} text-foreground`}>{vm.titlePl}</h2>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
            {vm.subtitlePl}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!fullyRevealed && (
            <button
              type="button"
              className="text-[11px] font-medium text-primary underline-offset-4 hover:underline min-h-[44px] px-2 touch-manipulation"
              data-expert-conversation-skip
              onClick={revealAll}
            >
              {EXPERT_CONVERSATION_SKIP_PL}
            </button>
          )}
          <button
            type="button"
            className="text-[11px] font-medium rounded-md border border-border bg-background px-2.5 min-h-[44px] touch-manipulation hover:bg-secondary/40"
            data-expert-conversation-continue
            onClick={() => {
              revealAll();
              scrollToDecision();
            }}
          >
            {EXPERT_CONVERSATION_CONTINUE_PL}
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className="px-3 py-3 space-y-2 max-h-[min(28rem,55vh)] overflow-y-auto overscroll-contain"
        data-expert-conversation-list
      >
        {steps.map((step, i) => (
          <ExpertConversationStepCard
            key={step.id}
            step={step}
            revealed={i < revealedCount}
            isCurrent={i === currentIndex && !fullyRevealed}
            collapsedDone={fullyRevealed || skipped}
          />
        ))}
      </div>
    </section>
  );
}
