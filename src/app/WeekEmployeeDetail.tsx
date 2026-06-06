import { useCallback } from "react";
import { Banknote, X, Plus, Trash2, FileText, Clock, Receipt, ThumbsUp, ThumbsDown, SkipForward } from "lucide-react";
import { useAdminAccess } from "@/app/admin-access";
import { PayrollDayEditor } from "@/app/payroll-editors";
import {
  isBiweeklyPayrollEmployee,
  calcBiweeklyRowDisplay,
  calcWeekNetNoPrevSat,
} from "@/lib/payroll-cycle";
import {
  canDeferPayroll,
  CARRY_FORWARD_LABEL,
  type PayrollCalcWithAdjustments,
} from "@/lib/payroll-carry-forward";
import {
  type WeekEmployee,
  type WeekSnapshot,
  type DirectoryEmployee,
  type DayKey,
  type DayData,
  type EmployeeExtraCost,
  DAYS,
  DAY_LABELS,
  fmt,
  fmtH,
  calcWeekEmployee,
  previousSaturdayIso,
  defaultDay,
  defaultDays,
  fmtDate,
  PREV_SAT_SHORT,
  getPrevSaturday,
} from "@/app/app-domain";

/** Uzupełnia brakujące dni (stare archiwum / niepełny sync). */
function ensureWeekEmployeeDays(emp: WeekEmployee): WeekEmployee {
  const base = defaultDays();
  const days = { ...base };
  for (const k of DAYS) {
    const d = emp.days?.[k];
    if (d && typeof d === "object") days[k] = { ...defaultDay(), ...d };
  }
  return {
    ...emp,
    days,
    prevSaturday: emp.prevSaturday && typeof emp.prevSaturday === "object"
      ? { ...defaultDay(), ...emp.prevSaturday }
      : defaultDay(),
    extraCosts: emp.extraCosts ?? [],
  };
}

