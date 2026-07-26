import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { NavItemWithHint } from "@/app/app-ui";
import type { AdminNavItem, View } from "@/app/admin/admin-nav";
import { isNavItemActive } from "@/app/admin/admin-nav";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_MD,
  WG_TYPE_LABEL,
} from "@/lib/wg-ui-tokens";

/** Desktop sidebar width — w-56 (224px) + 16px komfortu etykiet (v2.57.3). */
export const ADMIN_SIDEBAR_WIDTH_CLASS = "w-60";

export type AdminSidebarProps = {
  sidebarOpen: boolean;
  view: View;
  navItems: AdminNavItem[];
  onGoToView: (v: View) => void;
};

/** Presentation-only section map (UI-01C DF-07) — order of keys matches buildAdminNavItems. */
const NAV_SECTIONS: { id: string; label: string; keys: View[] }[] = [
  { id: "praca", label: "Praca", keys: ["dashboard", "payroll", "schedule", "directory"] },
  { id: "operacje", label: "Operacje", keys: ["archive", "jobs", "wmprint", "tenders"] },
  {
    id: "kontrola",
    label: "Kontrola",
    keys: ["operationalnotes", "inspector", "recoverablecharges", "media", "audit"],
  },
  { id: "pomoc", label: "Pomoc", keys: ["guide", "changelog"] },
];

function groupNavItems(navItems: AdminNavItem[]) {
  const byKey = new Map(navItems.map((item) => [item.key, item]));
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.keys
      .map((key) => byKey.get(key))
      .filter((item): item is AdminNavItem => item !== undefined),
  })).filter((section) => section.items.length > 0);
}

/**
 * WGDOM-UI-01C — Sidebar visual polish (DF-01…15).
 * No routing / badge math / collapse behavior changes.
 */
export function AdminSidebar({
  sidebarOpen,
  view,
  navItems,
  onGoToView,
}: AdminSidebarProps) {
  const sections = groupNavItems(navItems);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 min-h-0",
        "border-r border-border/60 bg-card",
        "transition-all duration-300",
        "motion-reduce:transition-none",
        sidebarOpen ? ADMIN_SIDEBAR_WIDTH_CLASS : "w-0 overflow-hidden",
      )}
    >
      <div className="admin-sidebar-logo flex flex-col gap-1 px-4 py-4 border-b border-border/50 shrink-0">
        <ImageWithFallback
          src={logoSrc}
          alt="W&G DOM"
          className="h-8 w-auto object-contain object-left"
        />
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          Zarządzanie Pracą
        </p>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain admin-sidebar-scroll">
        <nav className="admin-sidebar-nav min-w-0 px-3 py-3 space-y-1" aria-label="Nawigacja główna">
          {sections.map((section, sectionIndex) => (
            <div key={section.id} className={cn("min-w-0", sectionIndex > 0 && "pt-2")}>
              <p
                className={cn(
                  WG_TYPE_LABEL,
                  "px-3.5 pb-1.5 pt-1 truncate",
                  sectionIndex === 0 && "pt-0",
                )}
              >
                {section.label}
              </p>
              <div className="min-w-0 space-y-1">
                {section.items.map(({ key, label, hint, icon: Icon, badge }) => {
                  const active = isNavItemActive(key, view);
                  return (
                    <div key={key} className="min-w-0 w-full">
                      <NavItemWithHint hint={hint}>
                        <button
                          type="button"
                          onClick={() => onGoToView(key)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            // min-w-0: flex default min-width:auto blokował truncate → horizontal scroll
                            "relative w-full min-w-0 max-w-full flex items-center gap-2.5",
                            // DF-14: komfortowy poziomy rytm (szerokość w-60 bez zmian)
                            "min-h-10 px-3.5 py-2",
                            WG_RADIUS_MD,
                            "text-sm",
                            `transition-colors ${WG_DURATION_HOVER}`,
                            "motion-reduce:transition-none",
                            WG_FOCUS_RING,
                            // DF-04/15: active rail — tylko opacity (zakaz translate/scale)
                            "before:absolute before:left-0 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-primary",
                            "before:transition-opacity before:duration-150 before:motion-reduce:transition-none",
                            active
                              ? "bg-primary/10 text-primary font-semibold before:opacity-100 hover:bg-primary/15"
                              : "text-muted-foreground font-medium before:opacity-0 hover:text-foreground hover:bg-secondary/60",
                          )}
                        >
                          <Icon size={16} className="w-5 h-5 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 text-left truncate">{label}</span>
                          {badge !== undefined && badge > 0 && (
                            <span
                              className={cn(
                                "shrink-0 inline-flex items-center justify-center",
                                "min-w-[1.25rem] h-5 px-1.5 rounded-md",
                                "text-[11px] font-semibold tabular-nums",
                                active
                                  ? "bg-primary/15 text-primary"
                                  : "bg-secondary text-muted-foreground",
                              )}
                            >
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </button>
                      </NavItemWithHint>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
