import { useMemo, useRef } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import type { DirectoryEmployee, Job, WeekEmployee } from "@/app/app-domain";
import {
  MULTI_SITE_SCHEDULE_LABEL,
  getWeekRange,
  scheduleCellFor,
  todayIsoDate,
  weekDayColumns,
} from "@/app/app-domain";

function ScheduleCellBody({ cell }: { cell: ReturnType<typeof scheduleCellFor> }) {
  if (!cell.working) return <span className="text-muted-foreground/50 text-sm">—</span>;
  return (
    <div className="space-y-1 min-h-[40px] flex flex-col items-center justify-start">
      {cell.timeRange && (
        <span className="text-[10px] font-semibold text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
          {cell.timeRange}
        </span>
      )}
      {cell.hoursLabel && <span className="text-[9px] text-muted-foreground">{cell.hoursLabel}</span>}
      {cell.locations.length > 0 ? (
        cell.locations.map((loc, i) => (
          <span key={i} className="text-[9px] leading-snug text-primary flex items-start gap-0.5 max-w-[96px]">
            <MapPin size={8} className="shrink-0 mt-0.5"/>
            <span className="text-left">{loc}</span>
          </span>
        ))
      ) : cell.timeRange ? (
        cell.logisticsOnly ? (
          <span className="text-[9px] leading-snug text-violet-500/90 italic max-w-[96px] text-center">{MULTI_SITE_SCHEDULE_LABEL}</span>
        ) : (
          <span className="text-[9px] text-muted-foreground italic">bez roboty</span>
        )
      ) : null}
    </div>
  );
}

export function ScheduleView({
  weekEmployees,
  weekFrom,
  weekTo,
  jobs,
  directory,
  onWeekChange,
  onGoToCurrent,
  onOpenPayroll,
}: {
  weekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  jobs: Job[];
  directory: DirectoryEmployee[];
  onWeekChange: (from: string, to: string) => void;
  onGoToCurrent: () => void;
  onOpenPayroll: () => void;
}) {
  const columns = useMemo(() => weekDayColumns(weekFrom), [weekFrom]);
  const todayIso = todayIsoDate();
  const currentWeek = getWeekRange();
  const sortedEmps = useMemo(
    () => [...weekEmployees].sort((a, b) => a.name.localeCompare(b.name, "pl")),
    [weekEmployees],
  );
  const scheduleHeaderRef = useRef<HTMLDivElement>(null);
  useWheelScrollForward(scheduleHeaderRef);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div ref={scheduleHeaderRef} className="px-4 sm:px-6 py-4 border-b border-border bg-card shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays size={16} className="text-primary"/>
              Grafik tygodniowy
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kto pracuje, gdzie i w jakich godzinach — ten sam tydzień co Lista Płac
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={weekFrom} onChange={(e) => onWeekChange(e.target.value, weekTo)}
              className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
            <span className="text-muted-foreground text-sm">–</span>
            <input type="date" value={weekTo} onChange={(e) => onWeekChange(weekFrom, e.target.value)}
              className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
            {weekFrom !== currentWeek.from && (
              <button onClick={onGoToCurrent} className="text-xs px-3 py-2.5 min-h-[44px] rounded-lg bg-secondary hover:bg-secondary/70 border border-border font-medium touch-manipulation">
                Bieżący tydzień
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/20 border border-primary/30"/>Dziś</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/15 border border-green-500/25"/>Praca (lista płac)</span>
          <span className="flex items-center gap-1.5"><MapPin size={10} className="text-primary"/>Adres z roboty</span>
        </div>
      </div>

      {sortedEmps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-muted-foreground flex-1">
            <CalendarDays size={40} className="opacity-20 mb-3"/>
            <p className="text-sm font-medium text-foreground">Brak pracowników w tym tygodniu</p>
            <p className="text-xs mt-2 max-w-sm">Dodaj ekipę w Liście Płac i zaznacz dni pracy. Adresy pojawią się po wpisach „Pracownicy na robocie”.</p>
            <button onClick={onOpenPayroll} className="mt-4 px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium touch-manipulation">
              Otwórz Listę Płac
            </button>
          </div>
        ) : (
          <>
            <div className="md:hidden flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
              {sortedEmps.map((emp) => (
                <div key={emp.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border bg-secondary/30">
                    <p className="text-sm font-semibold leading-tight">{emp.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{emp.position || "—"}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {columns.map((col) => {
                      const cell = scheduleCellFor(emp, col.key, col.iso, jobs, directory);
                      const isToday = col.iso === todayIso;
                      return (
                        <div key={col.key} className={`flex items-start gap-3 px-3 py-2.5 ${isToday ? "bg-primary/5" : ""} ${cell.working ? "" : "opacity-50"}`}>
                          <div className="shrink-0 w-11 text-center pt-0.5">
                            <p className={`text-xs font-bold ${isToday ? "text-primary" : ""}`}>{col.shortLabel}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{col.dateLabel}</p>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <ScheduleCellBody cell={cell}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block flex-1 overflow-auto overscroll-contain">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_var(--border)]">
              <tr>
                <th className="sticky left-0 z-30 bg-card border-b border-r border-border px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[120px] sm:min-w-[140px]">
                  Pracownik
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`border-b border-border px-2 py-3 text-center min-w-[88px] sm:min-w-[100px] ${col.iso === todayIso ? "bg-primary/10" : "bg-card"}`}
                  >
                    <p className={`text-xs font-bold ${col.iso === todayIso ? "text-primary" : ""}`}>{col.shortLabel}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{col.dateLabel}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEmps.map((emp, ri) => (
                <tr key={emp.id} className={ri % 2 === 0 ? "bg-background" : "bg-card/40"}>
                  <td className={`sticky left-0 z-10 border-r border-b border-border px-3 py-2.5 ${ri % 2 === 0 ? "bg-background" : "bg-card/40"}`}>
                    <p className="text-sm font-medium leading-tight">{emp.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{emp.position || "—"}</p>
                  </td>
                  {columns.map((col) => {
                    const cell = scheduleCellFor(emp, col.key, col.iso, jobs, directory);
                    const isToday = col.iso === todayIso;
                    return (
                      <td
                        key={col.key}
                        className={`border-b border-border px-1.5 py-2 align-top text-center ${isToday ? "bg-primary/5" : ""} ${cell.working ? "" : "opacity-40"}`}
                      >
                        {cell.working ? (
                          <div className="space-y-1 min-h-[52px] flex flex-col items-center justify-start">
                            <ScheduleCellBody cell={cell}/>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </>
        )}
    </div>
  );
}
