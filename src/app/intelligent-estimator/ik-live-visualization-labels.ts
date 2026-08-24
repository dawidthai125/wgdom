/**
 * IK Live Visualization — presentation-only status labels (Phase 3).
 * NOT a runtime status enum — maps canonical ObservationStageStatus → UI copy/classes.
 */

import type { ObservationStageStatus } from "@/lib/intelligent-estimator/analysis-observation";

export type IkLiveVizStatusPresentation = {
  labelPl: string;
  className: string;
  /** Extra classes for running pulse — apply only when motion-safe. */
  runningPulseClassName: string;
};

const PRESENTATION: Record<ObservationStageStatus, IkLiveVizStatusPresentation> = {
  pending: {
    labelPl: "Oczekuje",
    className: "border-border/40 bg-muted/10 text-muted-foreground opacity-80",
    runningPulseClassName: "",
  },
  running: {
    labelPl: "W toku",
    className: "border-primary/50 bg-primary/5 text-foreground",
    runningPulseClassName: "motion-safe:animate-pulse",
  },
  done: {
    labelPl: "Gotowe",
    className: "border-border/50 bg-background/40 text-foreground",
    runningPulseClassName: "",
  },
  partial: {
    labelPl: "Częściowo",
    className: "border-amber-500/40 bg-amber-500/5 text-foreground",
    runningPulseClassName: "",
  },
  hold: {
    labelPl: "HOLD / Wstrzymane",
    className: "border-amber-500/40 bg-amber-500/5 text-foreground",
    runningPulseClassName: "",
  },
  blocked: {
    labelPl: "Zablokowane",
    className: "border-destructive/40 bg-destructive/5 text-foreground",
    runningPulseClassName: "",
  },
  failed: {
    labelPl: "Niekompletne",
    className: "border-destructive/40 bg-destructive/5 text-muted-foreground",
    runningPulseClassName: "",
  },
};

export function presentObservationStageStatus(
  status: ObservationStageStatus,
): IkLiveVizStatusPresentation {
  return PRESENTATION[status];
}

export function labelObservationOverallStatusPl(
  status: ObservationStageStatus,
): string {
  return PRESENTATION[status].labelPl;
}

export const IK_LIVE_VIZ_ETA_PLACEHOLDER_PL = "Szacowanie czasu…";
export const IK_LIVE_VIZ_NO_ACTIVE_STAGES_PL = "Brak aktywnych etapów";
export const IK_LIVE_VIZ_PROGRESS_LABEL_PL = "Postęp analizy IK";
export const IK_LIVE_VIZ_ACTIVE_STAGE_LABEL_PL = "Aktualny etap";
