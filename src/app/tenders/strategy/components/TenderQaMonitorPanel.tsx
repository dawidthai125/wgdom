import { useMemo, useState } from "react";
import { ChevronRight, HelpCircle, MessageSquare } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  collectAllQaEvents,
  filterQaEvents,
  formatRelativeQaTime,
  qaEventTypeLabel,
  type TenderQaEvent,
  type TenderQaFilter,
} from "@/lib/tender-qa-monitor";

const FILTERS: { id: TenderQaFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "new", label: "Nowe odpowiedzi" },
  { id: "updated", label: "Zmienione odpowiedzi" },
];

function QaCard({
  event,
  onOpenTender,
}: {
  event: TenderQaEvent;
  onOpenTender?: (tenderId: string) => void;
}) {
  const titleShort = event.tenderTitle.length > 48
    ? `${event.tenderTitle.slice(0, 48)}…`
    : event.tenderTitle;
  const addedLabel = event.type === "QA_BATCH"
    ? `Dodano: ${event.count ?? "?"} odpowiedzi`
    : event.type === "QA_UPDATED"
      ? "Zmieniono odpowiedź"
      : event.count && event.count > 1
        ? `Dodano: ${event.count} plików Q&A`
        : "Dodano odpowiedź";

  return (
    <button
      type="button"
      onClick={() => onOpenTender?.(event.tenderItemId)}
      className="w-full text-left rounded-xl border border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 px-3 py-2.5 transition-colors"
    >
      <div className="flex items-start gap-2">
        <MessageSquare size={15} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">❓ Nowe odpowiedzi</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={event.tenderTitle}>
            Przetarg: {titleShort}
          </p>
          <p className="text-xs font-medium text-foreground mt-1">{addedLabel}</p>
          {event.aiSummary && (
            <p className="text-[11px] text-violet-800 dark:text-violet-300 mt-1 leading-relaxed line-clamp-3">
              Najważniejsza zmiana: {event.aiSummary}
            </p>
          )}
          {event.details && !event.aiSummary && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={event.details}>
              {event.details}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {qaEventTypeLabel(event.type)} · {formatRelativeQaTime(event.at)}
          </p>
        </div>
        {onOpenTender && <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />}
      </div>
    </button>
  );
}

export function TenderQaMonitorPanel({
  items,
  onOpenTender,
}: {
  items: TenderPipelineItem[];
  onOpenTender?: (tenderId: string) => void;
}) {
  const [filter, setFilter] = useState<TenderQaFilter>("all");

  const allEvents = useMemo(() => collectAllQaEvents(items), [items]);
  const filtered = useMemo(
    () => filterQaEvents(allEvents, filter).slice(0, 20),
    [allEvents, filter],
  );

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-violet-500" />
          <h2 className="text-sm font-semibold">Nowe pytania i odpowiedzi</h2>
          {allEvents.length > 0 && (
            <span className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded font-medium">
              {allEvents.length}
            </span>
          )}
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
          <p className="text-xs text-muted-foreground px-1 py-2">
            Brak wykrytych Q&A. Pliki z nazwami typu „odpowiedzi na pytania”, „wyjaśnienia SWZ” są śledzone przy kolejnych skanach dokumentów.
          </p>
        )}
        {filtered.map((event) => (
          <QaCard key={event.id} event={event} onOpenTender={onOpenTender} />
        ))}
      </div>
    </section>
  );
}

export { qaMonitorSummary } from "@/lib/tender-qa-monitor";
