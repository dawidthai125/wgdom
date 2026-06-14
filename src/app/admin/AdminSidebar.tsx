import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { NavItemWithHint } from "@/app/app-ui";
import type { AdminNavItem, View } from "@/app/admin/admin-nav";
import { isNavItemActive } from "@/app/admin/admin-nav";

/** Desktop sidebar width — w-56 (224px) + 16px komfortu etykiet (v2.57.3). */
export const ADMIN_SIDEBAR_WIDTH_CLASS = "w-60";

export type AdminSidebarProps = {
  sidebarOpen: boolean;
  view: View;
  navItems: AdminNavItem[];
  onGoToView: (v: View) => void;
};

export function AdminSidebar({
  sidebarOpen,
  view,
  navItems,
  onGoToView,
}: AdminSidebarProps) {
  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0 min-h-0 ${sidebarOpen ? ADMIN_SIDEBAR_WIDTH_CLASS : "w-0 overflow-hidden"}`}
    >
      <div className="admin-sidebar-logo flex flex-col gap-1.5 px-4 py-4 border-b border-border shrink-0">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain object-left" />
        <p className="text-xs text-muted-foreground font-medium tracking-wide">Zarządzanie Pracą</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain admin-sidebar-scroll">
        <nav className="admin-sidebar-nav px-3 py-3 space-y-0.5">
          {navItems.map(({ key, label, hint, icon: Icon, badge }) => (
            <NavItemWithHint key={key} hint={hint}>
              <button
                onClick={() => onGoToView(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isNavItemActive(key, view) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <Icon size={15} />
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${isNavItemActive(key, view) ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            </NavItemWithHint>
          ))}
        </nav>
      </div>
    </aside>
  );
}
