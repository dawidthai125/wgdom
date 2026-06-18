import { useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronRight,
  FileSpreadsheet,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { ExecutiveSummaryCard } from "@/app/ExecutiveSummaryCard";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { OwnerFinanceView } from "@/lib/tender-owner-view-ux";
import type { OwnerPositionsFileView } from "@/lib/tender-owner-view-ux";
import type { OwnerPrepStatusView } from "@/lib/tender-owner-view-ux";
import type { OwnerRiskTermRow } from "@/lib/tender-owner-view-ux";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { buildAthQuickAccessContext } from "@/lib/tender-ath-quick-access";
import {
  ownerDecisionTone,
  ownerRiskToneClass,
  ownerStatusIconClass,
  ownerStatusIconGlyph,
} from "@/lib/tender-owner-view-ux";
import {
  TENDER_INTELLIGENCE_SECTION_COPY,
  TENDER_OWNER_VIEW_COPY,
} from "@/lib/tender-owner-language-pl";

export interface TenderOwnerViewProps {
  intelligenceCtx: TenderIntelligenceContext;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  /** Sekcja 7 — monitoring, analysis strip, operator actions (z TenderDetailPanel). */
  detailsSection: ReactNode;
}

function IntelligenceVerdictSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  const { overlay } = ctx;

  return (
    <section className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border/60 bg-primary/5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.verdict}
        </p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className={`inline-block rounded-lg border px-3 py-1.5 ${ownerDecisionTone(overlay.displayDecision)}`}>
            {overlay.displayLabel}
          </span>
        </p>
        {overlay.confidenceLabel && (
          <p className="text-xs text-muted-foreground">
            {TENDER_INTELLIGENCE_SECTION_COPY.confidenceLabel}:{" "}
            <span className="font-medium text-foreground">{overlay.confidenceLabel}</span>
            {overlay.confidenceHint && (
              <span className="block mt-0.5 text-[11px]">{overlay.confidenceHint}</span>
            )}
          </p>
        )}
        {overlay.reasons.length > 0 && (
          <ul className="space-y-1 text-sm text-foreground/90">
            {overlay.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
        {overlay.heroBlocks.map((block) => (
          <div
            key={`${block.kind}-${block.message}`}
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-300"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{block.message}</span>
          </div>
        ))}
        {overlay.helperMessage && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {overlay.helperMessage}
          </p>
        )}
      </div>
    </section>
  );
}

function IntelligenceAboutSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.about}
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm text-foreground leading-relaxed">{ctx.narrative}</p>
        {ctx.executive && (
          <ExecutiveSummaryCard summary={ctx.executive} />
        )}
      </div>
    </section>
  );
}

function OwnerFinanceDisplay({ finance }: { finance: OwnerFinanceView }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.economy}
        </p>
      </div>
      {finance.mode === "ready" ? (
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
        <div className="px-4 py-4">
          <p className="text-sm font-medium text-foreground">{finance.message}</p>
          {finance.hint && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{finance.hint}</p>
          )}
        </div>
      )}
    </section>
  );
}

function IntelligenceBlockersSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  const { overlay, riskRows, monitoringCounts } = ctx;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.blockers}
        </p>
        {monitoringCounts.total > 0 && (
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
            {TENDER_INTELLIGENCE_SECTION_COPY.monitoringSignals(monitoringCounts.total)}
          </span>
        )}
      </div>
      <div className="px-3 py-3 space-y-3">
        {overlay.allBlocks.map((block) => (
          <div
            key={`${block.kind}-${block.message}`}
            className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-800 dark:text-red-300"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{block.message}</span>
          </div>
        ))}
        {overlay.allBlocks.length === 0 && monitoringCounts.total === 0 && (
          <p className="text-xs text-muted-foreground">Brak aktywnych blokerów formalnych.</p>
        )}
        <OwnerRiskTerminRows rows={riskRows} />
      </div>
    </section>
  );
}

