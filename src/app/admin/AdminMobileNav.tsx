import { Menu, X } from "lucide-react";
import type { AdminNavItem, View } from "@/app/admin/admin-nav";

export type AdminMobileNavProps = {
  view: View;
  payrollDetailOpen: boolean;
  mobileNavPrimary: AdminNavItem[];
  mobileNavMore: AdminNavItem[];
  mobileMoreActive: boolean;
  mobileMoreOpen: boolean;
  navItems: AdminNavItem[];
  todayFieldStats: { label: string; people: number; jobs: number };
  onGoToView: (v: View) => void;
  onOpenMore: () => void;
  onCloseMore: () => void;
};

export function AdminMobileNav({
  view,
  payrollDetailOpen,
  mobileNavPrimary,
  mobileNavMore,
  mobileMoreActive,
  mobileMoreOpen,
  navItems,
  todayFieldStats,
  onGoToView,
  onOpenMore,
  onCloseMore,
}: AdminMobileNavProps) {
  return (
    <>
      {!payrollDetailOpen && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {mobileNavPrimary.map(({ key, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => onGoToView(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 relative transition-colors ${view === key ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className="relative">
                <Icon size={22} />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground px-0.5">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">
                {navItems.find((n) => n.key === key)?.label.split(" ")[0]}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenMore}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 relative transition-colors ${mobileMoreActive ? "text-primary" : "text-muted-foreground"}`}
          >
            <Menu size={22} />
            <span className="text-[10px] font-medium leading-none">Więcej</span>
          </button>
        </nav>
      )}

      {mobileMoreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={onCloseMore}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl px-4 pt-4 pb-2 max-h-[70dvh] overflow-y-auto"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Menu</p>
              <button
                type="button"
                onClick={onCloseMore}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground flex justify-between gap-2 mb-3 pb-3 border-b border-border">
              <span>Dziś ({todayFieldStats.label})</span>
              <span className="font-medium shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {todayFieldStats.people} os. · {todayFieldStats.jobs} rob.
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {mobileNavMore.map(({ key, label, icon: Icon, badge }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onGoToView(key)}
                  className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border transition-colors ${view === key ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <div className="relative">
                    <Icon size={20} />
                    {badge !== undefined && badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground px-0.5">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight px-1">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
