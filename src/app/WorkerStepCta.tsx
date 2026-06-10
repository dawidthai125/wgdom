import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { WorkerProgressStepId } from "@/lib/worker-job-progress";
import { workerProgressScrollTarget } from "@/lib/worker-job-progress";
import { scrollWorkerProgressSection } from "@/app/WorkerJobProgressFlow";

const CTA_BY_NEXT: Record<
  Exclude<WorkerProgressStepId, "photos">,
  { title: string; button: string }
> = {
  documentation: {
    title: "Zdjęcia ukończone",
    button: "Przejdź do dokumentacji",
  },
  dimensions: {
    title: "Dokumentacja ukończona",
    button: "Dodaj wymiary",
  },
  sketch: {
    title: "Wymiary ukończone",
    button: "Dodaj obrys",
  },
};

export function WorkerStepCta({
  allComplete,
  nextStep,
  mode = "action",
}: {
  allComplete: boolean;
  nextStep: WorkerProgressStepId | null;
  mode?: "action" | "complete";
}) {
  if (mode === "action" && allComplete) return null;
  if (mode === "complete" && !allComplete) return null;

  if (allComplete) {
    return (
      <div className="bg-green-500/10 border border-green-500/25 rounded-2xl px-4 py-3.5 space-y-1">
        <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          Dokumentacja robót kompletna
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Zdjęcia, opis prac, wymiary i obrys zostały zapisane. Inspektor może przygotować plan techniczny.
        </p>
      </div>
    );
  }

  if (!nextStep || nextStep === "photos") return null;

  const cta = CTA_BY_NEXT[nextStep];
  if (!cta) return null;

  return (
    <button
      type="button"
      onClick={() => scrollWorkerProgressSection(workerProgressScrollTarget(nextStep))}
      className="w-full flex items-center justify-between gap-3 min-h-[48px] px-4 py-3 rounded-2xl border border-primary/30 bg-primary/10 text-left touch-manipulation active:scale-[0.99] transition-all"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-primary">{cta.title}</p>
        <p className="text-sm font-semibold text-foreground">{cta.button}</p>
      </div>
      <ArrowRight size={18} className="text-primary shrink-0" />
    </button>
  );
}

export function WorkerEducationBanner() {
  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl px-4 py-3.5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Dodaj zdjęcia, opis prac, wymiary i obrys. Inspektor przygotuje później plan techniczny.
      </p>
    </div>
  );
}
