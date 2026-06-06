import { useMemo } from "react";
import { Wallet, ChevronRight, AlertTriangle } from "lucide-react";
import {
  type RecoverableCharge,
  fmtRecoverableAmount,
  computeRecoverableChargesReportingStats,
  computeRecoverableChargesAlerts,
} from "@/lib/recoverable-charges";
import { RecoverableChargesAlertsSection } from "@/app/RecoverableChargesAlertsSection";

export function RecoverableChargesDashboardCard({
  charges,
  onOpenModule,
}: {
  charges: RecoverableCharge[];
  onOpenModule: () => void;
}) {
  const stats = useMemo(() => computeRecoverableChargesReportingStats(charges), [charges]);
  const alertStats = useMemo(() => computeRecoverableChargesAlerts(charges), [charges]);
  const needsAttention = alertStats.attentionCount > 0;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        stats.isEmpty
          ? "bg-card border-border"
          : needsAttention
            ? "bg-amber-500/5 border-amber-500/30"
            : "bg-card border-border hover:border-primary/25"
      }`}
    >
      <button
        type="button"
        onClick={onOpenModule}
        className="w-full text-left px-4 sm:px-5 py-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Do odzyskania</p>
              {stats.isEmpty ? (
                <p className="text-xs text-muted-foreground mt-0.5">Brak pozycji do odzyskania</p>
              ) : needsAttention ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={12} className="shrink-0" />
                  Wymaga uwagi
                  {alertStats.alerts.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      · {alertStats.alerts.length}{" "}
                      {alertStats.alerts.length === 1 ? "pozycja" : alertStats.alerts.length < 5 ? "pozycje" : "pozycji"}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Kliknij, aby otworzyć moduł</p>
              )}
            </div>
          </div>
          <span className="text-xs font-medium text-primary shrink-0 flex items-center gap-0.5 pt-1">
            Moduł
            <ChevronRight size={14} />
          </span>
        </div>

        {stats.isEmpty ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Dodaj pozycję w module Do rozliczenia, gdy firma poniosła koszt do odzyskania od klienta.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Do odzyskania" value={fmtRecoverableAmount(stats.toRecoverSum)} accent />
              <Metric label="Pozycji" value={String(stats.unsettledCount)} />
              <Metric label="Rozliczone częściowo" value={String(stats.partialCount)} />
              <Metric label="Odzyskano" value={fmtRecoverableAmount(stats.recoveredSum)} />
            </div>
            {stats.oldestUnsettledDays != null && (
              <p className="text-xs text-muted-foreground">
                Najstarsza pozycja:{" "}
                <span className="font-medium text-foreground">{stats.oldestUnsettledDays} dni</span>
                {stats.oldestUnsettledDays > 90 && (
                  <span className="text-amber-600 dark:text-amber-400"> · powyżej 90 dni</span>
                )}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/60">
              {stats.aging.map((bucket) => (
                <div key={bucket.key} className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{bucket.label}</p>
                  <p
                    className={`text-xs font-semibold truncate ${bucket.key === "90_plus" && bucket.count > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {fmtRecoverableAmount(bucket.amountRemainingSum)}
                  </p>
                </div>
              ))}
            </div>
            <RecoverableChargesAlertsSection charges={charges} variant="dashboard" />
          </>
        )}
      </button>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">{label}</p>
      <p
        className={`text-sm sm:text-base font-bold truncate ${accent ? "text-primary" : "text-foreground"}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
    </div>
  );
}
