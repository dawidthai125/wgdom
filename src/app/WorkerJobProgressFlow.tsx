import { Check } from "lucide-react";
import type { WorkerProgressStep } from "@/lib/worker-job-progress";
import { WgButton, WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_TOUCH_MIN,
  WG_TYPE_LABEL,
} from "@/lib/wg-ui-tokens";

function scrollToSection(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function WorkerJobProgressFlow({ steps }: { steps: WorkerProgressStep[] }) {
  return (
    <WgCard elevation="soft" padding="sm" radius="lg" className="px-3 py-3">
      <p className={cn(WG_TYPE_LABEL, "mb-2.5 px-1")}>Postęp dokumentacji</p>
      <div className="grid grid-cols-2 gap-2">
        {steps.map((step) => (
          <WgButton
            key={step.id}
            type="button"
            variant="ghost"
            onClick={() => scrollToSection(step.scrollTargetId)}
            className={cn(
              "flex items-center justify-start gap-2 h-auto min-h-[44px] px-3 py-2.5 text-left text-sm font-medium touch-manipulation",
              `transition-colors ${WG_DURATION_HOVER}`,
              WG_FOCUS_RING,
              WG_TOUCH_MIN,
              step.done
                ? "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/15"
                : "border border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                step.done
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "border-border text-muted-foreground",
              )}
            >
              {step.done ? <Check size={12} strokeWidth={3} /> : ""}
            </span>
            <span className="truncate">{step.label}</span>
          </WgButton>
        ))}
      </div>
    </WgCard>
  );
}

export { scrollToSection as scrollWorkerProgressSection };
