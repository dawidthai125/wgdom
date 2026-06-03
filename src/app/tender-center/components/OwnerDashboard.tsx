import { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertCircle, Layers } from "lucide-react";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import { useCommandCenterExecutiveSnapshot } from "@/app/tender-center/hooks/useCommandCenterExecutiveSnapshot";
import type { GrowthModeState } from "@/lib/tender-center-growth-mode";
import { useOwnerTenderDecisions } from "@/app/tender-center/hooks/useOwnerTenderDecisions";
import {
  getLearningStats,
  recordTenderLearningDecision,
  type LearningReasonId,
} from "@/lib/tender-center-learning";
import type { TenderDecision, TenderScoringBundle } from "@/lib/tender-center-decision";
import { OwnerAlertsPanel } from "@/app/tender-center/components/OwnerAlertsPanel";
import { ActionCenter } from "@/app/tender-center/components/ActionCenter";
import { OpportunityOverview } from "@/app/tender-center/components/OpportunityOverview";
import { LearningReasonDialog } from "@/app/tender-center/components/LearningReasonDialog";
import { LearningMemoryPanel } from "@/app/tender-center/components/LearningMemoryPanel";
import { OwnerProfilePanel } from "@/app/tender-center/components/OwnerProfilePanel";
import { AiInsightsPanel } from "@/app/tender-center/components/AiInsightsPanel";
import { MorningBriefingCard } from "@/app/tender-center/components/MorningBriefingCard";
import { CommandCenterHero } from "@/app/tender-center/components/CommandCenterHero";
import { BestOpportunityCard } from "@/app/tender-center/components/BestOpportunityCard";
import { ForecastCommandStrip } from "@/app/tender-center/components/ForecastCommandStrip";
import { WhatIfPanel } from "@/app/tender-center/components/WhatIfPanel";
import { FinancialCapacityPanel } from "@/app/tender-center/components/FinancialCapacityPanel";
import { TenderPortfolioPanel } from "@/app/tender-center/components/TenderPortfolioCounters";
import { CommandCenterExplainability } from "@/app/tender-center/components/CommandCenterExplainability";
import { CommandCenterBrandHeader } from "@/app/tender-center/components/CommandCenterBrandHeader";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";
import { hasSeenCommandCenterOnboarding } from "@/app/tender-center/command-center-onboarding";
import { CommandCenterWelcomeDialog } from "@/app/tender-center/components/CommandCenterWelcomeDialog";
import { HowToUseCommandCenter } from "@/app/tender-center/components/HowToUseCommandCenter";
import { CommandCenterGlossary } from "@/app/tender-center/components/CommandCenterGlossary";
import { AboutCommandCenter } from "@/app/tender-center/components/AboutCommandCenter";
import { computeAiInsights } from "@/lib/tender-center-ai-insights";
import { computeOwnerProfile } from "@/lib/tender-center-owner-profile";
import { loadTenderLearning } from "@/lib/tender-center-learning";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";

