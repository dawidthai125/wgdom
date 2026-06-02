import type { ReactNode } from "react";
import { Info, Minus, Plus } from "lucide-react";
import type { ExplainLine } from "@/lib/tender-center-explain";

export function ExplainBullets({
  plus,
  minus,
  compact,
}: {
  plus: ExplainLine[];
  minus: ExplainLine[];
  compact?: boolean;
}) {
  if (plus.length === 0 && minus.length === 0) return null;

  return (
    <div className={`space-y-2 ${compact ? "text-[10px]" : "text-xs"}`}>
      {plus.length > 0 && (
        <ul className="space-y-0.5">
          {plus.map((l) => (
            <li key={`+${l.text}`} className="flex gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Plus size={11} className="shrink-0 mt-0.5" />
              <span>
                {l.text}
                {!compact && (
                  <span className="block text-[9px] text-muted-foreground font-normal mt-0.5">
                    Źródło: {l.source}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {minus.length > 0 && (
        <ul className="space-y-0.5">
          {minus.map((l) => (
            <li key={`-${l.text}`} className="flex gap-1.5 text-amber-700 dark:text-amber-400">
              <Minus size={11} className="shrink-0 mt-0.5" />
              <span>
                {l.text}
                {!compact && (
                  <span className="block text-[9px] text-muted-foreground font-normal mt-0.5">
                    Źródło: {l.source}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExplainReasonList({
  reasons,
  title = "Powody",
}: {
  reasons: ExplainLine[];
  title?: string;
}) {
  if (reasons.length === 0) return null;
  return (
    <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Info size={11} />
        {title}
      </p>
      <ul className="text-[10px] text-muted-foreground space-y-1">
        {reasons.map((r) => (
          <li key={r.text}>
            <span className="text-foreground">{r.text}</span>
            <span className="block text-[9px] opacity-80">Źródło: {r.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExplainToggle({ children, label = "Dlaczego?" }: { children: ReactNode; label?: string }) {
  return (
    <details className="group mt-2">
      <summary className="text-[10px] text-primary cursor-pointer hover:underline list-none">
        {label}
      </summary>
      <div className="mt-2 pl-0.5">{children}</div>
    </details>
  );
}
