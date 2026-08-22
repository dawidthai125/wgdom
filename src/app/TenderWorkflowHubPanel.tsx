import { useMemo, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  TenderWorkspaceV2Panel,
  TenderWorkspaceV2ChecklistCompact,
  TenderWorkspaceV2ProgressCompact,
  TenderWorkspaceV2InsightsCompact,
} from "@/app/TenderWorkspaceV2Panel";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TenderWorkflowPrimaryAction } from "@/app/TenderWorkflowPrimaryAction";
import { TenderAnalysisStatusStrip } from "@/app/TenderAnalysisStatusStrip";
import {
  WorkflowHubBlockersSection,
  WorkflowHubPositionsFileDisplay,
} from "@/app/TenderWorkflowHubSections";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { TrustBanner } from "@/app/tenders/trust/TrustBanner";
import { TrustChipRow } from "@/app/tenders/trust/TrustChipRow";
import { shouldRenderHubTrustBanner } from "@/lib/tender-trust-ui";
import { ChiefDossierSurface } from "@/app/chief-dossier";
import type { ChiefDossierViewModel } from "@/lib/chief-dossier-ui";
import type { ExpertWorkspaceViewModel } from "@/lib/expert-workspace-ui";
import { DecisionWorkspaceHost } from "@/app/decision-workspace";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import { isExpertAiRuntimeEffective } from "@/lib/tender-expert-effective";
import { resolveAuthoritativeOfferPln } from "@/lib/tender-offer-pln-authority";
import {
  BID_PLN_SOURCE_BADGE_PL,
  OFFER_BID_MISMATCH_BADGE_PL,
  OFFER_PLN_SOURCE_BADGE_PL,
} from "@/lib/decision-workspace-ui";
import { formatRecommendedOfferPln } from "@/lib/tender-recommendation-result";
import { buildExpertConversationViewModel } from "@/lib/expert-conversation-ui";
import {
  ExpertConversationSurface,
  InteligentnyKosztorysantBrand,
} from "@/app/expert-conversation";
import { IkLaborGapResearchPanel } from "@/app/ik-pricing/IkLaborGapResearchPanel";
import { IkKnrWcIdentityProposalQueuePanel } from "@/app/ik-pricing/IkKnrWcIdentityProposalQueuePanel";
import { IkKnrWcIdentityCreateExecutor } from "@/app/ik-pricing/IkKnrWcIdentityCreateExecutor";
import { isKnrWcIdentityBridgeP3CreateRuntimeEnabled } from "@/lib/intelligent-estimator/knr-wc-identity-bridge-feature";
import { isIkEntryEnabled } from "@/lib/intelligent-estimator/ik-entry-flag";
import { OwnerRateInputCard } from "@/app/OwnerRateInputCard";
import { MultiDwellingPackagePanel } from "@/app/MultiDwellingPackagePanel";
import {
  listTransportBidCandidates,
  markTransportBidCandidate,
  unmarkTransportBidCandidate,
} from "@/lib/tender-position-cost/transport-bid-candidate";

