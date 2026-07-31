import { CompanyMusicPlayer } from "@/app/components/CompanyMusicPlayer";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { cn } from "@/app/components/ui/utils";
import { ThemeToggle } from "@/app/theme/ThemeToggle";
import { WgButton } from "@/app/ui";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import {
  BookOpen,
  Cloud,
  CloudOff,
  CloudUpload,
  LogOut,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import {
  WG_DURATION_ENTER,
  WG_FOCUS_RING,
  WG_TOUCH_MIN,
  WG_TYPE_TITLE,
} from "@/lib/wg-ui-tokens";

export type InspectorCloudStatus = "idle" | "saving" | "saved" | "error";

export type InspectorCommandLayerProps = {
  primaryLine: string;
  secondaryLine: string;
  activeTabLabel?: string;
  syncing: boolean;
  syncPending: boolean;
  pushFailed: boolean;
  lastSyncedAt: Date | null;
  cloudStatus: InspectorCloudStatus;
  cloudSyncTitle: string;
  onCloudSyncClick: () => void;
  onRefreshFromCloud: () => void;
  operationalNotesUnread: number;
  onOpenNotes: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
};

const utilityIconBtn = cn(
  WG_TOUCH_MIN,
  "h-11 w-11 shrink-0 rounded-lg",
  `transition-colors ${WG_DURATION_ENTER}`,
  "motion-reduce:transition-none",
);

const utilityTextBtn = cn(
  WG_TOUCH_MIN,
  "h-11 w-auto shrink-0 inline-flex items-center justify-center gap-1.5",
  "px-3 rounded-lg text-xs",
  "text-muted-foreground hover:text-foreground hover:bg-secondary",
  `transition-colors ${WG_DURATION_ENTER}`,
  "motion-reduce:transition-none",
);

function SyncStatusBadge({
  syncing,
  syncPending,
  pushFailed,
  lastSyncedAt,
  onRetry,
}: {
  syncing: boolean;
  syncPending: boolean;
  pushFailed: boolean;
  lastSyncedAt: Date | null;
  onRetry?: () => void;
}) {
  if (syncing) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
        <RefreshCw size={10} className="animate-spin shrink-0" />
        Odświeżam z chmury…
      </p>
    );
  }
  if (pushFailed) {
    return (
      <WgButton
        type="button"
        variant="ghost"
        onClick={onRetry}
        className={cn(
          "h-auto min-h-[28px] w-auto px-0 py-0.5 justify-start gap-1",
          "text-xs text-amber-600 dark:text-amber-400 font-normal",
          "hover:bg-transparent hover:text-amber-700 dark:hover:text-amber-300",
        )}
        title="Dotknij ikony chmury u góry, aby ponowić wysłanie"
      >
        <CloudOff size={10} className="shrink-0" />
        Czeka na wysłanie — dotknij
      </WgButton>
    );
  }
  if (syncPending) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
        <Cloud size={10} className="shrink-0" />
        Zapisywanie…
      </p>
    );
  }
  return (
    <p
      className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5"
      title={
        lastSyncedAt
          ? `Ostatnio: ${lastSyncedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
          : undefined
      }
    >
      <Cloud size={10} className="shrink-0" />
      Zsynchronizowano
    </p>
  );
}

export function InspectorCommandLayer({
  primaryLine,
  secondaryLine,
  activeTabLabel,
  syncing,
  syncPending,
  pushFailed,
  lastSyncedAt,
  cloudStatus,
  cloudSyncTitle,
  onCloudSyncClick,
  onRefreshFromCloud,
  operationalNotesUnread,
  onOpenNotes,
  onOpenHelp,
  onLogout,
}: InspectorCommandLayerProps) {
  return (
    <header
      className={cn(
        "inspector-command-layer z-40 flex items-center justify-between px-4 py-3",
        "border-b border-border/60 bg-card shrink-0 gap-2",
      )}
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-7 w-auto shrink-0" />
        <div className="min-w-0">
          <p className={cn(WG_TYPE_TITLE, "truncate")}>{primaryLine}</p>
          <p className="text-xs text-muted-foreground font-medium truncate">{secondaryLine}</p>
          {activeTabLabel && (
            <p className="text-xs text-primary/80 font-medium truncate hidden md:block">{activeTabLabel}</p>
          )}
          <SyncStatusBadge
            syncing={syncing}
            syncPending={syncPending}
            pushFailed={pushFailed}
            lastSyncedAt={lastSyncedAt}
            onRetry={onCloudSyncClick}
          />
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <CompanyMusicPlayer />
        <WgButton
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCloudSyncClick}
          disabled={syncing && !pushFailed}
          className={cn(
            utilityIconBtn,
            pushFailed ? "hover:bg-secondary cursor-pointer" : syncing ? "cursor-default" : "hover:bg-secondary",
          )}
          title={cloudSyncTitle}
          aria-label={cloudSyncTitle}
        >
          {cloudStatus === "saving" && <CloudUpload size={15} className="text-muted-foreground animate-pulse" />}
          {cloudStatus === "saved" && <Cloud size={15} className="text-green-500" />}
          {cloudStatus === "error" && <CloudOff size={15} className="text-destructive" />}
          {cloudStatus === "idle" && <Cloud size={15} className="text-muted-foreground/40" />}
        </WgButton>
        <WgButton
          type="button"
          variant="ghost"
          onClick={onRefreshFromCloud}
          disabled={syncing}
          className={cn(utilityTextBtn, "gap-1 disabled:opacity-50")}
          title={
            lastSyncedAt
              ? `Ostatnio: ${lastSyncedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
              : "Odśwież dane z chmury"
          }
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{syncing ? "…" : "Odśwież"}</span>
        </WgButton>
        <WgButton
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenNotes}
          className={cn(utilityIconBtn, "relative hover:bg-secondary")}
          title={
            operationalNotesUnread > 0
              ? `Notatki operacyjne · ${operationalNotesUnread} nieprzeczytanych`
              : "Notatki operacyjne"
          }
          aria-label={
            operationalNotesUnread > 0
              ? `Notatki operacyjne, ${operationalNotesUnread} nieprzeczytanych`
              : "Notatki operacyjne"
          }
        >
          <ScrollText
            size={16}
            className={operationalNotesUnread > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
          />
          {operationalNotesUnread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {operationalNotesUnread > 9 ? "9+" : operationalNotesUnread}
            </span>
          )}
        </WgButton>
        <WgButton
          type="button"
          variant="ghost"
          onClick={onOpenHelp}
          className={cn(utilityTextBtn, "gap-1")}
          title="Instrukcja"
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Pomoc</span>
        </WgButton>
        <ThemeToggle
          className={cn(
            utilityIconBtn,
            "inline-flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground",
            WG_FOCUS_RING,
          )}
        />
        <WgButton
          type="button"
          variant="ghost"
          onClick={onLogout}
          className={utilityTextBtn}
        >
          <LogOut size={14} />
          Wyloguj
        </WgButton>
      </div>
    </header>
  );
}
