import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { tradeLabelPl, type TradeId, type WorkBundle } from "@/lib/work-catalog";
import { useWorkCatalog } from "@/app/hooks/useWorkCatalog";
import { useWorkBundles } from "@/app/hooks/useWorkBundles";
import { WorkCatalogBundleDeleteDialog } from "@/app/work-catalog/WorkCatalogBundleDeleteDialog";
import { WorkCatalogBundleEditor } from "@/app/work-catalog/WorkCatalogBundleEditor";
import {
  DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS,
  countFilteredWorkCatalogBundleList,
  filterWorkCatalogBundleList,
  type WorkCatalogBundleActiveFilter,
  type WorkCatalogBundleListFilters,
} from "@/app/work-catalog/work-catalog-bundle-list";

const ACTIVE_FILTER_OPTIONS: { id: WorkCatalogBundleActiveFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "active", label: "Aktywne" },
  { id: "inactive", label: "Nieaktywne" },
];

type Props = {
  isEmbedded: boolean;
  tradesOrder: TradeId[];
};

export function WorkCatalogBundlesPanel({ isEmbedded, tradesOrder }: Props) {
  const { store: catalogStore, works } = useWorkCatalog();
  const {
    bundles,
    totalCount,
    saveBundle,
    deleteBundle,
    duplicateBundle,
    toggleBundleActive,
    toggleBundleFavorite,
    createBundleDraft,
  } = useWorkBundles();

  const [filters, setFilters] = useState<WorkCatalogBundleListFilters>(
    DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS,
  );
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [draftBundle, setDraftBundle] = useState<WorkBundle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkBundle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredBundles = useMemo(
    () => filterWorkCatalogBundleList(bundles, filters),
    [bundles, filters],
  );

  const counts = useMemo(
    () => countFilteredWorkCatalogBundleList(bundles, filteredBundles),
    [bundles, filteredBundles],
  );

  const counterLine =
    counts.filtered === counts.total
      ? `${counts.total} pakietów · ${counts.active} aktywnych`
      : `${counts.filtered} z ${counts.total} · ${counts.active} aktywnych w bazie`;

  const hasFilters =
    filters.search.trim().length > 0
    || filters.tradeId !== "all"
    || filters.active !== DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS.active;

  const syncDraftFromStore = useCallback(
    (bundleId: string) => {
      const fromStore = bundles.find((bundle) => bundle.id === bundleId);
      if (fromStore) {
        setDraftBundle({ ...fromStore, steps: fromStore.steps.map((step) => ({ ...step })) });
      }
    },
    [bundles],
  );

  useEffect(() => {
    if (!selectedBundleId) return;
    syncDraftFromStore(selectedBundleId);
  }, [bundles, selectedBundleId, syncDraftFromStore]);

  const handleSelectBundle = (bundleId: string) => {
    setSelectedBundleId(bundleId);
    setSaveError(null);
    setActionError(null);
    syncDraftFromStore(bundleId);
  };

  const handleCreateNew = () => {
    const draft = createBundleDraft();
    setSelectedBundleId(draft.id);
    setDraftBundle(draft);
    setSaveError(null);
    setActionError(null);
  };

  const handleSave = async () => {
    if (!draftBundle) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveBundle(draftBundle, catalogStore);
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.message);
      return;
    }

    const savedId = result.bundleId ?? draftBundle.id;
    setSelectedBundleId(savedId);
  };

  const handleCancelEdit = () => {
    if (selectedBundleId) {
      const exists = bundles.some((bundle) => bundle.id === selectedBundleId);
      if (exists) {
        syncDraftFromStore(selectedBundleId);
        return;
      }
    }
    setSelectedBundleId(null);
    setDraftBundle(null);
    setSaveError(null);
  };

  const handleDuplicate = async (bundleId: string) => {
    setActionError(null);
    const result = await duplicateBundle(bundleId);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    if (result.bundleId) {
      setSelectedBundleId(result.bundleId);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    const result = await deleteBundle(deleteTarget.id);
    setDeleting(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    if (selectedBundleId === deleteTarget.id) {
      setSelectedBundleId(null);
      setDraftBundle(null);
    }
    setDeleteTarget(null);
  };

  const listPad = isEmbedded
    ? "px-3 py-3 sm:px-4 md:px-4"
    : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 md:px-6";

  return (
    <>
      <header className={isEmbedded ? "px-3 py-3 sm:px-4 md:px-4" : "shrink-0 border-b border-border px-3 py-3 sm:px-4 md:px-6"}>
        <div className="flex flex-wrap items-start gap-2">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">
            Pakiety robót · szablony kroków · sync{" "}
            <code className="text-[11px]">kw-wgdom-work-bundles</code>
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus size={16} aria-hidden />
            Nowy pakiet
          </button>
        </div>

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
            placeholder="Szukaj pakietów…"
            className="min-h-[44px] w-full rounded-xl border border-border bg-card py-2 pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Szukaj pakietów robót"
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

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtr aktywności pakietów">
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
          <label htmlFor="work-catalog-bundle-trade-filter" className="mb-1 block text-xs font-medium text-muted-foreground">
            Branża
          </label>
          <select
            id="work-catalog-bundle-trade-filter"
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
            onClick={() => setFilters(DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS)}
            className="mt-3 min-h-[44px] text-sm font-medium text-primary hover:underline"
          >
            Wyczyść filtry
          </button>
        )}

        {actionError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </header>

      <div className={listPad}>
        {totalCount === 0 && !draftBundle ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Brak pakietów robót</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Utwórz pierwszy pakiet — zestaw kroków z biblioteki robót. Dane zapisują się lokalnie i w chmurze.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            {filteredBundles.length === 0 && !draftBundle ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Brak pakietów dla wybranych filtrów.
              </div>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Lista pakietów robót">
                {filteredBundles.map((bundle) => {
                  const selected = selectedBundleId === bundle.id;
                  return (
                    <li
                      key={bundle.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void toggleBundleFavorite(bundle.id, !bundle.favorite);
                          }}
                          className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted ${
                            bundle.favorite ? "text-amber-500" : "text-muted-foreground"
                          }`}
                          aria-label={bundle.favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                          aria-pressed={bundle.favorite}
                        >
                          <Star size={16} fill={bundle.favorite ? "currentColor" : "none"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectBundle(bundle.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-sm font-semibold text-foreground">{bundle.namePl}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {tradeLabelPl(bundle.primaryTradeId)} · {bundle.steps.length}{" "}
                            {bundle.steps.length === 1 ? "krok" : "kroków"}
                            {bundle.estimatedDurationDays != null
                              ? ` · ~${bundle.estimatedDurationDays} dni`
                              : ""}
                          </p>
                        </button>
                        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={bundle.active}
                            onChange={(e) => {
                              void toggleBundleActive(bundle.id, e.target.checked);
                            }}
                            className="h-5 w-5 rounded border-border accent-primary"
                            aria-label={bundle.active ? "Aktywny pakiet" : "Nieaktywny pakiet"}
                          />
                          <span>{bundle.active ? "Aktywny" : "Nieaktywny"}</span>
                        </label>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectBundle(bundle.id)}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border hover:bg-muted"
                            aria-label="Edytuj pakiet"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDuplicate(bundle.id);
                            }}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border hover:bg-muted"
                            aria-label="Duplikuj pakiet"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(bundle)}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
                            aria-label="Usuń pakiet"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {draftBundle && selectedBundleId === draftBundle.id && (
              <WorkCatalogBundleEditor
                bundle={draftBundle}
                catalogStore={catalogStore}
                works={works}
                saving={saving}
                saveError={saveError}
                onChange={setDraftBundle}
                onSave={handleSave}
                onCancel={handleCancelEdit}
              />
            )}
          </div>
        )}
      </div>

      <WorkCatalogBundleDeleteDialog
        open={deleteTarget != null}
        bundleName={deleteTarget?.namePl ?? ""}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </>
  );
}
