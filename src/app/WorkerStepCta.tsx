import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { WorkerProgressStepId } from "@/lib/worker-job-progress";
import { workerProgressScrollTarget } from "@/lib/worker-job-progress";
import { scrollWorkerProgressSection } from "@/app/WorkerJobProgressFlow";
import { WgButton, WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_HOVER, WG_FOCUS_RING, WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

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
      <WgCard
        elevation="soft"
        padding="sm"
        radius="lg"
        className="border-green-500/25 bg-green-500/10 space-y-1"
      >
        <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          Dokumentacja robót kompletna
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Zdjęcia, opis prac, wymiary i obrys zostały zapisane. Inspektor może przygotować plan techniczny.
        </p>
      </WgCard>
    );
  }

  if (!nextStep || nextStep === "photos") return null;

  const cta = CTA_BY_NEXT[nextStep];
  if (!cta) return null;

  return (
    <WgButton
      type="button"
      variant="secondary"
      onClick={() => scrollWorkerProgressSection(workerProgressScrollTarget(nextStep))}
      className={cn(
        "w-full h-auto min-h-[48px] justify-between gap-3 px-4 py-3 text-left touch-manipulation",
        "border border-primary/30 bg-primary/10 hover:bg-primary/15",
        `transition-all ${WG_DURATION_HOVER}`,
        "active:scale-[0.99] motion-reduce:active:scale-100",
        WG_FOCUS_RING,
        WG_TOUCH_MIN,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-primary">{cta.title}</p>
        <p className="text-sm font-semibold text-foreground">{cta.button}</p>
      </div>
      <ArrowRight size={18} className="text-primary shrink-0" />
    </WgButton>
  );
}

export function WorkerEducationBanner() {
  return (
    <WgCard elevation="soft" padding="sm" radius="lg" className="border-blue-500/20 bg-blue-500/5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Dodaj zdjęcia, opis prac, wymiary i obrys. Inspektor przygotuje później plan techniczny.
      </p>
    </WgCard>
  );
}
