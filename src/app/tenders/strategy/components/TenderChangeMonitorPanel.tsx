import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, FilePlus, MessageSquare, ChevronRight } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  collectAllChangeEvents,
  filterChangeEvents,
  formatRelativeChangeTime,
  changeEventIconLabel,
  type TenderChangeEvent,
  type TenderChangeFilter,
} from "@/lib/tender-change-monitor";

const FILTERS: { id: TenderChangeFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "documents", label: "Nowe dokumenty" },
  { id: "deadline", label: "Zmiana terminu" },
  { id: "qa", label: "Odpowiedzi na pytania" },
];

function eventIcon(type: TenderChangeEvent["type"]) {
  switch (type) {
    case "DEADLINE_CHANGED": return CalendarClock;
    case "NEW_QA": return MessageSquare;
    case "NEW_DOCUMENT": return FilePlus;
    default: return AlertTriangle;
  }
}

function ChangeCard({
  event,
  onOpenTender,
}: {
  event: TenderChangeEvent;
  onOpenTender?: (tenderId: string) => void;
}) {
  const Icon = eventIcon(event.type);
  const titleShort = event.tenderTitle.length > 48
    ? `${event.tenderTitle.slice(0, 48)}…`
    : event.tenderTitle;

  return (
    <button
      type="button"
      onClick={() => onOpenTender?.(event.tenderItemId)}
      className="w-full text-left rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-2.5 transition-colors"
    >
      <div className="flex items-start gap-2">
        <Icon size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">⚠ Zmiana dokumentacji</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={event.tenderTitle}>
            Przetarg: {titleShort}
          </p>
          <p className="text-xs font-medium text-foreground mt-1">{event.summary}</p>
          {event.details && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={event.details}>
              {event.details}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {changeEventIconLabel(event.type)} · {new Date(event.at).toLocaleDateString("pl-PL")}
          </p>
        </div>
        {onOpenTender && <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />}
      </div>
    </button>
  );
}

export function TenderChangeMonitorPanel({
  items,
  onOpenTender,
}: {
  items: TenderPipelineItem[];
  onOpenTender?: (tenderId: string) => void;
}) {
  const [filter, setFilter] = useState<TenderChangeFilter>("all");

  const allEvents = useMemo(() => collectAllChangeEvents(items), [items]);
  const filtered = useMemo(
    () => filterChangeEvents(allEvents, filter).slice(0, 20),
    [allEvents, filter],
  );

  if (allEvents.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <AlertTriangle size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Zmiany w przetargach</h2>
        </div>
        <p className="px-4 py-4 text-xs text-muted-foreground">
          Brak wykrytych zmian. Snapshot tworzy się przy pierwszym pobraniu dokumentów — kolejne skany porównują listę plików i termin.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold">Zmiany w przetargach</h2>
          <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
            {allEvents.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                filter === f.id
                  ? "bg-primary/10 border-primary/30 text-primary font-medium"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-1 py-2">Brak zmian w wybranym filtrze.</p>
        )}
        {filtered.map((event) => (
          <ChangeCard key={event.id} event={event} onOpenTender={onOpenTender} />
        ))}
      </div>
    </section>
  );
}

export function tenderChangesSummary(items: TenderPipelineItem[]): {
  urgentCount: number;
  lastChangeAt: string | null;
  lastChangeRelative: string | null;
} {
  const events = collectAllChangeEvents(items);
  const cutoff = Date.now() - 7 * 24 * 3600_000;
  const recent = events.filter((e) => new Date(e.at).getTime() >= cutoff);
  const lastChangeAt = events[0]?.at ?? null;
  return {
    urgentCount: recent.length,
    lastChangeAt,
    lastChangeRelative: lastChangeAt ? formatRelativeChangeTime(lastChangeAt) : null,
  };
}