function OwnerRiskTerminRows({ rows }: { rows: OwnerRiskTermRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-lg border border-border/60 overflow-hidden">
      {rows.map((row) => (
        <div key={row.id} className="px-3 py-2.5 min-w-0 bg-secondary/10">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
          <p className={`text-xs font-medium mt-0.5 break-words ${ownerRiskToneClass(row.tone)}`}>
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function IntelligenceNextActionSection({
  ctx,
  onNavigate,
  onExpandDetails,
}: {
  ctx: TenderIntelligenceContext;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
  onExpandDetails: () => void;
}) {
  const { nextAction } = ctx;

  const handleClick = () => {
    if (nextAction.informationalOnly) return;
    if (nextAction.expandDetails) {
      onExpandDetails();
      return;
    }
    if (nextAction.tab) onNavigate(nextAction.tab);
  };

  return (
    <section className="rounded-xl border border-primary/35 bg-card overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-border/60 bg-primary/5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.nextAction}
        </p>
      </div>
      <div className="px-4 py-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">{nextAction.title}</p>
        <p className="text-xs text-muted-foreground">{nextAction.description}</p>
        {!nextAction.informationalOnly && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 min-h-[44px]"
          >
            {nextAction.buttonLabel}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </section>
  );
}

function OwnerPrepStatusDisplay({ status }: { status: OwnerPrepStatusView }) {
  const rows = [
    { key: "kosztorys", label: TENDER_OWNER_VIEW_COPY.prepStatusKosztorysLabel, line: status.kosztorys },
    { key: "pricing", label: TENDER_OWNER_VIEW_COPY.prepStatusPricingLabel, line: status.pricing },
  ] as const;

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 flex flex-wrap gap-x-6 gap-y-1.5">
      {rows.map(({ key, label, line }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${ownerStatusIconClass(line.icon)}`}
        >
          <span aria-hidden>{ownerStatusIconGlyph(line.icon)}</span>
          <span className="text-muted-foreground">{label}:</span>
          <span className="text-foreground">{line.text}</span>
        </span>
      ))}
    </div>
  );
}

function OwnerPositionsFileDisplay({
  view,
  item,
  onNavigate,
  onOpenPreview,
}: {
  view: OwnerPositionsFileView;
  item: TenderIntelligenceContext["item"];
  onNavigate: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
}) {
  const athCtx = buildAthQuickAccessContext(item);

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
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_OWNER_VIEW_COPY.positionsSection}
        </p>
      </div>
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${ownerStatusIconClass(view.statusIcon)}`}>
            <span aria-hidden className="mr-1.5">{ownerStatusIconGlyph(view.statusIcon)}</span>
            {view.statusLine}
          </p>
          {view.hint && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{view.hint}</p>
          )}
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

export function TenderOwnerView({
  intelligenceCtx,
  onNavigate,
  onOpenPreview,
  detailsSection,
}: TenderOwnerViewProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const expandDetails = () => {
    setDetailsOpen(true);
    detailsRef.current?.setAttribute("open", "");
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="space-y-3">
      <IntelligenceVerdictSection ctx={intelligenceCtx} />
      <IntelligenceAboutSection ctx={intelligenceCtx} />
      <OwnerFinanceDisplay finance={intelligenceCtx.finance} />
      <IntelligenceBlockersSection ctx={intelligenceCtx} />
      <IntelligenceNextActionSection
        ctx={intelligenceCtx}
        onNavigate={onNavigate}
        onExpandDetails={expandDetails}
      />
      <details
        ref={detailsRef}
        open={detailsOpen}
        onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-xl border border-border bg-card overflow-hidden group"
      >
        <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30">
          <span className="inline-flex items-center gap-2">
            <ShieldAlert size={13} />
            {TENDER_INTELLIGENCE_SECTION_COPY.details}
          </span>
          <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/60">
          <OwnerPrepStatusDisplay status={intelligenceCtx.prepStatus} />
          <OwnerPositionsFileDisplay
            view={intelligenceCtx.positions}
            item={intelligenceCtx.item}
            onNavigate={onNavigate}
            onOpenPreview={onOpenPreview}
          />
          {detailsSection}
        </div>
      </details>
    </div>
  );
}
