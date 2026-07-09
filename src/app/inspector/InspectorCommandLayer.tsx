import { CompanyMusicPlayer } from "@/app/components/CompanyMusicPlayer";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
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
      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
        <RefreshCw size={10} className="animate-spin shrink-0" />
        Odświeżam z chmury…
      </p>
    );
  }
  if (pushFailed) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 touch-manipulation min-h-[28px]"
        title="Dotknij ikony chmury u góry, aby ponowić wysłanie"
      >
        <CloudOff size={10} className="shrink-0" />
        Czeka na wysłanie — dotknij
      </button>
    );
  }
  if (syncPending) {
    return (
      <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
        <Cloud size={10} className="shrink-0" />
        Zapisywanie…
      </p>
    );
  }
  return (
    <p
      className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5"
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
      className="inspector-command-layer z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 gap-2"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-7 w-auto shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{primaryLine}</p>
          <p className="text-[10px] text-muted-foreground font-medium truncate">{secondaryLine}</p>
          {activeTabLabel && (
            <p className="text-[10px] text-primary/80 font-medium truncate hidden md:block">{activeTabLabel}</p>
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
        <button
          type="button"
          onClick={onCloudSyncClick}
          disabled={syncing && !pushFailed}
          className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${pushFailed ? "hover:bg-secondary cursor-pointer" : syncing ? "cursor-default" : "hover:bg-secondary"}`}
          title={cloudSyncTitle}
          aria-label={cloudSyncTitle}
        >
          {cloudStatus === "saving" && <CloudUpload size={15} className="text-muted-foreground animate-pulse" />}
          {cloudStatus === "saved" && <Cloud size={15} className="text-green-500" />}
          {cloudStatus === "error" && <CloudOff size={15} className="text-destructive" />}
          {cloudStatus === "idle" && <Cloud size={15} className="text-muted-foreground/40" />}
        </button>
        <button
          type="button"
          onClick={onRefreshFromCloud}
          disabled={syncing}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-secondary disabled:opacity-50"
          title={
            lastSyncedAt
              ? `Ostatnio: ${lastSyncedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
              : "Odśwież dane z chmury"
          }
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{syncing ? "…" : "Odśwież"}</span>
        </button>
        <button
          type="button"
          onClick={onOpenNotes}
          className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary"
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
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {operationalNotesUnread > 9 ? "9+" : operationalNotesUnread}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary px-3 py-2.5 min-h-[44px] rounded-lg"
          title="Instrukcja"
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Pomoc</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-secondary"
        >
          <LogOut size={14} />
          Wyloguj
        </button>
      </div>
    </header>
  );
}
