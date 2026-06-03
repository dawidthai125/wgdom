import type { LucideIcon } from "lucide-react";
import { Sun, Target, AlertTriangle, Wallet, Sparkles, Lightbulb } from "lucide-react";
import {
  summaryToneClasses,
  type MorningBriefing,
} from "@/lib/tender-center-morning-briefing";

function BriefBlock({
  label,
  icon: Icon,
  content,
  accent = "default",
}: {
  label: string;
  icon: LucideIcon;
  content: string;
  accent?: "default" | "primary" | "amber" | "emerald";
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
    <div className={`rounded-xl border px-3 py-3 space-y-1.5 ${accents[accent]}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={iconAccents[accent]} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-sm leading-snug whitespace-pre-line">{content}</p>
    </div>
  );
}

export function MorningBriefingCard({ briefing }: { briefing: MorningBriefing }) {
  const opportunityLines = briefing.opportunityStatus.split("\n\n");
  const oppTitle = opportunityLines[0] ?? "";
  const oppScores = opportunityLines[1] ?? "";
  const oppAction = opportunityLines[2] ?? "";

  return (
    <section className="rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-card via-card to-primary/8 overflow-hidden shadow-lg">
      <div className="px-4 sm:px-5 py-3 border-b border-primary/15 bg-primary/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sun size={18} className="text-primary" />
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-primary">
              Codzienny raport właściciela
            </h2>
            <p className="text-sm text-foreground/90 mt-0.5">{briefing.greeting}</p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${summaryToneClasses(briefing.summaryTone)}`}
        >
          {briefing.summaryTone}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-base sm:text-lg font-semibold leading-snug">{briefing.headline}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <BriefBlock
            label="Priorytet dnia"
            icon={Target}
            content={briefing.priorityAction}
            accent="primary"
          />
          <BriefBlock
            label="Ryzyko"
            icon={AlertTriangle}
            content={briefing.biggestRisk}
            accent="amber"
          />
          <BriefBlock
            label="Finanse"
            icon={Wallet}
            content={briefing.financialStatus}
            accent="default"
          />
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Najlepsza okazja
              </p>
            </div>
            <p className="text-sm font-semibold leading-snug">{oppTitle}</p>
            {oppScores && (
              <p
                className="text-xs tabular-nums text-muted-foreground whitespace-pre-line"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {oppScores}
              </p>
            )}
            {oppAction && (
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  oppAction === "STARTUJ"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {oppAction}
              </p>
            )}
          </div>
          <BriefBlock
            label="Insight"
            icon={Lightbulb}
            content={briefing.ownerInsight}
            accent="emerald"
          />
        </div>
      </div>
    </section>
  );
}
