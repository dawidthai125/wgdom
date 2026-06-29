import { useCallback, useEffect, useId, useState } from "react";
import type { CatalogWork } from "@/lib/work-catalog";
import { workCatalogUnitLabelPl } from "@/app/work-catalog/work-catalog-list";
import {
  formatCompanyPriceDraft,
  validateCompanyPricePlnInput,
} from "@/app/work-catalog/work-catalog-price";
import type { UpdateCompanyPriceResult } from "@/app/hooks/useWorkCatalog";

type Props = {
  work: CatalogWork;
  onSave: (workId: string, companyPricePln: number) => Promise<UpdateCompanyPriceResult>;
};

export function WorkCatalogCompanyPriceField({ work, onSave }: Props) {
  const inputId = useId();
  const [draft, setDraft] = useState(() => formatCompanyPriceDraft(work.companyPricePln));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(formatCompanyPriceDraft(work.companyPricePln));
    setError(null);
  }, [work.companyPricePln, work.updatedAt]);

  const commit = useCallback(async () => {
    const parsed = validateCompanyPricePlnInput(draft);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (parsed.valuePln === work.companyPricePln) {
      setError(null);
      return;
    }

    setSaving(true);
    const result = await onSave(work.id, parsed.valuePln);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
  }, [draft, onSave, work.companyPricePln, work.id]);

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        Cena firmy
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={draft}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onBlur={() => {
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
          }}
          placeholder="0"
          className="min-h-[44px] w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary sm:max-w-[9rem]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-unit`}
        />
        <p
          id={`${inputId}-unit`}
          className="shrink-0 text-xs text-muted-foreground sm:text-sm"
        >
          zł / {workCatalogUnitLabelPl(work.unit)}
        </p>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {saving && (
        <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
          Zapisywanie…
        </p>
      )}
    </div>
  );
}
