import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { NavItemWithHint } from "@/app/app-ui";
import { fmt, fmtDate } from "@/app/app-domain";
import type { WeekEmployee } from "@/app/app-domain";
import type { computePayrollCashSplit } from "@/lib/payroll-cycle";
import type { AdminNavItem, View } from "@/app/admin/admin-nav";

type PayrollCashSplit = ReturnType<typeof computePayrollCashSplit>;

export type AdminSidebarProps = {
  sidebarOpen: boolean;
  view: View;
  navItems: AdminNavItem[];
  onGoToView: (v: View) => void;
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  todayFieldStats: { label: string; people: number; jobs: number };
  totalNet: number;
  payrollCashSplitSidebar: PayrollCashSplit;
};

export function AdminSidebar({
  sidebarOpen,
  view,
  navItems,
  onGoToView,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  todayFieldStats,
  totalNet,
  payrollCashSplitSidebar,
}: AdminSidebarProps) {
  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0 min-h-0 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}`}
    >
      <div className="admin-sidebar-logo flex flex-col gap-1.5 px-4 py-4 border-b border-border shrink-0">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain object-left" />
        <p className="text-xs text-muted-foreground font-medium tracking-wide">Zarządzanie Pracą</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <nav className="admin-sidebar-nav px-3 py-3 space-y-0.5 border-b border-border">
          {navItems.map(({ key, label, hint, icon: Icon, badge }) => (
            <NavItemWithHint key={key} hint={hint}>
              <button
                onClick={() => onGoToView(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <Icon size={15} />
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${view === key ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            </NavItemWithHint>
          ))}
        </nav>

        <div className="px-4 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Bieżący tydzień</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pracownicy</span>
              <span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {productionWeekEmployees.length}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Okres</span>
              <span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtDate(weekFrom).slice(0, 5)}–{fmtDate(weekTo).slice(0, 5)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Rozliczeni</span>
              <span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {productionWeekEmployees.filter((e) => e.settled).length}/{productionWeekEmployees.length}
              </span>
            </div>
            <div className="flex justify-between items-baseline gap-2 text-xs pt-0.5">
              <span className="text-muted-foreground leading-snug">
                Dziś
                <span className="text-muted-foreground/65 normal-case"> ({todayFieldStats.label})</span>
              </span>
              <span
                className="font-medium text-right leading-snug shrink-0"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                title="Osoby z wpisem czasu pracy na aktywnej robocie"
              >
                {todayFieldStats.people} os. · {todayFieldStats.jobs} rob.
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-border space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Do wypłaty w sobotę</p>
                <p className="text-lg font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(totalNet)} PLN
                </p>
              </div>
              {payrollCashSplitSidebar.hasBiweeklyEmployees && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Tygodniówki</span>
                    <span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmt(payrollCashSplitSidebar.weeklyNet)}
                    </span>
                  </div>
                  {payrollCashSplitSidebar.isAnyBiweeklyPayoutWeek ? (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-sky-400/90">Co 2 tyg.</span>
                      <span className="font-medium text-sky-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(payrollCashSplitSidebar.biweeklyPayoutNet)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Co 2 tyg. → {fmtDate(payrollCashSplitSidebar.nextBiweeklyPayoutDate).slice(0, 5)}
                      </span>
                      <span className="font-medium text-sky-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(payrollCashSplitSidebar.biweeklyAccruedNet)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
