import { useMemo, type ReactNode } from "react";
import { Briefcase, ExternalLink } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  buildParticipationDisplayGroups,
  buildPrzetargExecutiveBundle,
  buildPrzetargHighlights,
  buildPrzetargKeyFacts,
  buildPrzetargWorkScopeLabels,
  hasParticipationDisplayData,
} from "@/lib/tender-detail-v4-display";
import { TenderWorkflowHubPanel } from "@/app/TenderWorkflowHubPanel";
import { TenderDetailKpiBar } from "@/app/TenderDetailKpiBar";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import { TENDER_INTELLIGENCE_SECTION_COPY } from "@/lib/tender-owner-language-pl";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { buildTenderPortfolioPositionView } from "@/lib/tender-strategy-ux";
import { TenderPortfolioPositionPanel } from "@/app/tenders/strategy/components/TenderPortfolioPositionPanel";
import type { ChiefDossierViewModel } from "@/lib/chief-dossier-ui";
import type { ExpertWorkspaceViewModel } from "@/lib/expert-workspace-ui";

const PARTICIPATION_PREVIEW_LINES = 3;

function BlockShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function KeyFactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-3 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm sm:text-base font-semibold text-foreground mt-1 leading-snug break-words">{value}</p>
    </div>
  );
}

export function TenderPrzetargWorkspace({
  item,
  swz,
  intelligenceCtx,
  onNavigateTab,
  onNavigateLegacy,
  onOpenPreview,
  operatorSection,
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
  onOpenStrategy,
  chiefDossierVm = null,
  expertWorkspaceVm = null,
  chiefSessionForDecision = null,
  onPriceResearchAccepted,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  onNavigateLegacy: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  operatorSection?: ReactNode;
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  participationResult?: ParticipationCheckResult | null;
  kosztorysSession?: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
  trustAssessment: TenderTrustAssessment;
  /** NG-03.2 — Command Layer w TenderDetailPage. */
  commandLayerActive?: boolean;
  /** NG-03.6 — bridge Przetarg → Strategia z kontekstem tenderId. */
  onOpenStrategy?: (tenderId: string) => void;
  /** WIRE-CHIEF-UI-DOSSIER-01 — RO dossier under intelligence hub. */
  chiefDossierVm?: ChiefDossierViewModel | null;
  /** WIRE-EXPERTS-UI-01 — Expert Details VM (Slot A). */
  expertWorkspaceVm?: ExpertWorkspaceViewModel | null;
  /** DEMAND-RESEARCH-01 S0 — Chief Cost refresh po manual Quotes ACCEPT. */
  onPriceResearchAccepted?: (meta?: import("@/lib/intelligent-estimator/orchestra/orchestra-refresh-phase").HubPricingAcceptedMeta) => void;
  /** DECISION-WORKSPACE-01 — Session → Decision Host. */
  chiefSessionForDecision?: import("@/lib/chief-session").ChiefSessionOutput | null;
}) {
  const tendersCtx = useTendersContextOptional();
  const portfolioPosition = useMemo(() => {
    if (!tendersCtx?.snapshot.scoringContext) return null;
    return buildTenderPortfolioPositionView({
      item,
      scoringContext: tendersCtx.snapshot.scoringContext,
      scoredBundles: tendersCtx.snapshot.scoredForForecast,
      ownerRecord: tendersCtx.ownerDecisions.store.byId[item.id],
    });
  }, [item, tendersCtx?.snapshot.scoringContext, tendersCtx?.snapshot.scoredForForecast, tendersCtx?.ownerDecisions.store.byId]);

  const handleOpenStrategy = onOpenStrategy ?? tendersCtx?.openTendersStrategy;
  const bundle = useMemo(() => buildPrzetargExecutiveBundle(item), [item]);
  const keyFacts = useMemo(() => buildPrzetargKeyFacts(item, swz), [item, swz]);
  const participationGroups = useMemo(() => buildParticipationDisplayGroups(swz), [swz]);
  const workScope = useMemo(() => buildPrzetargWorkScopeLabels(item, bundle), [item, bundle]);
  const highlights = useMemo(() => buildPrzetargHighlights(item, swz, bundle), [item, swz, bundle]);

  return (
    <div className="space-y-4" data-tender-przetarg-workspace>
      <TenderWorkflowHubPanel
        item={item}
        swz={swz}
        intelligenceCtx={intelligenceCtx}
        onNavigateTab={onNavigateTab}
        onNavigateLegacy={onNavigateLegacy}
        onOpenPreview={onOpenPreview}
        ownerFinanceProposal={ownerFinanceProposal}
        ownerDecision={ownerDecision}
        participationResult={participationResult}
        kosztorysSession={kosztorysSession}
        autoRunning={autoRunning}
        dossierBuilding={dossierBuilding}
        dossierSaving={dossierSaving}
        analyzing={analyzing}
        trustAssessment={trustAssessment}
        commandLayerActive={commandLayerActive}
        chiefDossierVm={chiefDossierVm}
        expertWorkspaceVm={expertWorkspaceVm}
        chiefSessionForDecision={chiefSessionForDecision}
        onPriceResearchAccepted={onPriceResearchAccepted}
      />

      {portfolioPosition && handleOpenStrategy && (
        <TenderPortfolioPositionPanel
          item={item}
          position={portfolioPosition}
          onOpenStrategy={handleOpenStrategy}
        />
      )}

      <details
        className="rounded-xl border border-border bg-card overflow-hidden group"
        data-tender-info-accordion
      >
        <summary className="px-4 py-2.5 min-h-[44px] cursor-pointer list-none flex items-center justify-between gap-2 bg-secondary/30 border-b border-transparent group-open:border-border/60 transition-colors duration-150 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Informacje o przetargu
          </span>
          <span className="text-[10px] text-muted-foreground" aria-hidden>rozwiń</span>
        </summary>
        <div className="px-4 py-4 space-y-4">
          <TenderDetailKpiBar item={item} swz={swz} />

      <BlockShell title="Podstawowe dane">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {keyFacts.map((fact) => (
            <KeyFactCard key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-muted-foreground">
          <span className="font-mono">{item.bzpNumber || "—"}</span>
          {item.organizationCity && <span>· {item.organizationCity}</span>}
          {item.ezamowieniaUrl && (
            <a
              href={item.ezamowieniaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              <ExternalLink size={11} />
              e-Zamówienia
            </a>
          )}
        </div>
      </BlockShell>

      <BlockShell title="Warunki udziału">
        {!hasParticipationDisplayData(swz) ? (
          <p className="text-sm text-muted-foreground">Nie wykryto wymagań</p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {participationGroups.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">{group.label}</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {group.items.slice(0, PARTICIPATION_PREVIEW_LINES).map((line, i) => (
                      <li key={`${group.label}-${i}`} className="break-words">{line}</li>
                    ))}
                    {group.items.length > PARTICIPATION_PREVIEW_LINES && (
                      <li className="list-none pl-0 text-[10px] text-muted-foreground">
                        +{group.items.length - PARTICIPATION_PREVIEW_LINES} więcej w kwalifikacji
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="text-[10px] font-medium text-primary hover:underline min-h-[44px] lg:min-h-0 px-1 touch-manipulation"
              onClick={() => onNavigateTab("decyzja", { decyzjaWorkspace: "qualification" })}
            >
              Pełna kwalifikacja → {TENDER_INTELLIGENCE_SECTION_COPY.verdict}
            </button>
          </div>
        )}
      </BlockShell>

      <BlockShell title="Zakres robót">
        {workScope.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nie ustalono głównych grup robót w dokumentach.</p>
        ) : (
          <ul className="space-y-2">
            {workScope.map((work, i) => (
              <li
                key={`${work}-${i}`}
                className="text-sm font-medium text-foreground px-3 py-2 rounded-lg bg-secondary/40 border border-border/50"
              >
                {work}
              </li>
            ))}
          </ul>
        )}
      </BlockShell>

      <BlockShell title="Najważniejsze informacje">
        {highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak skróconych informacji z dokumentów.</p>
        ) : (
          <ul className="space-y-2">
            {highlights.map((line, i) => (
              <li key={i} className="text-sm text-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
                {line}
              </li>
            ))}
          </ul>
        )}
      </BlockShell>

      {handleOpenStrategy && (
        <div className="rounded-lg border border-border/70 bg-secondary/20 px-3 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase size={14} className="text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Pełna analiza portfolio i monitoring zmian — moduł Strategia.
            </p>
          </div>
          <button
            type="button"
            className="text-[10px] font-medium text-primary hover:underline min-h-[44px] sm:min-h-0 px-1"
            onClick={() => handleOpenStrategy(item.id)}
          >
            Otwórz w Strategii →
          </button>
        </div>
      )}
        </div>
      </details>

      {operatorSection && (
        <details
          className="rounded-xl border border-border bg-card overflow-hidden group"
          data-tender-operator-accordion
        >
          <summary className="px-4 py-2.5 min-h-[44px] cursor-pointer list-none flex items-center justify-between gap-2 bg-secondary/30 border-b border-transparent group-open:border-border/60 transition-colors duration-150 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Przygotowanie oferty
            </span>
            <span className="text-[10px] text-muted-foreground" aria-hidden>rozwiń</span>
          </summary>
          <div className="px-4 py-4">
            {operatorSection}
          </div>
        </details>
      )}

      <p className="text-[10px] text-muted-foreground px-1">
        Szczegóły decyzji biznesowej (GO / HOLD / ODPUŚĆ) — zakładka{" "}
        <button
          type="button"
          className="text-primary font-medium hover:underline min-h-[44px] lg:min-h-0 px-1 touch-manipulation"
          onClick={() => onNavigateTab("decyzja")}
        >
          {TENDER_INTELLIGENCE_SECTION_COPY.verdict}
        </button>
        .
      </p>
    </div>
  );
}
