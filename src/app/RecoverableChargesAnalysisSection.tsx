import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import {
  type RecoverableCharge,
  fmtRecoverableAmount,
  computeRecoverableChargesReportingStats,
  sumAgingAmountRemaining,
} from "@/lib/recoverable-charges";

export function RecoverableChargesAnalysisSection({ charges }: { charges: RecoverableCharge[] }) {
  const stats = useMemo(() => computeRecoverableChargesReportingStats(charges), [charges]);
  const agingTotal = sumAgingAmountRemaining(stats.aging);

  if (stats.isEmpty) {
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={16} className="text-primary shrink-0" />
          <p className="text-sm font-semibold">📊 Analiza odzyskiwania</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Brak nierozliczonych pozycji — aging pojawi się po dodaniu pozycji do odzyskania.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-primary shrink-0" />
          <p className="text-sm font-semibold">📊 Analiza odzyskiwania</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Wiek od utworzenia pozycji · łącznie{" "}
          <span className="font-medium text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtRecoverableAmount(agingTotal)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.aging.map((bucket) => (
          <div
            key={bucket.key}
            className={`rounded-xl border px-3 py-3 ${
              bucket.key === "90_plus" && bucket.count > 0
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-secondary/30"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{bucket.label}</p>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtRecoverableAmount(bucket.amountRemainingSum)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bucket.count} {bucket.count === 1 ? "pozycja" : bucket.count < 5 ? "pozycje" : "pozycji"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
