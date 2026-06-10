import { Check } from "lucide-react";
import type { WorkerProgressStep } from "@/lib/worker-job-progress";

function scrollToSection(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function WorkerJobProgressFlow({ steps }: { steps: WorkerProgressStep[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-3 py-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
        Postęp dokumentacji
      </p>
      <div className="grid grid-cols-2 gap-2">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollToSection(step.scrollTargetId)}
            className={`flex items-center gap-2 min-h-[44px] px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors touch-manipulation ${
              step.done
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            <span
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                step.done
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              {step.done ? <Check size={12} strokeWidth={3} /> : ""}
            </span>
            <span className="truncate">{step.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { scrollToSection as scrollWorkerProgressSection };
