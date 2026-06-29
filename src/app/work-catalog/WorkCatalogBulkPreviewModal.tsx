import { X } from "lucide-react";
import { workCatalogUnitLabelPl } from "@/app/work-catalog/work-catalog-list";
import {
  formatCompanyPricePlnLabel,
  type BulkPricePreviewRow,
} from "@/app/work-catalog/work-catalog-bulk-price";

type Props = {
  open: boolean;
  rows: BulkPricePreviewRow[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function WorkCatalogBulkPreviewModal({
  open,
  rows,
  saving,
  error,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  const changedCount = rows.filter((row) => row.oldPricePln !== row.newPricePln).length;

  return (
    <div
      className="fixed inset-0 z-50 modal-overlay flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="work-catalog-bulk-preview-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 id="work-catalog-bulk-preview-title" className="text-base font-semibold">
            Podgląd nowych cen
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          <p className="mb-3 text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "robota" : "robót"}
            {changedCount < rows.length
              ? ` · ${changedCount} ze zmianą ceny`
              : " · wszystkie ze zmianą ceny"}
          </p>
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.workId}
                className="rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <p className="truncate text-sm font-medium text-foreground">{row.namePl}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatCompanyPricePlnLabel(row.oldPricePln)}</span>
                  <span aria-hidden>→</span>
                  <span
                    className={
                      row.oldPricePln !== row.newPricePln
                        ? "font-medium text-foreground"
                        : ""
                    }
                  >
                    {formatCompanyPricePlnLabel(row.newPricePln)}
                  </span>
                  <span className="text-border">·</span>
                  <span>{workCatalogUnitLabelPl(row.unit)}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="shrink-0 px-4 pb-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-card px-4 text-sm font-medium"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || rows.length === 0}
            className="min-h-[44px] flex-1 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Zapisywanie…" : "Potwierdź zmiany"}
          </button>
        </div>
      </div>
    </div>
  );
}
