/**
 * MARKET-SYNC-01 P3 — thin CTA mock ingest (flag-gated).
 * Legal Gate PASS (OWNER-LEGAL-PASS-07) · live HTTP adapter brak · mock only · bez cron.
 */

import {
  MARKET_SYNC_P3_DEFAULT_PROVIDER,
  MARKET_SYNC_P3_LEGAL_GATE,
  runMarketSyncP3Ingest,
  type MarketSyncStagingStore,
  type PreviewReport,
} from "@/lib/market-sync";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

type Props = {
  store: MarketSyncStagingStore;
  busy: boolean;
  actorAdminId: string | null;
  onResult: (next: {
    store: MarketSyncStagingStore;
    preview: PreviewReport;
    message: string;
  }) => void;
  onError: (msg: string) => void;
  onBusy: (busy: boolean) => void;
};

export function MarketSyncP3Panel({
  store,
  busy,
  actorAdminId,
  onResult,
  onError,
  onBusy,
}: Props) {
  const onMockIngest = () => {
    onBusy(true);
    try {
      const result = runMarketSyncP3Ingest(store, {
        providerId: MARKET_SYNC_P3_DEFAULT_PROVIDER,
        allowLiveNetwork: false,
        actorAdminId,
      });
      if (!result.ok || !result.preview) {
        onError(result.errors.join(" · ") || "P3 ingest FAIL");
        return;
      }
      onResult({
        store: result.store,
        preview: result.preview,
        message: `P3 mock ingest (${MARKET_SYNC_P3_DEFAULT_PROVIDER}): ${result.preview.diagnostics.totalQuotes} wierszy → Preview · SyncRun ${result.syncRunId?.slice(0, 12) ?? "—"}… · bez Publish`,
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Błąd P3 ingest");
    } finally {
      onBusy(false);
    }
  };

  return (
    <section
      className="mt-3 space-y-2 rounded-lg border border-border bg-background/60 p-3"
      data-market-sync-p3="1"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">P3 — Ingest (mock)</h3>
        <p className="text-xs text-muted-foreground">
          Jedyny adapter: mock · provider <strong>{MARKET_SYNC_P3_DEFAULT_PROVIDER}</strong> ·
          Legal Gate <strong>{MARKET_SYNC_P3_LEGAL_GATE}</strong> — live HTTP adapter brak · bez
          auto-publish · bez cron
        </p>
      </div>
      <WgButton
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={onMockIngest}
        className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
        data-market-sync-p3-mock-cta
      >
        Pobierz (P3 / mock)
      </WgButton>
    </section>
  );
}
