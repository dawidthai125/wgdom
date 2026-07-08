import { ArrowRight, Briefcase, Target } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { TenderMonitoringBanner } from "@/app/TenderMonitoringBanner";
import type { TenderPortfolioPositionView } from "@/lib/tender-strategy-ux";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";

function decisionBadgeClass(decision: TenderDecision): string {
  switch (decision) {
    case "GO":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "HOLD":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "NO-GO":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25";
  }
}

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/** NG-03.6 — Portfolio Position w workspace Przetarg (bridge → Strategia). */
export function TenderPortfolioPositionPanel({
  item,
  position,
  onOpenStrategy,
}: {
  item: TenderPipelineItem;
  position: TenderPortfolioPositionView;
  onOpenStrategy: (tenderId: string) => void;
}) {
  const effectiveDecision = position.ownerDecision ?? position.systemDecision;
  const effectiveLabel = position.ownerDecisionLabel ?? position.systemDecisionLabel;

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden transition-shadow duration-150"
      data-tender-portfolio-position
      aria-labelledby="tender-portfolio-position-heading"
    >
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase size={14} className="text-primary shrink-0" aria-hidden />
          <h2 id="tender-portfolio-position-heading" className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Pozycja w portfolio
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onOpenStrategy(item.id)}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline shrink-0 min-h-[44px] lg:min-h-0 px-2 touch-manipulation transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Otwórz ten przetarg w module Strategia — po powrocie zostaniesz w tym samym przetargu"
        >
          Strategia
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Target size={16} className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Rekomendacja systemu
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span
                  className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md border ${decisionBadgeClass(position.systemDecision)}`}
                >
                  {position.systemDecisionLabel}
                </span>
                {position.ownerDecision && position.ownerDecisionLabel && (
                  <span className="text-[10px] text-muted-foreground">
                    Twoja: <strong className="text-foreground">{position.ownerDecisionLabel}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Score
            </p>
            <p className={`text-lg font-bold tabular-nums ${scoreTone(position.score)}`}>
              {position.score}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
          <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
            <dt className="text-muted-foreground">Termin</dt>
            <dd className="font-medium text-foreground mt-0.5">{position.deadlineLabel}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
            <dt className="text-muted-foreground">Efektywna decyzja</dt>
            <dd className="font-medium text-foreground mt-0.5">{effectiveLabel}</dd>
          </div>
          {position.portfolioRank != null && position.totalRanked > 0 && (
            <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2 col-span-2 sm:col-span-1">
              <dt className="text-muted-foreground">Ranking portfolio</dt>
              <dd className="font-medium text-foreground mt-0.5 tabular-nums">
                #{position.portfolioRank} / {position.totalRanked}
              </dd>
            </div>
          )}
        </dl>

        {position.topReasons.length > 0 && (
          <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4">
            {position.topReasons.map((r) => (
              <li key={r} className="break-words">{r}</li>
            ))}
          </ul>
        )}

        <TenderMonitoringBanner
          item={item}
          onOpenStrategy={() => onOpenStrategy(item.id)}
          compact
        />
      </div>
    </section>
  );
}