/** A1 — explicit Bid Transport mark (tenderId + lineId). Not auto-detection. */
function TransportBidCandidateMarkPanel({
  tenderId,
  onChanged,
}: {
  tenderId: string;
  onChanged?: () => void;
}) {
  const tid = String(tenderId ?? "").trim();
  const [lineIdDraft, setLineIdDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  const marked = useMemo(() => {
    void bump;
    if (!tid) return [];
    return listTransportBidCandidates(tid);
  }, [tid, bump]);

  if (!tid) return null;

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-transport-bid-candidate-panel
    >
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          Bid Transport
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Jawne oznaczenie linii (lineId) — nie wykrywanie automatyczne
        </p>
      </div>
      <div className="px-4 py-3 space-y-2 text-[12px]">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 min-w-[10rem] flex-1">
            <span className="text-[10px] uppercase text-muted-foreground">
              OfferBoq lineId
            </span>
            <input
              type="text"
              className="h-9 rounded-md border border-border bg-background px-2"
              value={lineIdDraft}
              onChange={(e) => setLineIdDraft(e.target.value)}
              placeholder="np. L-12"
              data-transport-bid-line-id
            />
          </label>
          <button
            type="button"
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold"
            data-transport-bid-mark
            onClick={() => {
              const lineId = lineIdDraft.trim();
              const result = markTransportBidCandidate({
                tenderId: tid,
                lineId,
                markedByRole: "admin",
              });
              if (!result.ok) {
                setError(result.reason);
                return;
              }
              setError(null);
              setLineIdDraft("");
              setBump((n) => n + 1);
              onChanged?.();
            }}
          >
            Oznacz jako Bid Transport
          </button>
        </div>
        {error && (
          <p className="text-[11px] text-destructive" data-transport-bid-error>
            {error}
          </p>
        )}
        {marked.length > 0 && (
          <ul className="space-y-1.5 pt-1" data-transport-bid-list>
            {marked.map((r) => (
              <li
                key={`${r.tenderId}:${r.lineId}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                data-transport-bid-row
                data-line-id={r.lineId}
              >
                <span className="font-medium tabular-nums">
                  Bid Transport · {r.lineId}
                </span>
                <button
                  type="button"
                  className="h-8 px-2 rounded-md border border-border text-[11px]"
                  data-transport-bid-unmark
                  onClick={() => {
                    unmarkTransportBidCandidate({
                      tenderId: tid,
                      lineId: r.lineId,
                    });
                    setBump((n) => n + 1);
                    onChanged?.();
                  }}
                >
                  Usuń oznaczenie Bid Transport
                </button>
              </li>
            ))}
          </ul>
        )}
        {marked.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Brak oznaczonych linii Bid Transport w tym przetargu.
          </p>
        )}
      </div>
    </section>
  );
}

export function TenderWorkflowHubPanel({
  item,
  swz,
  intelligenceCtx,
  onNavigateTab,
  onNavigateLegacy,
  onOpenPreview,
  ownerFinanceProposal,
  ownerDecision,
  participationResult,
  kosztorysSession,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  analyzing,
  trustAssessment,
  commandLayerActive = false,
  chiefDossierVm = null,
  expertWorkspaceVm = null,
  chiefSessionForDecision = null,
  onPriceResearchAccepted,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  trustAssessment: TenderTrustAssessment;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  onNavigateLegacy: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  participationResult?: ParticipationCheckResult | null;
  kosztorysSession?: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
  /** NG-03.2 — Trust/Strip/CTA w Command Layer (TenderDetailPage). */
  commandLayerActive?: boolean;
  /** WIRE-CHIEF-UI-DOSSIER-01 — sibling POD (S4: after ANALIZA). */
  chiefDossierVm?: ChiefDossierViewModel | null;
  /** WIRE-EXPERTS-UI-01 — Expert Details under Trace (Slot A). */
  expertWorkspaceVm?: ExpertWorkspaceViewModel | null;
  /** DECISION-WORKSPACE-01 — sibling POD #chief-dossier-surface. */
  chiefSessionForDecision?: ChiefSessionOutput | null;
  /** DEMAND-RESEARCH-01 S0 — po Quotes ACCEPT → Chief Cost refresh. */
  onPriceResearchAccepted?: () => void;
}) {
  const expertEffective = isExpertAiRuntimeEffective();
  const knrWcP3CreateEnabled = useMemo(
    () =>
      isKnrWcIdentityBridgeP3CreateRuntimeEnabled({
        ikEntryEnabled: isIkEntryEnabled(),
      }),
    [],
  );
  const blockersCount = intelligenceCtx.overlay.allBlocks.length;
  const progressDefaultOpen = blockersCount > 0;

  const conversationVm = useMemo(
    () => buildExpertConversationViewModel(chiefDossierVm),
    [chiefDossierVm],
  );

  const offerPricePln =
    chiefSessionForDecision?.dossier?.primaryRecommendation?.offerPricePln ??
    null;
  const bidPln = ownerFinanceProposal?.recommendedBidPln ?? null;
  const authPln = resolveAuthoritativeOfferPln({
    expertEffective,
    offerPricePln,
    recommendedBidPln: bidPln,
  });
  const primaryBadge =
    authPln.source === "offer_expert"
      ? OFFER_PLN_SOURCE_BADGE_PL
      : authPln.source === "bid_legacy"
        ? BID_PLN_SOURCE_BADGE_PL
        : null;

  const insightsRecovery = (
    <TenderWorkspaceV2InsightsCompact
      item={item}
      swz={swz}
      intelligenceCtx={intelligenceCtx}
      onNavigateCostTab={(tab) => onNavigateTab(tab)}
    />
  );

  return (
    <div
      className="space-y-4"
      data-tender-workflow-hub
      data-s4-hub-hierarchy="1"
      data-s2-expert-effective={expertEffective ? "1" : "0"}
      data-s2-dw-primary={expertEffective ? "1" : "0"}
      data-s3-primary-source={authPln.source}
      data-s3-mismatch={authPln.mismatch ? "1" : "0"}
    >
      {authPln.primaryPln != null && primaryBadge && (
        <div
          className="rounded-lg border border-border/70 bg-card px-3 py-2 space-y-1"
          data-s3-primary-pln-headline
          data-s4-primary-pln="1"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {primaryBadge}
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {formatRecommendedOfferPln(authPln.primaryPln)}
          </p>
          {expertEffective &&
            authPln.secondaryBidPln != null &&
            authPln.secondaryBidPln !== authPln.primaryPln && (
              <p
                className="text-[10px] text-muted-foreground"
                data-s3-bid-secondary
              >
                {BID_PLN_SOURCE_BADGE_PL}:{" "}
                {formatRecommendedOfferPln(authPln.secondaryBidPln)}
              </p>
            )}
          {authPln.mismatch && (
            <p
              className="text-[10px] text-amber-700 dark:text-amber-300"
              data-s3-mismatch-badge
            >
              {OFFER_BID_MISMATCH_BADGE_PL}
            </p>
          )}
        </div>
      )}
      {!commandLayerActive && (
        <>
          {shouldRenderHubTrustBanner(trustAssessment) && (
            <TrustBanner assessment={trustAssessment} variant="overall" />
          )}

          <TrustChipRow
            assessment={trustAssessment}
            surfaceId="hub"
            onNavigateTab={(tab) => onNavigateTab(tab)}
            dataAttr="hub"
          />

          <TenderWorkflowProcessStrip
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            trustAssessment={trustAssessment}
            onNavigateTab={onNavigateTab}
          />

          <TenderWorkflowPrimaryAction
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            ownerFinanceProposal={ownerFinanceProposal}
            ownerDecision={ownerDecision}
            participationResult={participationResult}
            kosztorysSession={kosztorysSession}
            autoRunning={autoRunning}
            dossierBuilding={dossierBuilding}
            dossierSaving={dossierSaving}
            analyzing={analyzing}
            onNavigateTab={onNavigateTab}
          />
        </>
      )}

      {/* Inteligentny Kosztorysant — Hub branding (tender detail only) */}
      <InteligentnyKosztorysantBrand />

      {/* IK-E2E-WIRE-01 W2 — labor gap → research → Owner Accept → recompute */}
      <IkLaborGapResearchPanel
        item={item}
        onPriceResearchAccepted={onPriceResearchAccepted}
      />

      {/* IK-KNR-WC-IDENTITY-BRIDGE P2 UI — Owner Review queue (flag-gated · zero authority write) */}
      <IkKnrWcIdentityProposalQueuePanel item={item} />

      {/* IK-KNR-WC-IDENTITY-BRIDGE P3 — Owner CREATE executor (additive · P3 flag default OFF) */}
      {knrWcP3CreateEnabled ? <IkKnrWcIdentityCreateExecutor item={item} /> : null}

      <MultiDwellingPackagePanel
        item={item}
        costDocumentIds={(item.tenderDossier?.scanSummary?.branchWinnerArtifacts ?? [])
          .map((a) => String(a.documentId ?? a.filename ?? "").trim())
          .filter(Boolean)}
      />

      {/* S4 — ANALIZA → EKSPERCI → WALIDACJA/REKOMENDACJA/DECYZJA (DW) · Intelligence = recovery */}
      <div data-s4-step="analiza">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
          Analiza
        </p>
        <TenderWorkspaceV2ProgressCompact item={item} swz={swz} />
      </div>

      {chiefDossierVm != null && (
        <div data-s4-step="eksperci" className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
            Eksperci
          </p>
          {/* Presentation layer over Trace — D/Session gated via chiefDossierVm */}
          <ExpertConversationSurface vm={conversationVm} />
          <TransportBidCandidateMarkPanel
            tenderId={item.id}
            onChanged={onPriceResearchAccepted}
          />
          <OwnerRateInputCard
            tenderId={item.id}
            onAccepted={onPriceResearchAccepted}
          />
          <ChiefDossierSurface
            vm={chiefDossierVm}
            expertWorkspaceVm={expertWorkspaceVm}
            tenderId={item.id}
            onPriceResearchAccepted={onPriceResearchAccepted}
          />
        </div>
      )}

      {chiefSessionForDecision != null && (
        <DecisionWorkspaceHost
          session={chiefSessionForDecision}
          tenderId={item.id}
          scoringBundle={intelligenceCtx.scoringBundle}
        />
      )}

      {expertEffective && (
        <p
          className="text-[10px] text-muted-foreground px-1"
          data-s2-hub-hierarchy-cue
        >
          PRIMARY decyzja człowieka: Decision Workspace · Hub: Analiza → Eksperci →
          Walidacja → Rekomendacja → Decyzja · legacy GO/HOLD = compatibility
        </p>
      )}

      <details
        id="tender-progress-accordion"
        className="rounded-xl border border-border bg-card overflow-hidden group"
        data-tender-progress-accordion
        data-s4-recovery="1"
        open={progressDefaultOpen}
      >
        <summary className="px-4 py-2.5 min-h-[44px] cursor-pointer list-none flex items-center justify-between gap-2 bg-secondary/30 border-b border-transparent group-open:border-border/60 transition-colors duration-150 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Szczegóły / Intelligence (recovery)
          </span>
          <span className="text-[10px] text-muted-foreground" aria-hidden>rozwiń</span>
        </summary>
        <div className="px-4 py-3 space-y-4">
          {insightsRecovery}

          <TenderAnalysisStatusStrip
            item={item}
            swz={swz}
            bidProposal={ownerFinanceProposal}
            dossierBuilding={dossierBuilding}
            dossierSaving={dossierSaving}
            autoRunning={autoRunning}
            kosztorysSession={kosztorysSession}
          />

          <TenderWorkspaceV2Panel
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            onNavigateTab={onNavigateTab}
            hubDensity={commandLayerActive}
            skipProgressSection
            skipInsightsSection
          />

          <WorkflowHubBlockersSection ctx={intelligenceCtx} />

          <TenderWorkspaceV2ChecklistCompact item={item} swz={swz} />

          <WorkflowHubPositionsFileDisplay
            view={intelligenceCtx.positions}
            item={item}
            onNavigate={onNavigateLegacy}
            onOpenPreview={onOpenPreview}
          />
        </div>
      </details>
    </div>
  );
}
