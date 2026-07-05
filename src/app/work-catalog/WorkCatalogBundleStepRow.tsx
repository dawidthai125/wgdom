import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { CatalogWork } from "@/lib/work-catalog";
import type { WorkBundleStep } from "@/lib/work-catalog";
import type { BundleStepWorkRefResult } from "@/app/work-catalog/work-catalog-bundle";

type Props = {
  step: WorkBundleStep;
  stepIndex: number;
  stepCount: number;
  works: CatalogWork[];
  workRef: BundleStepWorkRefResult;
  onWorkIdChange: (workId: string) => void;
  onQuantityChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

export function WorkCatalogBundleStepRow({
  step,
  stepIndex,
  stepCount,
  works,
  workRef,
  onWorkIdChange,
  onQuantityChange,
  onNoteChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  const quantityValue =
    step.quantityDefault != null && Number.isFinite(step.quantityDefault)
      ? String(step.quantityDefault)
      : "";

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-start gap-2">
        <span className="mt-2 shrink-0 text-xs font-semibold text-muted-foreground">
          {stepIndex + 1}.
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label
              htmlFor={`bundle-step-work-${stepIndex}`}
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Robota
            </label>
            <select
              id={`bundle-step-work-${stepIndex}`}
              value={step.workId}
              onChange={(e) => onWorkIdChange(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
            >
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.namePl}
                  {!work.active ? " (nieaktywna)" : ""}
                </option>
              ))}
            </select>
            {workRef.warning && (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300" role="status">
                ⚠ {workRef.warning}
              </p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`bundle-step-qty-${stepIndex}`}
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Ilość (opcjonalnie)
              </label>
              <input
                id={`bundle-step-qty-${stepIndex}`}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={quantityValue}
                onChange={(e) => onQuantityChange(e.target.value)}
                placeholder="np. 12"
                className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor={`bundle-step-note-${stepIndex}`}
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Notatka kroku
              </label>
              <input
                id={`bundle-step-note-${stepIndex}`}
                type="text"
                value={step.notePl ?? ""}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Opcjonalnie"
                className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={stepIndex === 0}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40"
            aria-label="Przesuń krok wyżej"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={stepIndex >= stepCount - 1}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40"
            aria-label="Przesuń krok niżej"
          >
            <ChevronDown size={18} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
            aria-label="Usuń krok"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </li>
  );
}
