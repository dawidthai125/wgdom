import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Zap } from "lucide-react";
import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import type {
  HeroTodayItem,
  HeroTodayNavTarget,
  HeroTodayResult,
} from "@/lib/dashboard-hero-today";
import {
  ACTION_PRIORITY_LABEL_PL,
  priorityTone,
} from "@/lib/tender-center-action-center";
import { summaryToneClasses, type SummaryTone } from "@/lib/tender-center-morning-briefing";

/** UI label (20.7E) — „Hero” pozostaje nazwą techniczną komponentu/lib. */
export const NAJWAZNIEJSZE_DZIS_UI_LABEL = "Najważniejsze dziś";

export type HeroDzisNavigateView =
  | "payroll"
  | "directory"
  | "archive"
  | "jobs"
  | "schedule"
  | "inspector"
  | "recoverablecharges";

export function formatHeroCriticalBadge(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "1 krytyczne" : `${count} krytyczne`;
}

export function formatHeroHighBadge(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "1 wysokie" : `${count} wysokie`;
}

function SummaryToneChip({ tone }: { tone: SummaryTone }) {
  return (
    <span
      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${summaryToneClasses(tone)}`}
    >
      {tone}
    </span>
  );
}

export function resolveHeroItemNavigation(
  item: HeroTodayItem,
  handlers: {
    onNavigate: (
      v: HeroDzisNavigateView,
      jobId?: string,
      payrollEmpId?: string,
      jobSection?: JobDetailSection,
    ) => void;
    onOpenTenders?: () => void;
    onOpenTender?: (tenderId: string) => void;
  },
): void {
  const { onNavigate, onOpenTenders, onOpenTender } = handlers;

  if (item.navTarget === "tenders" || item.tenderId) {
    if (item.tenderId && onOpenTender) {
      onOpenTender(item.tenderId);
      return;
    }
    if (onOpenTenders) onOpenTenders();
    return;
  }

  const target = item.navTarget;
  if (!target || target === "tenders") return;

  if (target === "jobs" && item.jobId) {
    const section: JobDetailSection | undefined =
      item.domain === "documents" ? "reports" : item.domain === "inspector" ? "summary" : undefined;
    onNavigate("jobs", item.jobId, undefined, section);
    return;
  }

  if (target === "payroll") {
    onNavigate("payroll", undefined, item.payrollEmpId);
    return;
  }

  if (target === "inspector") {
    if (item.jobId) onNavigate("jobs", item.jobId, undefined, "summary");
    else onNavigate("inspector");
    return;
  }

  if (target === "recoverablecharges") {
    onNavigate("recoverablecharges");
    return;
  }

  const allowed: HeroTodayNavTarget[] = ["schedule", "archive", "directory", "jobs", "payroll", "inspector"];
  if (allowed.includes(target)) {
    onNavigate(target as HeroDzisNavigateView);
  }
}

function HeroActionRow({
  item,
  onNavigate,
  onOpenTenders,
  onOpenTender,
}: {
  item: HeroTodayItem;
  onNavigate: HeroDzisPanelProps["onNavigate"];
  onOpenTenders?: () => void;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        resolveHeroItemNavigation(item, { onNavigate, onOpenTenders, onOpenTender })
      }
      className="w-full text-left rounded-xl border border-border bg-card/60 px-3.5 py-3 space-y-2 hover:border-primary/25 hover:bg-card transition-colors min-h-[44px] touch-manipulation"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${priorityTone(item.priority)}`}
          >
            {ACTION_PRIORITY_LABEL_PL[item.priority]}
          </span>
          <p className="text-sm font-semibold leading-snug min-w-0 text-foreground">{item.title}</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" />
      </div>

      {item.subtitle && (
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{item.subtitle}</p>
      )}

      <div className="rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-2">
        <p className="text-[10px] font-medium text-primary flex items-start gap-1 leading-snug">
          <ChevronRight size={12} className="shrink-0 mt-0.5" />
          {item.recommendedAction}
        </p>
      </div>
    </button>
  );
}

