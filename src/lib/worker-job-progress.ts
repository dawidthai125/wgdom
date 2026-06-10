import type { PhotoEntry, WorkerJobReport } from "@/app/app-domain";
import { roomHasContent } from "@/app/app-domain";
import { reportHasWorkScope } from "@/lib/work-scope-text";

export type WorkerProgressStepId = "photos" | "documentation" | "dimensions" | "sketch";

export type WorkerProgressStep = {
  id: WorkerProgressStepId;
  label: string;
  done: boolean;
  scrollTargetId: string;
};

export type WorkerJobProgress = {
  steps: WorkerProgressStep[];
  allComplete: boolean;
  nextStep: WorkerProgressStepId | null;
};

const STEP_ORDER: WorkerProgressStepId[] = ["photos", "documentation", "dimensions", "sketch"];

const STEP_META: Record<WorkerProgressStepId, { label: string; scrollTargetId: string }> = {
  photos: { label: "Zdjęcia", scrollTargetId: "worker-section-photos" },
  documentation: { label: "Dokumentacja", scrollTargetId: "worker-section-documentation" },
  dimensions: { label: "Wymiary", scrollTargetId: "worker-section-dimensions" },
  sketch: { label: "Obrys", scrollTargetId: "worker-section-sketch" },
};

function reportHasSketch(report: WorkerJobReport): boolean {
  return Boolean(report.sketch?.publicUrl || report.sketch?.path);
}

function reportHasDimensions(report: WorkerJobReport): boolean {
  return (report.rooms || []).some(roomHasContent);
}

export function computeWorkerJobProgress(
  myPhotos: PhotoEntry[],
  myReports: WorkerJobReport[],
): WorkerJobProgress {
  const doneByStep: Record<WorkerProgressStepId, boolean> = {
    photos: myPhotos.length > 0,
    documentation: myReports.some(reportHasWorkScope),
    dimensions: myReports.some(reportHasDimensions),
    sketch: myReports.some(reportHasSketch),
  };

  const steps: WorkerProgressStep[] = STEP_ORDER.map((id) => ({
    id,
    label: STEP_META[id].label,
    done: doneByStep[id],
    scrollTargetId: STEP_META[id].scrollTargetId,
  }));

  const allComplete = steps.every((s) => s.done);
  const nextStep = allComplete ? null : (STEP_ORDER.find((id) => !doneByStep[id]) ?? null);

  return { steps, allComplete, nextStep };
}

export function workerProgressScrollTarget(stepId: WorkerProgressStepId): string {
  return STEP_META[stepId].scrollTargetId;
}
