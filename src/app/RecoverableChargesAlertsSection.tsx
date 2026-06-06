import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  type RecoverableCharge,
  type RecoverableChargeAlertType,
  fmtRecoverableAmount,
  computeRecoverableChargesAlerts,
  topRecoverableChargeAlerts,
  RECOVERABLE_CHARGE_ALERT_TYPE_LABELS,
} from "@/lib/recoverable-charges";

type AlertFilter = "all" | RecoverableChargeAlertType;

const MODULE_FILTERS: { key: AlertFilter; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "kwota", label: "Kwota" },
  { key: "wiek", label: "Wiek" },
  { key: "częściowe", label: "Częściowe" },
  { key: "aktywność", label: "Brak aktywności" },
];

export function RecoverableChargesAlertsSection({
  charges,
  variant,
  onSelectCharge,
}: {
  charges: RecoverableCharge[];
  variant: "dashboard" | "module";
  onSelectCharge?: (chargeId: string) => void;
}) {
  const alertStats = useMemo(() => computeRecoverableChargesAlerts(charges), [charges]);
  const [filter, setFilter] = useState<AlertFilter>("all");

  const visibleAlerts = useMemo(() => {
    if (variant === "dashboard") return topRecoverableChargeAlerts(alertStats.alerts, 3);
    if (filter === "all") return alertStats.alerts;
    return alertStats.alerts.filter((a) => a.types.includes(filter));
  }, [alertStats.alerts, filter, variant]);

  if (alertStats.alerts.length === 0) {
    if (variant === "module") {
      return (
        <div className="bg-card border border-border rounded-xl px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-muted-foreground shrink-0" />
            <p className="text-sm font-semibold">⚠ Wymaga uwagi</p>
          </div>
          <p className="text-xs text-muted-foreground">Brak pozycji wymagających natychmiastowej uwagi.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`space-y-2 ${variant === "dashboard" ? "pt-1 border-t border-border/60" : "bg-card border border-border rounded-xl px-4 py-4"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle size={12} className="shrink-0" />
          Wymaga uwagi
        </p>
        {variant === "module" && (
          <span className="text-[10px] text-muted-foreground">
            {alertStats.alerts.length}{" "}
            {alertStats.alerts.length === 1 ? "pozycja" : alertStats.alerts.length < 5 ? "pozycje" : "pozycji"}
          </span>
        )}
      </div>

      {variant === "module" && (
        <div className="flex flex-wrap gap-1.5">
          {MODULE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                filter === f.key
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {f.key !== "all" && alertStats.countsByType[f.key] > 0 && (
                <span className="ml-1 opacity-80">({alertStats.countsByType[f.key]})</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const row = (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{alert.title}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtRecoverableAmount(alert.amountRemaining)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.reason}</p>
              {variant === "module" && alert.types.length > 1 && (
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  {alert.types.map((t) => RECOVERABLE_CHARGE_ALERT_TYPE_LABELS[t]).join(" · ")}
                </p>
              )}
            </div>
          );

          if (variant === "module" && onSelectCharge) {
            return (
              <button
                key={alert.chargeId}
                type="button"
                onClick={() => onSelectCharge(alert.chargeId)}
                className="w-full text-left rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 hover:bg-amber-500/10 transition-colors"
              >
                {row}
              </button>
            );
          }

          return (
            <div
              key={alert.chargeId}
              className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2"
            >
              {row}
            </div>
          );
        })}
      </div>

      {variant === "module" && filter !== "all" && visibleAlerts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Brak alertów typu „{RECOVERABLE_CHARGE_ALERT_TYPE_LABELS[filter]}”.
        </p>
      )}
    </div>
  );
}
