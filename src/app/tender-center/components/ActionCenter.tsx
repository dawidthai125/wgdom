import { Zap, ChevronRight, ExternalLink } from "lucide-react";
import type { ActionCenterResult, OwnerActionItem, ActionPriority } from "@/lib/tender-center-action-center";
import {
  ACTION_CATEGORY_LABEL_PL,
  ACTION_PRIORITY_LABEL_PL,
  priorityTone,
} from "@/lib/tender-center-action-center";

function countUrgent(actions: OwnerActionItem[]): ActionCenterResult["counts"] {
  return {
    CRITICAL: actions.filter((a) => a.priority === "CRITICAL").length,
    HIGH: actions.filter((a) => a.priority === "HIGH").length,
    MEDIUM: 0,
    LOW: 0,
  };
}

function PriorityCounters({
  counts,
  urgentOnly = false,
}: {
  counts: ActionCenterResult["counts"];
  urgentOnly?: boolean;
}) {
  const items = (
    urgentOnly
      ? [
          ["CRITICAL", counts.CRITICAL],
          ["HIGH", counts.HIGH],
        ]
      : [
          ["CRITICAL", counts.CRITICAL],
          ["HIGH", counts.HIGH],
          ["MEDIUM", counts.MEDIUM],
          ["LOW", counts.LOW],
        ]
  ) as [ActionPriority, number][];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([key, n]) => (
        <div
          key={key}
          className={`rounded-lg border px-2.5 py-1.5 text-center min-w-[64px] ${priorityTone(key)}`}
        >
          <p className="text-[9px] uppercase tracking-wider opacity-80">{key}</p>
          <p
            className="text-lg font-bold tabular-nums leading-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {n}
          </p>
        </div>
      ))}
    </div>
  );
}

function ActionRow({
  item,
  onOpenTender,
}: {
  item: OwnerActionItem;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-card/60 px-3.5 py-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityTone(item.priority)}`}>
            {item.priority}
          </span>
          <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            {ACTION_CATEGORY_LABEL_PL[item.category]}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground shrink-0">
          {ACTION_PRIORITY_LABEL_PL[item.priority]}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
        )}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-2">
        <p className="text-[10px] font-medium text-primary flex items-start gap-1">
          <ChevronRight size={12} className="shrink-0 mt-0.5" />
          {item.recommendedAction}
        </p>
      </div>

      {item.tenderId && onOpenTender && (
        <button
          type="button"
          onClick={() => onOpenTender(item.tenderId!)}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:underline min-h-[36px]"
        >
          <ExternalLink size={12} />
          Otwórz przetarg
        </button>
      )}

      <p className="text-[10px] text-muted-foreground">
        <span className="opacity-70">Powód: </span>{item.reason}
        <span className="block text-[9px] mt-0.5 opacity-80">Źródło: {item.source}</span>
      </p>
    </article>
  );
}

export function ActionCenter({
  center,
  variant = "full",
  onOpenTender,
}: {
  center: ActionCenterResult;
  variant?: "full" | "urgent";
  onOpenTender?: (tenderId: string) => void;
}) {
  const urgentPriorities = new Set<ActionPriority>(["CRITICAL", "HIGH"]);
  const primaryId = center.primaryAction?.id;

  const urgentActions = center.actions.filter((a) => urgentPriorities.has(a.priority));
  const actions =
    variant === "urgent"
      ? urgentActions.filter((a) => a.id !== primaryId)
      : center.actions;

  const counts =
    variant === "urgent"
      ? countUrgent(actions)
      : center.counts;

  const title = variant === "urgent" ? "Co wymaga uwagi" : "Action Center";
  const subtitle = variant === "urgent" ? "CRITICAL · HIGH" : "Co zrobić dzisiaj";

  return (
    <section className="rounded-xl border-2 border-primary/25 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-primary/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      </div>

      <div className="p-4 space-y-4">
        <PriorityCounters counts={counts} urgentOnly={variant === "urgent"} />

        {variant === "full" && center.primaryAction && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Dzisiaj system rekomenduje
            </p>
            <p className="text-sm font-semibold leading-snug">{center.primaryAction.title}</p>
            <p className="text-xs text-foreground/90">{center.primaryAction.recommendedAction}</p>
            <p className="text-[9px] text-muted-foreground">Źródło: {center.primaryAction.source}</p>
          </div>
        )}

        {variant === "full" && !center.primaryAction && (
          <p className="text-xs text-muted-foreground text-center py-2">{center.headline}</p>
        )}

        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {variant === "urgent"
              ? "Brak dodatkowych pilnych zadań — główna akcja jest w sekcji Kondycja firmy."
              : "Brak zadań na dziś — sytuacja stabilna."}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {variant === "urgent" ? `Pilne działania (${actions.length})` : `Lista działań (${actions.length})`}
            </p>
            {actions.map((item) => (
              <ActionRow key={item.id} item={item} onOpenTender={onOpenTender} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
