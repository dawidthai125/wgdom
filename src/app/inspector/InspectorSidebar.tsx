import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import {
  INSPECTOR_MAIN_TAB_DEFS,
  type InspectorMainTab,
} from "@/app/InspectorNavigation";

/** Desktop sidebar width — parity AdminSidebar (`w-60`). */
export const INSPECTOR_SIDEBAR_WIDTH_CLASS = "w-60";

export type InspectorSidebarProps = {
  active: InspectorMainTab;
  dashboardAlertCount?: number;
  onSelect: (tab: InspectorMainTab) => void;
};

export function InspectorSidebar({ active, dashboardAlertCount = 0, onSelect }: InspectorSidebarProps) {
  return (
    <aside
      className={`inspector-sidebar hidden md:flex flex-col border-r border-border bg-card shrink-0 min-h-0 ${INSPECTOR_SIDEBAR_WIDTH_CLASS}`}
      aria-label="Nawigacja inspektora — panel boczny"
    >
      <div className="flex flex-col gap-1 px-4 py-4 border-b border-border shrink-0">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain object-left" />
        <p className="text-xs text-muted-foreground font-medium tracking-wide">Inspektor WM</p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-0.5">
        {INSPECTOR_MAIN_TAB_DEFS.map(({ id, label, icon: Icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${
                on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              aria-current={on ? "page" : undefined}
            >
              <span className="relative shrink-0">
                <Icon size={15} />
                {id === "dashboard" && dashboardAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-red-600 text-white px-0.5">
                    {dashboardAlertCount > 9 ? "9+" : dashboardAlertCount}
                  </span>
                )}
              </span>
              <span className="flex-1 text-left">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
