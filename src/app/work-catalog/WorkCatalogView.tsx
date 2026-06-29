import { useCallback, useMemo, useState } from "react";
import { Search, Library, X } from "lucide-react";
import { tradeLabelPl, type TradeId } from "@/lib/work-catalog";
import { useWorkCatalog } from "@/app/hooks/useWorkCatalog";
import { WorkCatalogWorkRow } from "@/app/work-catalog/WorkCatalogWorkRow";
import { WorkCatalogBulkEditBar } from "@/app/work-catalog/WorkCatalogBulkEditBar";
import { WorkCatalogBulkPreviewModal } from "@/app/work-catalog/WorkCatalogBulkPreviewModal";
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
  type WorkCatalogListFilters,
} from "@/app/work-catalog/work-catalog-list";
import { computeLibraryCompleteness } from "@/app/work-catalog/work-catalog-completeness";
import { WorkCatalogCompletenessPanel } from "@/app/work-catalog/WorkCatalogCompletenessPanel";

const ACTIVE_FILTER_OPTIONS: { id: WorkCatalogActiveFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "active", label: "Aktywne" },
  { id: "inactive", label: "Nieaktywne" },
];

export function WorkCatalogView() {
  const {
    works,
    totalCount,
    tradesOrder,
    regionLabel,
    updateCompanyPrice,
    updateWorkActive,
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

  const handleTradeCompletenessSelect = useCallback((tradeId: TradeId | "all") => {
    setFilters((prev) => ({ ...prev, tradeId }));
  }, []);

  const hasFilters =
    filters.search.trim().length > 0
    || filters.tradeId !== "all"
    || filters.active !== DEFAULT_WORK_CATALOG_LIST_FILTERS.active;

  const counterLine =
    counts.filtered === counts.total
      ? `${counts.total} robót · ${counts.active} aktywnych`
      : `${counts.filtered} z ${counts.total} · ${counts.active} aktywnych w bazie`;

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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Library size={20} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">Biblioteka Robót</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Katalog v3 · region {regionLabel} · cena firmy · aktywność
              {bulkEditMode ? " · edycja wielu" : ""}
            </p>
          </div>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (bulkEditMode) exitBulkEdit();
                else setBulkEditMode(true);
              }}
              className={`shrink-0 min-h-[44px] rounded-xl px-3 text-sm font-medium ${
                bulkEditMode
                  ? "border border-border bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {bulkEditMode ? "Zakończ" : "Edytuj wiele"}
            </button>
          )}
        </div>

        <WorkCatalogCompletenessPanel
          summary={completeness}
          selectedTradeId={filters.tradeId}
          onTradeSelect={handleTradeCompletenessSelect}
        />

        <div className="relative mt-3">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Szukaj robót, słów kluczowych, branży…"
            className="min-h-[44px] w-full rounded-xl border border-border bg-card py-2 pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Szukaj w bibliotece robót"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Wyczyść wyszukiwanie"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <p className="mt-2 text-xs font-medium text-muted-foreground" aria-live="polite">
          {counterLine}
        </p>

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
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 md:px-6">
        {totalCount === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Brak robót w katalogu v3</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ten widok czyta <code className="text-[11px]">kw-wgdom-work-catalog</code>.
              Po pierwszym logowaniu admina dane migrują z Bazy cen (PB-3) i synchronizują się z chmurą.
              Odśwież widok lub poczekaj chwilę po starcie aplikacji, jeśli lista jest jeszcze pusta.
            </p>
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Brak wyników</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Zmień wyszukiwanie lub filtry branży / aktywności.
            </p>
          </div>
        ) : (
          <ul
            className={`flex flex-col gap-2 ${bulkEditMode ? "pb-36" : "pb-4"}`}
            aria-label="Lista robót"
          >
            {filteredWorks.map((work) => (
              <WorkCatalogWorkRow
                key={work.id}
                work={work}
                onSaveCompanyPrice={updateCompanyPrice}
                onToggleActive={updateWorkActive}
                bulkEditMode={bulkEditMode}
                bulkSelected={selectedIds.has(work.id)}
                onBulkSelectToggle={handleBulkSelectToggle}
              />
            ))}
          </ul>
        )}
      </div>

      {bulkEditMode && (
        <WorkCatalogBulkEditBar
          selectedCount={selectedIds.size}
          onPreview={handleBulkPreview}
          onCancel={exitBulkEdit}
        />
      )}

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
    </div>
  );
}
