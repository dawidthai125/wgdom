import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { DirectoryEmployee, WeekSnapshot } from "@/app/app-domain";
import {
  MONTH_NAMES,
  buildEmployeeArchiveStats,
  fmt,
  fmtDate,
  fmtH,
} from "@/app/app-domain";

export function EmployeeArchiveModal({
  employee,
  savedWeeks,
  onClose,
}: {
  employee: DirectoryEmployee;
  savedWeeks: WeekSnapshot[];
  onClose: () => void;
}) {
  const years = useMemo(
    () => Array.from(new Set(savedWeeks.map((w) => new Date(w.weekFrom).getFullYear()))).sort((a, b) => b - a),
    [savedWeeks],
  );
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const stats = useMemo(
    () => buildEmployeeArchiveStats(employee.id, employee.name, savedWeeks, year),
    [employee.id, employee.name, savedWeeks, year],
  );
  const maxMonthlyNet = Math.max(...stats.monthlyNet, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{employee.name || "Pracownik"}</p>
            <p className="text-xs text-muted-foreground">Karta z archiwum listy płac</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-5">
          {years.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${year === y ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
          {stats.weekCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Brak zapisanych tygodni z tym pracownikiem w {year} r.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Godziny</p>
                  <p className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtH(stats.totalHours)}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wypłaty</p>
                  <p className="text-base font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(stats.totalNet)}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tygodni</p>
                  <p className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.weekCount}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Wypłaty miesięczne · {year}</p>
                <div className="flex items-end gap-1 h-24">
                  {stats.monthlyNet.map((net, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div
                        className={`w-full rounded-t transition-all ${net > 0 ? "bg-primary/70" : "bg-border/40"}`}
                        style={{ height: net > 0 ? `${Math.max(8, (net / maxMonthlyNet) * 72)}px` : "4px" }}
                        title={net > 0 ? `${MONTH_NAMES[i]}: ${fmt(net)} PLN` : MONTH_NAMES[i]}
                      />
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center">{MONTH_NAMES[i].slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tygodnie ({stats.weekCount})</p>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {stats.weeks.map((w) => (
                    <div key={w.weekFrom} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{fmtDate(w.weekFrom)} – {fmtDate(w.weekTo)}</span>
                      <span className="shrink-0 flex items-center gap-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>{fmtH(w.hours)}</span>
                        <span className="font-semibold text-primary">{fmt(w.netPay)} PLN</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
