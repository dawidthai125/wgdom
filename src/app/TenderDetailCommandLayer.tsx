/**
 * NG-03.2 — Command Layer: sticky chrome detalu przetargu V4.
 * NG-06-TEUX-4 — module nav sheet (M4) + density pass ≤390px.
 * NG-08-01 — Workspace Frame: breadcrumb continuity, CTA na wszystkich tabach.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ChevronRight, LayoutGrid } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { TenderDetailKpiCompact } from "@/app/TenderDetailKpiCompact";
import { TenderDetailTabBar } from "@/app/TenderDetailTabBar";
import { TenderDecyzjaSubTabBar } from "@/app/TenderDecyzjaSubTabBar";
import { TenderModuleNavSheet } from "@/app/tenders/mobile/TenderModuleNavSheet";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { navigateToTendersModuleTab } from "@/lib/tender-module-nav-sheet";
import type { TendersTabId } from "@/lib/tenders-module-labels";
import {
  DECYZJA_V4_SUB_TAB_LABELS,
  TENDER_DETAIL_V4_TAB_LABELS,
  type DecyzjaV4EmbedWorkspace,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";
import {
  TEUX_FONT_CAPTION,
  TEUX_FONT_TITLE,
  TEUX_TRANSITION_FAST,
} from "@/lib/tender-ux-tokens";

export function TenderDetailCommandLayer({
  item,
  tab,
  swz,
  compactKosztorysChrome,
  decyzjaWorkspace,
  canViewWorkCatalog = false,
  onBack,
  onTabChange,
  onDecyzjaWorkspaceChange,
  przetargCommandSlot: workspaceCommandSlot,
}: {
  item: TenderPipelineItem;
  tab: TenderDetailV4TabId;
  swz: TenderSwzAnalysis | null | undefined;
  compactKosztorysChrome: boolean;
  decyzjaWorkspace?: DecyzjaV4EmbedWorkspace;
  canViewWorkCatalog?: boolean;
  onBack: () => void;
  onTabChange: (tab: TenderDetailV4TabId) => void;
  onDecyzjaWorkspaceChange?: (ws: DecyzjaV4EmbedWorkspace) => void;
  /** Ribbon (Przetarg) + CTA — wszystkie taby workspace (NG-08-01). */
  przetargCommandSlot?: ReactNode;
}) {
  const navigate = useNavigate();
  const { activeTab: moduleTab, setActiveTab } = useTendersContext();
  const [moduleNavOpen, setModuleNavOpen] = useState(false);

  const showKpiCompact = !compactKosztorysChrome;
  const przetargChrome = tab === "przetarg";

  const handleModuleNavSelect = useCallback(
    (nextTab: TendersTabId) => {
      setModuleNavOpen(false);
      navigateToTendersModuleTab(navigate, setActiveTab, nextTab);
    },
    [navigate, setActiveTab],
  );

  const tenderRef = item.bzpNumber || item.id.slice(0, 8);

  const breadcrumbTabSegment = useMemo(() => {
    if (tab === "decyzja" && decyzjaWorkspace) {
      return (
        <>
          <span>{TENDER_DETAIL_V4_TAB_LABELS[tab]}</span>
          <ChevronRight size={12} className="shrink-0 opacity-60" aria-hidden />
          <span className="text-foreground font-medium">
            {DECYZJA_V4_SUB_TAB_LABELS[decyzjaWorkspace]}
          </span>
        </>
      );
    }
    return (
      <span className="text-foreground font-medium">{TENDER_DETAIL_V4_TAB_LABELS[tab]}</span>
    );
  }, [tab, decyzjaWorkspace]);

  return (
    <>
      <div
        className={`shrink-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 ${
          compactKosztorysChrome
            ? "px-4 sm:px-6 py-2 space-y-2 max-[390px]:px-3 max-[390px]:py-1.5"
            : przetargChrome
              ? "px-4 sm:px-6 py-1.5 sm:py-2 space-y-1.5 max-[390px]:space-y-1 max-[390px]:px-3 max-[390px]:py-1"
              : "px-4 sm:px-6 py-2 sm:py-3 space-y-2 sm:space-y-2.5 max-[390px]:px-3 max-[390px]:py-1.5 max-[390px]:space-y-1.5"
        }`}
        data-tender-command-layer
        data-ng08-workspace-frame
        data-tender-tab={tab}
        data-tender-command-przetarg={przetargChrome ? "true" : undefined}
      >
        <div className="flex items-center justify-between gap-2 -mx-1">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 ${TEUX_FONT_CAPTION} font-medium text-primary hover:underline px-2 min-h-[44px] lg:min-h-[36px] rounded-lg touch-manipulation ${TEUX_TRANSITION_FAST} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-[390px]:gap-1 max-[390px]:px-1.5`}
            onClick={onBack}
            aria-label="Powrót do listy przetargów"
          >
            <ArrowLeft size={14} />
            Powrót do listy
          </button>
          <button
            type="button"
            className={`lg:hidden inline-flex items-center gap-1.5 px-2.5 min-h-[44px] rounded-lg border border-border bg-secondary/50 ${TEUX_FONT_CAPTION} font-medium text-foreground touch-manipulation ${TEUX_TRANSITION_FAST} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-[390px]:px-2`}
            data-tender-module-nav-trigger
            aria-label="Menu modułu Przetargi"
            aria-expanded={moduleNavOpen}
            onClick={() => setModuleNavOpen(true)}
          >
            <LayoutGrid size={14} aria-hidden />
            <span className="max-[390px]:hidden">Moduł</span>
          </button>
        </div>

        {!compactKosztorysChrome && (
          <p
            className={`md:hidden ${TEUX_FONT_CAPTION} text-muted-foreground truncate`}
            data-teux7b-mobile-context
            data-tender-workspace-breadcrumb-mobile
            aria-label="Kontekst workspace"
          >
            <span className="text-muted-foreground/80">Workspace</span>
            {" › "}
            {tenderRef}
            {" › "}
            {tab === "decyzja" && decyzjaWorkspace ? (
              <>
                {TENDER_DETAIL_V4_TAB_LABELS[tab]}
                {" › "}
                {DECYZJA_V4_SUB_TAB_LABELS[decyzjaWorkspace]}
              </>
            ) : (
              TENDER_DETAIL_V4_TAB_LABELS[tab]
            )}
          </p>
        )}

        {!compactKosztorysChrome && (
          <nav
            className={`${przetargChrome ? "hidden md:flex" : "hidden sm:flex"} flex-wrap items-center gap-1 text-[10px] text-muted-foreground`}
            aria-label="Breadcrumb"
            data-tender-workspace-breadcrumb
          >
            <span>Przetargi</span>
            <ChevronRight size={12} className="shrink-0 opacity-60" aria-hidden />
            <span className="truncate max-w-[12rem]">{tenderRef}</span>
            <ChevronRight size={12} className="shrink-0 opacity-60" aria-hidden />
            {breadcrumbTabSegment}
          </nav>
        )}

        {compactKosztorysChrome && (
          <p
            className={`sm:hidden ${TEUX_FONT_CAPTION} text-muted-foreground truncate`}
            data-tender-workspace-breadcrumb-compact
          >
            Workspace › {tenderRef} › {TENDER_DETAIL_V4_TAB_LABELS[tab]}
          </p>
        )}

        <h1
          className={
            compactKosztorysChrome || przetargChrome
              ? `${TEUX_FONT_TITLE} text-foreground line-clamp-1 max-[390px]:text-[13px] max-[390px]:leading-snug`
              : `${TEUX_FONT_TITLE} sm:text-lg line-clamp-2 sm:line-clamp-none max-[390px]:text-[13px] max-[390px]:line-clamp-1`
          }
        >
          {item.title}
        </h1>

        <TenderDetailTabBar activeTab={tab} onTabChange={onTabChange} />

        {tab === "decyzja" && decyzjaWorkspace != null && onDecyzjaWorkspaceChange && (
          <TenderDecyzjaSubTabBar
            activeWorkspace={decyzjaWorkspace}
            onWorkspaceChange={onDecyzjaWorkspaceChange}
          />
        )}

        {showKpiCompact && !przetargChrome && (
          <div className="max-[390px]:[&_[data-tender-kpi-compact]]:rounded-md max-[390px]:[&_[data-tender-kpi-compact]_div]:px-2 max-[390px]:[&_[data-tender-kpi-compact]_div]:py-1.5">
            <TenderDetailKpiCompact item={item} swz={swz} />
          </div>
        )}

        {workspaceCommandSlot}
      </div>

      <TenderModuleNavSheet
        open={moduleNavOpen}
        activeTab={moduleTab}
        canViewWorkCatalog={canViewWorkCatalog}
        workspaceContext={{ tenderRef, title: item.title }}
        onClose={() => setModuleNavOpen(false)}
        onSelectTab={handleModuleNavSelect}
      />
    </>
  );
}
