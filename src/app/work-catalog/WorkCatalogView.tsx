import { useCallback, useMemo, useState } from "react";
import { Search, Library, X, FileSpreadsheet, Store } from "lucide-react";
import { tradeLabelPl, type TradeId } from "@/lib/work-catalog";
import { useWorkCatalog } from "@/app/hooks/useWorkCatalog";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import { WorkCatalogWorkRow } from "@/app/work-catalog/WorkCatalogWorkRow";
import { WorkCatalogBulkEditBar } from "@/app/work-catalog/WorkCatalogBulkEditBar";
import { WorkCatalogBulkPreviewModal } from "@/app/work-catalog/WorkCatalogBulkPreviewModal";
import { MarketSyncPreviewPanel } from "@/app/market-sync/MarketSyncPreviewPanel";
import {
  computeBulkPricePreview,
  previewToPriceMap,
  validateBulkOperationValue,
  type BulkPriceOperationKind,
  type BulkPricePreviewRow,
} from "@/app/work-catalog/work-catalog-bulk-price";
import {
  DEFAULT_WORK_CATALOG_LIST_FILTERS,
  countFilteredWorkCatalogList,
  filterWorkCatalogList,
  type WorkCatalogActiveFilter,
  type WorkCatalogFavoriteFilter,
  type WorkCatalogListFilters,
} from "@/app/work-catalog/work-catalog-list";
import { computeLibraryCompleteness } from "@/app/work-catalog/work-catalog-completeness";
import { WorkCatalogCompletenessPanel } from "@/app/work-catalog/WorkCatalogCompletenessPanel";
import { WorkCatalogBundlesPanel } from "@/app/work-catalog/WorkCatalogBundlesPanel";
import { WorkCatalogCsvImportPreviewPanel } from "@/app/work-catalog/WorkCatalogCsvImportPreviewPanel";
import { computeMarketCoverageSummary } from "@/app/work-catalog/work-catalog-market-coverage";
import { WorkCatalogMarketCoveragePanel } from "@/app/work-catalog/WorkCatalogMarketCoveragePanel";
import { isWcP33MarketPricingUxEnabled } from "@/lib/wc-p33-flag";
import { CATALOG_UX_WORK_CATALOG_TAB_LABEL } from "@/lib/tender-catalog-ux-labels";
import { WgButton, WgField } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_DURATION_ENTER, WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

export type WorkCatalogLayout = "standalone" | "embedded";
export type WorkCatalogSection = "works" | "bundles";

const SECTION_OPTIONS: { id: WorkCatalogSection; label: string }[] = [
  { id: "works", label: "Roboty" },
  { id: "bundles", label: "Pakiety" },
];

const ACTIVE_FILTER_OPTIONS: { id: WorkCatalogActiveFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "active", label: "Aktywne" },
  { id: "inactive", label: "Nieaktywne" },
];

const FAVORITE_FILTER_OPTIONS: { id: WorkCatalogFavoriteFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "favorites", label: "Ulubione" },
];

/** Clearance below last row when bulk bar is sticky (embedded single-scroll). */
const EMBEDDED_LIST_PAD_BULK =
  "pb-[calc(11rem+env(safe-area-inset-bottom))] max-md:pb-[calc(11rem+3.5rem+env(safe-area-inset-bottom))]";

type WorkCatalogViewProps = {
  layout?: WorkCatalogLayout;
};

