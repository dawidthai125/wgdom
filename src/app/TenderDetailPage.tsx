import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import {
  jobDraftFromTender,
  type TenderPipelineItem,
} from "@/lib/tenders-bzp";
import { TenderDetailPanel } from "@/app/TenderDetailPanel";
import { TenderAutonomousGate } from "@/app/tenders/autonomous/TenderAutonomousGate";
import { TenderDetailCommandLayer } from "@/app/TenderDetailCommandLayer";
import {
  TenderWorkflowOperatorActionBar,
  type TenderWorkflowOperatorActionBarProps,
} from "@/app/TenderWorkflowOperatorActionBar";
import { TenderStatusRibbon } from "@/app/TenderStatusRibbon";
import { TenderWorkflowPrimaryAction } from "@/app/TenderWorkflowPrimaryAction";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { useTenderPrzetargCommandContext } from "@/app/hooks/useTenderPrzetargCommandContext";
import {
  resolveActiveProcessStripStageId,
  WORKFLOW_PROCESS_STRIP_LABELS,
} from "@/lib/tender-workflow-process-strip";
import { TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import {
  buildCostWorkspaceShortcutLabel,
  buildIntelligenceHubShortcutLabel,
  resolveSuggestedCostV4Tab,
} from "@/lib/tender-command-layer-ux";
import {
  loadTenderTabScrollTop,
  saveTenderTabScrollTop,
  type TenderCostScrollTab,
} from "@/lib/tender-cost-ui-persist";
import { TenderKosztorysWorkspace } from "@/app/TenderKosztorysWorkspace";
import { useTenderPipelineRuntime } from "@/app/hooks/useTenderPipelineRuntime";
import { TenderPipelineDevTimeline } from "@/app/tenders/pipeline/TenderPipelineDevTimeline";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { bindTenderPipelineOnUpdate } from "@/lib/tender-pipeline/bind-tender-pipeline-on-update";
import {
  buildTenderDetailPath,
  buildTenderDetailPathFromLegacyWorkspace,
  parseDecyzjaWorkspaceQuery,
  parseTenderDetailPath,
  resolveRetiredV4TabRedirect,
  resolveV4EmbedLegacyWorkspace,
  TENDER_DETAIL_DECYZJA_WS_QUERY,
  TENDER_DETAIL_V4_DEFAULT_TAB,
  TENDERS_LIST_PATH,
  type DecyzjaV4EmbedWorkspace,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";
import {
  shouldPreferKosztorysV4Tab,
  TENDER_WORKFLOW_HUB_EMBED_WORKSPACE,
  type TenderWorkspaceTabId,
} from "@/lib/tender-workspace-ux";

export function TenderDetailPage({
  tenderId: tenderIdFallback,
  tab: tabFallback,
  onCreateJobFromTender,
  onOpenJob,
  athPreviewEnabled = true,
  canViewWorkCatalog = false,
}: {
  tenderId: string;
  /** Awaryjny fallback — SSOT: parseTenderDetailPath(location.pathname). */
  tab?: TenderDetailV4TabId;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
  canViewWorkCatalog?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { snapshot, profileVersion, pricingCatalogRevision } = useTendersContext();
  const { pipeline } = snapshot;

  const parsedDetail = useMemo(
    () => parseTenderDetailPath(location.pathname),
    [location.pathname],
  );
  const tenderId = parsedDetail?.tenderId ?? tenderIdFallback;
  const urlTab = parsedDetail?.tab ?? tabFallback ?? TENDER_DETAIL_V4_DEFAULT_TAB;

  /** Optimistic tab — RR7 bez `<Routes>`: pathname w kontekście opóźniony vs `window.location`. */
  const [pendingTab, setPendingTab] = useState<TenderDetailV4TabId | null>(null);

  useEffect(() => {
    setPendingTab(null);
  }, [location.pathname]);

  const activeTab = pendingTab ?? urlTab;

  const decyzjaWs = useMemo(() => {
    if (activeTab !== "decyzja") return null;
    return new URLSearchParams(location.search).get(TENDER_DETAIL_DECYZJA_WS_QUERY);
  }, [activeTab, location.search]);

  const decyzjaWorkspace = useMemo(
    () => parseDecyzjaWorkspaceQuery(decyzjaWs),
    [decyzjaWs],
  );

  const retiredRedirect = useMemo(
    () => resolveRetiredV4TabRedirect(tenderId, activeTab),
    [tenderId, activeTab],
  );

  useEffect(() => {
    if (retiredRedirect) {
      navigate(retiredRedirect, { replace: true });
    }
  }, [retiredRedirect, navigate]);

  const item = useMemo(
    () => pipeline.items.find((t) => t.id === tenderId) ?? null,
    [pipeline.items, tenderId],
  );

  const swz = item?.swzAnalysis ?? null;

  const handleTabChange = useCallback(
    (next: TenderDetailV4TabId, opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace }) => {
      setPendingTab(next);
      navigate(buildTenderDetailPath(tenderId, next, opts));
    },
    [navigate, tenderId],
  );

  const handleLegacyNavigate = useCallback(
    (legacyTab: TenderWorkspaceTabId) => {
      const preferKosztorys = item
        ? shouldPreferKosztorysV4Tab(legacyTab, item)
        : false;
      navigate(buildTenderDetailPathFromLegacyWorkspace(tenderId, legacyTab, { preferKosztorys }));
    },
    [navigate, tenderId, item],
  );

  const handleDecyzjaWorkspaceChange = useCallback(
    (ws: DecyzjaV4EmbedWorkspace) => {
      setPendingTab("decyzja");
      navigate(buildTenderDetailPath(tenderId, "decyzja", { decyzjaWorkspace: ws }));
    },
    [navigate, tenderId],
  );

  const legacyWorkspace = activeTab === "przetarg"
    ? TENDER_WORKFLOW_HUB_EMBED_WORKSPACE
    : resolveV4EmbedLegacyWorkspace(activeTab, decyzjaWs);
  const compactKosztorysChrome = activeTab === "kosztorys";

  useEffect(() => {
    return registerNativeBackHandler(() => {
      navigate(TENDERS_LIST_PATH);
      return true;
    });
  }, [navigate]);

  const onUpdateItem = useCallback(
    (patch: Partial<TenderPipelineItem>, opts?: { persist?: "local" | "cloud" }) =>
      pipeline.updateItem(item?.id ?? tenderId, patch, opts),
    [pipeline, item?.id, tenderId],
  );

  const bootstrapItem = item ?? { id: tenderId, title: "", status: "seen", updatedAt: "" } as TenderPipelineItem;

  const [pricingRevision, setPricingRevision] = useState(0);
  const [operatorActionBar, setOperatorActionBar] = useState<TenderWorkflowOperatorActionBarProps | null>(null);

  const przetargActionBarActive = activeTab === "przetarg" && operatorActionBar != null;

  const pipelineRuntime = useTenderPipelineRuntime({
    item: bootstrapItem,
    onUpdate: onUpdateItem,
    swz,
    athPreviewEnabled,
    enabled: Boolean(item),
    priceOverridesRevision: pricingRevision,
    pricingCatalogRevision,
  });

  const intelligenceItem = pipelineRuntime.discoveryMergedItem ?? bootstrapItem;

  const przetargCommand = useTenderPrzetargCommandContext(
    intelligenceItem,
    swz,
    pipelineRuntime,
  );

  const activeProcessStageId = useMemo(
    () => resolveActiveProcessStripStageId(activeTab, decyzjaWorkspace),
    [activeTab, decyzjaWorkspace],
  );

  const [processStripExpanded, setProcessStripExpanded] = useState(false);

  useEffect(() => {
    setProcessStripExpanded(false);
  }, [tenderId]);

  const activeProcessStageLabel = activeProcessStageId
    ? WORKFLOW_PROCESS_STRIP_LABELS[activeProcessStageId]
    : "Proces";

  const blockersCount = przetargCommand.intelligenceCtx?.overlay.allBlocks.length ?? 0;

  const handleBlockersChipClick = useCallback(() => {
    const accordion = document.getElementById("tender-progress-accordion");
    if (accordion instanceof HTMLDetailsElement) {
      accordion.open = true;
      accordion.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const prevCostTabRef = useRef<TenderDetailV4TabId>(activeTab);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pendingIntelligenceScroll, setPendingIntelligenceScroll] = useState(false);

  const scrollToIntelligenceHub = useCallback((behavior: ScrollBehavior = "smooth") => {
    const hub = document.getElementById("tender-intelligence-hub");
    const root = scrollRootRef.current;
    if (!hub || !root) return;
    const hubTop = hub.getBoundingClientRect().top;
    const rootTop = root.getBoundingClientRect().top;
    const nextTop = root.scrollTop + (hubTop - rootTop);
    root.scrollTo({ top: Math.max(0, nextTop), behavior });
  }, []);

  const handleIntelligenceShortcutClick = useCallback(() => {
    if (activeTab !== "przetarg") {
      setPendingIntelligenceScroll(true);
      handleTabChange("przetarg");
      return;
    }
    scrollToIntelligenceHub();
  }, [activeTab, handleTabChange, scrollToIntelligenceHub]);

  useEffect(() => {
    if (activeTab !== "przetarg" || !pendingIntelligenceScroll) return;
    setPendingIntelligenceScroll(false);

    let cancelled = false;
    let frames = 0;
    const maxFrames = 90;

    const tick = () => {
      if (cancelled) return;
      const hub = document.getElementById("tender-intelligence-hub");
      const root = scrollRootRef.current;
      if (hub && root) {
        scrollToIntelligenceHub("instant");
        const hubRect = hub.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const intersects = hubRect.bottom > rootRect.top && hubRect.top < rootRect.bottom;
        if (intersects) return;
      }
      frames += 1;
      if (frames < maxFrames) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [activeTab, pendingIntelligenceScroll, scrollToIntelligenceHub]);

  const suggestedCostTab = useMemo(
    () => resolveSuggestedCostV4Tab(bootstrapItem),
    [bootstrapItem],
  );

  const handleCostShortcutClick = useCallback(() => {
    handleTabChange(suggestedCostTab);
  }, [handleTabChange, suggestedCostTab]);

  const isCostScrollTab = (tab: TenderDetailV4TabId): tab is TenderCostScrollTab =>
    tab === "kosztorys" || tab === "ceny";

  useEffect(() => {
    const el = scrollRootRef.current;
    const tenderId = item?.id;
    if (!el || !tenderId?.trim()) return;

    const prev = prevCostTabRef.current;
    if (isCostScrollTab(prev) && prev !== activeTab) {
      saveTenderTabScrollTop(tenderId, prev, el.scrollTop);
    }
    prevCostTabRef.current = activeTab;

    if (!isCostScrollTab(activeTab)) return;

    const saved = loadTenderTabScrollTop(tenderId, activeTab);
    if (saved != null) {
      requestAnimationFrame(() => {
        el.scrollTop = saved;
      });
    }
  }, [activeTab, item?.id]);

  useEffect(() => {
    const el = scrollRootRef.current;
    const tenderId = item?.id;
    if (!el || !tenderId?.trim() || !isCostScrollTab(activeTab)) return;

    const onScroll = () => {
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = setTimeout(() => {
        saveTenderTabScrollTop(tenderId, activeTab, el.scrollTop);
      }, 150);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      saveTenderTabScrollTop(tenderId, activeTab, el.scrollTop);
    };
  }, [activeTab, item?.id]);

  const workspaceCommandSlot = useMemo(() => {
    if (!przetargCommand.intelligenceCtx) return null;
    return (
      <div className="space-y-0.5 max-[430px]:space-y-0" data-tender-workspace-command-slot data-mfs01="true">
        {activeTab === "przetarg" && (
          <div className="hidden 2xl:block">
            <TenderStatusRibbon
              trustAssessment={pipelineRuntime.trustAssessment}
              onNavigateTab={handleTabChange}
            />
          </div>
        )}

        {/* MFS-01: Process Strip collapsed on max-lg; full ribbon on lg+ */}
        <div className="lg:hidden" data-mfs01-process-collapse>
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-2 rounded-md border border-border/70 bg-card/80 px-2.5 min-h-[36px] ${TEUX_FONT_CAPTION} font-semibold text-foreground touch-manipulation hover:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            aria-expanded={processStripExpanded}
            aria-controls="tender-mfs01-process-strip-panel"
            data-mfs01-process-toggle
            onClick={() => setProcessStripExpanded((v) => !v)}
          >
            <span className="truncate">
              {activeProcessStageId
                ? `Proces · ${activeProcessStageLabel}`
                : "Proces"}
            </span>
            <ChevronDown
              size={14}
              className={`shrink-0 text-muted-foreground transition-transform duration-150 ${processStripExpanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {processStripExpanded && (
            <div id="tender-mfs01-process-strip-panel" className="mt-0.5" data-mfs01-process-panel>
              <TenderWorkflowProcessStrip
                item={bootstrapItem}
                swz={swz}
                intelligenceCtx={przetargCommand.intelligenceCtx}
                trustAssessment={pipelineRuntime.trustAssessment}
                onNavigateTab={handleTabChange}
                variant="ribbon"
                activeStageId={activeProcessStageId}
              />
            </div>
          )}
        </div>
        <div className="hidden lg:block" data-mfs01-process-desktop>
          <TenderWorkflowProcessStrip
            item={bootstrapItem}
            swz={swz}
            intelligenceCtx={przetargCommand.intelligenceCtx}
            trustAssessment={pipelineRuntime.trustAssessment}
            onNavigateTab={handleTabChange}
            variant="ribbon"
            activeStageId={activeProcessStageId}
          />
        </div>

        {blockersCount > 0 && (
          <button
            type="button"
            onClick={handleBlockersChipClick}
            className={`inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 min-h-[32px] ${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-200 touch-manipulation hover:bg-amber-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            data-tender-blockers-chip
          >
            Blokery ({blockersCount})
          </button>
        )}

        {/* MFS-01: shortcuts desktop-only */}
        <div
          className="hidden lg:flex flex-wrap items-center gap-1.5"
          data-tender-command-shortcuts-row
        >
          <button
            type="button"
            onClick={handleIntelligenceShortcutClick}
            className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1 min-h-11 lg:min-h-8 ${TEUX_FONT_CAPTION} font-semibold text-foreground touch-manipulation hover:bg-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            data-tender-intelligence-shortcut
          >
            {buildIntelligenceHubShortcutLabel()}
          </button>
          <button
            type="button"
            onClick={handleCostShortcutClick}
            className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1 min-h-11 lg:min-h-8 ${TEUX_FONT_CAPTION} font-semibold text-foreground touch-manipulation hover:bg-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            data-tender-cost-shortcut
          >
            {buildCostWorkspaceShortcutLabel(suggestedCostTab)}
          </button>
        </div>

        <TenderWorkflowPrimaryAction
          item={bootstrapItem}
          swz={swz}
          intelligenceCtx={przetargCommand.intelligenceCtx}
          ownerFinanceProposal={pipelineRuntime.ownerFinanceProposal}
          ownerDecision={przetargCommand.ownerDecision}
          participationResult={przetargCommand.participationResult}
          kosztorysSession={pipelineRuntime.kosztorysProcessSession}
          autoRunning={pipelineRuntime.autoRunning}
          dossierBuilding={pipelineRuntime.dossierBuilding}
          dossierSaving={pipelineRuntime.dossierSaving}
          analyzing={false}
          onNavigateTab={handleTabChange}
          commandLayerChrome
          activeTab={activeTab}
        />
      </div>
    );
  }, [
    activeTab,
    activeProcessStageId,
    activeProcessStageLabel,
    processStripExpanded,
    blockersCount,
    bootstrapItem,
    swz,
    przetargCommand.intelligenceCtx,
    przetargCommand.ownerDecision,
    przetargCommand.participationResult,
    pipelineRuntime,
    handleTabChange,
    handleBlockersChipClick,
    handleIntelligenceShortcutClick,
    handleCostShortcutClick,
    suggestedCostTab,
  ]);

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">Nie znaleziono przetargu w pipeline.</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-primary font-medium"
          onClick={() => navigate(TENDERS_LIST_PATH)}
        >
          <ArrowLeft size={16} />
          Powrót do listy
        </button>
      </div>
    );
  }

  if (retiredRedirect) {
    return null;
  }

  return (
    <TenderAutonomousGate
      item={item}
      pipelineRuntime={pipelineRuntime}
      intelligenceCtx={przetargCommand.intelligenceCtx}
      pricingCatalogRevision={pricingCatalogRevision}
      onBack={() => navigate(TENDERS_LIST_PATH)}
      onReveal={() => {
        scrollRootRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }}
    >
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      data-tender-detail-v4
      data-tender-id={item.id}
      data-tender-tab={activeTab}
      data-tender-ws={activeTab === "decyzja" ? decyzjaWorkspace : undefined}
    >
      <TenderDetailCommandLayer
        item={item}
        tab={activeTab}
        swz={swz}
        compactKosztorysChrome={compactKosztorysChrome}
        decyzjaWorkspace={activeTab === "decyzja" ? decyzjaWorkspace : undefined}
        canViewWorkCatalog={canViewWorkCatalog}
        onBack={() => navigate(TENDERS_LIST_PATH)}
        onTabChange={handleTabChange}
        onDecyzjaWorkspaceChange={activeTab === "decyzja" ? handleDecyzjaWorkspaceChange : undefined}
        przetargCommandSlot={workspaceCommandSlot}
      />

      {przetargActionBarActive && (
        <div
          className="hidden lg:block shrink-0 border-b border-border bg-card/95 backdrop-blur-sm px-4 sm:px-6 py-2"
          data-tender-operator-action-bar-slot="desktop"
        >
          <TenderWorkflowOperatorActionBar {...operatorActionBar} variant="desktop" />
        </div>
      )}

      <div
        ref={scrollRootRef}
        data-tender-detail-scroll-root
        className={`mobile-view-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain relative ${
          przetargActionBarActive ? "max-lg:pb-[calc(3.25rem+env(safe-area-inset-bottom))]" : ""
        }`}
        style={
          przetargActionBarActive
            ? undefined
            : { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }
        }
      >
        <div className={`px-4 sm:px-6 ${compactKosztorysChrome ? "py-2" : "py-4"} max-w-7xl mx-auto w-full`}>
          <TenderPipelineDevTimeline
            timeline={pipelineRuntime.timeline}
            pipelineState={pipelineRuntime.pipelineState}
            gateStatus={pipelineRuntime.attachmentGateStatus}
            gateReason={pipelineRuntime.attachmentGateReason}
          />

          {activeTab === "kosztorys" && (
            <TenderKosztorysWorkspace
              item={item}
              athPreviewEnabled={athPreviewEnabled}
              processSession={pipelineRuntime.kosztorysProcessSession}
              retryNonce={pipelineRuntime.retryNonce}
              onRetryParse={pipelineRuntime.retryDossierParse}
              trustAssessment={pipelineRuntime.trustAssessment}
            />
          )}

          {legacyWorkspace && (
            <TenderDetailPanel
              item={item}
              allItems={pipeline.items}
              pipelineRuntime={pipelineRuntime}
              onUpdate={bindTenderPipelineOnUpdate(pipeline.updateItem, item.id)}
              onRemove={() => void pipeline.removeItem(item.id).then(() => navigate(TENDERS_LIST_PATH))}
              athPreviewEnabled={athPreviewEnabled}
              profileVersion={profileVersion}
              onOpenJob={onOpenJob}
              onCreateJob={onCreateJobFromTender
                ? (t) => onCreateJobFromTender(jobDraftFromTender(t), t)
                : undefined}
              embedV4ChromeHidden
              embedV4CommandLayerActive={activeTab === "przetarg"}
              embedV4Workspace={legacyWorkspace}
              onEmbedV4Navigate={handleLegacyNavigate}
              onEmbedV4TabNavigate={handleTabChange}
              onPriceOverridesChanged={() => setPricingRevision((v) => v + 1)}
              onOperatorActionBarChange={setOperatorActionBar}
            />
          )}
        </div>

        {przetargActionBarActive && (
          <div
            className="lg:hidden sticky bottom-0 z-20 shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-shadow duration-150"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            data-tender-operator-action-bar-slot="mobile"
            data-mfs01-operator-slot="horizontal-scroll"
          >
            <TenderWorkflowOperatorActionBar {...operatorActionBar} variant="mobile" />
          </div>
        )}
      </div>
    </div>
    </TenderAutonomousGate>
  );
}
