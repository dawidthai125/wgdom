import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function StrategyCollapsibleSection({
  title,
  icon,
  summary,
  defaultExpanded = false,
  children,
  testId,
}: {
  title: string;
  icon?: ReactNode;
  summary: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-testid={testId}
    >
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          {icon}
          {title}
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="text-xs text-muted-foreground space-y-1">{summary}</div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
        >
          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Ukryj szczegóły" : "Rozwiń"}
        </button>
        {expanded && (
          <div className="pt-2 border-t border-border/60 space-y-3">{children}</div>
        )}
      </div>
    </section>
  );
}
