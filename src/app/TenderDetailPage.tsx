import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import {
  jobDraftFromTender,
  type TenderPipelineItem,
} from "@/lib/tenders-bzp";
import { TenderDetailPanel } from "@/app/TenderDetailPanel";
import { TenderDetailKpiBar } from "@/app/TenderDetailKpiBar";
import { TenderDetailTabBar } from "@/app/TenderDetailTabBar";
import { TenderKosztorysWorkspace } from "@/app/TenderKosztorysWorkspace";
import { useTenderPipelineRuntime } from "@/app/hooks/useTenderPipelineRuntime";
import { TenderPipelineDevTimeline } from "@/app/tenders/pipeline/TenderPipelineDevTimeline";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import {
  buildTenderDetailPath,
  buildTenderDetailPathFromLegacyWorkspace,
  isTenderDetailV4PlaceholderTab,
  resolveV4EmbedLegacyWorkspace,
  TENDER_DETAIL_DECYZJA_WS_QUERY,
  TENDER_DETAIL_V4_TAB_LABELS,
  TENDERS_LIST_PATH,
  type DecyzjaV4EmbedWorkspace,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";
import {
  shouldPreferKosztorysV4Tab,
  TENDER_WORKFLOW_HUB_EMBED_WORKSPACE,
  type TenderWorkspaceTabId,
} from "@/lib/tender-workspace-ux";

function TenderV4Placeholder({ tab }: { tab: TenderDetailV4TabId }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center space-y-2">
      <p className="text-sm font-medium text-foreground">{TENDER_DETAIL_V4_TAB_LABELS[tab]}</p>
      <p className="text-xs text-muted-foreground">Wkrótce</p>
    </div>
  );
}

export function TenderDetailPage({
  tenderId,
  tab,
  onCreateJobFromTender,
  onOpenJob,
  athPreviewEnabled = true,
}: {
  tenderId: string;
  tab: TenderDetailV4TabId;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { snapshot, profileVersion } = useTendersContext();
  const { pipeline } = snapshot;

  const decyzjaWs = useMemo(() => {
    if (tab !== "decyzja") return null;
    return new URLSearchParams(location.search).get(TENDER_DETAIL_DECYZJA_WS_QUERY);
  }, [tab, location.search]);

  const item = useMemo(
    () => pipeline.items.find((t) => t.id === tenderId) ?? null,
    [pipeline.items, tenderId],
  );

  const swz = item?.swzAnalysis ?? null;

  const handleTabChange = useCallback(
    (next: TenderDetailV4TabId, opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace }) => {
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

  const legacyWorkspace = tab === "przetarg"
    ? TENDER_WORKFLOW_HUB_EMBED_WORKSPACE
    : resolveV4EmbedLegacyWorkspace(tab, decyzjaWs);
  const compactKosztorysChrome = tab === "kosztorys";

  useEffect(() => {
    return registerNativeBackHandler(() => {
      navigate(TENDERS_LIST_PATH);
      return true;
    });
  }, [navigate]);

  const onUpdateItem = useCallback(
    (patch: Partial<TenderPipelineItem>) => pipeline.updateItem(item?.id ?? tenderId, patch),
    [pipeline, item?.id, tenderId],
  );

  const bootstrapItem = item ?? { id: tenderId, title: "", status: "seen", updatedAt: "" } as TenderPipelineItem;

  const [pricingRevision, setPricingRevision] = useState(0);

  const pipelineRuntime = useTenderPipelineRuntime({
    item: bootstrapItem,
    onUpdate: onUpdateItem,
    swz,
    athPreviewEnabled,
    enabled: Boolean(item),
    priceOverridesRevision: pricingRevision,
  });

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

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      data-tender-detail-v4
      data-tender-id={item.id}
      data-tender-tab={tab}
      data-tender-ws={tab === "decyzja" ? (decyzjaWs ?? "overview") : undefined}
    >
      <div
        className={`shrink-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 ${compactKosztorysChrome ? "px-4 sm:px-6 py-2 space-y-2" : "px-4 sm:px-6 py-3 space-y-3"}`}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[44px] -ml-1 px-1"
          onClick={() => navigate(TENDERS_LIST_PATH)}
        >
          <ArrowLeft size={14} />
          Powrót do listy
        </button>

        {!compactKosztorysChrome && (
          <nav className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground" aria-label="Breadcrumb">
            <span>Przetargi</span>
            <ChevronRight size={12} className="shrink-0 opacity-60" />
            <span className="truncate max-w-[12rem]">{item.bzpNumber || item.id.slice(0, 8)}</span>
            <ChevronRight size={12} className="shrink-0 opacity-60" />
            <span className="text-foreground font-medium">{TENDER_DETAIL_V4_TAB_LABELS[tab]}</span>
          </nav>
        )}

        <h1
          className={
            compactKosztorysChrome
              ? "text-sm font-semibold leading-snug text-foreground line-clamp-1"
              : "text-base sm:text-lg font-semibold leading-snug text-foreground"
          }
        >
          {item.title}
        </h1>

        {!compactKosztorysChrome && <TenderDetailKpiBar item={item} swz={swz} />}
        <TenderDetailTabBar activeTab={tab} onTabChange={handleTabChange} />
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className={`px-4 sm:px-6 ${compactKosztorysChrome ? "py-2" : "py-4"}`}>
          <TenderPipelineDevTimeline
            timeline={pipelineRuntime.timeline}
            pipelineState={pipelineRuntime.pipelineState}
          />

          {tab === "kosztorys" && (
            <TenderKosztorysWorkspace
              item={item}
              athPreviewEnabled={athPreviewEnabled}
              processSession={pipelineRuntime.kosztorysProcessSession}
              retryNonce={pipelineRuntime.retryNonce}
              onRetryParse={pipelineRuntime.retryDossierParse}
              trustAssessment={pipelineRuntime.trustAssessment}
            />
          )}

          {isTenderDetailV4PlaceholderTab(tab) && (
            <TenderV4Placeholder tab={tab} />
          )}

          {legacyWorkspace && (
            <TenderDetailPanel
              item={item}
              allItems={pipeline.items}
              pipelineRuntime={pipelineRuntime}
              onUpdate={(patch) => pipeline.updateItem(item.id, patch)}
              onRemove={() => void pipeline.removeItem(item.id).then(() => navigate(TENDERS_LIST_PATH))}
              athPreviewEnabled={athPreviewEnabled}
              profileVersion={profileVersion}
              onOpenJob={onOpenJob}
              onCreateJob={onCreateJobFromTender
                ? (t) => onCreateJobFromTender(jobDraftFromTender(t), t)
                : undefined}
              embedV4ChromeHidden
              embedV4Workspace={legacyWorkspace}
              onEmbedV4Navigate={handleLegacyNavigate}
              onEmbedV4TabNavigate={handleTabChange}
              onPriceOverridesChanged={() => setPricingRevision((v) => v + 1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
