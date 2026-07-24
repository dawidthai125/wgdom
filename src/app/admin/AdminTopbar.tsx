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
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { fmt, fmtDate } from "@/app/app-domain";
import type { Job, WeekEmployee } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import { adminIsSuperAdmin, adminRoleLabel } from "@/lib/admin-auth";
import { topbarRoleTooltipVisible } from "@/lib/role-visibility";
import type { AdminNavItem, View } from "@/app/admin/admin-nav";
import { isNavItemActive } from "@/app/admin/admin-nav";

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
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Zwiń menu boczne" : "Rozwiń menu boczne"}
        className="hidden md:flex p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"
      >
        <PanelLeft size={15} />
      </button>
      <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-6 w-auto object-contain md:hidden shrink-0" />
      {!sidebarOpen && (
        <div className="hidden md:flex gap-1 flex-wrap">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onGoToView(key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isNavItemActive(key, view) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
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
      <div className="ml-auto flex items-center gap-0.5 sm:gap-2 shrink-0">
        <div className="hidden sm:block">
          <Suspense fallback={null}>
            <CompanyMusicPlayer />
          </Suspense>
        </div>
        <ThemeToggle className="hidden sm:flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" />
        {view === "payroll" && canViewRates && (
          <span
            className="text-xs text-muted-foreground hidden sm:block"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {fmt(totalNet)} PLN · {productionWeekEmployees.length} prac.
          </span>
        )}
        {view === "schedule" && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {fmtDate(weekFrom)} – {fmtDate(weekTo)} · {productionWeekEmployees.length} prac.
          </span>
        )}
        {view === "jobs" && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {jobs.filter((j) => j.status === "in_progress").length} aktywne ·{" "}
            {jobs.filter((j) => j.status === "completed").length} zdane
          </span>
        )}
        <button
          type="button"
          onClick={exportBackup}
          title="Eksportuj backup"
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <Download size={16} />
        </button>
        <label
          title="Importuj backup"
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Upload size={16} />
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
          />
        </label>
        <button
          type="button"
          onClick={() => (syncStatus === "error" || syncStatus === "offline") && onRetrySync()}
          className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${syncStatus === "error" || syncStatus === "offline" ? "hover:bg-secondary cursor-pointer" : "cursor-default"}`}
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
        >
          {syncStatus === "saving" && <CloudUpload size={15} className="text-muted-foreground animate-pulse" />}
          {syncStatus === "saved" && <Cloud size={15} className="text-green-500" />}
          {syncStatus === "error" && <CloudOff size={15} className="text-destructive" />}
          {syncStatus === "offline" && <CloudOff size={15} className="text-yellow-500" />}
          {syncStatus === "idle" && <Cloud size={15} className="text-muted-foreground/40" />}
        </button>
        <button
          onClick={onToggleSearch}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <Search size={16} />
        </button>
        {adminSession && adminIsSuperAdmin(adminSession.role) && (
          <button
            onClick={onOpenAdminSettings}
            title="Ustawienia administratorów"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Settings size={16} />
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Wyloguj"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
