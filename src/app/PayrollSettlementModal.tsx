/** Modal potwierdzenia rozliczenia wypłaty — forma obowiązkowa. */

import { useState } from "react";
import type { PayrollPayoutMethod } from "@/lib/payroll-settlement";

export function PayrollSettlementModal({
  employeeName,
  amount,
  settledByName,
  onCancel,
  onConfirm,
}: {
  employeeName: string;
  amount: number;
  settledByName: string;
  onCancel: () => void;
  onConfirm: (method: PayrollPayoutMethod) => void;
}) {
  const [method, setMethod] = useState<PayrollPayoutMethod | null>(null);
  const amountLabel = amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payroll-settlement-title"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p id="payroll-settlement-title" className="text-base font-semibold">
            Rozliczenie wypłaty
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{employeeName}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            Najpierw zapis w chmurze. Gotówkę/przelew wypłać dopiero po komunikacie sukcesu.
          </p>
        </div>

        <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Kwota</p>
          <p className="text-lg font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {amountLabel} zł
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground mb-1">Forma wypłaty</legend>
          <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:bg-secondary/40 cursor-pointer">
            <input
              type="radio"
              name="payroll-settle-method"
              checked={method === "cash"}
              onChange={() => setMethod("cash")}
            />
            <span className="text-sm">Gotówka</span>
          </label>
          <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:bg-secondary/40 cursor-pointer">
            <input
              type="radio"
              name="payroll-settle-method"
              checked={method === "transfer"}
              onChange={() => setMethod("transfer")}
            />
            <span className="text-sm">Przelew</span>
          </label>
        </fieldset>

        <div className="text-sm">
          <span className="text-muted-foreground">Rozlicza: </span>
          <span className="font-medium">{settledByName}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary/60"
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={!method}
            onClick={() => method && onConfirm(method)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            Rozlicz w chmurze
          </button>
        </div>
      </div>
    </div>
  );
}
