import { useState } from "react";
import { ChevronDown, Flame, ExternalLink } from "lucide-react";
import {
  buildStrategyDecisionsToday,
  prioritizeStrategyList,
  STRATEGY_DECISION_TOP_LIMIT,
  type StrategyDecisionTodayItem,
} from "@/lib/tender-strategy-ux";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { DECISION_LABEL_PL } from "@/lib/tenders-strategy-decision";
import type { OwnerDecisionsStore } from "@/lib/tenders-strategy-owner-decisions";

function DecisionRow({
  item,
  onOpenTender,
}: {
  item: StrategyDecisionTodayItem;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border/70 bg-secondary/20 px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug line-clamp-2">{item.title}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.bzpNumber}</p>
        </div>
        <span
          className="text-sm font-bold tabular-nums shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {item.score}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <span>System: <strong className="text-foreground">{DECISION_LABEL_PL[item.systemDecision]}</strong></span>
        {item.daysUntilDeadline != null && item.daysUntilDeadline >= 0 && (
          <span>
            Termin:{" "}
            <strong className="text-foreground">
              {item.daysUntilDeadline === 0 ? "dziś" : `${item.daysUntilDeadline} dni`}
            </strong>
          </span>
        )}
      </div>
      {onOpenTender && (
        <button
          type="button"
          onClick={() => onOpenTender(item.tenderItemId)}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline min-h-[36px]"
        >
          <ExternalLink size={11} />
          Otwórz przetarg
        </button>
      )}
    </li>
  );
}

export function StrategyDecisionsTodayPanel({
  scoredBundles,
  ownerStore,
  onOpenTender,
}: {
  scoredBundles: TenderScoringBundle[];
  ownerStore: Pick<OwnerDecisionsStore, "byId">;
  onOpenTender?: (tenderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const all = buildStrategyDecisionsToday(scoredBundles, ownerStore);
  const { top, rest, total } = prioritizeStrategyList(all, STRATEGY_DECISION_TOP_LIMIT);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Flame size={14} className="text-orange-500 shrink-0" />
          Wymaga decyzji dziś
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {total === 0 ? "Brak oczekujących decyzji" : `${total} przetargów bez Twojej decyzji`}
        </p>
      </div>
      <div className="p-4 space-y-2">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Wszystkie priorytetowe przetargi mają decyzję właściciela.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {(expanded ? all : top).map((item) => (
                <DecisionRow key={item.tenderItemId} item={item} onOpenTender={onOpenTender} />
              ))}
            </ul>
            {rest.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? "Ukryj kolejne" : `Pokaż kolejne (${rest.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
