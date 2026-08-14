/**
 * Shared global commercial margin floor bar.
 * Parent supplies catalog-scope IDs (NOT filtered rows.map).
 * Super Admin only — parent must not render for other roles.
 */

import { WgButton, WgField } from "@/app/ui";

type CommercialMarginGlobalBarProps = {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  onApply: () => void;
  busy?: boolean;
  dataPrefix: "work-rate" | "price-catalog";
};

export function CommercialMarginGlobalBar({
  label,
  value,
  onChange,
  onApply,
  busy = false,
  dataPrefix,
}: CommercialMarginGlobalBarProps) {
  return (
    <div
      className="flex flex-col sm:flex-row gap-2 sm:items-end border-t border-border/60 pt-3"
      data-catalog-global-margin=""
      data-work-rate-global-margin={dataPrefix === "work-rate" ? "" : undefined}
      data-price-catalog-global-margin={dataPrefix === "price-catalog" ? "" : undefined}
    >
      <WgField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="sm:max-w-[18rem]"
      />
      <WgButton
        type="button"
        variant="secondary"
        onClick={() => onApply()}
        disabled={busy}
        data-catalog-global-margin-apply=""
        data-work-rate-global-margin-apply={dataPrefix === "work-rate" ? "" : undefined}
      >
        Zastosuj
      </WgButton>
    </div>
  );
}
