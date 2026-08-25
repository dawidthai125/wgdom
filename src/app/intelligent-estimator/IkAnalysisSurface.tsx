/**
 * IK Analysis Surface — presentation-only large overlay for existing IkEntryHost.
 *
 * HARD: no second orchestra / Observation / EC / Live Viz engine.
 * Children = existing IkEntryHost (LiveVisualizationView + EC + action queue).
 */

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { WgButton, WgModalFrame } from "@/app/ui";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_ENTER, WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";
import { INTELIGENTNY_KOSZTORYSANT_TITLE_PL } from "@/lib/expert-conversation-ui";

export const IK_ANALYSIS_SURFACE_TITLE_PL = "IK — Analiza przetargu";
export const IK_ANALYSIS_SURFACE_OPEN_CTA_PL = "Otwórz analizę IK";
export const IK_ANALYSIS_SURFACE_CLOSE_PL = "Zamknij analizę";

export function IkAnalysisSurface({
  open,
  onClose,
  children,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional tender label under the title (presentation only). */
  subtitle?: string | null;
}) {
  useModalScrollLock(open);

  return (
    <WgModalFrame
      open={open}
      onClose={onClose}
      showHeader={false}
      variant="sheet"
      surface="solid"
      size="xl"
      zIndex={130}
      closeLabel={IK_ANALYSIS_SURFACE_CLOSE_PL}
      aria-label={IK_ANALYSIS_SURFACE_TITLE_PL}
      className="overflow-hidden"
    >
      <div
        className="flex flex-col min-h-0 flex-1 h-full"
        data-ik-analysis-surface="1"
      >
        <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-start justify-between gap-3 bg-card">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
              {IK_ANALYSIS_SURFACE_TITLE_PL}
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              {subtitle?.trim()
                ? subtitle
                : INTELIGENTNY_KOSZTORYSANT_TITLE_PL}
            </p>
          </div>
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={IK_ANALYSIS_SURFACE_CLOSE_PL}
            className={cn(
              WG_TOUCH_MIN,
              "h-11 w-11 rounded-lg hover:bg-secondary text-muted-foreground shrink-0",
              `transition-colors ${WG_DURATION_ENTER}`,
            )}
            data-ik-analysis-surface-close
          >
            <X size={16} />
          </WgButton>
        </header>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 [&_[data-ik-entry-host]]:mb-0"
          data-ik-analysis-surface-body
        >
          {children}
        </div>

        <footer className="shrink-0 border-t border-border px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 bg-card/95">
          <p className="text-[11px] text-muted-foreground min-w-0 truncate">
            Orkiestracja IK · zamknięcie nie zatrzymuje runtime
          </p>
          <WgButton
            type="button"
            variant="secondary"
            onClick={onClose}
            className={cn(
              "rounded-xl shrink-0",
              WG_TOUCH_MIN,
              "h-11 px-4",
              `transition-colors ${WG_DURATION_ENTER}`,
            )}
            data-ik-analysis-surface-footer-close
          >
            {IK_ANALYSIS_SURFACE_CLOSE_PL}
          </WgButton>
        </footer>
      </div>
    </WgModalFrame>
  );
}
