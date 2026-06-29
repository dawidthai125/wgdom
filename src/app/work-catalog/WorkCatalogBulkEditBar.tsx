import { useMemo, useState } from "react";
import {
  bulkOperationLabelPl,
  validateBulkOperationValue,
  type BulkPriceOperationKind,
} from "@/app/work-catalog/work-catalog-bulk-price";

const OPERATION_KINDS: BulkPriceOperationKind[] = [
  "percent_add",
  "percent_sub",
  "amount_add",
  "amount_sub",
  "set_price",
];

type Props = {
  selectedCount: number;
  onPreview: (kind: BulkPriceOperationKind, valueRaw: string) => void;
  onCancel: () => void;
};

export function WorkCatalogBulkEditBar({ selectedCount, onPreview, onCancel }: Props) {
  const [kind, setKind] = useState<BulkPriceOperationKind>("percent_add");
  const [valueRaw, setValueRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const valuePlaceholder = useMemo(() => {
    switch (kind) {
      case "percent_add":
      case "percent_sub":
        return "np. 8";
      case "amount_add":
      case "amount_sub":
        return "np. 5";
      case "set_price":
        return "np. 45,00";
      default:
        return "";
    }
  }, [kind]);

  const valueLabel = useMemo(() => {
    switch (kind) {
      case "percent_add":
      case "percent_sub":
        return "Procent";
      case "amount_add":
      case "amount_sub":
        return "Kwota (zł)";
      case "set_price":
        return "Nowa cena (zł)";
      default:
        return "Wartość";
    }
  }, [kind]);

  const handlePreview = () => {
    const parsed = validateBulkOperationValue(kind, valueRaw);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    onPreview(kind, valueRaw);
  };

  return (
    <div className="shrink-0 border-t border-border bg-card px-3 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] sm:px-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          Zaznaczono: <span className="text-primary">{selectedCount}</span>
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Anuluj edycję
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">Wybierz akcję dla zaznaczonych robót</p>

      <div
        className="mt-2 flex flex-wrap gap-2"
        role="group"
        aria-label="Akcja grupowa"
      >
        {OPERATION_KINDS.map((operationKind) => {
          const selected = kind === operationKind;
          return (
            <button
              key={operationKind}
              type="button"
              onClick={() => {
                setKind(operationKind);
                setError(null);
              }}
              className={`min-h-[44px] rounded-full px-3 text-sm font-medium transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-pressed={selected}
            >
              {bulkOperationLabelPl(operationKind)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="work-catalog-bulk-value"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            {valueLabel}
          </label>
          <input
            id="work-catalog-bulk-value"
            type="text"
            inputMode="decimal"
            value={valueRaw}
            onChange={(e) => {
              setValueRaw(e.target.value);
              if (error) setError(null);
            }}
            placeholder={valuePlaceholder}
            className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={handlePreview}
          disabled={selectedCount === 0}
          className="min-h-[44px] shrink-0 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Podgląd zmian
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
