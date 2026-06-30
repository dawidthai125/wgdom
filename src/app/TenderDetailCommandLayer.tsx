/**
 * NG-03.2 — Command Layer: sticky chrome detalu przetargu V4.
 */

import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { TenderDetailKpiCompact } from "@/app/TenderDetailKpiCompact";
import { TenderDetailTabBar } from "@/app/TenderDetailTabBar";
import { TenderDecyzjaSubTabBar } from "@/app/TenderDecyzjaSubTabBar";
import {
  DECYZJA_V4_SUB_TAB_LABELS,
  TENDER_DETAIL_V4_TAB_LABELS,
  TENDERS_LIST_PATH,
  type DecyzjaV4EmbedWorkspace,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";

export function TenderDetailCommandLayer({
  item,
  tab,
  swz,
  compactKosztorysChrome,
  decyzjaWorkspace,
  onBack,
  onTabChange,
  onDecyzjaWorkspaceChange,
  przetargCommandSlot,
}: {
  item: TenderPipelineItem;
  tab: TenderDetailV4TabId;
  swz: TenderSwzAnalysis | null | undefined;
  compactKosztorysChrome: boolean;
  decyzjaWorkspace?: DecyzjaV4EmbedWorkspace;
  onBack: () => void;
  onTabChange: (tab: TenderDetailV4TabId) => void;
  onDecyzjaWorkspaceChange?: (ws: DecyzjaV4EmbedWorkspace) => void;
  /** Ribbon + CTA — tylko tab Przetarg (montowane z TenderDetailPage). */
  przetargCommandSlot?: ReactNode;
}) {
  const showKpiCompact = !compactKosztorysChrome;
  const przetargChrome = tab === "przetarg";

  return (
    <div
      className={`shrink-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 ${
        compactKosztorysChrome
          ? "px-4 sm:px-6 py-2 space-y-2"
          : przetargChrome
            ? "px-4 sm:px-6 py-1.5 sm:py-2 space-y-1.5 max-[390px]:space-y-1"
            : "px-4 sm:px-6 py-2 sm:py-3 space-y-2 sm:space-y-2.5"
      }`}
      data-tender-command-layer
      data-tender-tab={tab}
      data-tender-command-przetarg={przetargChrome ? "true" : undefined}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline -ml-1 px-1 ${
          przetargChrome
            ? "min-h-[36px] max-[390px]:min-h-[32px] sm:min-h-[40px]"
            : "min-h-[40px] sm:min-h-[44px]"
        }`}
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        Powrót do listy
      </button>

      {!compactKosztorysChrome && !przetargChrome && (
        <nav
          className="hidden sm:flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <span>Przetargi</span>
          <ChevronRight size={12} className="shrink-0 opacity-60" />
          <span className="truncate max-w-[12rem]">{item.bzpNumber || item.id.slice(0, 8)}</span>
          <ChevronRight size={12} className="shrink-0 opacity-60" />
          <span className="text-foreground font-medium">
            {TENDER_DETAIL_V4_TAB_LABELS[tab]}
            {tab === "decyzja" && decyzjaWorkspace && (
              <>
                {" · "}
                {DECYZJA_V4_SUB_TAB_LABELS[decyzjaWorkspace]}
              </>
            )}
          </span>
        </nav>
      )}

      <h1
        className={
          compactKosztorysChrome || przetargChrome
            ? "text-sm font-semibold leading-snug text-foreground line-clamp-1"
            : "text-sm sm:text-lg font-semibold leading-snug text-foreground line-clamp-2 sm:line-clamp-none"
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
        <TenderDetailKpiCompact item={item} swz={swz} />
      )}

      {tab === "przetarg" && przetargCommandSlot}
    </div>
  );
}
