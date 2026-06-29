/**
 * EPIC B — jednolity pasek procesu na zakładce Przetarg (Workflow Hub).
 * Prezentacja + nawigacja V4 — bez logiki biznesowej.
 */

import { Check, ChevronRight, Circle } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import {
  buildWorkflowProcessStripStages,
  workflowProcessStripStageToV4Navigate,
  type WorkflowProcessStripStage,
  type WorkflowProcessStripStageStatus,
} from "@/lib/tender-workflow-process-strip";
import {
  trustLevelToIcon,
  trustStageOverlayLevel,
  trustToneClass,
  trustLevelToTone,
} from "@/lib/tender-trust-ui";

function stageStatusClass(status: WorkflowProcessStripStageStatus): string {
  switch (status) {
    case "done":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "partial":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    default:
      return "border-border bg-secondary/40 text-muted-foreground";
  }
}

function StageIcon({ status }: { status: WorkflowProcessStripStageStatus }) {
  if (status === "done") return <Check size={12} className="shrink-0" aria-hidden />;
  return <Circle size={10} className="shrink-0 opacity-60" aria-hidden />;
}

function ProcessStripStageButton({
  stage,
  onNavigate,
  trustOverlayLevel,
}: {
  stage: WorkflowProcessStripStage;
  onNavigate: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  trustOverlayLevel?: ReturnType<typeof trustStageOverlayLevel>;
}) {
  const handleClick = () => {
    const target = workflowProcessStripStageToV4Navigate(stage.id);
    onNavigate(target.tab, target.decyzjaWorkspace ? { decyzjaWorkspace: target.decyzjaWorkspace } : undefined);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        trustOverlayLevel && trustOverlayLevel !== "trusted"
          ? `${stage.label}: trust ${trustLevelToIcon(trustOverlayLevel)}`
          : stage.hint ? `${stage.label}: ${stage.hint}` : stage.label
      }
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${stageStatusClass(stage.status)} ${
        trustOverlayLevel && trustOverlayLevel !== "trusted"
          ? `ring-1 ring-inset ${trustToneClass(trustLevelToTone(trustOverlayLevel))}`
          : ""
      }`}
      data-workflow-process-stage={stage.id}
      data-tender-trust-overlay={trustOverlayLevel ?? undefined}
    >
      {trustOverlayLevel && trustOverlayLevel !== "trusted" && (
        <span className="shrink-0 font-bold" aria-hidden>{trustLevelToIcon(trustOverlayLevel)}</span>
      )}
      <StageIcon status={stage.status} />
      <span className="whitespace-nowrap">{stage.label}</span>
    </button>
  );
}

export function TenderWorkflowProcessStrip({
  item,
  swz,
  intelligenceCtx,
  trustAssessment,
  onNavigateTab,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  trustAssessment: TenderTrustAssessment;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
}) {
  const stages = buildWorkflowProcessStripStages({
    item,
    swz,
    prepStatus: intelligenceCtx.prepStatus,
  });

  return (
    <nav
      className="rounded-xl border border-border bg-card px-3 py-2.5"
      aria-label="Proces przygotowania oferty"
      data-tender-workflow-process-strip
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Proces oferty
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {stages.map((stage, index) => (
          <div key={stage.id} className="inline-flex items-center gap-1">
            <ProcessStripStageButton
              stage={stage}
              onNavigate={onNavigateTab}
              trustOverlayLevel={trustStageOverlayLevel(trustAssessment, stage.id)}
            />
            {index < stages.length - 1 && (
              <ChevronRight size={12} className="text-muted-foreground/50 shrink-0" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
