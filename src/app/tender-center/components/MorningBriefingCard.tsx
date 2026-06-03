import type { LucideIcon } from "lucide-react";
import { Sun, AlertTriangle, Wallet, Lightbulb } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  summaryToneClasses,
  type MorningBriefing,
} from "@/lib/tender-center-morning-briefing";
import { TenderJobLinkButtons } from "@/app/tender-center/components/TenderJobLinkButtons";

function BriefBlock({
  label,
  icon: Icon,
  content,
  accent = "default",
  compact = false,
}: {
  label: string;
  icon: LucideIcon;
  content: string;
  accent?: "default" | "primary" | "amber" | "emerald";
  compact?: boolean;
}) {
  const accents = {
    default: "border-border bg-secondary/20",
    primary: "border-primary/25 bg-primary/5",
    amber: "border-amber-500/25 bg-amber-500/5",
    emerald: "border-emerald-500/25 bg-emerald-500/5",
  };
  const iconAccents = {
    default: "text-muted-foreground",
    primary: "text-primary",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={`rounded-lg border ${compact ? "px-2.5 py-2 space-y-1" : "px-3 py-3 space-y-1.5"} ${accents[accent]}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} className={iconAccents[accent]} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className={`leading-snug whitespace-pre-line ${compact ? "text-xs" : "text-sm"}`}>{content}</p>
    </div>
  );
}

export function MorningBriefingCard({
  briefing,
  compact = true,
  hideOpportunityPreview = true,
  wonOpportunityItem = null,
  onCreateJobFromTender,
  onOpenJob,
}: {
  briefing: MorningBriefing;
  /** ETAP 7G.1 — mniejszy briefing; priorytet i okazja są w innych sekcjach. */
  compact?: boolean;
  hideOpportunityPreview?: boolean;
  /** Najlepsza okazja = wygrany przetarg bez roboty — CTA ETAP 8.0 */
  wonOpportunityItem?: TenderPipelineItem | null;
  onCreateJobFromTender?: (item: TenderPipelineItem) => void;
  onOpenJob?: (jobId: string) => void;
}) {
  const showWonJobCta =
    wonOpportunityItem?.status === "won"
    && !wonOpportunityItem.linkedJobId
    && onCreateJobFromTender;
  return (
    <section
      className={`rounded-xl border-2 border-primary/25 bg-gradient-to-br from-card via-card to-primary/8 overflow-hidden ${
        compact ? "shadow-sm" : "shadow-lg"
      }`}
    >
      <div
        className={`border-b border-primary/15 bg-primary/5 flex flex-wrap items-center justify-between gap-2 ${
          compact ? "px-3 py-2" : "px-4 sm:px-5 py-3"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sun size={compact ? 16 : 18} className="text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[10px] font-bold tracking-widest uppercase text-primary">
              Codzienny raport właściciela
            </h2>
            <p className={`text-foreground/90 truncate ${compact ? "text-xs mt-0.5" : "text-sm mt-0.5"}`}>
              {briefing.greeting}
            </p>
          </div>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border shrink-0 ${summaryToneClasses(briefing.summaryTone)}`}
        >
          {briefing.summaryTone}
        </span>
      </div>

      <div className={`space-y-3 ${compact ? "p-3" : "p-4 sm:p-5 space-y-4"}`}>
        <div>
          <p className={`font-semibold leading-snug ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
            {briefing.headline}
          </p>
          {compact && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
              {briefing.priorityAction}
            </p>
          )}
        </div>

        {compact ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <BriefBlock label="Ryzyko" icon={AlertTriangle} content={briefing.biggestRisk} accent="amber" compact />
            <BriefBlock label="Finanse" icon={Wallet} content={briefing.financialStatus} accent="default" compact />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <BriefBlock label="Ryzyko" icon={AlertTriangle} content={briefing.biggestRisk} accent="amber" />
            <BriefBlock label="Finanse" icon={Wallet} content={briefing.financialStatus} accent="default" />
            {!hideOpportunityPreview && (
              <BriefBlock label="Insight" icon={Lightbulb} content={briefing.ownerInsight} accent="emerald" />
            )}
          </div>
        )}

        {compact && briefing.ownerInsight && (
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-snug">
            <Lightbulb size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{briefing.ownerInsight}</span>
          </p>
        )}

        {showWonJobCta && wonOpportunityItem && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-snug">
              Wygrany przetarg — utwórz robotę, aby rozpocząć realizację.
            </p>
            <TenderJobLinkButtons
              item={wonOpportunityItem}
              onCreateJob={onCreateJobFromTender}
              onOpenJob={onOpenJob}
              size="compact"
            />
          </div>
        )}
      </div>
    </section>
  );
}
