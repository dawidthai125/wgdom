import { ChevronRight, Wallet } from "lucide-react";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import {
  JOB_RECOVERABLE_CHARGES_LIST_LIMIT,
  deriveChargeAmounts,
  fmtRecoverableAmount,
  formatRecoverableChargeDate,
  getRecoverableChargeJobStats,
  getRecoverableChargesForJob,
  getRecoverableChargesRecoveredOnJob,
  recoverableChargeStatusLabel,
} from "@/lib/recoverable-charges";

export function JobRecoverableChargesPanel({
  jobId,
  charges,
  onOpenCharge,
}: {
  jobId: string;
  charges: RecoverableCharge[];
  onOpenCharge?: (chargeId: string) => void;
}) {
  const stats = getRecoverableChargeJobStats(charges, jobId);
  if (stats.chargeCount === 0 && stats.recoveredCount === 0) return null;

  const sourceCharges = getRecoverableChargesForJob(charges, jobId);
  const recoveredRows = getRecoverableChargesRecoveredOnJob(charges, jobId);
  const sourcePreview = sourceCharges.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const sourceOverflow = Math.max(0, sourceCharges.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const recoveredPreview = recoveredRows.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const recoveredOverflow = Math.max(0, recoveredRows.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Wallet size={13} className="text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          💰 Do rozliczenia
        </span>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border/60">
        <Kpi label="Do odzyskania" value={fmtRecoverableAmount(stats.toRecoverAmount)} accent />
        <Kpi label="Pozycji" value={String(stats.chargeCount)} />
        <Kpi label="Odzyskano" value={fmtRecoverableAmount(stats.recoveredAmount)} />
        <Kpi
          label="Alerty"
          value={String(stats.alertCount)}
          warn={stats.alertCount > 0}
        />
      </div>

      {sourcePreview.length > 0 && (
        <div className="px-5 py-3 border-b border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Pozycje źródłowe
          </p>
          <ul className="divide-y divide-border/60">
            {sourcePreview.map((charge) => {
              const { amountRemaining, status } = deriveChargeAmounts(charge);
              const title = charge.title.trim() || charge.description.trim().slice(0, 80) || "Pozycja";
              return (
                <li key={charge.id}>
                  <button
                    type="button"
                    onClick={() => onOpenCharge?.(charge.id)}
                    disabled={!onOpenCharge}
                    className="w-full text-left py-2.5 flex items-center gap-2 hover:bg-secondary/30 rounded-lg px-1 -mx-1 transition-colors disabled:cursor-default disabled:hover:bg-transparent group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {recoverableChargeStatusLabel(status, true)} · pozostało{" "}
                        {fmtRecoverableAmount(amountRemaining)}
                      </p>
                    </div>
                    {onOpenCharge && (
                      <ChevronRight
                        size={12}
                        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {sourceOverflow > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">+ {sourceOverflow} kolejnych</p>
          )}
        </div>
      )}

      {recoveredPreview.length > 0 && (
        <div className="px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Rozliczenia na tej robocie
          </p>
          <ul className="divide-y divide-border/60">
            {recoveredPreview.map((row) => (
              <li key={row.chargeId}>
                <button
                  type="button"
                  onClick={() => onOpenCharge?.(row.chargeId)}
                  disabled={!onOpenCharge}
                  className="w-full text-left py-2.5 flex items-center gap-2 hover:bg-secondary/30 rounded-lg px-1 -mx-1 transition-colors disabled:cursor-default disabled:hover:bg-transparent group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{row.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Odzyskano {fmtRecoverableAmount(row.recoveredAmount)} ·{" "}
                      {formatRecoverableChargeDate(row.lastSettledAt)}
                    </p>
                  </div>
                  {onOpenCharge && (
                    <ChevronRight
                      size={12}
                      className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {recoveredOverflow > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">+ {recoveredOverflow} kolejnych</p>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p
        className={`text-sm font-semibold tabular-nums ${
          warn ? "text-amber-600 dark:text-amber-400" : accent ? "text-primary" : "text-foreground"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
    </div>
  );
}
