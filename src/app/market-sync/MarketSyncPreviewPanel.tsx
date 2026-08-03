/**
 * MARKET-SYNC-01 P1 — Preview + Accept (staging) + Publish (commit only).
 * P2 — History / Coverage / Templates (flag `kw-market-sync-01-p2`).
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Upload,
  FileJson,
  Store,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";
import {
  PREVIEW_BUCKET_LABEL_PL,
  clearMarketSyncStagingLocal,
  createEmptyStagingStore,
  decideProviderQuoteStatus,
  exportMarketSyncStagingJson,
  importMarketSyncStagingJson,
  isMarketSyncPublishEnabled,
  loadMarketSyncStagingLocal,
  mergeMarketProducts,
  normalizeMarketProduct,
  prepareMarketSyncPublish,
  previewFromStaging,
  refreshMarketSyncMatch,
  runMarketSyncCsvImport,
  runMarketSyncPublish,
  saveMarketSyncStagingLocal,
  setMarketProductLinkedWorkIds,
  setMarketSyncPublishEnabled,
  undoMarketSyncPublish,
  isMarketSyncP2Enabled,
  isMarketSyncP3Enabled,
  type MarketProduct,
  type MarketSyncPublishSummary,
  type MarketSyncStagingStore,
  type PreviewBucketId,
  type PreviewReport,
} from "@/lib/market-sync";
import type { MarketQuotesRollbackSnapshot } from "@/lib/work-catalog/rollback-market-quotes";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog";
import { useWorkCatalog } from "@/app/hooks/useWorkCatalog";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import { MarketSyncP2Panel } from "@/app/market-sync/MarketSyncP2Panel";
import { MarketSyncP3Panel } from "@/app/market-sync/MarketSyncP3Panel";

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
  const { store: catalogStore, works, reload: reloadCatalog } = useWorkCatalog();

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [linkDraftByProduct, setLinkDraftByProduct] = useState<Record<string, string>>({});
  const [publishEnabled, setPublishEnabled] = useState(() => isMarketSyncPublishEnabled());
  const [summary, setSummary] = useState<MarketSyncPublishSummary | null>(null);
  const [summaryReady, setSummaryReady] = useState(false);
  const [undoToken, setUndoToken] = useState<{
    snapshot: MarketQuotesRollbackSnapshot;
    quoteIds: string[];
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const p2Enabled = isMarketSyncP2Enabled();
  const p3Enabled = isMarketSyncP3Enabled();

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSummaryReady(false);
    setSummary(null);
  }, []);

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
          `Import CSV: ${result.preview.diagnostics.totalQuotes} wierszy · SyncRun ${result.syncRunId.slice(0, 12)}…`,
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
        } else if (
          parsed
          && typeof parsed === "object"
          && Array.isArray((parsed as { marketProducts?: unknown }).marketProducts)
        ) {
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
    setSelectedIds(new Set());
    setSummary(null);
    setSummaryReady(false);
    setUndoToken(null);
    setMessage("Staging wyczyszczony (local only).");
  }, []);

  const applyDecision = useCallback(
    (decision: "accepted" | "rejected" | "deferred") => {
      let next = store;
      let okCount = 0;
      for (const id of selectedIds) {
        const r = decideProviderQuoteStatus(next, id, decision);
        if (r.ok) {
          next = r.store;
          okCount += 1;
        }
      }
      const refreshed = refreshMarketSyncMatch(next);
      persist(refreshed.store, refreshed.preview);
      setSummaryReady(false);
      setSummary(null);
      setMessage(`Staging ${decision}: ${okCount} / ${selectedIds.size} (Quotes katalogu nietknięte).`);
    },
    [persist, selectedIds, store],
  );

  const onLinkWork = useCallback(
    (productId: string) => {
      const workId = (linkDraftByProduct[productId] ?? "").trim();
      if (!workId) {
        setError("Podaj workId (N:1) przed linkiem.");
        return;
      }
      const next = setMarketProductLinkedWorkIds(store, productId, [workId]);
      const refreshed = refreshMarketSyncMatch(next);
      persist(refreshed.store, refreshed.preview);
      setMessage(`Linked workId=${workId} → produkt ${productId} (staging).`);
      setSummaryReady(false);
    },
    [linkDraftByProduct, persist, store],
  );

  const onToggleKillSwitch = useCallback(() => {
    const next = !isMarketSyncPublishEnabled();
    setMarketSyncPublishEnabled(next);
    setPublishEnabled(next);
    setSummaryReady(false);
    setSummary(null);
    setMessage(
      next
        ? "Kill Switch ON — Publish możliwy (Confirm wymagany)."
        : "Kill Switch OFF — Publish zablokowany (fail-closed).",
    );
  }, []);

  const onPrepareSummary = useCallback(() => {
    setBusy(true);
    setError(null);
    try {
      const catalog = loadWorkCatalogStoreLocal();
      const ids = [...selectedIds];
      if (ids.length === 0) {
        setError("Zaznacz Accepted quotes do Publish Summary.");
        return;
      }
      const prepared = prepareMarketSyncPublish(store, {
        quoteIds: ids,
        catalog,
        region: catalog.activeRegion,
      });
      setSummary(prepared.summary);
      setSummaryReady(prepared.status === "ready");
      if (prepared.status !== "ready") {
        setError(`Summary niedostępne: ${prepared.reason ?? "blocked"}`);
      } else {
        setMessage("Publish Summary gotowe — potwierdź Confirm Publish.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd Summary");
    } finally {
      setBusy(false);
    }
  }, [selectedIds, store]);

  const onConfirmPublish = useCallback(async () => {
    if (!summaryReady || !summary?.canConfirmPublish) {
      setError("Najpierw wygeneruj Publish Summary (canConfirmPublish).");
      return;
    }
    if (!window.confirm("Confirm Publish — zapis Product Quotes przez commitMarketQuotesImport?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const catalog = loadWorkCatalogStoreLocal();
      const result = await runMarketSyncPublish(store, {
        quoteIds: [...selectedIds],
        catalog,
        region: catalog.activeRegion,
        confirmed: true,
        catalogForCapture: catalog,
      });
      const refreshed = refreshMarketSyncMatch(result.staging);
      persist(refreshed.store, refreshed.preview);
      reloadCatalog();
      if (result.status === "committed" && result.undoSnapshot) {
        setUndoToken({
          snapshot: result.undoSnapshot,
          quoteIds: result.publishedQuoteIds,
        });
        setMessage(
          `Publish OK · region ${result.commit?.region} · Undo dostępne (single).`,
        );
      } else if (result.status === "noop") {
        setMessage("Publish noop (idempotencja — brak zmian Quotes).");
      } else {
        setError(`Publish: ${result.status}${result.reason ? ` · ${result.reason}` : ""}`);
      }
      setSummaryReady(false);
      setSummary(result.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd Publish");
    } finally {
      setBusy(false);
    }
  }, [persist, reloadCatalog, selectedIds, store, summary, summaryReady]);

  const onUndo = useCallback(async () => {
    if (!undoToken) return;
    if (!window.confirm("Undo Publish (single) — przywrócić Quotes sprzed Publish?")) return;
    setBusy(true);
    setError(null);
    try {
      const current = loadWorkCatalogStoreLocal();
      const result = await undoMarketSyncPublish({
        staging: store,
        currentCatalog: current,
        snapshot: undoToken.snapshot,
        publishedQuoteIds: undoToken.quoteIds,
      });
      if (!result.ok) {
        setError(`Undo FAIL: ${result.reason ?? "unknown"}`);
        return;
      }
      const refreshed = refreshMarketSyncMatch(result.staging);
      persist(refreshed.store, refreshed.preview);
      reloadCatalog();
      setUndoToken(null);
      setMessage("Undo OK — Quotes przywrócone · staging published→accepted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd Undo");
    } finally {
      setBusy(false);
    }
  }, [persist, reloadCatalog, store, undoToken]);

  if (!isSuperAdmin) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Market Sync (P1) — tylko Super Admin.</p>
        <WgButton type="button" variant="secondary" onClick={onBack} className="mt-3">
          Wróć
        </WgButton>
      </div>
    );
  }

  const d = preview.diagnostics;
  const workOptions = works.filter((w) => w.active).slice(0, 200);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-market-sync-p1="1">
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
              Market Sync — Accept + Publish (P1)
            </h2>
            <p className="text-xs text-muted-foreground">
              Accept = staging · Publish = wyłącznie commitMarketQuotesImport · region{" "}
              {catalogStore.activeRegion}
              {p2Enabled ? " · P2 History ON" : ""}
              {p3Enabled ? " · P3 ingest ON" : ""}
            </p>
          </div>
        </div>

        {p2Enabled ? <MarketSyncP2Panel store={store} /> : null}
        {p3Enabled ? (
          <MarketSyncP3Panel
            store={store}
            busy={busy}
            actorAdminId={session?.id ?? null}
            onBusy={setBusy}
            onError={(msg) => {
              setError(msg);
              setMessage(null);
            }}
            onResult={({ store: next, preview: nextPreview, message: msg }) => {
              persist(next, nextPreview);
              setError(null);
              setMessage(msg);
              setSummaryReady(false);
              setSummary(null);
            }}
          />
        ) : null}

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

        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy || selectedIds.size === 0}
            onClick={() => applyDecision("accepted")}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Accept
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy || selectedIds.size === 0}
            onClick={() => applyDecision("rejected")}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Reject
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy || selectedIds.size === 0}
            onClick={() => applyDecision("deferred")}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Defer
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onToggleKillSwitch}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            {publishEnabled ? <ShieldCheck size={16} aria-hidden /> : <ShieldOff size={16} aria-hidden />}
            Kill Switch: {publishEnabled ? "ON" : "OFF"}
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy || selectedIds.size === 0 || !publishEnabled}
            onClick={onPrepareSummary}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Publish Summary
          </WgButton>
          <WgButton
            type="button"
            disabled={busy || !summaryReady || !summary?.canConfirmPublish}
            onClick={() => void onConfirmPublish()}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Confirm Publish
          </WgButton>
          <WgButton
            type="button"
            variant="secondary"
            disabled={busy || !undoToken}
            onClick={() => void onUndo()}
            className={cn("gap-1.5 px-3 text-sm", WG_TOUCH_MIN)}
          >
            Undo Publish
          </WgButton>
        </div>

        {summary && (
          <div
            className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
            data-market-sync-publish-summary="1"
          >
            <div className="font-medium text-foreground">Publish Summary</div>
            <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-8">
              <span>Nowe: {summary.newCount}</span>
              <span>Δ: {summary.updatedCount}</span>
              <span>Bez zmian: {summary.unchangedCount}</span>
              <span>Odrzucone: {summary.rejectedCount}</span>
              <span>Konflikt: {summary.conflictCount}</span>
              <span>LM: {summary.providers.leroy}</span>
              <span>Casto: {summary.providers.castorama}</span>
              <span>KS: {summary.killSwitchEnabled ? "ON" : "OFF"}</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              Eligible: {summary.eligibleCount} · Confirm:{" "}
              {summary.canConfirmPublish ? "TAK" : "NIE"}
            </div>
          </div>
        )}

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
          Fuzzy = {d.fuzzyAutoLinkCount} (musi 0) · Kill Switch default OFF · zapis Quotes tylko przez
          commitMarketQuotesImport · LS staging{" "}
          <code className="text-[10px]">kw-market-sync-01-staging</code>
        </p>

        <div className="mb-3 rounded-xl border border-border p-3">
          <div className="mb-2 text-xs font-medium">Link MarketProduct → workId (N:1)</div>
          <div className="flex flex-col gap-2">
            {store.marketProducts.filter((p) => p.active).slice(0, 12).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="min-w-[140px] font-mono">{p.id}</span>
                <span className="text-muted-foreground truncate max-w-[160px]">{p.canonicalName}</span>
                <span className="text-muted-foreground">
                  link: {p.linkedWorkIds[0] ?? "—"}
                </span>
                <select
                  className="min-h-9 max-w-[220px] rounded border border-border bg-background px-2"
                  value={linkDraftByProduct[p.id] ?? p.linkedWorkIds[0] ?? ""}
                  onChange={(e) =>
                    setLinkDraftByProduct((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                >
                  <option value="">— wybierz robotę —</option>
                  {workOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.id} · {w.namePl}
                    </option>
                  ))}
                </select>
                <WgButton
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onLinkWork(p.id)}
                  className={cn("px-2 text-xs", WG_TOUCH_MIN)}
                >
                  Zapisz link
                </WgButton>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[1080px] w-full border-collapse text-left text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Sel</th>
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
                  <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                    Brak wierszy — wczytaj produkty JSON i/lub import CSV.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.quote.id} className="border-t border-border/80 align-top">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.quote.id)}
                        onChange={() => toggleSelect(row.quote.id)}
                        aria-label={`Zaznacz ${row.quote.id}`}
                      />
                    </td>
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
