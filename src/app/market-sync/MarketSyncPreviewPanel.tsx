/**
 * MARKET-SYNC-01 P0 — Preview UI (staging only).
 * STOP: brak Accept / Publish / commitMarketQuotesImport.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, RefreshCw, Upload, FileJson, Store } from "lucide-react";
import {
  PREVIEW_BUCKET_LABEL_PL,
  clearMarketSyncStagingLocal,
  createEmptyStagingStore,
  exportMarketSyncStagingJson,
  importMarketSyncStagingJson,
  loadMarketSyncStagingLocal,
  mergeMarketProducts,
  normalizeMarketProduct,
  previewFromStaging,
  refreshMarketSyncMatch,
  runMarketSyncCsvImport,
  saveMarketSyncStagingLocal,
  type MarketProduct,
  type MarketSyncStagingStore,
  type PreviewBucketId,
  type PreviewReport,
} from "@/lib/market-sync";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";

type Props = {
  onBack: () => void;
};

const BUCKET_FILTERS: { id: PreviewBucketId | "all"; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "new_product", label: PREVIEW_BUCKET_LABEL_PL.new_product },
  { id: "price_change", label: PREVIEW_BUCKET_LABEL_PL.price_change },
  { id: "unmatched", label: PREVIEW_BUCKET_LABEL_PL.unmatched },
  { id: "conflict", label: PREVIEW_BUCKET_LABEL_PL.conflict },
  { id: "proposed", label: "Proponowany (status)" },
  { id: "rejected_row", label: PREVIEW_BUCKET_LABEL_PL.rejected_row },
];

function formatConfidence(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export function MarketSyncPreviewPanel({ onBack }: Props) {
  const { session } = useAdminAccess();
  const isSuperAdmin = session ? adminIsSuperAdmin(session.role) : false;

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const productsInputRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<MarketSyncStagingStore>(() => loadMarketSyncStagingLocal());
  const [preview, setPreview] = useState<PreviewReport>(() =>
    previewFromStaging(loadMarketSyncStagingLocal()),
  );
  const [bucketFilter, setBucketFilter] = useState<PreviewBucketId | "all" | "proposed_status">(
    "all",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = useCallback((next: MarketSyncStagingStore, nextPreview: PreviewReport) => {
    saveMarketSyncStagingLocal(next);
    setStore(next);
    setPreview(nextPreview);
  }, []);

  const rows = useMemo(() => {
    if (bucketFilter === "all") return preview.rows;
    if (bucketFilter === "proposed_status") {
      return preview.rows.filter((r) => r.quote.status === "proposed");
    }
    return preview.rows.filter((r) => r.bucket === bucketFilter);
  }, [preview.rows, bucketFilter]);

  const onCsvFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const text = await file.text();
        const result = runMarketSyncCsvImport(store, text, {
          actorAdminId: session?.id ?? null,
          fileName: file.name,
        });
        persist(result.store, result.preview);
        setMessage(
          `Import CSV: ${result.preview.diagnostics.totalQuotes} wierszy · SyncRun ${result.syncRunId.slice(0, 12)}… · STOP Preview (brak publish).`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd importu CSV");
      } finally {
        setBusy(false);
        if (csvInputRef.current) csvInputRef.current.value = "";
      }
    },
    [persist, session, store],
  );

  const onStagingJson = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        const text = await file.text();
        const imported = importMarketSyncStagingJson(text);
        const refreshed = refreshMarketSyncMatch(imported);
        persist(refreshed.store, refreshed.preview);
        setMessage("Wczytano staging JSON (local-first).");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd importu JSON");
      } finally {
        setBusy(false);
        if (jsonInputRef.current) jsonInputRef.current.value = "";
      }
    },
    [persist],
  );

  const onProductsJson = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        let products: MarketProduct[] = [];
        if (Array.isArray(parsed)) {
          products = parsed
            .map(normalizeMarketProduct)
            .filter((p): p is MarketProduct => p != null);
        } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { marketProducts?: unknown }).marketProducts)) {
          products = ((parsed as { marketProducts: unknown[] }).marketProducts)
            .map(normalizeMarketProduct)
            .filter((p): p is MarketProduct => p != null);
        }
        const merged = mergeMarketProducts(store, products);
        const refreshed = refreshMarketSyncMatch(merged);
        persist(refreshed.store, refreshed.preview);
        setMessage(`Dodano / zaktualizowano ${products.length} MarketProduct (staging).`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd produktów JSON");
      } finally {
        setBusy(false);
        if (productsInputRef.current) productsInputRef.current.value = "";
      }
    },
    [persist, store],
  );

  const onRefresh = useCallback(() => {
    setBusy(true);
    setError(null);
    try {
      const refreshed = refreshMarketSyncMatch(store);
      persist(refreshed.store, refreshed.preview);
      setMessage("Odświeżono Match + Preview (staging).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd refresh");
    } finally {
      setBusy(false);
    }
  }, [persist, store]);

  const onExport = useCallback(() => {
    const blob = new Blob([exportMarketSyncStagingJson(store)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-sync-01-staging-${store.updatedAt.slice(0, 10) || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Eksport JSON staging pobrany.");
  }, [store]);

  const onClear = useCallback(() => {
    if (!window.confirm("Wyczyścić lokalny staging Market Sync? (bez wpływu na Bibliotekę / Quotes)")) {
      return;
    }
    clearMarketSyncStagingLocal();
    const empty = createEmptyStagingStore();
    setStore(empty);
    setPreview(previewFromStaging(empty));
    setMessage("Staging wyczyszczony (local only).");
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Market Sync (P0) — tylko Super Admin.</p>
        <WgButton type="button" variant="secondary" onClick={onBack} className="mt-3">
          Wróć
        </WgButton>
      </div>
    );
  }

  const d = preview.diagnostics;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-market-sync-p0="1">
      <header className="shrink-0 border-b border-border px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-start gap-3">
          <WgButton
            type="button"
            variant="secondary"
            onClick={onBack}
            className={cn("shrink-0 gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            <ArrowLeft size={16} aria-hidden />
            Wróć
          </WgButton>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Store size={18} aria-hidden />
              Market Sync — Preview (P0)
            </h2>
            <p className="text-xs text-muted-foreground">
              Staging local-first · STOP przed Accept/Publish · Quotes i Work Catalog nietknięte
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => csvInputRef.current?.click()}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            <Upload size={16} aria-hidden />
            Import CSV
          </WgButton>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void onCsvFile(e.target.files?.[0] ?? null)}
          />
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => productsInputRef.current?.click()}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            <FileJson size={16} aria-hidden />
            Produkty JSON
          </WgButton>
          <input
            ref={productsInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onProductsJson(e.target.files?.[0] ?? null)}
          />
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => jsonInputRef.current?.click()}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Import staging JSON
          </WgButton>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onStagingJson(e.target.files?.[0] ?? null)}
          />
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onExport}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            <Download size={16} aria-hidden />
            Eksport JSON
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onRefresh}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            <RefreshCw size={16} aria-hidden />
            Odśwież Match
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onClear}
            className={cn("gap-1.5 px-3 text-sm text-destructive", WG_TOUCH_MIN)}
          >
            Wyczyść staging
          </WgButton>
        </div>

        {message && (
          <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ["Quote", d.totalQuotes],
            ["MP", d.activeProducts],
            ["Proposed", d.proposed],
            ["Unmatched", d.unmatched],
            ["Konflikt", d.conflict],
            ["Δ ceny", d.priceChanges],
            ["Nowe", d.newProducts],
            ["Fuzzy", d.fuzzyAutoLinkCount],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-center"
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="text-sm font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {BUCKET_FILTERS.map((b) => {
            const active =
              b.id === "proposed"
                ? bucketFilter === "proposed_status"
                : bucketFilter === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  setBucketFilter(b.id === "proposed" ? "proposed_status" : b.id)
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  WG_TOUCH_MIN,
                  active
                    ? "border-violet-500 bg-violet-500/15 text-violet-900 dark:text-violet-100"
                    : "border-border text-muted-foreground",
                )}
              >
                {b.label}
                {b.id !== "all" && b.id !== "proposed"
                  ? ` (${preview.counts[b.id] ?? 0})`
                  : b.id === "proposed"
                    ? ` (${d.proposed})`
                    : ""}
              </button>
            );
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4">
        <p className="mb-2 text-[11px] text-muted-foreground">
          Diagnostyka: fuzzy auto-link = {d.fuzzyAutoLinkCount} (musi być 0) · commit/publish = niedostępne w P0 ·
          klucz LS <code className="text-[10px]">{store.updatedAt ? "kw-market-sync-01-staging" : "—"}</code>
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[960px] w-full border-collapse text-left text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Bucket</th>
                <th className="px-2 py-2">Provider</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">EAN</th>
                <th className="px-2 py-2">Nazwa feed</th>
                <th className="px-2 py-2">canonicalName</th>
                <th className="px-2 py-2">Jm</th>
                <th className="px-2 py-2">grossPrice</th>
                <th className="px-2 py-2">Confidence</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                    Brak wierszy — wczytaj produkty JSON i/lub import CSV.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.quote.id} className="border-t border-border/80 align-top">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {PREVIEW_BUCKET_LABEL_PL[row.bucket]}
                    </td>
                    <td className="px-2 py-2">{row.quote.provider}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{row.quote.providerSku || "—"}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{row.quote.ean || "—"}</td>
                    <td className="px-2 py-2 max-w-[180px] truncate" title={row.quote.productName}>
                      {row.quote.productName}
                    </td>
                    <td className="px-2 py-2 max-w-[160px] truncate" title={row.canonicalName ?? ""}>
                      {row.canonicalName ?? "—"}
                    </td>
                    <td className="px-2 py-2">{row.quote.unit || row.quote.unitRaw || "—"}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {row.quote.grossPrice.toFixed(2)} {row.quote.currency}
                      {row.priceDelta != null && Math.abs(row.priceDelta) >= 0.01 ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          ({row.priceDelta > 0 ? "+" : ""}
                          {row.priceDelta.toFixed(2)})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatConfidence(row.quote.matchConfidence)}
                    </td>
                    <td className="px-2 py-2">{row.quote.matchMethod ?? "—"}</td>
                    <td className="px-2 py-2">
                      {row.quote.status}
                      {row.quote.status === "conflict" && row.quote.matchCandidates.length > 0 ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {row.quote.matchCandidates
                            .map((c) => `${c.marketProductId.slice(0, 10)}…/${c.method}`)
                            .join(", ")}
                        </div>
                      ) : null}
                      {row.quote.rejectReason ? (
                        <div className="text-[10px] text-destructive">{row.quote.rejectReason}</div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