function HeroCompactTopPreview({
  item,
  onNavigate,
  onOpenTenders,
  onOpenTender,
}: {
  item: HeroTodayItem;
  onNavigate: HeroDzisPanelProps["onNavigate"];
  onOpenTenders?: () => void;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        resolveHeroItemNavigation(item, { onNavigate, onOpenTenders, onOpenTender })
      }
      className="w-full text-left rounded-lg border border-border/80 bg-secondary/20 px-3 py-2.5 hover:border-primary/25 hover:bg-secondary/40 transition-colors min-h-[44px] touch-manipulation flex items-center gap-2 min-w-0"
    >
      <span
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${priorityTone(item.priority)}`}
      >
        {ACTION_PRIORITY_LABEL_PL[item.priority]}
      </span>
      <span className="text-xs font-medium leading-snug truncate min-w-0 flex-1 text-foreground">{item.title}</span>
      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
    </button>
  );
}

function HeroItemsList({
  items,
  onNavigate,
  onOpenTenders,
  onOpenTender,
}: {
  items: HeroTodayItem[];
  onNavigate: HeroDzisPanelProps["onNavigate"];
  onOpenTenders?: () => void;
  onOpenTender?: (tenderId: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5 min-w-0">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <HeroActionRow
            item={item}
            onNavigate={onNavigate}
            onOpenTenders={onOpenTenders}
            onOpenTender={onOpenTender}
          />
        </li>
      ))}
    </ul>
  );
}

export type HeroDzisPanelProps = {
  hero: HeroTodayResult;
  variant?: "full" | "compact";
  onNavigate: (
    v: HeroDzisNavigateView,
    jobId?: string,
    payrollEmpId?: string,
    jobSection?: JobDetailSection,
  ) => void;
  onOpenTenders?: () => void;
  onOpenTender?: (tenderId: string) => void;
};

function HeroDzisCompactPanel({
  hero,
  onNavigate,
  onOpenTenders,
  onOpenTender,
}: Omit<HeroDzisPanelProps, "variant">) {
  const [expanded, setExpanded] = useState(false);
  const criticalBadge = formatHeroCriticalBadge(hero.criticalCount);
  const highBadge = formatHeroHighBadge(hero.highCount);
  const topItem = hero.items[0];
  const hasItems = hero.items.length > 0;

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
      aria-label={NAJWAZNIEJSZE_DZIS_UI_LABEL}
    >
      <div className="px-3 sm:px-4 py-3 space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
            <Zap size={14} className="shrink-0 text-primary" />
            <h2 className="text-xs font-bold tracking-wide text-foreground">{NAJWAZNIEJSZE_DZIS_UI_LABEL}</h2>
          </div>
          <SummaryToneChip tone={hero.summaryTone} />
          {criticalBadge && (
            <span className="text-[10px] font-semibold text-destructive shrink-0">🔴 {criticalBadge}</span>
          )}
          {highBadge && (
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
              🟠 {highBadge}
            </span>
          )}
        </div>

        <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{hero.headline}</p>

        {!hasItems ? (
          <p className="text-xs text-muted-foreground">Dziś nie ma pilnych spraw.</p>
        ) : (
          <>
            {!expanded && topItem && (
              <HeroCompactTopPreview
                item={topItem}
                onNavigate={onNavigate}
                onOpenTenders={onOpenTenders}
                onOpenTender={onOpenTender}
              />
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary/70 text-xs font-semibold transition-colors min-h-[44px] touch-manipulation"
            >
              {expanded ? "Ukryj priorytety" : "Pokaż priorytety"}
              {expanded ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}
            </button>
            {expanded && (
              <div className="pt-1">
                <HeroItemsList
                  items={hero.items}
                  onNavigate={onNavigate}
                  onOpenTenders={onOpenTenders}
                  onOpenTender={onOpenTender}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function HeroDzisPanel({
  hero,
  variant = "full",
  onNavigate,
  onOpenTenders,
  onOpenTender,
}: HeroDzisPanelProps) {
  if (variant === "compact") {
    return (
      <HeroDzisCompactPanel
        hero={hero}
        onNavigate={onNavigate}
        onOpenTenders={onOpenTenders}
        onOpenTender={onOpenTender}
      />
    );
  }

  const criticalBadge = formatHeroCriticalBadge(hero.criticalCount);
  const highBadge = formatHeroHighBadge(hero.highCount);

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
      aria-label={NAJWAZNIEJSZE_DZIS_UI_LABEL}
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-secondary/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Zap size={16} className="shrink-0 text-primary" />
              <h2 className="text-sm font-bold tracking-wide text-foreground">{NAJWAZNIEJSZE_DZIS_UI_LABEL}</h2>
              <SummaryToneChip tone={hero.summaryTone} />
            </div>
            <p className="text-sm mt-1.5 leading-snug text-muted-foreground">{hero.headline}</p>
          </div>
          {(criticalBadge || highBadge) && (
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {criticalBadge && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-destructive/35 bg-destructive/10 text-destructive">
                  🔴 {criticalBadge}
                </span>
              )}
              {highBadge && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  🟠 {highBadge}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-2.5">
        {hero.items.length === 0 ? (
          <div className="text-center py-6 px-2">
            <p className="text-sm text-muted-foreground">Dziś nie ma pilnych spraw.</p>
          </div>
        ) : (
          <HeroItemsList
            items={hero.items}
            onNavigate={onNavigate}
            onOpenTenders={onOpenTenders}
            onOpenTender={onOpenTender}
          />
        )}
      </div>
    </section>
  );
}