export function WorkCatalogView({ layout = "standalone" }: WorkCatalogViewProps) {
  const isEmbedded = layout === "embedded";
  const [section, setSection] = useState<WorkCatalogSection>("works");
  const p33Enabled = isWcP33MarketPricingUxEnabled();
  const [showMarketCsvImport, setShowMarketCsvImport] = useState(false);
  const [showMarketSyncP0, setShowMarketSyncP0] = useState(false);
  const { session } = useAdminAccess();
  const isSuperAdmin = session ? adminIsSuperAdmin(session.role) : false;

  const {
    store,
    works,
    totalCount,
    tradesOrder,
    regionLabel,
    reload,
    updateCompanyPrice,
    updateWorkActive,
    toggleWorkFavorite,
    updateBulkCompanyPrices,
  } = useWorkCatalog();
  const [filters, setFilters] = useState<WorkCatalogListFilters>(DEFAULT_WORK_CATALOG_LIST_FILTERS);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<BulkPricePreviewRow[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filteredWorks = useMemo(
    () => filterWorkCatalogList(works, filters),
    [works, filters],
  );

  const counts = useMemo(
    () => countFilteredWorkCatalogList(works, filteredWorks),
    [works, filteredWorks],
  );

  const completeness = useMemo(
    () => computeLibraryCompleteness(works, tradesOrder),
    [works, tradesOrder],
  );

  const marketCoverage = useMemo(
    () =>
      p33Enabled
        ? computeMarketCoverageSummary(works, store.activeRegion)
        : null,
    [p33Enabled, works, store.activeRegion],
  );

  const workNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of works) map.set(w.id, w.namePl);
    return map;
  }, [works]);

  const handleTradeCompletenessSelect = useCallback((tradeId: TradeId | "all") => {
    setFilters((prev) => ({ ...prev, tradeId }));
  }, []);

  const handleCatalogMutated = useCallback(() => {
    reload();
  }, [reload]);

  const hasFilters =
    filters.search.trim().length > 0
    || filters.tradeId !== "all"
    || filters.active !== DEFAULT_WORK_CATALOG_LIST_FILTERS.active
    || filters.favorite !== DEFAULT_WORK_CATALOG_LIST_FILTERS.favorite;

  const counterLine = useMemo(() => {
    const favoriteSuffix = counts.favorite > 0 ? ` · ${counts.favorite} ulubionych` : "";
    if (counts.filtered === counts.total) {
      return `${counts.total} robót · ${counts.active} aktywnych${favoriteSuffix}`;
    }
    return `${counts.filtered} z ${counts.total} · ${counts.active} aktywnych w bazie${favoriteSuffix}`;
  }, [counts]);

  const exitBulkEdit = useCallback(() => {
    setBulkEditMode(false);
    setSelectedIds(new Set());
    setPreviewOpen(false);
    setPreviewRows([]);
    setBulkError(null);
  }, []);

  const handleBulkSelectToggle = useCallback((workId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(workId);
      else next.delete(workId);
      return next;
    });
  }, []);

  const handleBulkPreview = useCallback(
    (kind: BulkPriceOperationKind, valueRaw: string) => {
      if (selectedIds.size === 0) return;
      const parsed = validateBulkOperationValue(kind, valueRaw);
      if (!parsed.ok) {
        setBulkError(parsed.message);
        return;
      }
      setBulkError(null);
      const rows = computeBulkPricePreview(works, selectedIds, parsed.operation);
      setPreviewRows(rows);
      setPreviewOpen(true);
    },
    [selectedIds, works],
  );

  const handleBulkConfirm = useCallback(async () => {
    const priceMap = previewToPriceMap(
      previewRows.filter((row) => row.oldPricePln !== row.newPricePln),
    );
    if (Object.keys(priceMap).length === 0) {
      setBulkError("Brak zmian cen do zapisania");
      return;
    }

    setBulkSaving(true);
    setBulkError(null);
    const result = await updateBulkCompanyPrices(priceMap);
    setBulkSaving(false);

    if (!result.ok) {
      setBulkError(result.message);
      return;
    }

    setPreviewOpen(false);
    setPreviewRows([]);
    setSelectedIds(new Set());
  }, [previewRows, updateBulkCompanyPrices]);

  const headerPad = isEmbedded
    ? "px-3 py-3 sm:px-4 md:px-4"
    : "shrink-0 border-b border-border px-3 py-3 sm:px-4 md:px-6";

  const listPad = isEmbedded
    ? "px-3 py-3 sm:px-4 md:px-4"
    : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 md:px-6";

  const listBottomPad = isEmbedded
    ? bulkEditMode
      ? EMBEDDED_LIST_PAD_BULK
      : "pb-4 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]"
    : bulkEditMode
      ? "pb-36"
      : "pb-4";

  if (isSuperAdmin && showMarketSyncP0) {
    return (
      <div
        className={
          isEmbedded
            ? "min-w-0"
            : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background"
        }
        data-market-sync-p0-host="1"
      >
        <MarketSyncPreviewPanel onBack={() => setShowMarketSyncP0(false)} />
      </div>
    );
  }

  if (p33Enabled && showMarketCsvImport) {
    return (
      <div
        className={
          isEmbedded
            ? "min-w-0"
            : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background"
        }
        data-wc-p33-flag="1"
      >
        <WorkCatalogCsvImportPreviewPanel
          workNameById={workNameById}
          onBack={() => setShowMarketCsvImport(false)}
          onCatalogMutated={handleCatalogMutated}
        />
      </div>
    );
  }

  return (
    <div
      className={
        isEmbedded
          ? "min-w-0"
          : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background"
      }
      data-wc-p33-flag={p33Enabled ? "1" : undefined}
    >
      <header className={headerPad}>
        <div className="flex items-start gap-3">
          {!isEmbedded && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Library size={20} aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {isEmbedded ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                Katalog v3 · region {regionLabel}
                {section === "works"
                  ? ` · cena firmy · aktywność${bulkEditMode ? " · edycja wielu" : ""}`
                  : " · pakiety robót"}
              </p>
            ) : (
              <>
                <h1 className="text-base font-semibold text-foreground sm:text-lg">{CATALOG_UX_WORK_CATALOG_TAB_LABEL}</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Katalog v3 · region {regionLabel}
                  {section === "works"
                    ? ` · cena firmy · aktywność${bulkEditMode ? " · edycja wielu" : ""}`
                    : " · pakiety robót"}
                </p>
              </>
            )}
          </div>
          {section === "works" && (totalCount > 0 || isSuperAdmin) && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
              {isSuperAdmin && (
                <WgButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (bulkEditMode) exitBulkEdit();
                    setShowMarketSyncP0(true);
                  }}
                  className={cn(
                    "shrink-0 px-3 text-sm font-medium rounded-xl border border-border",
                    WG_TOUCH_MIN,
                    "h-11",
                    "touch-manipulation",
                  )}
                  data-market-sync-p0-entry
                >
                  <Store size={16} className="mr-1.5 shrink-0" aria-hidden />
                  Market Sync Preview
                </WgButton>
              )}
              {p33Enabled && totalCount > 0 && (
                <WgButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (bulkEditMode) exitBulkEdit();
                    setShowMarketCsvImport(true);
                  }}
                  className={cn(
                    "shrink-0 px-3 text-sm font-medium rounded-xl border border-border",
                    WG_TOUCH_MIN,
                    "h-11",
                    "touch-manipulation",
                  )}
                  data-wc-p33-import-entry
                >
                  <FileSpreadsheet size={16} className="mr-1.5 shrink-0" aria-hidden />
                  Import CSV rynku
                </WgButton>
              )}
              {totalCount > 0 && (
              <WgButton
                type="button"
                variant={bulkEditMode ? "secondary" : "primary"}
                onClick={() => {
                  if (bulkEditMode) exitBulkEdit();
                  else setBulkEditMode(true);
                }}
                className={cn(
                  "shrink-0 px-3 text-sm font-medium rounded-xl",
                  WG_TOUCH_MIN,
                  "h-11",
                  bulkEditMode && "border border-border",
                  `transition-colors ${WG_DURATION_ENTER}`,
                  "motion-reduce:transition-none",
                )}
              >
                {bulkEditMode ? "Zakończ" : "Edytuj wiele"}
              </WgButton>
              )}
            </div>
          )}
        </div>

        <div
          className="mt-3 flex gap-2 rounded-xl border border-border bg-muted/30 p-1"
          role="tablist"
          aria-label="Sekcja biblioteki"
        >
          {SECTION_OPTIONS.map((opt) => {
            const selected = section === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  if (opt.id === "bundles" && bulkEditMode) exitBulkEdit();
                  setSection(opt.id);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {section === "works" && (
        <WorkCatalogCompletenessPanel
          summary={completeness}
          selectedTradeId={filters.tradeId}
          onTradeSelect={handleTradeCompletenessSelect}
        />
        )}

        {section === "works" && p33Enabled && marketCoverage && (
          <WorkCatalogMarketCoveragePanel summary={marketCoverage} />
        )}

        {section === "works" && (
        <>
        <WgField
          type="search"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          placeholder="Szukaj robót, słów kluczowych, branży…"
          aria-label="Szukaj w bibliotece robót"
          className="relative mt-3"
          controlClassName="h-11 min-h-[44px]"
          leading={
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          }
          trailing={
            filters.search ? (
              <WgButton
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 text-muted-foreground hover:bg-muted"
                aria-label="Wyczyść wyszukiwanie"
              >
                <X size={18} />
              </WgButton>
            ) : null
          }
        />

        <p className="mt-2 text-xs font-medium text-muted-foreground" aria-live="polite">
          {counterLine}
        </p>

        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtr ulubionych robót"
        >
          {FAVORITE_FILTER_OPTIONS.map((opt) => {
            const selected = filters.favorite === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, favorite: opt.id }))}
                className={`min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
                aria-pressed={selected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtr aktywności"
        >
          {ACTIVE_FILTER_OPTIONS.map((opt) => {
            const selected = filters.active === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, active: opt.id }))}
                className={`min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
                aria-pressed={selected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label htmlFor="work-catalog-trade-filter" className="mb-1 block text-xs font-medium text-muted-foreground">
            Branża
          </label>
          <select
            id="work-catalog-trade-filter"
            value={filters.tradeId}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                tradeId: e.target.value as TradeId | "all",
              }))
            }
            className="min-h-[44px] w-full max-w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary sm:max-w-md"
          >
            <option value="all">Wszystkie branże</option>
            {tradesOrder.map((tradeId) => (
              <option key={tradeId} value={tradeId}>
                {tradeLabelPl(tradeId)}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_WORK_CATALOG_LIST_FILTERS)}
            className="mt-3 min-h-[44px] text-sm font-medium text-primary hover:underline"
          >
            Wyczyść filtry
          </button>
        )}
        </>
        )}
      </header>

      {section === "bundles" ? (
        <WorkCatalogBundlesPanel isEmbedded={isEmbedded} tradesOrder={tradesOrder} />
      ) : (
      <div className={listPad}>
        {totalCount === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Brak robót w katalogu v3</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ten widok czyta <code className="text-[11px]">kw-wgdom-work-catalog</code>.
              Po pierwszym starcie aplikacji dane synchronizują się z chmurą.
              Odśwież widok lub poczekaj chwilę po starcie aplikacji, jeśli lista jest jeszcze pusta.
            </p>
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Brak wyników</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {filters.favorite === "favorites"
                ? "Brak ulubionych robót dla wybranych filtrów."
                : "Zmień wyszukiwanie lub filtry branży / aktywności."}
            </p>
          </div>
        ) : (
          <ul className={`flex flex-col gap-2 ${listBottomPad}`} aria-label="Lista robót">
            {filteredWorks.map((work) => (
              <WorkCatalogWorkRow
                key={work.id}
                work={work}
                onSaveCompanyPrice={updateCompanyPrice}
                onToggleActive={updateWorkActive}
                onToggleFavorite={toggleWorkFavorite}
                bulkEditMode={bulkEditMode}
                bulkSelected={selectedIds.has(work.id)}
                onBulkSelectToggle={handleBulkSelectToggle}
              />
            ))}
          </ul>
        )}
      </div>
      )}

      {section === "works" && bulkEditMode && (
        <WorkCatalogBulkEditBar
          selectedCount={selectedIds.size}
          onPreview={handleBulkPreview}
          onCancel={exitBulkEdit}
        />
      )}

      {section === "works" && (
      <WorkCatalogBulkPreviewModal
        open={previewOpen}
        rows={previewRows}
        saving={bulkSaving}
        error={bulkError}
        onClose={() => {
          if (!bulkSaving) {
            setPreviewOpen(false);
            setBulkError(null);
          }
        }}
        onConfirm={() => {
          void handleBulkConfirm();
        }}
      />
      )}
    </div>
  );
}