export function OwnerDashboard({
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
  showTestBadge = false,
  onOpenTender,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  showTestBadge?: boolean;
  onOpenTender?: (tenderId: string) => void;
}) {
  const [learningDialogOpen, setLearningDialogOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<{
    bundle: TenderScoringBundle;
    decision: TenderDecision;
  } | null>(null);
  const [learningRevision, setLearningRevision] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenCommandCenterOnboarding()) {
      setWelcomeOpen(true);
    }
  }, []);

  const ownerDecisions = useOwnerTenderDecisions();

  const snapshot = useCommandCenterExecutiveSnapshot({
    jobs,
    directory,
    productionWeekEmployees,
    weekFrom,
    weekTo,
    savedWeeks,
    learningRevision,
    financialCapacityEnabled: true,
  });

  const {
    pipeline,
    growthModeState,
    setGrowthMode: applyGrowthMode,
    health,
    healthExplanation,
    morningBriefing,
    actionCenter,
    forecast90,
    forecastInput,
    forecastHorizonExplanations,
    bestOpportunity,
    financialCapacity,
    marketKpi,
    portfolioCounts,
    ownerAlerts,
    goCandidates,
  } = snapshot;

  const learningStats = useMemo(
    () => getLearningStats(),
    [learningRevision],
  );

  const ownerDecisionProfile = useMemo(() => {
    const { entries } = loadTenderLearning();
    return computeOwnerProfile(entries);
  }, [learningRevision]);

  const aiInsights = useMemo(
    () =>
      computeAiInsights({
        learningEntries: loadTenderLearning().entries,
        ownerProfile: ownerDecisionProfile,
      }),
    [learningRevision, ownerDecisionProfile],
  );

  const handleGrowthModeChange = (mode: GrowthModeState["mode"]) => {
    applyGrowthMode(mode);
  };

  const handleDecisionRequest = (bundle: TenderScoringBundle, decision: TenderDecision) => {
    setPendingDecision({ bundle, decision });
    setLearningDialogOpen(true);
  };

  const handleLearningConfirm = (reason: LearningReasonId, customReason: string) => {
    if (!pendingDecision) return;
    const { bundle, decision } = pendingDecision;
    ownerDecisions.setOwnerDecision(bundle, decision);
    recordTenderLearningDecision({
      tenderId: bundle.item.id,
      ownerDecision: decision,
      reason,
      customReason,
      systemDecision: bundle.decision,
      opportunityScore: bundle.opportunity.score,
      strategicScore: bundle.strategic.score,
      impactScore: 0,
    });
    setLearningRevision((v) => v + 1);
    setPendingDecision(null);
  };

  if (pipeline.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {COMMAND_CENTER_BRAND.loading}
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <CommandCenterBrandHeader
        showTestBadge={showTestBadge}
        refreshButton={
          <button
            type="button"
            onClick={() => void pipeline.refreshFromBzp()}
            disabled={pipeline.syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px] shrink-0"
          >
            <RefreshCw size={16} className={pipeline.syncing || pipeline.autoSyncing ? "animate-spin" : ""} />
            {pipeline.syncing ? "Pobieranie…" : pipeline.autoSyncing ? "Auto-sync…" : "Odśwież z BZP"}
          </button>
        }
      />

      <div className="px-4 sm:px-6 py-3 space-y-4">
        {pipeline.error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {pipeline.error}
          </div>
        )}

        {pipeline.autoAwardRunning && (
          <p className="text-[10px] text-muted-foreground">Sprawdzam wyniki zakończonych postępowań…</p>
        )}

        <MorningBriefingCard briefing={morningBriefing} compact hideOpportunityPreview />

        <BestOpportunityCard
          bundle={bestOpportunity}
          ownerRecord={bestOpportunity ? ownerDecisions.getOwnerDecision(bestOpportunity.item.id) : null}
          onSetDecision={handleDecisionRequest}
          onOpenTender={onOpenTender}
        />

        <FinancialCapacityPanel capacity={financialCapacity} />

        <CommandCenterHero
          health={health}
          growthMode={growthModeState.mode}
          suggestedMode={health.suggestedGrowthMode}
          onGrowthModeChange={handleGrowthModeChange}
        />

        <ActionCenter
          center={actionCenter}
          variant="urgent"
          onOpenTender={onOpenTender}
          pipelineItems={pipeline.items}
        />

        <ForecastCommandStrip forecast={forecast90} />

        <WhatIfPanel forecastInput={forecastInput} goCandidates={goCandidates} />

        <TenderPortfolioPanel
          systemCounts={portfolioCounts}
          ownerStats={ownerDecisions.stats}
          snapshotAlignment={ownerDecisions.snapshotAlignment}
          recent={ownerDecisions.recent}
          pipelineItems={pipeline.items}
        />

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Layers size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Pozostałe analizy</h2>
          </div>
          <Accordion type="multiple" className="px-4">
            <AccordionItem value="ai-insights">
              <AccordionTrigger>AI Insights</AccordionTrigger>
              <AccordionContent>
                <AiInsightsPanel insights={aiInsights} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="kpi">
              <AccordionTrigger>KPI rynku</AccordionTrigger>
              <AccordionContent>
                <OpportunityOverview kpi={marketKpi} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alerts">
              <AccordionTrigger>
                Alerty
                {ownerAlerts.length > 0 && (
                  <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {ownerAlerts.length}
                  </span>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <OwnerAlertsPanel alerts={ownerAlerts} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="explain">
              <AccordionTrigger>Explainability</AccordionTrigger>
              <AccordionContent>
                <CommandCenterExplainability
                  health={health}
                  healthExplanation={healthExplanation}
                  bestOpportunity={bestOpportunity}
                  forecastHorizonExplanations={forecastHorizonExplanations}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="learning">
              <AccordionTrigger>Pamięć decyzji</AccordionTrigger>
              <AccordionContent>
                <LearningMemoryPanel stats={learningStats} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="owner-profile">
              <AccordionTrigger>Profil właściciela</AccordionTrigger>
              <AccordionContent>
                <OwnerProfilePanel profile={ownerDecisionProfile} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="how-to-use">
              <AccordionTrigger>🎓 Jak korzystać z COMMAND CENTER AI</AccordionTrigger>
              <AccordionContent>
                <HowToUseCommandCenter />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="glossary">
              <AccordionTrigger>📚 Słownik COMMAND CENTER AI</AccordionTrigger>
              <AccordionContent>
                <CommandCenterGlossary />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="about">
              <AccordionTrigger>ℹ️ O COMMAND CENTER AI</AccordionTrigger>
              <AccordionContent>
                <AboutCommandCenter />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <CommandCenterWelcomeDialog open={welcomeOpen} onOpenChange={setWelcomeOpen} />

        <LearningReasonDialog
          open={learningDialogOpen}
          decision={pendingDecision?.decision ?? null}
          onOpenChange={setLearningDialogOpen}
          onConfirm={handleLearningConfirm}
        />

        <p className="text-[11px] text-muted-foreground text-center pb-2">
          Pełna lista przetargów, filtry i SWZ — w{" "}
          <strong className="text-foreground">{COMMAND_CENTER_BRAND.toggleClassic}</strong> (przełącznik u góry ekranu).
        </p>
      </div>
    </div>
  );
}
