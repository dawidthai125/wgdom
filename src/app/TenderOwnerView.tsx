import { useMemo, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronRight,
  FileSpreadsheet,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { aggregateMarketKpi } from "@/lib/tenders-strategy-kpi";
import { computeCompanyHealth } from "@/lib/tenders-strategy-health";
import { loadGrowthMode } from "@/lib/tenders-strategy-growth-mode";
import type { StrategicScoreContext } from "@/lib/tenders-strategy-strategic-score";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { buildAthQuickAccessContext } from "@/lib/tender-ath-quick-access";
import {
  buildOwnerDecisionView,
  buildOwnerFinanceView,
  buildOwnerPositionsFileView,
  buildOwnerRiskTermRows,
  ownerDecisionTone,
  ownerRiskToneClass,
  scoreTenderForOwnerView,
} from "@/lib/tender-owner-view-ux";
import {
  TENDER_OWNER_NEXT_STEP_CTA,
  TENDER_OWNER_VIEW_COPY,
} from "@/lib/tender-owner-language-pl";

function buildFallbackScoringContext(
  items: TenderPipelineItem[],
): StrategicScoreContext {
  const profile = loadCompanyProfileLocal();
  const growthMode = loadGrowthMode().mode;
  const marketKpi = aggregateMarketKpi(items, profile);
  const health = computeCompanyHealth({
    items,
    jobs: [],
    directory: [],
    weekEmployees: [],
    weekFrom: "",
    weekTo: "",
    profile,
    growthMode,
    savedWeeks: [],
    marketKpi,
  });
  return { health, growthMode, jobs: [], items, profile, marketKpi };
}

function OwnerHeroDecision({
  item,
  allItems,
}: {
  item: TenderPipelineItem;
  allItems: TenderPipelineItem[];
}) {
  const tendersCtx = useTendersContextOptional();
  const decisionView = useMemo(() => {
    const ctx = tendersCtx?.snapshot.scoringContext ?? buildFallbackScoringContext(allItems);
    const bundle = scoreTenderForOwnerView(item, ctx);
    return buildOwnerDecisionView(bundle);
  }, [item, allItems, tendersCtx?.snapshot.scoringContext]);

  return (
    <section className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border/60 bg-primary/5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{TENDER_OWNER_VIEW_COPY.decisionSection}</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className={`inline-block rounded-lg border px-3 py-1.5 ${ownerDecisionTone(decisionView.decision)}`}>
            {decisionView.label}
          </span>
        </p>
        {decisionView.reasons.length > 0 && (
          <ul className="space-y-1 text-sm text-foreground/90">
            {decisionView.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
        {decisionView.blocks.map((block) => (
          <div
            key={`${block.kind}-${block.message}`}
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-300"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{block.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnerFinance({
  bidProposal,
  onNavigate,
}: {
  bidProposal: TenderBidProposal | null | undefined;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
}) {
  const finance = useMemo(() => buildOwnerFinanceView(bidProposal), [bidProposal]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{TENDER_OWNER_VIEW_COPY.financeSection}</p>
      </div>
      {finance.ready ? (
        <div className="grid grid-cols-3 divide-x divide-border">
          {([
            { label: TENDER_OWNER_VIEW_COPY.revenueLabel, value: finance.revenueDisplay, icon: TrendingUp },
            { label: TENDER_OWNER_VIEW_COPY.costLabel, value: finance.costDisplay, icon: Wallet },
            { label: TENDER_OWNER_VIEW_COPY.marginLabel, value: finance.marginDisplay, icon: TrendingUp },
          ] as const).map(({ label, value, icon: Icon }) => (
            <div key={label} className="px-3 py-3 text-center min-w-0">
              <Icon size={13} className="mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{TENDER_OWNER_VIEW_COPY.financeEmpty}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate("valuation"); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >
            {TENDER_OWNER_VIEW_COPY.financeCta}
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </section>
  );
}

function OwnerRiskTermin({
  item,
  swz,
  fit,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
}) {
  const rows = useMemo(() => buildOwnerRiskTermRows(item, swz, fit), [item, swz, fit]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{TENDER_OWNER_VIEW_COPY.riskSection}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {rows.map((row) => (
          <div key={row.id} className="px-3 py-2.5 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
            <p className={`text-xs font-medium mt-0.5 break-words ${ownerRiskToneClass(row.tone)}`}>
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnerPositionsFile({
  item,
  onNavigate,
  onOpenPreview,
}: {
  item: TenderPipelineItem;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
}) {
  const view = useMemo(() => buildOwnerPositionsFileView(item), [item]);
  const athCtx = useMemo(() => buildAthQuickAccessContext(item), [item]);

  const handleCta = () => {
    if (view.state === "awaiting") {
      onNavigate("documents");
      return;
    }
    if (athCtx.previewItem) onOpenPreview(athCtx.previewItem);
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30 flex items-center gap-2">
        <FileSpreadsheet size={13} className="text-primary shrink-0" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{TENDER_OWNER_VIEW_COPY.positionsSection}</p>
      </div>
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{view.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{view.subtitle}</p>
        </div>
        {view.ctaLabel && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCta(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 shrink-0"
          >
            {view.ctaLabel}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </section>
  );
}

function OwnerNextSteps({
  onNavigate,
}: {
  onNavigate: (tab: TenderWorkspaceTabId) => void;
}) {
  const steps: { tab: TenderWorkspaceTabId; label: string }[] = [
    { tab: "documents", label: TENDER_OWNER_NEXT_STEP_CTA.documents },
    { tab: "valuation", label: TENDER_OWNER_NEXT_STEP_CTA.valuation },
    { tab: "qualification", label: TENDER_OWNER_NEXT_STEP_CTA.qualification },
  ];

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{TENDER_OWNER_VIEW_COPY.nextStepsSection}</p>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {steps.map((step) => (
          <button
            key={step.tab}
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(step.tab); }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-xs font-medium hover:bg-secondary/70 min-h-[44px]"
          >
            {step.label}
            <ChevronRight size={12} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function TenderOwnerView({
  item,
  allItems,
  swz,
  fit,
  ownerFinanceProposal,
  onNavigate,
  onOpenPreview,
  moreSection,
}: {
  item: TenderPipelineItem;
  allItems: TenderPipelineItem[];
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  ownerFinanceProposal: TenderBidProposal | null | undefined;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  moreSection: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <OwnerHeroDecision item={item} allItems={allItems} />
      <OwnerFinance bidProposal={ownerFinanceProposal} onNavigate={onNavigate} />
      <OwnerRiskTermin item={item} swz={swz} fit={fit} />
      <OwnerPositionsFile item={item} onNavigate={onNavigate} onOpenPreview={onOpenPreview} />
      <OwnerNextSteps onNavigate={onNavigate} />
      <details className="rounded-xl border border-border bg-card overflow-hidden group">
        <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30">
          <span className="inline-flex items-center gap-2">
            <ShieldAlert size={13} />
            {TENDER_OWNER_VIEW_COPY.moreSection}
          </span>
          <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/60">
          {moreSection}
        </div>
      </details>
    </div>
  );
}
