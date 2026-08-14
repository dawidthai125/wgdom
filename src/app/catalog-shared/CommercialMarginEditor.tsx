/**
 * Shared per-row commercial margin editor.
 * REUSE parseOwnerCommercialMarginPctInput + parent updateCommercialMargin.
 * UNSET stays empty until Owner Zapisz. Super Admin only.
 */

import { parseOwnerCommercialMarginPctInput } from "@/lib/work-catalog/our-work-rate-catalog";

type CommercialMarginEditorProps = {
  namePl: string;
  workId: string;
  marginPct: number | null;
  marginUnset: boolean;
  draft: string | undefined;
  onDraftChange: (workId: string, raw: string) => void;
  onSave: (workId: string) => void;
  onInvalid?: () => void;
  isSuperAdmin: boolean;
  busy?: boolean;
  /** "work-rate" | "price-catalog" — stable test hooks */
  dataPrefix: "work-rate" | "price-catalog";
};

export function CommercialMarginEditor({
  namePl,
  workId,
  marginPct,
  marginUnset,
  draft,
  onDraftChange,
  onSave,
  onInvalid,
  isSuperAdmin,
  busy = false,
  dataPrefix,
}: CommercialMarginEditorProps) {
  if (!isSuperAdmin) {
    return marginUnset ? (
      <span
        className="text-muted-foreground"
        data-catalog-margin-unset
        data-work-rate-margin-unset={dataPrefix === "work-rate" ? "" : undefined}
      >
        Brak marży
      </span>
    ) : (
      <span data-catalog-margin-value={`${marginPct}`}>{marginPct}%</span>
    );
  }

  const value = draft ?? (marginUnset ? "" : String(marginPct));

  function handleSave(): void {
    const n = parseOwnerCommercialMarginPctInput(value);
    if (n == null) {
      onInvalid?.();
      return;
    }
    onSave(workId);
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      data-catalog-margin-editor=""
      data-work-id={workId}
      data-work-rate-margin-editor={dataPrefix === "work-rate" ? "" : undefined}
      data-price-catalog-margin-editor={dataPrefix === "price-catalog" ? "" : undefined}
    >
      <input
        className="w-14 rounded border border-border bg-background px-1 py-1 text-xs min-h-[36px]"
        value={value}
        placeholder="—"
        onChange={(e) => onDraftChange(workId, e.target.value)}
        inputMode="decimal"
        aria-label={`Marża WGDOM ${namePl}`}
        data-catalog-margin-input=""
        data-work-rate-margin-input={dataPrefix === "work-rate" ? "" : undefined}
      />
      <span className="text-muted-foreground">%</span>
      <button
        type="button"
        className="text-[10px] text-primary underline min-h-[36px] px-1 disabled:opacity-50"
        onClick={() => handleSave()}
        disabled={busy}
        aria-label={`Zapisz marżę WGDOM: ${namePl}`}
        data-catalog-margin-save=""
        data-work-rate-margin-save={dataPrefix === "work-rate" ? "" : undefined}
      >
        Zapisz
      </button>
    </div>
  );
}
