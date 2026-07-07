import { Loader2 } from "lucide-react";
import {
  tenderParserLoadingSteps,
  type TenderParserLoadingStep,
} from "@/app/tenders/loading/tender-loading-step-label";
import { TEUX5_SKELETON } from "@/app/tenders/loading/TenderUxSkeleton";

export function TenderParserSteppedLabel({ step }: { step: TenderParserLoadingStep }) {
  const steps = tenderParserLoadingSteps();
  const activeIdx = steps.findIndex((s) => s.id === step);

  return (
    <p
      className={`text-[10px] text-muted-foreground flex flex-wrap items-center ${TEUX5_SKELETON.gapSm}`}
      data-teux5-parser-stepped-label
      data-teux5-parser-step={step}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={11} className="animate-spin shrink-0" aria-hidden />
      {steps.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-1">
          {i > 0 && <span className="opacity-50" aria-hidden>→</span>}
          <span
            className={
              i === activeIdx
                ? "font-semibold text-foreground"
                : i < activeIdx
                  ? "text-foreground/70"
                  : "opacity-60"
            }
          >
            {s.label}
          </span>
        </span>
      ))}
    </p>
  );
}
