import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import {
  jobDraftFromTender,
  type TenderPipelineItem,
} from "@/lib/tenders-bzp";
import { TenderDetailPanel } from "@/app/TenderDetailPanel";
import { TenderDetailCommandLayer } from "@/app/TenderDetailCommandLayer";
import { TenderStatusRibbon } from "@/app/TenderStatusRibbon";
import { TenderWorkflowPrimaryAction } from "@/app/TenderWorkflowPrimaryAction";
import { useTenderPrzetargCommandContext } from "@/app/hooks/useTenderPrzetargCommandContext";
import { TenderKosztorysWorkspace } from "@/app/TenderKosztorysWorkspace";
import { useTenderPipelineRuntime } from "@/app/hooks/useTenderPipelineRuntime";
import { TenderPipelineDevTimeline } from "@/app/tenders/pipeline/TenderPipelineDevTimeline";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import {
  buildTenderDetailPath,
  buildTenderDetailPathFromLegacyWorkspace,
  parseDecyzjaWorkspaceQuery,
  resolveRetiredV4TabRedirect,
  resolveV4EmbedLegacyWorkspace,
  TENDER_DETAIL_DECYZJA_WS_QUERY,
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

  const decyzjaWorkspace = useMemo(
    () => parseDecyzjaWorkspaceQuery(decyzjaWs),
    [decyzjaWs],
  );

  const retiredRedirect = useMemo(
    () => resolveRetiredV4TabRedirect(tenderId, tab),
    [tenderId, tab],
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
      navigate(buildTenderDetailPath(tenderId, "decyzja", { decyzjaWorkspace: ws }));
    },
    [navigate, tenderId],
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

  const przetargCommand = useTenderPrzetargCommandContext(
    bootstrapItem,
    swz,
    pipelineRuntime,
  );

  const przetargCommandSlot = useMemo(() => {
    if (tab !== "przetarg" || !przetargCommand.intelligenceCtx) return null;
    return (
      <div className="space-y-2 pt-0.5" data-tender-przetarg-command-slot>
        <TenderStatusRibbon
          item={bootstrapItem}
          swz={swz}
          intelligenceCtx={przetargCommand.intelligenceCtx}
          trustAssessment={pipelineRuntime.trustAssessment}
          bidProposal={pipelineRuntime.ownerFinanceProposal}
          kosztorysSession={pipelineRuntime.kosztorysProcessSession}
          autoRunning={pipelineRuntime.autoRunning}
          dossierBuilding={pipelineRuntime.dossierBuilding}
          dossierSaving={pipelineRuntime.dossierSaving}
          onNavigateTab={handleTabChange}
        />
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
        />
      </div>
    );
  }, [
    tab,
    bootstrapItem,
    swz,
    przetargCommand.intelligenceCtx,
    przetargCommand.ownerDecision,
    przetargCommand.participationResult,
    pipelineRuntime,
    handleTabChange,
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
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      data-tender-detail-v4
      data-tender-id={item.id}
      data-tender-tab={tab}
      data-tender-ws={tab === "decyzja" ? decyzjaWorkspace : undefined}
    >
      <TenderDetailCommandLayer
        item={item}
        tab={tab}
        swz={swz}
        compactKosztorysChrome={compactKosztorysChrome}
        decyzjaWorkspace={tab === "decyzja" ? decyzjaWorkspace : undefined}
        onBack={() => navigate(TENDERS_LIST_PATH)}
        onTabChange={handleTabChange}
        onDecyzjaWorkspaceChange={tab === "decyzja" ? handleDecyzjaWorkspaceChange : undefined}
        przetargCommandSlot={przetargCommandSlot}
      />

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className={`px-4 sm:px-6 ${compactKosztorysChrome ? "py-2" : "py-4"}`}>
          <TenderPipelineDevTimeline
            timeline={pipelineRuntime.timeline}
            pipelineState={pipelineRuntime.pipelineState}
            gateStatus={pipelineRuntime.attachmentGateStatus}
            gateReason={pipelineRuntime.attachmentGateReason}
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
              embedV4CommandLayerActive={tab === "przetarg"}
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
