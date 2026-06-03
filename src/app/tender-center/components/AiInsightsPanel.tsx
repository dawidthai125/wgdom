import type { LucideIcon } from "lucide-react";
import { Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import type { AiInsightsResult } from "@/lib/tender-center-ai-insights";

function InsightColumn({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  tone: "primary" | "amber" | "emerald";
}) {
  const toneClasses = {
    primary: "border-primary/25 bg-primary/5",
    amber: "border-amber-500/25 bg-amber-500/5",
    emerald: "border-emerald-500/25 bg-emerald-500/5",
  };
  const iconClasses = {
    primary: "text-primary",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={iconClasses[tone]} />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <ul className="space-y-2 text-sm leading-snug">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiInsightsPanel({ insights }: { insights: AiInsightsResult }) {
  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Dojrzałość wiedzy systemu
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className="text-3xl font-bold tabular-nums text-primary"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {insights.maturityScore}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
        <p className="text-sm font-semibold mt-1 uppercase tracking-wide">
          {insights.maturityLabel}
        </p>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${insights.maturityScore}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <InsightColumn
          title="Wnioski"
          icon={Sparkles}
          items={insights.highlights}
          tone="primary"
        />
        <InsightColumn
          title="Ostrzeżenia"
          icon={AlertTriangle}
          items={insights.warnings}
          tone="amber"
        />
        <InsightColumn
          title="Mocne strony"
          icon={TrendingUp}
          items={insights.strengths}
          tone="emerald"
        />
      </div>
    </div>
  );
}
