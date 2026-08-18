/**
 * IK-KNR-EXPERT Slice C3 — presentation chrome over the existing IK Surface.
 *
 * ZERO second timeline · ZERO KV/settings/flags · ZERO Master BOQ / knrHint / catalogWorkId.
 * Nested list max-h override is chrome-scoped (does not change Surface API / Hub).
 */

import { useState, type ReactNode } from "react";
import { InteligentnyKosztorysantBrand } from "@/app/expert-conversation";
import { prefersReducedMotion } from "@/lib/expert-conversation-ui";
import type { IkKnrExpertReport } from "./ik-knr-expert";

const KNR_CHROME_LINE_PL = "KNR — Ekspert od oznaczeń katalogowych";
const COLLAPSE_EXPAND_PL = "Rozwiń";
const COLLAPSE_COLLAPSE_PL = "Zwiń";
const STATE_BLOCKED_PL = "czekam na przedmiar";
const STATE_CHECKED_PL = "oznaczenia sprawdzone";
const STATE_EMPTY_PL = "brak oznaczeń w danych";

function isMobileViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(max-width: 767px)").matches;
  } catch {
    return false;
  }
}

function collapsedStatePl(report: IkKnrExpertReport | null | undefined): string {
  if (!report || report.status !== "COMPLETED") return STATE_BLOCKED_PL;
  if (report.counts.withBasis > 0) return STATE_CHECKED_PL;
  return STATE_EMPTY_PL;
}

export function IkExpertRoomChrome({
  report,
  children,
}: {
  report: IkKnrExpertReport | null;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(() => !isMobileViewport());
  const reducedMotion = prefersReducedMotion();
  const statePl = collapsedStatePl(report);

  return (
    <section
      data-ik-expert-room-chrome="1"
      data-ik-expert-room-collapsed={expanded ? "0" : "1"}
      data-ik-expert-room-mobile={isMobileViewport() ? "1" : "0"}
      className={
        `sticky top-0 z-20 mb-3 overflow-hidden rounded-xl border border-border bg-card`
        + (expanded ? " max-h-[min(36rem,42vh)] max-[767px]:max-h-[50vh]" : "")
        + (reducedMotion ? "" : " transition-[max-height] duration-200")
        + " motion-reduce:transition-none"
      }
    >
      <div className="flex items-start gap-2 border-b border-border/60 bg-secondary/30 px-3 py-2">
        <div className="min-w-0 flex-1">
          <InteligentnyKosztorysantBrand compact />
          <p
            className="mt-1 text-[11px] text-muted-foreground"
            data-ik-expert-room-knr-line
          >
            {KNR_CHROME_LINE_PL}
          </p>
          {!expanded && (
            <p
              className="mt-0.5 truncate text-[11px] text-muted-foreground"
              data-ik-expert-room-collapsed-state
            >
              {statePl}
            </p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 min-h-[44px] min-w-[44px] touch-manipulation rounded-md border border-border bg-background px-2.5 text-[11px] font-medium hover:bg-secondary/40"
          data-ik-expert-room-collapse
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? COLLAPSE_COLLAPSE_PL : COLLAPSE_EXPAND_PL}
        </button>
      </div>
      {expanded ? (
        <div
          className="min-h-0 overflow-y-auto overscroll-contain [&_[data-expert-conversation-list]]:max-h-[min(18rem,32vh)]"
          data-ik-expert-room-body
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
