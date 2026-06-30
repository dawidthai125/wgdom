import { AlertTriangle, CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import {
  buildTenderAnalysisStatusRows,
  type TenderAnalysisStatusRow,
  type TenderAnalysisStepState,
} from "@/lib/tender-analysis-status-ux";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { TENDER_OWNER_WORKSPACE_SECTION_COPY } from "@/lib/tender-owner-language-pl";

const STATE_CLASS: Record<TenderAnalysisStepState, string> = {
  ready: "text-emerald-600 dark:text-emerald-400",
  pending: "text-amber-600 dark:text-amber-400",
  warn: "text-amber-600 dark:text-amber-400",
  missing: "text-muted-foreground/70",
};

function rowIcon(
  row: TenderAnalysisStatusRow,
  opts: { dossierBuilding?: boolean; autoRunning?: boolean },
) {
  if (row.state === "ready") return CheckCircle2;
  if (row.state === "warn") return AlertTriangle;
  if (row.state === "missing") return Circle;
  const active = (row.id === "kosztorys" && opts.dossierBuilding)
    || ((row.id === "notice" || row.id === "documents") && opts.autoRunning);
  return active ? Loader2 : Clock;
}

export function TenderAnalysisStatusStrip({
  item,
  swz,
  bidProposal,
  dossierBuilding,
  dossierSaving,
  autoRunning,
  kosztorysSession,
  ownerMoreContext = false,
  ribbonCompact = false,
}: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  bidProposal?: TenderBidProposal | null;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  kosztorysSession?: import("@/lib/tender-kosztorys-process-phase").KosztorysProcessSession;
  /** P5-004 — w Więcej pomiń kroki duplikujące Owner View. */
  ownerMoreContext?: boolean;
  /** NG-03.2 — inline w Status Ribbon (bez osobnego boxa). */
  ribbonCompact?: boolean;
}) {
  const rows = buildTenderAnalysisStatusRows({
    item,
    swz,
    bidProposal,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    kosztorysSession,
  });
  const visibleRows = ownerMoreContext
    ? rows.filter((r) => r.id === "notice" || r.id === "documents")
    : rows;

  if (ribbonCompact) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5"
        data-tender-analysis-status-ribbon
      >
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
          {TENDER_OWNER_WORKSPACE_SECTION_COPY.analysisProgress}
        </span>
        {visibleRows.map((row) => {
          const Icon = rowIcon(row, { dossierBuilding, autoRunning });
          const spin = row.state === "pending" && Icon === Loader2;
          return (
            <span
              key={row.id}
              className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium ${STATE_CLASS[row.state]}`}
            >
              <Icon size={10} className={spin ? "animate-spin shrink-0" : "shrink-0"} />
              {row.label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {TENDER_OWNER_WORKSPACE_SECTION_COPY.analysisProgress}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {visibleRows.map((row) => {
          const Icon = rowIcon(row, { dossierBuilding, autoRunning });
          const spin = row.state === "pending" && Icon === Loader2;
          return (
            <span
              key={row.id}
              className={`inline-flex items-center gap-1 text-[10px] font-medium ${STATE_CLASS[row.state]}`}
            >
              <Icon size={11} className={spin ? "animate-spin shrink-0" : "shrink-0"} />
              {row.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
