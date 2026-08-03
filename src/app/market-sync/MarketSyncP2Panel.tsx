/**
 * MARKET-SYNC-01 P2 — Coverage · Timeline · Templates (flag-gated host).
 */

import { useMemo, useState } from "react";
import {
  buildMarketSyncCoverageView,
  buildMarketSyncProviderTemplateCsv,
  computeHistoryDeltaPct,
  isPriceAlert,
  listHistoryForProductProvider,
  MARKET_SYNC_P2_TEMPLATE_PROVIDERS,
  PRICE_ALERT_PCT,
  type MarketSyncStagingStore,
  type ProviderId,
} from "@/lib/market-sync";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

export function MarketSyncP2Panel({ store }: { store: MarketSyncStagingStore }) {
  const coverage = useMemo(() => buildMarketSyncCoverageView(store), [store]);
  const [timelineKey, setTimelineKey] = useState<string | null>(null);

  const rings = useMemo(() => {
    const map = new Map<string, { mpId: string; providerId: ProviderId; name: string }>();
    for (const e of store.priceHistory ?? []) {
      const key = `${e.marketProductId}::${e.providerId}`;
      if (map.has(key)) continue;
      const product = store.marketProducts.find((p) => p.id === e.marketProductId);
      map.set(key, {
        mpId: e.marketProductId,
        providerId: e.providerId,
        name: product?.canonicalName ?? e.marketProductId,
      });
    }
    return [...map.entries()];
  }, [store]);

  const timeline = useMemo(() => {
    if (!timelineKey) return [];
    const sep = timelineKey.indexOf("::");
    const mpId = timelineKey.slice(0, sep);
    const providerId = timelineKey.slice(sep + 2) as ProviderId;
    return listHistoryForProductProvider(store, mpId, providerId);
  }, [store, timelineKey]);

  return (
    <section
      className="mt-3 space-y-3 rounded-lg border border-border bg-background/60 p-3"
      data-market-sync-p2="1"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">P2 — Historia · Coverage (RO)</h3>
        <p className="text-xs text-muted-foreground">
          Cap 24 · alert Δ≥{PRICE_ALERT_PCT}% (informacyjny) · bez scrapera · bez full sync
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-market-sync-p2-coverage
      >
        <Chip label="Produkty" value={String(coverage.productCount)} />
        <Chip label="Quotes" value={String(coverage.quoteCount)} />
        <Chip label="Accepted" value={String(coverage.acceptedCount)} />
        <Chip label="Published" value={String(coverage.publishedCount)} />
        <Chip label="Linked N:1" value={String(coverage.linkedProductCount)} />
        <Chip label="History" value={String(coverage.historyEntryCount)} />
        <Chip label="Ringi" value={String(coverage.productsWithHistory)} />
        <Chip label="Alerty Δ%" value={String(coverage.alertCount)} />
      </div>

      <div className="space-y-2" data-market-sync-p2-timeline>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Timeline
        </p>
        {rings.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Brak historii — Accept przy fladze P2 ON zapisuje punkty.
          </p>
        ) : (
          <ul className="space-y-1">
            {rings.map(([key, meta]) => (
              <li key={key}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md border border-border/70 px-2.5 py-2 text-left text-sm",
                    WG_TOUCH_MIN,
                    timelineKey === key ? "bg-secondary/40" : "hover:bg-secondary/20",
                  )}
                  onClick={() => setTimelineKey((k) => (k === key ? null : key))}
                  data-market-sync-p2-ring={key}
                >
                  <span className="font-medium text-foreground">{meta.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{meta.providerId}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {timeline.length > 0 ? (
          <ol className="space-y-1 border-l border-border pl-3">
            {timeline.map((e, idx) => {
              const prev = idx > 0 ? timeline[idx - 1]! : null;
              const delta = computeHistoryDeltaPct(e.pricePln, prev?.pricePln);
              const alert = isPriceAlert(delta);
              return (
                <li key={e.id} className="text-xs text-foreground" data-market-sync-p2-point={e.id}>
                  <span className="font-mono">{e.pricePln.toFixed(2)} PLN</span>
                  <span className="ml-2 text-muted-foreground">{e.at.slice(0, 19)}</span>
                  {delta != null ? (
                    <span className={cn("ml-2", alert && "font-semibold text-amber-700 dark:text-amber-400")}>
                      Δ {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}%{alert ? " · alert" : ""}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <div className="space-y-2" data-market-sync-p2-templates>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Szablony CSV (stub)
        </p>
        <div className="flex flex-wrap gap-2">
          {MARKET_SYNC_P2_TEMPLATE_PROVIDERS.map((p) => (
            <WgButton
              key={p}
              type="button"
              variant="secondary"
              className={cn("px-3 text-sm", WG_TOUCH_MIN)}
              onClick={() => {
                const csv = buildMarketSyncProviderTemplateCsv(p);
                void navigator.clipboard?.writeText(csv);
              }}
              data-market-sync-p2-template={p}
            >
              Kopiuj stub {p}
            </WgButton>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
