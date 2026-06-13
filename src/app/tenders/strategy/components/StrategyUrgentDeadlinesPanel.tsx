import { useState } from "react";
import { ChevronDown, Clock, ExternalLink } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildStrategyUrgentDeadlines,
  prioritizeStrategyList,
  strategyUrgentTierEmoji,
  STRATEGY_URGENT_TOP_LIMIT,
  type StrategyUrgentDeadlineItem,
} from "@/lib/tender-strategy-ux";

function DeadlineRow({
  item,
  onOpenTender,
}: {
  item: StrategyUrgentDeadlineItem;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border/70 bg-secondary/20 px-3 py-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-sm" aria-hidden>{strategyUrgentTierEmoji(item.tier)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug line-clamp-2">{item.title}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.bzpNumber}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {item.daysUntil === 0 ? "Termin dziś" : item.daysUntil === 1 ? "Termin jutro" : `Termin za ${item.daysUntil} dni`}
            {item.tier === "critical" ? " · ≤3 dni" : " · ≤7 dni"}
          </p>
        </div>
      </div>
      {onOpenTender && (
        <button
          type="button"
          onClick={() => onOpenTender(item.tenderItemId)}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline min-h-[36px] ml-6"
        >
          <ExternalLink size={11} />
          Otwórz przetarg
        </button>
      )}
    </li>
  );
}

function DeadlineGroup({
  title,
  items,
  onOpenTender,
}: {
  title: string;
  items: StrategyUrgentDeadlineItem[];
  onOpenTender?: (tenderId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <DeadlineRow key={item.tenderItemId} item={item} onOpenTender={onOpenTender} />
        ))}
      </ul>
    </div>
  );
}

export function StrategyUrgentDeadlinesPanel({
  items,
  onOpenTender,
}: {
  items: TenderPipelineItem[];
  onOpenTender?: (tenderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const all = buildStrategyUrgentDeadlines(items);
  const { top, rest, total } = prioritizeStrategyList(all, STRATEGY_URGENT_TOP_LIMIT);
  const visible = expanded ? all : top;
  const critical = visible.filter((i) => i.tier === "critical");
  const urgent = visible.filter((i) => i.tier === "urgent");

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Clock size={14} className="text-amber-500 shrink-0" />
          Termin pilny
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {total === 0 ? "Brak pilnych terminów" : `${total} postępowań · TOP ${Math.min(STRATEGY_URGENT_TOP_LIMIT, total)}`}
        </p>
      </div>
      <div className="p-4 space-y-3">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Brak terminów składania w ciągu 7 dni.</p>
        ) : (
          <>
            <DeadlineGroup title="≤3 dni" items={critical} onOpenTender={onOpenTender} />
            <DeadlineGroup title="≤7 dni" items={urgent} onOpenTender={onOpenTender} />
            {rest.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? "Ukryj pozostałe" : `Pokaż pozostałe (${rest.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
