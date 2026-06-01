import { MapPin } from "lucide-react";
import type { DirectoryEmployee, WeekSnapshot } from "@/app/app-domain";
import { MULTI_SITE_SCHEDULE_LABEL, weekDayColumns, scheduleCellFromArchive } from "@/app/app-domain";

export function ArchiveScheduleGrid({
  week,
  directory,
}: {
  week: WeekSnapshot;
  directory: DirectoryEmployee[];
}) {
  const emps = week.weekEmployees ?? [];
  const workEntries = week.workEntries ?? [];
  const columns = weekDayColumns(week.weekFrom);
  const sortedEmps = [...emps].sort((a, b) => a.name.localeCompare(b.name, "pl"));

  if (emps.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-muted-foreground text-sm">
        Brak zapisanego grafiku — to starszy wpis archiwum (tylko podsumowanie płac).
        <p className="text-xs mt-2">Nowe zapisy tygodnia zawierają pełny grafik.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="bg-secondary/30">
            <th className="sticky left-0 z-10 bg-secondary/30 border-b border-r border-border px-3 py-2 text-xs font-semibold text-muted-foreground min-w-[120px]">
              Pracownik
            </th>
            {columns.map((col) => (
              <th key={col.key} className="border-b border-border px-2 py-2 text-center min-w-[80px]">
                <p className="text-xs font-bold">{col.shortLabel}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{col.dateLabel}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedEmps.map((emp, ri) => (
            <tr key={emp.id} className={ri % 2 === 0 ? "bg-background" : "bg-card/30"}>
              <td className={`sticky left-0 z-10 border-r border-b border-border px-3 py-2 ${ri % 2 === 0 ? "bg-background" : "bg-card/30"}`}>
                <p className="text-sm font-medium">{emp.name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{emp.position || "—"}</p>
              </td>
              {columns.map((col) => {
                const cell = scheduleCellFromArchive(emp, col.key, col.iso, workEntries, directory);
                return (
                  <td key={col.key} className={`border-b border-border px-1.5 py-2 align-top text-center ${cell.working ? "" : "opacity-40"}`}>
                    {cell.working ? (
                      <div className="space-y-1 flex flex-col items-center">
                        {cell.timeRange && (
                          <span className="text-[10px] font-semibold text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                            {cell.timeRange}
                          </span>
                        )}
                        {cell.hoursLabel && (
                          <span className="text-[9px] text-muted-foreground">{cell.hoursLabel}</span>
                        )}
                        {cell.locations.map((loc, i) => (
                          <span key={i} className="text-[9px] text-primary flex items-start gap-0.5 max-w-[88px]">
                            <MapPin size={8} className="shrink-0 mt-0.5"/>
                            <span className="text-left">{loc}</span>
                          </span>
                        ))}
                        {cell.timeRange && cell.locations.length === 0 && (
                          cell.logisticsOnly ? (
                            <span className="text-[9px] leading-snug text-violet-500/90 italic max-w-[88px] text-center">
                              {MULTI_SITE_SCHEDULE_LABEL}
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">bez roboty</span>
                          )
                        )}
                        {!cell.timeRange && cell.locations.length === 0 && (
                          <span className="text-[9px] text-muted-foreground italic">robota</span>
                        )}
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
  );
}
