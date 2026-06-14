import { ScrollText, ChevronRight } from "lucide-react";
import type { OperationalNotesDashboardSummary } from "@/lib/operational-notes-dashboard";

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
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors touch-manipulation ${
        hasUnread
          ? "bg-primary/5 border-primary/25 hover:border-primary/40"
          : "bg-card border-border hover:border-primary/30"
      }`}
      aria-label="Notatki operacyjne — przejdź do modułu"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ScrollText size={14} className={`shrink-0 ${hasUnread ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
            Notatki operacyjne
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Łącznie</p>
          <p className="text-lg font-bold text-foreground leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {summary.total}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nieprzeczytane</p>
          <p
            className={`text-lg font-bold leading-tight ${hasUnread ? "text-primary" : "text-muted-foreground"}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {summary.unread}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Od inspektora</p>
          <p className="text-lg font-bold text-foreground leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {summary.fromInspector}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 leading-snug truncate">
        Ostatnia aktywność:{" "}
        <span className="text-foreground/90 font-medium">{lastTitle}</span>
        {lastTime ? ` · ${lastTime}` : summary.total === 0 ? " · brak notatek" : ""}
      </p>
    </button>
  );
}
