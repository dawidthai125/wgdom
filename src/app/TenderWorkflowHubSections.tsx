/**
 * EPIC A — sekcje Workflow Hub (Przetarg): blokery, status przygotowania, plik pozycji.
 * SSOT prezentacji — bez zmian logiki biznesowej.
 */

import { AlertTriangle, ChevronRight, FileSpreadsheet } from "lucide-react";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { OwnerPrepStatusView } from "@/lib/tender-owner-view-ux";
import type { OwnerPositionsFileView } from "@/lib/tender-owner-view-ux";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { buildAthQuickAccessContext } from "@/lib/tender-ath-quick-access";
import {
  ownerRiskToneClass,
  ownerStatusIconClass,
  ownerStatusIconGlyph,
} from "@/lib/tender-owner-view-ux";
import {
  TENDER_INTELLIGENCE_SECTION_COPY,
  TENDER_OWNER_VIEW_COPY,
} from "@/lib/tender-owner-language-pl";

export function WorkflowHubBlockersSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  const { overlay, riskRows, monitoringCounts } = ctx;

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-tender-workflow-hub="blockers"
    >
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
        <WorkflowHubRiskTermRows rows={riskRows} />
      </div>
    </section>
  );
}

function WorkflowHubRiskTermRows({ rows }: { rows: TenderIntelligenceContext["riskRows"] }) {
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

export function WorkflowHubPrepStatusDisplay({ status }: { status: OwnerPrepStatusView }) {
  const rows = [
    { key: "kosztorys", label: TENDER_OWNER_VIEW_COPY.prepStatusKosztorysLabel, line: status.kosztorys },
    { key: "pricing", label: TENDER_OWNER_VIEW_COPY.prepStatusPricingLabel, line: status.pricing },
  ] as const;

  return (
    <div
      className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 flex flex-wrap gap-x-6 gap-y-1.5"
      data-tender-workflow-hub="prep-status"
    >
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

export function WorkflowHubPositionsFileDisplay({
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
    <section
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-tender-workflow-hub="positions"
    >
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
