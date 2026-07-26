import { lazy, Suspense } from "react";
import {
  ChevronRight,
  PanelLeft,
  Download,
  Upload,
  Cloud,
  CloudUpload,
  CloudOff,
  Search,
  Settings,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/app/theme/ThemeToggle";
import { WgButton } from "@/app/ui";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { fmt, fmtDate } from "@/app/app-domain";
import type { Job, WeekEmployee } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import { adminIsSuperAdmin, adminRoleLabel } from "@/lib/admin-auth";
import { topbarRoleTooltipVisible } from "@/lib/role-visibility";
import type { AdminNavItem, View } from "@/app/admin/admin-nav";
import { isNavItemActive } from "@/app/admin/admin-nav";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_ENTER,
  WG_FOCUS_RING,
  WG_GLASS_TOOLBAR,
  WG_RADIUS_LG,
  WG_RADIUS_SM,
  WG_TOUCH_MIN,
} from "@/lib/wg-ui-tokens";

const CompanyMusicPlayer = lazy(() =>
  import("@/app/components/CompanyMusicPlayer").then((m) => ({ default: m.CompanyMusicPlayer })),
);

export type AdminSyncStatus = "idle" | "saving" | "saved" | "error" | "offline";

export type AdminTopbarProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  view: View;
  navItems: AdminNavItem[];
  onGoToView: (v: View) => void;
  adminSession: AdminSession | null | undefined;
  canViewRates: boolean;
  totalNet: number;
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  jobs: Job[];
  exportBackup: () => void;
  importBackup: (file: File) => void;
  syncStatus: AdminSyncStatus;
  syncError: string;
  onRetrySync: () => void;
  onToggleSearch: () => void;
  onOpenAdminSettings: () => void;
  onLogout?: () => void;
};

/** Icon chrome inside glass utility cluster — Login toolbar parity + ≥44 touch (DS-07). */
const utilityIconBtn = cn(
  WG_TOUCH_MIN,
  "h-11 w-11 shrink-0 rounded-lg",
  `transition-colors ${WG_DURATION_ENTER}`,
  "motion-reduce:transition-none",
);

