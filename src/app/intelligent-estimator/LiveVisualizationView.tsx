/**
 * IK-ANALYSIS-OBSERVABILITY-PROJECTION-01 Phase 3 —
 * Live Visualization — READ-ONLY consumer of AnalysisObservation.
 *
 * HARD: no orchestra · no EC VM · no progress recalculation · no ETA invent · no writes.
 */

import { Check, Circle, Loader2 } from "lucide-react";
import type {
  AnalysisObservation,
  ObservationStageStatus,
} from "@/lib/intelligent-estimator/analysis-observation";
import { INTELIGENTNY_KOSZTORYSANT_TITLE_PL } from "@/lib/expert-conversation-ui";
import { prefersReducedMotion } from "@/lib/expert-conversation-ui";
import { TEUX_FONT_CAPTION, TEUX_FONT_META, TEUX_FONT_TITLE } from "@/lib/tender-ux-tokens";
import {
  IK_LIVE_VIZ_ACTIVE_STAGE_LABEL_PL,
  IK_LIVE_VIZ_ETA_PLACEHOLDER_PL,
  IK_LIVE_VIZ_NO_ACTIVE_STAGES_PL,
  IK_LIVE_VIZ_PROGRESS_LABEL_PL,
  labelObservationOverallStatusPl,
  presentObservationStageStatus,
} from "./ik-live-visualization-labels";

function StageStatusIcon({
  status,
  reducedMotion,
}: {
  status: ObservationStageStatus;
  reducedMotion: boolean;
}) {
  if (status === "done") {
    return <Check size={12} className="shrink-0" aria-hidden />;
  }
  if (status === "running") {
    return (
      <Loader2
        size={12}
        className={`shrink-0 text-primary ${reducedMotion ? "" : "motion-safe:animate-spin"}`}
        aria-hidden
      />
    );
  }
  return <Circle size={10} className="shrink-0 opacity-60" aria-hidden />;
}

/**
 * Presentation-only Live Viz.
 * Single runtime input: `observation` (C-PROP).
 */
export function LiveVisualizationView({
  observation,
}: {
  observation: AnalysisObservation;
}) {
  const reducedMotion = prefersReducedMotion();
  const percent = observation.progress.percent;
  const totalWeight = observation.progress.totalWeight;
  const runningId = observation.progress.runningStageId;
  const runningStage =
    runningId != null
      ? observation.stages.find((s) => s.stageId === runningId)
      : undefined;
  const overallPl = labelObservationOverallStatusPl(observation.overallStatus);
  const noActiveStages = totalWeight === 0;

  return (
    <section
      data-ik-live-visualization="1"
      data-ik-live-viz-overall={observation.overallStatus}
      data-ik-live-viz-percent={String(percent)}
      data-ik-live-viz-total-weight={String(totalWeight)}
      data-ik-live-viz-blocked={observation.progress.blocked ? "1" : "0"}
      className="mb-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5"
      aria-label={IK_LIVE_VIZ_PROGRESS_LABEL_PL}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`${TEUX_FONT_TITLE} text-foreground truncate`}>
            {INTELIGENTNY_KOSZTORYSANT_TITLE_PL}
          </p>
          <p
            className={`${TEUX_FONT_META} text-muted-foreground mt-0.5`}
            data-ik-live-viz-overall-label
          >
            Status: {overallPl}
          </p>
        </div>
        <p
          className={`${TEUX_FONT_CAPTION} font-semibold tabular-nums shrink-0`}
          data-ik-live-viz-percent-text
          aria-hidden
        >
          {percent}%
        </p>
      </header>

      <div
        className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={IK_LIVE_VIZ_PROGRESS_LABEL_PL}
        data-ik-live-viz-progressbar="1"
      >
        <div
          className="h-full rounded-full bg-primary motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
          data-ik-live-viz-progress-fill="1"
        />
      </div>

      {noActiveStages ? (
        <p
          className={`${TEUX_FONT_META} text-muted-foreground mt-1.5`}
          data-ik-live-viz-no-active="1"
        >
          {IK_LIVE_VIZ_NO_ACTIVE_STAGES_PL}
        </p>
      ) : null}

      {observation.progress.blocked ? (
        <p
          className={`${TEUX_FONT_META} text-amber-800 dark:text-amber-300 mt-1.5`}
          data-ik-live-viz-blocked-banner="1"
        >
          Analiza z blokadami / HOLD
        </p>
      ) : null}

      {runningStage ? (
        <p
          className={`${TEUX_FONT_CAPTION} mt-2 text-foreground`}
          data-ik-live-viz-active-stage="1"
          data-ik-live-viz-active-stage-id={runningStage.stageId}
        >
          <span className="text-muted-foreground">{IK_LIVE_VIZ_ACTIVE_STAGE_LABEL_PL}: </span>
          <span className="font-medium truncate inline-block max-w-full align-bottom" title={runningStage.labelPl}>
            {runningStage.labelPl}
          </span>
        </p>
      ) : null}

      <ul
        className="mt-2 flex flex-col gap-1.5 max-[767px]:gap-1"
        data-ik-live-viz-stage-list="1"
      >
        {observation.stages.map((stage) => {
          const pres = presentObservationStageStatus(stage.status);
          const isCurrent = runningId != null && stage.stageId === runningId;
          const pulse =
            stage.status === "running" && !reducedMotion
              ? pres.runningPulseClassName
              : "";
          return (
            <li
              key={stage.stageId}
              className={`flex items-center gap-2 min-h-[40px] max-[767px]:min-h-[44px] rounded-md border px-2.5 py-1.5 ${pres.className} ${
                isCurrent ? "ring-1 ring-primary/30" : ""
              }`}
              data-ik-live-viz-stage={stage.stageId}
              data-ik-live-viz-stage-status={stage.status}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${stage.labelPl}: ${pres.labelPl}`}
              title={`${stage.labelPl} — ${pres.labelPl}`}
            >
              <StageStatusIcon status={stage.status} reducedMotion={reducedMotion} />
              <span className={`${TEUX_FONT_CAPTION} font-medium truncate min-w-0 flex-1`}>
                {stage.labelPl}
              </span>
              <span
                className={`${TEUX_FONT_META} shrink-0 ${pulse}`}
                data-ik-live-viz-stage-status-label
              >
                {pres.labelPl}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ETA slot — Phase 3: null-safe placeholder only (C-ETA-FINAL) */}
      {observation.eta == null ? (
        <p
          className={`${TEUX_FONT_META} text-muted-foreground mt-2`}
          data-ik-live-viz-eta="null"
        >
          {IK_LIVE_VIZ_ETA_PLACEHOLDER_PL}
        </p>
      ) : null}

      {/* Final slot — Phase 3: empty when final === null */}
      {observation.final == null ? (
        <div data-ik-live-viz-final="null" hidden aria-hidden />
      ) : null}
    </section>
  );
}
