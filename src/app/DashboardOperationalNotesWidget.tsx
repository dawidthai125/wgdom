import { ScrollText, ChevronRight } from "lucide-react";
import type { OperationalNotesDashboardSummary } from "@/lib/operational-notes-dashboard";
import { WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_FOCUS_RING, WG_TYPE_LABEL } from "@/lib/wg-ui-tokens";

function fmtActivityTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

export function DashboardOperationalNotesWidget({
  summary,
  onOpen,
}: {
  summary: OperationalNotesDashboardSummary;
  onOpen: () => void;
}) {
  const hasUnread = summary.unread > 0;
  const lastTitle = summary.lastActivity?.title?.trim() || "—";
  const lastTime = summary.lastActivity ? fmtActivityTime(summary.lastActivity.at) : "";

  return (
    <WgCard
      as="button"
      type="button"
      elevation="soft"
      padding="sm"
      radius="md"
      onClick={onOpen}
      aria-label="Notatki operacyjne — przejdź do modułu"
      className={cn(
        WG_FOCUS_RING,
        "w-full text-left touch-manipulation transition-colors duration-150 motion-reduce:transition-none",
        hasUnread
          ? "bg-primary/5 border-primary/25 hover:border-primary/40"
          : "hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ScrollText
            size={13}
            className={cn("shrink-0", hasUnread ? "text-primary" : "text-muted-foreground")}
          />
          <p className="text-sm font-semibold text-foreground truncate">Notatki operacyjne</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className={WG_TYPE_LABEL}>Łącznie</p>
          <p
            className="text-lg font-semibold text-foreground leading-tight mt-0.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {summary.total}
          </p>
        </div>
        <div className="min-w-0">
          <p className={WG_TYPE_LABEL}>Nieprzeczytane</p>
          <p
            className={cn(
              "text-lg font-semibold leading-tight mt-0.5",
              hasUnread ? "text-primary" : "text-muted-foreground",
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {summary.unread}
          </p>
        </div>
        <div className="min-w-0">
          <p className={WG_TYPE_LABEL}>Od inspektora</p>
          <p
            className="text-lg font-semibold text-foreground leading-tight mt-0.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {summary.fromInspector}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 leading-snug truncate">
        Ostatnia aktywność:{" "}
        <span className="text-foreground/90 font-medium">{lastTitle}</span>
        {lastTime ? ` · ${lastTime}` : summary.total === 0 ? " · brak notatek" : ""}
      </p>
    </WgCard>
  );
}
