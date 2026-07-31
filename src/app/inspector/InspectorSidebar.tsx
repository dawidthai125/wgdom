import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { cn } from "@/app/components/ui/utils";
import { WgButton } from "@/app/ui";
import {
  INSPECTOR_MAIN_TAB_DEFS,
  type InspectorMainTab,
} from "@/app/InspectorNavigation";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_MD,
  WG_TOUCH_MIN,
} from "@/lib/wg-ui-tokens";

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
      className={cn(
        "inspector-sidebar hidden md:flex flex-col shrink-0 min-h-0",
        "border-r border-border/60 bg-card",
        INSPECTOR_SIDEBAR_WIDTH_CLASS,
      )}
      aria-label="Nawigacja inspektora — panel boczny"
    >
      <div className="flex flex-col gap-1 px-4 py-4 border-b border-border/50 shrink-0">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain object-left" />
        <p className="text-xs text-muted-foreground font-medium tracking-wide">Inspektor WM</p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1" aria-label="Nawigacja inspektora">
        {INSPECTOR_MAIN_TAB_DEFS.map(({ id, label, icon: Icon }) => {
          const on = active === id;
          return (
            <WgButton
              key={id}
              type="button"
              variant="ghost"
              onClick={() => onSelect(id)}
              className={cn(
                "relative w-full min-w-0 max-w-full flex items-center justify-start gap-2.5",
                WG_TOUCH_MIN,
                "min-h-[44px] px-3.5 py-2.5",
                WG_RADIUS_MD,
                "text-sm font-medium",
                `transition-colors ${WG_DURATION_HOVER}`,
                "motion-reduce:transition-none",
                WG_FOCUS_RING,
                "before:absolute before:left-0 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-primary",
                "before:transition-opacity before:duration-150 before:motion-reduce:transition-none",
                on
                  ? "bg-primary/10 text-primary font-semibold before:opacity-100 hover:bg-primary/15"
                  : "text-muted-foreground before:opacity-0 hover:text-foreground hover:bg-secondary/60",
              )}
              aria-current={on ? "page" : undefined}
            >
              <span className="relative shrink-0">
                <Icon size={15} aria-hidden />
                {id === "dashboard" && dashboardAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 flex items-center justify-center text-[11px] font-bold rounded-md bg-red-600 text-white px-0.5">
                    {dashboardAlertCount > 9 ? "9+" : dashboardAlertCount}
                  </span>
                )}
              </span>
              <span className="flex-1 text-left truncate">{label}</span>
            </WgButton>
          );
        })}
      </nav>
    </aside>
  );
}
