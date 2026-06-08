import { useMemo, useState } from "react";
import { Zap, ChevronRight, ExternalLink, ChevronDown, Calendar } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import {
  isWonRealizationAction,
  TenderJobLinkButtons,
} from "@/app/tender-center/components/TenderJobLinkButtons";
import type { ActionCenterResult, OwnerActionItem, ActionPriority } from "@/lib/tender-center-action-center";
import {
  ACTION_CATEGORY_LABEL_PL,
  ACTION_PRIORITY_LABEL_PL,
  priorityTone,
} from "@/lib/tender-center-action-center";

const URGENT_VISIBLE_MAX = 5;

function countUrgent(actions: OwnerActionItem[]): ActionCenterResult["counts"] {
  return {
    CRITICAL: actions.filter((a) => a.priority === "CRITICAL").length,
    HIGH: actions.filter((a) => a.priority === "HIGH").length,
    MEDIUM: 0,
    LOW: 0,
  };
}

function fmtDeadlineLabel(iso: string | null | undefined, now: Date): string | null {
  if (!iso) return null;
  const days = daysUntilTenderDeadline(iso, now);
  if (days === null) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  const dateStr = d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (days < 0) return `Termin minął · ${dateStr}`;
  if (days === 0) return `Termin dziś · ${dateStr}`;
  if (days === 1) return `Termin jutro · ${dateStr}`;
  return `Termin za ${days} dni · ${dateStr}`;
}

function useTenderDeadlineLookup(pipelineItems?: TenderPipelineItem[]) {
  return useMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of pipelineItems ?? []) {
      map.set(item.id, item.submittingOffersDate ?? null);
    }
    return map;
  }, [pipelineItems]);
}

