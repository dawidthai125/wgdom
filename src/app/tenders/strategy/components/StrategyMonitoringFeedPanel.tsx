import { useState } from "react";
import { ChevronDown, Megaphone, ExternalLink } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildStrategyMonitoringFeed,
  prioritizeStrategyList,
  strategyMonitoringKindEmoji,
  STRATEGY_MONITORING_TOP_LIMIT,
  type StrategyMonitoringFeedItem,
} from "@/lib/tender-strategy-ux";
import { formatRelativeChangeTime } from "@/lib/tender-change-monitor";

function FeedRow({
  item,
  onOpenTender,
}: {
  item: StrategyMonitoringFeedItem;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border/70 bg-secondary/20 px-3 py-2.5 space-y-1">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-sm" aria-hidden>{strategyMonitoringKindEmoji(item.kind)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug line-clamp-1">{item.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.summary}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            {item.bzpNumber} · {formatRelativeChangeTime(item.at)}
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

export function StrategyMonitoringFeedPanel({
  items,
  onOpenTender,
}: {
  items: TenderPipelineItem[];
  onOpenTender?: (tenderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const all = buildStrategyMonitoringFeed(items);
  const { top, rest, total } = prioritizeStrategyList(all, STRATEGY_MONITORING_TOP_LIMIT);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden" data-testid="strategy-monitoring-feed">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Megaphone size={14} className="text-primary shrink-0" />
          Monitoring
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Jeden feed: zmiany · Q&A · dokumenty · terminy
        </p>
      </div>
      <div className="p-4 space-y-2">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Brak sygnałów z ostatnich 7 dni.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(expanded ? all : top).map((item) => (
                <FeedRow key={item.id} item={item} onOpenTender={onOpenTender} />
              ))}
            </ul>
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
