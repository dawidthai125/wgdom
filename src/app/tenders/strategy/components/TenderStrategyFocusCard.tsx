import { useEffect, useRef } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import type { TenderPortfolioPositionView } from "@/lib/tender-strategy-ux";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

/** NG-03.6 — kontekst przetargu po przejściu z detalu (highlight tenderId). */
export function TenderStrategyFocusCard({
  item,
  position,
  onOpenTender,
  onDismiss,
}: {
  item: TenderPipelineItem;
  position: TenderPortfolioPositionView;
  onOpenTender: () => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section
      ref={ref}
      id={`strategy-focus-${item.id}`}
      className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 space-y-2"
      data-tender-strategy-focus
      data-tender-id={item.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase size={16} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Kontekst przetargu
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mt-0.5">
              {item.title}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {position.systemDecisionLabel}
              {position.ownerDecisionLabel ? ` · Twoja: ${position.ownerDecisionLabel}` : ""}
              {" · "}score {position.score}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 px-2 py-1"
        >
          Zamknij
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenTender}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[44px] sm:min-h-0"
      >
        <ArrowLeft size={14} />
        Wróć do przetargu
      </button>
    </section>
  );
}
