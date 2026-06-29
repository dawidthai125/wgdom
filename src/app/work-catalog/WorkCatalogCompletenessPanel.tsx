import type { TradeId } from "@/lib/work-catalog";
import type { LibraryCompletenessSummary } from "@/app/work-catalog/work-catalog-completeness";

type Props = {
  summary: LibraryCompletenessSummary;
  selectedTradeId: TradeId | "all";
  onTradeSelect: (tradeId: TradeId | "all") => void;
};

export function WorkCatalogCompletenessPanel({
  summary,
  selectedTradeId,
  onTradeSelect,
}: Props) {
  if (summary.totalCount === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">Uzupełniono:</p>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span aria-hidden>{summary.statusEmoji}</span>
          <span>{summary.percent}%</span>
        </p>
        <p className="w-full text-xs text-muted-foreground">
          {summary.pricedCount} z {summary.totalCount} robót ma cenę firmy
        </p>
      </div>

      {summary.trades.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Branże</p>
          <ul className="flex flex-col gap-1.5" aria-label="Kompletność branż">
            {summary.trades.map((trade) => {
              const selected = selectedTradeId === trade.tradeId;
              return (
                <li key={trade.tradeId}>
                  <button
                    type="button"
                    onClick={() =>
                      onTradeSelect(selected ? "all" : trade.tradeId)
                    }
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-muted/60"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-base leading-none" aria-hidden>
                        {trade.statusEmoji}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {trade.labelPl}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {trade.pricedCount} / {trade.totalCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
