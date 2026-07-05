import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import {
  TRADE_IDS,
  tradeLabelPl,
  type CatalogWork,
  type TradeId,
  type WorkBundle,
  type WorkCatalogStore,
} from "@/lib/work-catalog";
import {
  addStepToBundle,
  removeStepFromBundle,
  reorderBundleStep,
  resolveBundleStepWorkRef,
  updateStepInBundle,
} from "@/app/work-catalog/work-catalog-bundle";
import { WorkCatalogBundleStepRow } from "@/app/work-catalog/WorkCatalogBundleStepRow";
import type { BundleMutationResult } from "@/app/hooks/useWorkBundles";

type Props = {
  bundle: WorkBundle;
  catalogStore: WorkCatalogStore;
  works: CatalogWork[];
  saving: boolean;
  saveError: string | null;
  onChange: (bundle: WorkBundle) => void;
  onSave: () => Promise<BundleMutationResult>;
  onCancel: () => void;
};

export function WorkCatalogBundleEditor({
  bundle,
  catalogStore,
  works,
  saving,
  saveError,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const defaultWorkId = works[0]?.id ?? "";

  const stepRefs = useMemo(
    () => bundle.steps.map((step) => resolveBundleStepWorkRef(catalogStore, step.workId)),
    [bundle.steps, catalogStore],
  );

  const patchBundle = useCallback(
    (next: WorkBundle) => {
      onChange(next);
    },
    [onChange],
  );

  const handleAddStep = () => {
    if (!defaultWorkId) return;
    const updatedAtIso = new Date().toISOString();
    patchBundle(addStepToBundle(bundle, defaultWorkId, updatedAtIso));
  };

  return (
    <section
      className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4"
      aria-label="Edytor pakietu robót"
    >
      <h2 className="text-sm font-semibold text-foreground sm:text-base">
        {bundle.namePl.trim() ? bundle.namePl : "Nowy pakiet"}
      </h2>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="bundle-name" className="mb-1 block text-xs font-medium text-muted-foreground">
            Nazwa pakietu *
          </label>
          <input
            id="bundle-name"
            type="text"
            value={bundle.namePl}
            onChange={(e) => patchBundle({ ...bundle, namePl: e.target.value })}
            className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="np. Łazienka komplet"
          />
        </div>

        <div>
          <label htmlFor="bundle-trade" className="mb-1 block text-xs font-medium text-muted-foreground">
            Branża *
          </label>
          <select
            id="bundle-trade"
            value={bundle.primaryTradeId}
            onChange={(e) =>
              patchBundle({ ...bundle, primaryTradeId: e.target.value as TradeId })
            }
            className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
          >
            {TRADE_IDS.map((tradeId) => (
              <option key={tradeId} value={tradeId}>
                {tradeLabelPl(tradeId)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bundle-description" className="mb-1 block text-xs font-medium text-muted-foreground">
            Opis pakietu
          </label>
          <textarea
            id="bundle-description"
            value={bundle.descriptionPl ?? ""}
            onChange={(e) => patchBundle({ ...bundle, descriptionPl: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Opcjonalny opis całego pakietu"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Kroki ({bundle.steps.length})
          </h3>
          <button
            type="button"
            onClick={handleAddStep}
            disabled={!defaultWorkId || saving}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Plus size={16} aria-hidden />
            Dodaj krok
          </button>
        </div>

        {bundle.steps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/50 px-3 py-6 text-center text-xs text-muted-foreground">
            Pakiet bez kroków — dodaj co najmniej jedną robotę lub zapisz pusty szablon.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bundle.steps.map((step, index) => (
              <WorkCatalogBundleStepRow
                key={`${step.workId}-${step.order}-${index}`}
                step={step}
                stepIndex={index}
                stepCount={bundle.steps.length}
                works={works}
                workRef={stepRefs[index] ?? { ok: false, warning: "Brak danych" }}
                onWorkIdChange={(workId) => {
                  const updatedAtIso = new Date().toISOString();
                  patchBundle(updateStepInBundle(bundle, index, { workId }, updatedAtIso));
                }}
                onQuantityChange={(raw) => {
                  const updatedAtIso = new Date().toISOString();
                  const parsed = raw.trim() === "" ? undefined : Number(raw.replace(",", "."));
                  const quantityDefault =
                    parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
                  patchBundle(
                    updateStepInBundle(bundle, index, { quantityDefault }, updatedAtIso),
                  );
                }}
                onNoteChange={(notePl) => {
                  const updatedAtIso = new Date().toISOString();
                  patchBundle(updateStepInBundle(bundle, index, { notePl }, updatedAtIso));
                }}
                onMoveUp={() => {
                  const updatedAtIso = new Date().toISOString();
                  patchBundle(reorderBundleStep(bundle, index, "up", updatedAtIso));
                }}
                onMoveDown={() => {
                  const updatedAtIso = new Date().toISOString();
                  patchBundle(reorderBundleStep(bundle, index, "down", updatedAtIso));
                }}
                onRemove={() => {
                  const updatedAtIso = new Date().toISOString();
                  patchBundle(removeStepFromBundle(bundle, index, updatedAtIso));
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {saveError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            void onSave();
          }}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Zapisywanie…" : "Zapisz pakiet"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="min-h-[44px] rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          Anuluj edycję
        </button>
      </div>
    </section>
  );
}