function PriorityCounters({
  counts,
  urgentOnly = false,
  compact = false,
}: {
  counts: ActionCenterResult["counts"];
  urgentOnly?: boolean;
  compact?: boolean;
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
    <div className="flex flex-wrap gap-1.5">
      {items.map(([key, n]) => (
        <div
          key={key}
          className={`rounded-lg border text-center ${compact ? "px-2 py-1 min-w-[52px]" : "px-2.5 py-1.5 min-w-[64px]"} ${priorityTone(key)}`}
        >
          <p className={`tracking-wider opacity-80 ${compact ? "text-[8px]" : "text-[9px]"}`}>{ACTION_PRIORITY_LABEL_PL[key]}</p>
          <p
            className={`font-bold tabular-nums leading-tight ${compact ? "text-base" : "text-lg"}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {n}
          </p>
        </div>
      ))}
    </div>
  );
}

function resolveTenderItem(
  tenderId: string | undefined,
  pipelineItems?: TenderPipelineItem[],
): TenderPipelineItem | null {
  if (!tenderId || !pipelineItems?.length) return null;
  return pipelineItems.find((i) => i.id === tenderId) ?? null;
}

function ActionRow({
  item,
  onOpenTender,
  pipelineItems,
  onCreateJobFromTender,
  onOpenJob,
}: {
  item: OwnerActionItem;
  onOpenTender?: (tenderId: string) => void;
  pipelineItems?: TenderPipelineItem[];
  onCreateJobFromTender?: (item: TenderPipelineItem) => void;
  onOpenJob?: (jobId: string) => void;
}) {
  const tenderItem = isWonRealizationAction(item.id)
    ? resolveTenderItem(item.tenderId, pipelineItems)
    : null;
  return (
    <article className="rounded-xl border border-border bg-card/60 px-3.5 py-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityTone(item.priority)}`}>
            {ACTION_PRIORITY_LABEL_PL[item.priority]}
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

      <div className="flex flex-wrap items-center gap-2">
        {tenderItem && (
          <TenderJobLinkButtons
            item={tenderItem}
            onCreateJob={onCreateJobFromTender}
            onOpenJob={onOpenJob}
            size="compact"
          />
        )}
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
      </div>

      <p className="text-[10px] text-muted-foreground">
        <span className="opacity-70">Powód: </span>{item.reason}
        <span className="block text-[9px] mt-0.5 opacity-80">Źródło: {item.source}</span>
      </p>
    </article>
  );
}

function ActionRowCompact({
  item,
  deadlineLabel,
  onOpenTender,
  pipelineItems,
  onCreateJobFromTender,
  onOpenJob,
}: {
  item: OwnerActionItem;
  deadlineLabel: string | null;
  onOpenTender?: (tenderId: string) => void;
  pipelineItems?: TenderPipelineItem[];
  onCreateJobFromTender?: (item: TenderPipelineItem) => void;
  onOpenJob?: (jobId: string) => void;
}) {
  const tenderItem = isWonRealizationAction(item.id)
    ? resolveTenderItem(item.tenderId, pipelineItems)
    : null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <article className="rounded-lg border border-border bg-card/50 px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-start gap-2">
        <span className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 ${priorityTone(item.priority)}`}>
          {ACTION_PRIORITY_LABEL_PL[item.priority]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug">{item.title}</p>
          {deadlineLabel && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              <Calendar size={10} className="shrink-0" />
              {deadlineLabel}
            </p>
          )}
          <p className="text-[10px] text-primary mt-1 leading-snug">{item.recommendedAction}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground min-h-[32px] px-1"
        >
          {detailsOpen ? "Ukryj szczegóły" : "Szczegóły"}
        </button>
        {tenderItem && (
          <TenderJobLinkButtons
            item={tenderItem}
            onCreateJob={onCreateJobFromTender}
            onOpenJob={onOpenJob}
            size="compact"
          />
        )}
        {item.tenderId && onOpenTender && (
          <button
            type="button"
            onClick={() => onOpenTender(item.tenderId!)}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline min-h-[32px]"
          >
            <ExternalLink size={10} />
            Przetarg
          </button>
        )}
      </div>

      {detailsOpen && (
        <div className="text-[10px] text-muted-foreground space-y-1 pt-1 border-t border-border/60">
          {item.description ? <p>{item.description}</p> : null}
          <p>
            <span className="opacity-70">Powód: </span>
            {item.reason}
          </p>
          <p className="text-[9px] opacity-80">Źródło: {item.source}</p>
          <p className="text-[9px]">{ACTION_CATEGORY_LABEL_PL[item.category]}</p>
        </div>
      )}
    </article>
  );
}

export function ActionCenter({
  center,
  variant = "full",
  onOpenTender,
  pipelineItems,
  onCreateJobFromTender,
  onOpenJob,
}: {
  center: ActionCenterResult;
  variant?: "full" | "urgent";
  onOpenTender?: (tenderId: string) => void;
  /** Do etykiet terminu w widoku skróconym (variant urgent). */
  pipelineItems?: TenderPipelineItem[];
  onCreateJobFromTender?: (item: TenderPipelineItem) => void;
  onOpenJob?: (jobId: string) => void;
}) {
  const [showAllUrgent, setShowAllUrgent] = useState(false);
  const urgentPriorities = new Set<ActionPriority>(["CRITICAL", "HIGH"]);
  const primaryId = center.primaryAction?.id;
  const deadlineLookup = useTenderDeadlineLookup(pipelineItems);
  const now = useMemo(() => new Date(), []);

  const urgentActions = center.actions.filter((a) => urgentPriorities.has(a.priority));
  const urgentList =
    variant === "urgent"
      ? urgentActions.filter((a) => a.id !== primaryId)
      : urgentActions;

  const actions = variant === "urgent" ? urgentList : center.actions;

  const visibleUrgent =
    variant === "urgent" && !showAllUrgent
      ? actions.slice(0, URGENT_VISIBLE_MAX)
      : actions;

  const hiddenUrgentCount =
    variant === "urgent" && !showAllUrgent && actions.length > URGENT_VISIBLE_MAX
      ? actions.length - URGENT_VISIBLE_MAX
      : 0;

  const counts =
    variant === "urgent"
      ? countUrgent(actions)
      : center.counts;

  const title = variant === "urgent" ? "Co wymaga uwagi" : "Centrum działań";
  const subtitle = variant === "urgent"
    ? `maks. 5 · ${ACTION_PRIORITY_LABEL_PL.CRITICAL.toLowerCase()} · ${ACTION_PRIORITY_LABEL_PL.HIGH.toLowerCase()}`
    : "Co zrobić dzisiaj";

  return (
    <section className="rounded-xl border-2 border-primary/25 bg-card overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 border-b border-border bg-primary/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      </div>

      <div className={`${variant === "urgent" ? "p-3 space-y-3" : "p-4 space-y-4"}`}>
        <PriorityCounters counts={counts} urgentOnly={variant === "urgent"} compact={variant === "urgent"} />

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

        {visibleUrgent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            {variant === "urgent"
              ? "Brak dodatkowych pilnych zadań — priorytet jest w raporcie powyżej."
              : "Brak zadań na dziś — sytuacja stabilna."}
          </p>
        ) : variant === "urgent" ? (
          <div className="space-y-2">
            {visibleUrgent.map((item) => {
              const iso = item.tenderId ? deadlineLookup.get(item.tenderId) : null;
              const deadlineLabel = fmtDeadlineLabel(iso ?? null, now);
              return (
                <ActionRowCompact
                  key={item.id}
                  item={item}
                  deadlineLabel={deadlineLabel}
                  onOpenTender={onOpenTender}
                  pipelineItems={pipelineItems}
                  onCreateJobFromTender={onCreateJobFromTender}
                  onOpenJob={onOpenJob}
                />
              );
            })}
            {hiddenUrgentCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllUrgent(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[40px] py-2 rounded-lg border border-dashed border-primary/30"
              >
                <ChevronDown size={14} />
                Pokaż wszystkie ({actions.length})
              </button>
            )}
            {showAllUrgent && actions.length > URGENT_VISIBLE_MAX && (
              <button
                type="button"
                onClick={() => setShowAllUrgent(false)}
                className="w-full text-[10px] text-muted-foreground hover:text-foreground py-1"
              >
                Zwiń listę
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Lista działań ({actions.length})
            </p>
            {actions.map((item) => (
              <ActionRow
                key={item.id}
                item={item}
                onOpenTender={onOpenTender}
                pipelineItems={pipelineItems}
                onCreateJobFromTender={onCreateJobFromTender}
                onOpenJob={onOpenJob}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
