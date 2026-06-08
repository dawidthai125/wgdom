import type { RecoverableCharge } from "@/lib/recoverable-charges";
import {
  JOB_RECOVERABLE_CHARGES_LIST_LIMIT,
  deriveChargeAmounts,
  fmtRecoverableAmount,
  formatRecoverableChargeDate,
  getRecoverableChargeJobStats,
  getRecoverableChargesForJob,
  getRecoverableChargesRecoveredOnJob,
  recoverableChargeDescriptionLine,
  recoverableChargeStatusLabel,
  settlementTargetJobLabel,
  type RecoverableChargeJobStats,
} from "@/lib/recoverable-charges";
import { parseSettlementNote } from "@/app/SettleChargeModal";
import { ChevronRight, Plus, Wallet } from "lucide-react";

type JobLookup = Pick<import("@/app/app-domain").Job, "id" | "address" | "flatNumber" | "client">;

export type JobRecoverableChargesVariant = "admin" | "inspector";

/** Inspektor: badge 💰 gdy są nierozliczone pozycje (Sprint 20.5A.3A). */
export function inspectorRecoverableBadgeVisible(stats: RecoverableChargeJobStats): boolean {
  return stats.unsettledCount > 0;
}

export function JobRecoverableChargesPanel({
  jobId,
  charges,
  onOpenCharge,
  onCreateCharge,
  variant = "admin",
  jobsById,
}: {
  jobId: string;
  charges: RecoverableCharge[];
  onOpenCharge?: (chargeId: string) => void;
  onCreateCharge?: () => void;
  variant?: JobRecoverableChargesVariant;
  jobsById?: Map<string, JobLookup>;
}) {
  const isInspector = variant === "inspector";
  const stats = getRecoverableChargeJobStats(charges, jobId);
  const sourceCharges = getRecoverableChargesForJob(charges, jobId);
  const recoveredRows = getRecoverableChargesRecoveredOnJob(charges, jobId);
  const sourcePreview = sourceCharges.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const sourceOverflow = Math.max(0, sourceCharges.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const recoveredPreview = recoveredRows.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const recoveredOverflow = Math.max(0, recoveredRows.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            💰 Do rozliczenia
          </span>
        </div>
        {!isInspector && onCreateCharge && (
          <button
            type="button"
            onClick={onCreateCharge}
            className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
          >
            <Plus size={12} />
            Dodaj do rozliczenia
          </button>
        )}
      </div>

      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border/60">
        {isInspector ? (
          <>
            <Kpi label="Pozycji" value={String(stats.chargeCount)} />
            <Kpi label="Nierozliczone" value={String(stats.unsettledCount)} warn={stats.unsettledCount > 0} />
            <Kpi label="Do odzyskania" value={fmtRecoverableAmount(stats.toRecoverAmount)} accent />
            <Kpi label="Odzyskano" value={fmtRecoverableAmount(stats.recoveredAmount)} />
          </>
        ) : (
          <>
            <Kpi label="Do odzyskania" value={fmtRecoverableAmount(stats.toRecoverAmount)} accent />
            <Kpi label="Pozycji" value={String(stats.chargeCount)} />
            <Kpi label="Odzyskano" value={fmtRecoverableAmount(stats.recoveredAmount)} />
            <Kpi label="Alerty" value={String(stats.alertCount)} warn={stats.alertCount > 0} />
          </>
        )}
      </div>

      {isInspector && sourcePreview.length > 0 && (
        <div className="px-5 py-3 border-b border-border/60 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pozycje źródłowe
          </p>
          {sourcePreview.map((charge) => (
            <InspectorChargeReviewCard key={charge.id} charge={charge} jobsById={jobsById} />
          ))}
          {sourceOverflow > 0 && (
            <p className="text-[10px] text-muted-foreground">+ {sourceOverflow} kolejnych</p>
          )}
        </div>
      )}

      {!isInspector && sourcePreview.length > 0 && (
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
          {isInspector ? (
            <ul className="space-y-2">
              {recoveredPreview.map((row) => (
                <li
                  key={row.chargeId}
                  className="bg-secondary/30 rounded-xl px-3 py-2.5 text-xs"
                >
                  <p className="font-medium truncate">{row.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Odzyskano {fmtRecoverableAmount(row.recoveredAmount)} · {formatRecoverableChargeDate(row.lastSettledAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
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
          )}
          {recoveredOverflow > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">+ {recoveredOverflow} kolejnych</p>
          )}
        </div>
      )}

      {stats.chargeCount === 0 && stats.recoveredCount === 0 && (
        <p className="px-5 py-4 text-xs text-muted-foreground">
          {isInspector
            ? "Brak pozycji powiązanych z tą robotą."
            : "Brak pozycji powiązanych z tą robotą — dodaj pierwszą pozycję do odzyskania."}
        </p>
      )}
    </div>
  );
}

function InspectorChargeReviewCard({
  charge,
  jobsById,
}: {
  charge: RecoverableCharge;
  jobsById?: Map<string, JobLookup>;
}) {
  const amounts = deriveChargeAmounts(charge);
  const history = [...(charge.settlements ?? [])].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
  const clientLabel =
    charge.clientName.trim()
    || (charge.sourceJobId && jobsById?.get(charge.sourceJobId)?.client?.trim())
    || "—";

  return (
    <div className="bg-secondary/25 border border-border/60 rounded-xl p-3 space-y-2.5 text-xs">
      <div>
        <p className="text-sm font-medium leading-snug">
          {charge.title.trim() || recoverableChargeDescriptionLine(charge)}
        </p>
        {charge.description.trim() && charge.title.trim() && (
          <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-words">{charge.description.trim()}</p>
        )}
      </div>
      <p className="text-[10px]">{recoverableChargeStatusLabel(amounts.status, true)}</p>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <span><span className="text-muted-foreground">Klient: </span>{clientLabel}</span>
        <span><span className="text-muted-foreground">Utworzono: </span>{formatRecoverableChargeDate(charge.createdAt)}</span>
        <span><span className="text-muted-foreground">Zmiana: </span>{formatRecoverableChargeDate(charge.updatedAt)}</span>
        {charge.responsibleInspector.trim() && (
          <span><span className="text-muted-foreground">Inspektor: </span>{charge.responsibleInspector}</span>
        )}
      </div>
      <div className="bg-card/80 rounded-lg p-2.5 space-y-1.5 border border-border/40">
        <AmountLine label="Kwota pierwotna" value={fmtRecoverableAmount(charge.amount)} />
        <AmountLine label="Rozliczono" value={fmtRecoverableAmount(amounts.amountSettled)} />
        <AmountLine label="Pozostało" value={fmtRecoverableAmount(amounts.amountRemaining)} emphasis />
      </div>
      {history.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Historia rozliczeń</p>
          {history.map((s) => {
            const { typeLabel, userNote } = parseSettlementNote(s.note);
            const targetLabel = settlementTargetJobLabel(s, jobsById);
            return (
              <div key={s.id} className="bg-card/60 rounded-lg p-2.5 space-y-1 border border-border/30">
                <p className="font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRecoverableChargeDate(s.settledAt)} · {fmtRecoverableAmount(s.amount)}
                </p>
                {s.targetJobId && (
                  <p><span className="text-muted-foreground">Robota docelowa: </span>{targetLabel}</p>
                )}
                <p><span className="text-muted-foreground">Rozliczył: </span>{s.settledBy || "—"}</p>
                {s.onBehalfOf && (
                  <p><span className="text-muted-foreground">Na podstawie: </span>{s.onBehalfOf}</p>
                )}
                {typeLabel && (
                  <p><span className="text-muted-foreground">Typ: </span>{typeLabel}</p>
                )}
                {userNote && (
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">{userNote}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AmountLine({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${emphasis ? "font-bold text-primary" : "font-semibold"}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </span>
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