export function AdminTopbar({
  sidebarOpen,
  onToggleSidebar,
  view,
  navItems,
  onGoToView,
  adminSession,
  canViewRates,
  totalNet,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  jobs,
  exportBackup,
  importBackup,
  syncStatus,
  syncError,
  onRetrySync,
  onToggleSearch,
  onOpenAdminSettings,
  onLogout,
}: AdminTopbarProps) {
  return (
    <div
      className="admin-topbar flex items-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-card shrink-0 min-h-[3rem]"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <WgButton
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Zwiń menu boczne" : "Rozwiń menu boczne"}
        aria-label={sidebarOpen ? "Zwiń menu boczne" : "Rozwiń menu boczne"}
        className={cn(
          "hidden md:inline-flex",
          WG_TOUCH_MIN,
          "h-11 w-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary",
          `transition-colors ${WG_DURATION_ENTER}`,
        )}
      >
        <PanelLeft size={15} />
      </WgButton>
      <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-6 w-auto object-contain md:hidden shrink-0" />
      {!sidebarOpen && (
        <div className="hidden md:flex gap-1 flex-wrap">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onGoToView(key)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 font-medium",
                WG_RADIUS_SM,
                `transition-colors ${WG_DURATION_ENTER}`,
                WG_FOCUS_RING,
                isNavItemActive(key, view)
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      )}
      <ChevronRight size={13} className="text-muted-foreground/40 hidden sm:block shrink-0" />
      <h2 className="text-sm font-semibold truncate min-w-0 shrink">{navItems.find((n) => n.key === view)?.label}</h2>
      {adminSession && (
        <span
          className="hidden md:inline text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full truncate max-w-[180px]"
          title={topbarRoleTooltipVisible(adminSession.role) ? adminRoleLabel(adminSession.role) : adminSession.displayName}
        >
          {adminSession.displayName}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2 shrink-0 min-w-0">
        {view === "payroll" && canViewRates && (
          <span
            className="text-xs text-muted-foreground hidden sm:block truncate"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {fmt(totalNet)} PLN · {productionWeekEmployees.length} prac.
          </span>
        )}
        {view === "schedule" && (
          <span className="text-xs text-muted-foreground hidden sm:block truncate">
            {fmtDate(weekFrom)} – {fmtDate(weekTo)} · {productionWeekEmployees.length} prac.
          </span>
        )}
        {view === "jobs" && (
          <span className="text-xs text-muted-foreground hidden sm:block truncate">
            {jobs.filter((j) => j.status === "in_progress").length} aktywne ·{" "}
            {jobs.filter((j) => j.status === "completed").length} zdane
          </span>
        )}

        {/* DS-04: glass only on utility cluster (Login toolbar parity) */}
        <div
          className={cn(
            "flex items-center gap-0.5 px-1 py-0.5 shrink-0",
            WG_RADIUS_LG,
            WG_GLASS_TOOLBAR,
          )}
        >
          <div className="hidden sm:block">
            <Suspense fallback={null}>
              <CompanyMusicPlayer />
            </Suspense>
          </div>
          <ThemeToggle
            className={cn(
              "hidden sm:inline-flex items-center justify-center",
              utilityIconBtn,
              "hover:bg-secondary text-muted-foreground hover:text-foreground",
              WG_FOCUS_RING,
            )}
          />
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={exportBackup}
            title="Eksportuj backup"
            aria-label="Eksportuj backup"
            className={cn(utilityIconBtn, "hover:bg-secondary text-muted-foreground hover:text-foreground")}
          >
            <Download size={16} />
          </WgButton>
          <label
            title="Importuj backup"
            aria-label="Importuj backup"
            className={cn(
              utilityIconBtn,
              "inline-flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer",
              WG_FOCUS_RING,
            )}
          >
            <Upload size={16} />
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
            />
          </label>
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => (syncStatus === "error" || syncStatus === "offline") && onRetrySync()}
            className={cn(
              utilityIconBtn,
              syncStatus === "error" || syncStatus === "offline"
                ? "hover:bg-secondary cursor-pointer"
                : "cursor-default",
            )}
            title={
              syncStatus === "saving"
                ? "Zapisywanie..."
                : syncStatus === "saved"
                  ? "Zsynchronizowano"
                  : syncStatus === "error"
                    ? `Błąd synchronizacji — kliknij, aby ponowić${syncError ? `\n${syncError}` : ""}`
                    : syncStatus === "offline"
                      ? syncError || "Chmura niedostępna — brak konfiguracji"
                      : "Zsynchronizowano"
            }
            aria-label={
              syncStatus === "saving"
                ? "Zapisywanie"
                : syncStatus === "error"
                  ? "Błąd synchronizacji — ponów"
                  : syncStatus === "offline"
                    ? "Chmura niedostępna"
                    : "Status synchronizacji"
            }
          >
            {syncStatus === "saving" && <CloudUpload size={15} className="text-muted-foreground animate-pulse" />}
            {syncStatus === "saved" && <Cloud size={15} className="text-green-500" />}
            {syncStatus === "error" && <CloudOff size={15} className="text-destructive" />}
            {syncStatus === "offline" && <CloudOff size={15} className="text-yellow-500" />}
            {syncStatus === "idle" && <Cloud size={15} className="text-muted-foreground/40" />}
          </WgButton>
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSearch}
            title="Szukaj"
            aria-label="Szukaj"
            className={cn(utilityIconBtn, "hover:bg-secondary text-muted-foreground hover:text-foreground")}
          >
            <Search size={16} />
          </WgButton>
          {adminSession && adminIsSuperAdmin(adminSession.role) && (
            <WgButton
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenAdminSettings}
              title="Ustawienia administratorów"
              aria-label="Ustawienia administratorów"
              className={cn(utilityIconBtn, "hover:bg-secondary text-muted-foreground hover:text-foreground")}
            >
              <Settings size={16} />
            </WgButton>
          )}
          {onLogout && (
            <WgButton
              type="button"
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="Wyloguj"
              aria-label="Wyloguj"
              className={cn(utilityIconBtn, "hover:bg-secondary text-muted-foreground hover:text-foreground")}
            >
              <LogOut size={16} />
            </WgButton>
          )}
        </div>
      </div>
    </div>
  );
}
