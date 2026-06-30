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
  buildProcessStripStagePresentation,
  pickStripStageTrustMessage,
  trustStageOverlayLevel,
} from "@/lib/tender-trust-ui";

function StageIcon({ status }: { status: WorkflowProcessStripStageStatus }) {
  if (status === "done") return <Check size={12} className="shrink-0" aria-hidden />;
  return <Circle size={10} className="shrink-0 opacity-60" aria-hidden />;
}

function ProcessStripStageButton({
  stage,
  onNavigate,
  trustAssessment,
}: {
  stage: WorkflowProcessStripStage;
  onNavigate: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  trustAssessment: TenderTrustAssessment;
}) {
  const trustLevel = trustStageOverlayLevel(trustAssessment, stage.id);
  const trustMessage = pickStripStageTrustMessage(trustAssessment, stage.id);
  const presentation = buildProcessStripStagePresentation(stage, trustLevel, trustMessage);

  const handleClick = () => {
    const target = workflowProcessStripStageToV4Navigate(stage.id);
    onNavigate(target.tab, target.decyzjaWorkspace ? { decyzjaWorkspace: target.decyzjaWorkspace } : undefined);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={presentation.title}
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${presentation.buttonClassName}`}
      data-workflow-process-stage={stage.id}
      data-tender-trust-overlay={trustLevel ?? undefined}
      data-tender-trust-strip-icon={presentation.iconKind}
    >
      {presentation.iconKind === "trust" && presentation.trustIcon ? (
        <span className="shrink-0 font-bold" aria-hidden>{presentation.trustIcon}</span>
      ) : (
        <StageIcon status={presentation.workflowStatus} />
      )}
      <span className="whitespace-nowrap">{stage.label}</span>
    </button>
  );
}

function ProcessStripStageButtonCompact({
  stage,
  onNavigate,
  trustAssessment,
  ribbon,
}: {
  stage: WorkflowProcessStripStage;
  onNavigate: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  trustAssessment: TenderTrustAssessment;
  ribbon: boolean;
}) {
  const trustLevel = trustStageOverlayLevel(trustAssessment, stage.id);
  const trustMessage = pickStripStageTrustMessage(trustAssessment, stage.id);
  const presentation = buildProcessStripStagePresentation(stage, trustLevel, trustMessage);

  const handleClick = () => {
    const target = workflowProcessStripStageToV4Navigate(stage.id);
    onNavigate(target.tab, target.decyzjaWorkspace ? { decyzjaWorkspace: target.decyzjaWorkspace } : undefined);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={presentation.title}
      className={`inline-flex items-center gap-1 font-semibold rounded-md border transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shrink-0 ${
        ribbon
          ? "text-[9px] max-[390px]:text-[8px] px-1.5 max-[390px]:px-1 py-1 max-[390px]:py-0.5"
          : "text-[10px] px-2.5 py-1.5 rounded-lg"
      } ${presentation.buttonClassName}`}
      data-workflow-process-stage={stage.id}
      data-tender-trust-overlay={trustLevel ?? undefined}
      data-tender-trust-strip-icon={presentation.iconKind}
    >
      {presentation.iconKind === "trust" && presentation.trustIcon ? (
        <span className="shrink-0 font-bold" aria-hidden>{presentation.trustIcon}</span>
      ) : (
        <StageIcon status={presentation.workflowStatus} />
      )}
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
  variant = "default",
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  trustAssessment: TenderTrustAssessment;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  /** NG-03 P0 — compact ribbon w Command Layer (bez wrap, scroll poziomy). */
  variant?: "default" | "ribbon";
}) {
  const stages = buildWorkflowProcessStripStages({
    item,
    swz,
    prepStatus: intelligenceCtx.prepStatus,
  });

  const ribbon = variant === "ribbon";

  return (
    <nav
      className={
        ribbon
          ? "rounded-lg border border-border/70 bg-card/80 px-2 py-1 max-[390px]:px-1.5 max-[390px]:py-0.5"
          : "rounded-xl border border-border bg-card px-3 py-2.5"
      }
      aria-label="Proces przygotowania oferty"
      data-tender-workflow-process-strip
      data-tender-process-strip-variant={variant}
    >
      <p
        className={
          ribbon
            ? "sr-only"
            : "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2"
        }
      >
        Proces oferty
      </p>
      <div
        className={
          ribbon
            ? "flex flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain scrollbar-thin -mx-0.5 px-0.5"
            : "flex flex-wrap items-center gap-1"
        }
      >
        {stages.map((stage, index) => (
          <div key={stage.id} className="inline-flex items-center gap-1 shrink-0">
            {ribbon ? (
              <ProcessStripStageButtonCompact
                stage={stage}
                onNavigate={onNavigateTab}
                trustAssessment={trustAssessment}
                ribbon
              />
            ) : (
              <ProcessStripStageButton
                stage={stage}
                onNavigate={onNavigateTab}
                trustAssessment={trustAssessment}
              />
            )}
            {index < stages.length - 1 && (
              <ChevronRight
                size={ribbon ? 10 : 12}
                className={`text-muted-foreground/50 shrink-0 ${ribbon ? "max-[390px]:hidden" : ""}`}
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