export function WeekEmployeeDetail({
  emp,
  weekFrom,
  weekTo,
  directory,
  savedWeeks,
  isArchivedWeek = false,
  payrollRow,
  onDeferPayroll,
  onChange,
  onClose,
}: {
  emp: WeekEmployee;
  weekFrom: string;
  weekTo: string;
  directory: DirectoryEmployee[];
  savedWeeks: WeekSnapshot[];
  isArchivedWeek?: boolean;
  payrollRow?: { emp: WeekEmployee } & PayrollCalcWithAdjustments;
  onDeferPayroll?: (emp: WeekEmployee) => void;
  onChange: (u: WeekEmployee) => void;
  onClose: () => void;
}) {
  const safeEmp = ensureWeekEmployeeDays(emp);
  const { canViewRates } = useAdminAccess();
  const biweekly = isBiweeklyPayrollEmployee(safeEmp, directory);
  const biweeklyRow = biweekly ? calcBiweeklyRowDisplay(safeEmp, directory, weekFrom, weekTo, savedWeeks) : null;
  const updateDayData = useCallback((key: DayKey, next: DayData) => {
    onChange({ ...safeEmp, days: { ...safeEmp.days, [key]: next } });
  }, [safeEmp, onChange]);
  const prevSatIso = previousSaturdayIso(weekFrom);
  const extraCosts = safeEmp.extraCosts ?? [];
  const updateExtraCosts = useCallback((next: EmployeeExtraCost[]) => {
    onChange({ ...safeEmp, extraCosts: next });
  }, [safeEmp, onChange]);
  const addExtraCost = () => {
    updateExtraCosts([...extraCosts, { id: crypto.randomUUID(), description: "", amount: "" }]);
  };
  const {
    weekHours, prevSatHours, totalHours, totalExtraHours,
    totalZaliczka, totalExtraCosts, grossPay, weekGross, prevSatGross, netPay, rateNum,
  } = calcWeekEmployee(safeEmp);
  const weekOnly = biweekly ? calcWeekNetNoPrevSat(safeEmp) : null;
  const deferCheck = payrollRow ? canDeferPayroll(safeEmp, payrollRow, directory, isArchivedWeek) : { ok: false as const };
  const displayNet =
    payrollRow?.leaveStatus
      ? 0
      : payrollRow?.carryForwardOut
        ? 0
        : payrollRow?.carryForwardIn
          ? payrollRow.displayNetPay
          : biweekly && biweeklyRow
            ? biweeklyRow.isPayoutWeek
              ? biweeklyRow.displayNet
              : biweeklyRow.thisWeekNet
            : netPay;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-semibold">{safeEmp.name||"Pracownik"}</p>
          <p className="text-xs text-muted-foreground">{safeEmp.position||"—"}</p>
        </div>
        <button onClick={onClose} className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X size={16}/></button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
        {canViewRates && (
        <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
          <Banknote size={14} className="text-muted-foreground shrink-0"/>
          <span className="text-sm text-muted-foreground flex-1">Stawka w tym tygodniu</span>
          <input type="number" min="0" step="0.50" value={safeEmp.rate}
            onChange={(e)=>onChange({...safeEmp,rate:e.target.value})}
            className="w-24 bg-background rounded-lg px-2 py-2 text-base text-right border border-transparent focus:border-primary focus:outline-none"
            style={{fontFamily:"'JetBrains Mono', monospace"}}/>
          <span className="text-xs text-muted-foreground">PLN/h</span>
        </div>
        )}

        {biweekly && biweeklyRow && (
          <div className="bg-sky-500/10 border border-sky-500/25 rounded-xl px-4 py-3 text-xs text-sky-300 leading-relaxed">
            <p className="font-semibold text-sky-200 mb-1">Wypłata co 2 tygodnie</p>
            {biweeklyRow.isPayoutWeek ? (
              <p>Ten tydzień to sobota wypłaty — łącznie za {fmtDate(biweeklyRow.prevWeekFrom)}–{fmtDate(biweeklyRow.prevWeekTo)} + bieżący tydzień: <strong>{fmt(biweeklyRow.displayNet)} PLN</strong>.</p>
            ) : (
              <p>Ten tydzień narasta na wypłatę <strong>{fmtDate(biweeklyRow.nextPayoutDate)}</strong>: {fmt(biweeklyRow.thisWeekNet)} PLN (bez wypłaty w tę sobotę).</p>
            )}
          </div>
        )}

        {/* Days */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.95fr)] px-4 py-2 text-xs text-muted-foreground border-b border-border gap-2" style={{fontFamily:"'JetBrains Mono', monospace"}}>
            <span>Dzień</span><span className="text-center">Od</span><span className="text-center">Do</span><span className="text-center">Godziny</span><span className="text-center">Zaliczka</span>
          </div>
          <div className="divide-y divide-border">
            {!biweekly && (
            <div className="bg-amber-500/5 border-b border-amber-500/15">
              <PayrollDayEditor
                day={getPrevSaturday(safeEmp)}
                title={PREV_SAT_SHORT}
                hint={`${fmtDate(prevSatIso)} · wypłata w tym tygodniu`}
                titleClass="text-amber-500"
                variant="prevSaturday"
                onUpdate={(next) => onChange({ ...safeEmp, prevSaturday: { ...next, extraHours: undefined } })}
              />
            </div>
            )}
            {DAYS.map((key) => (
              <PayrollDayEditor
                key={key}
                day={safeEmp.days[key]}
                title={DAY_LABELS[key]}
                titleClass={key === "So" ? "text-primary" : ""}
                hint={key === "So" ? "Bieżąca sobota — czasem wypłata w sobotę" : undefined}
                onUpdate={(next) => updateDayData(key, next)}
              />
            ))}
          </div>
          <p className="hidden sm:block px-4 py-2 text-[10px] text-muted-foreground/60 border-t border-border/50">Sob. poprz. = sobota z poprzedniego tygodnia (płatna teraz). Bieżąca sobota = ostatni dzień tygodnia Pn–So.</p>
        </div>

        {/* Koszty do zwrotu */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-semibold">Koszty do zwrotu</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Chemia, paliwo, zakupy na budowę — dopłata do wypłaty</p>
            </div>
            <button type="button" onClick={addExtraCost} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors">
              <Plus size={13}/> Dodaj
            </button>
          </div>
          {extraCosts.length === 0 ? (
            <p className="px-4 py-4 text-xs text-muted-foreground text-center">Brak kosztów w tym tygodniu</p>
          ) : (
            <div className="divide-y divide-border">
              {extraCosts.map((cost) => {
                const st = extraCostStatus(cost);
                return (
                <div key={cost.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      placeholder="Opis (np. chemia, paliwo)"
                      value={cost.description}
                      onChange={(e) => updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? { ...c, description: e.target.value } : c))}
                      className="flex-1 min-w-0 bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={cost.amount}
                      onChange={(e) => updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? { ...c, amount: e.target.value } : c))}
                      className="w-24 shrink-0 bg-secondary rounded-lg px-2 py-2 text-sm text-right border border-transparent focus:border-primary focus:outline-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <span className="text-xs text-muted-foreground pt-2.5 shrink-0">PLN</span>
                    <button
                      type="button"
                      onClick={() => updateExtraCosts(extraCosts.filter((c) => c.id !== cost.id))}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-0.5">
                    {st !== "approved" && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        st === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {EXTRA_COST_STATUS_LABELS[st]}
                      </span>
                    )}
                    {cost.submittedBy && (
                      <span className="text-[10px] text-muted-foreground">od {cost.submittedBy}</span>
                    )}
                    {cost.receiptUrl && (
                      <a href={cost.receiptUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <Receipt size={10}/> Paragon / faktura
                      </a>
                    )}
                    {st === "rejected" && cost.rejectReason && (
                      <span className="text-[10px] text-red-400/90 italic">Powód: {cost.rejectReason}</span>
                    )}
                    {st === "pending" && (
                      <>
                        <button type="button"
                          onClick={() => updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? { ...c, status: "approved" as const, rejectReason: undefined } : c))}
                          className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 font-medium flex items-center gap-1">
                          <ThumbsUp size={10}/> Akceptuj
                        </button>
                        <button type="button"
                          onClick={() => {
                            const reason = window.prompt("Powód odrzucenia (opcjonalnie):", "") ?? "";
                            updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? {
                              ...c,
                              status: "rejected" as const,
                              rejectReason: reason.trim() || undefined,
                            } : c));
                          }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium flex items-center gap-1">
                          <ThumbsDown size={10}/> Odrzuć
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>

        {!isArchivedWeek && onDeferPayroll && deferCheck.ok && (
          <button
            type="button"
            onClick={() => onDeferPayroll(safeEmp)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm font-medium hover:bg-amber-500/20 transition-colors"
          >
            <SkipForward size={16} />
            Przenieś {fmt(deferCheck.frozenAmount ?? 0)} PLN na następny tydzień
          </button>
        )}

        {safeEmp.payrollCarryForward?.amount != null && safeEmp.payrollCarryForward.amount > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {CARRY_FORWARD_LABEL} — {fmt(safeEmp.payrollCarryForward.amount)} PLN → tydzień {fmtDate(safeEmp.payrollCarryForward.targetWeekFrom)}–{fmtDate(safeEmp.payrollCarryForward.targetWeekTo)}
          </div>
        )}

        {payrollRow?.carryForwardIn != null && payrollRow.carryForwardIn > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
            Przeniesiona wypłata: +{fmt(payrollRow.carryForwardIn)} PLN
            {payrollRow.carryForwardInFrom ? ` (z ${fmtDate(payrollRow.carryForwardInFrom.from)}–${fmtDate(payrollRow.carryForwardInFrom.to)})` : ""}
          </div>
        )}

        {/* Mini summary */}
        <div className="space-y-2">
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Tydzień Pn–So</span><span className="font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(weekOnly?.weekHours ?? weekHours)}</span></div>
          {prevSatHours>0&&!biweekly&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">{PREV_SAT_SHORT}</span><span className="font-semibold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(prevSatHours)}</span></div>}
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Razem godzin</span><span className="font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(weekOnly?.weekHours ?? totalHours)}</span></div>
          {totalExtraHours>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">w tym dodatkowe</span><span className="font-semibold text-primary/80" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalExtraHours)}</span></div>}
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Brutto tydzień</span><span className="font-semibold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(weekOnly?.grossPay ?? weekGross)} PLN</span></div>
          {prevSatGross>0&&!biweekly&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Brutto {PREV_SAT_SHORT}</span><span className="font-semibold text-amber-500/90" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(prevSatGross)} PLN</span></div>}
          {biweekly && biweeklyRow && !biweeklyRow.isPayoutWeek && (
            <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Na wypłatę {fmtDate(biweeklyRow.nextPayoutDate)}</span><span className="font-semibold text-sky-400" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(biweeklyRow.thisWeekNet)} PLN</span></div>
          )}
          {biweekly && biweeklyRow && biweeklyRow.isPayoutWeek && biweeklyRow.prevWeekNet > 0 && (
            <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Poprzedni tydzień ({fmtDate(biweeklyRow.prevWeekFrom).slice(0,5)}–{fmtDate(biweeklyRow.prevWeekTo).slice(0,5)})</span><span className="font-semibold text-sky-400" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(biweeklyRow.prevWeekNet)} PLN</span></div>
          )}
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Brutto razem</span><span className="font-semibold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(weekOnly?.grossPay ?? grossPay)} PLN</span></div>
          {(weekOnly?.totalZaliczka ?? totalZaliczka)>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Zaliczki</span><span className="font-semibold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>−{fmt(weekOnly?.totalZaliczka ?? totalZaliczka)} PLN</span></div>}
          {totalExtraCosts>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Koszty do zwrotu</span><span className="font-semibold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>+{fmt(totalExtraCosts)} PLN</span></div>}
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-primary">
              {payrollRow?.carryForwardOut ? "Do wypłaty" : biweekly && biweeklyRow && !biweeklyRow.isPayoutWeek ? "Ten tydzień (narasta)" : "Do wypłaty"}
            </span>
            <span className={`text-xl font-bold ${displayNet < 0 ? "text-destructive" : payrollRow?.carryForwardOut ? "text-amber-400" : "text-primary"}`} style={{fontFamily:"'JetBrains Mono', monospace"}}>
              {payrollRow?.carryForwardOut ? CARRY_FORWARD_LABEL : `${fmt(displayNet)} PLN`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

