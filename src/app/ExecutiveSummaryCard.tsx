import type { ExecutiveSummary } from "@/lib/tender-executive-summary";

export function ExecutiveSummaryCard({ summary }: { summary: ExecutiveSummary }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-3">
      <div className="px-4 py-3 border-b border-border/70">
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          {summary.headline}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{summary.rowCountLabel}</span>
          {summary.departmentLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{summary.departmentLabel}</span>
            </>
          )}
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">Główne roboty:</p>
        {summary.mainWorks.length > 0 ? (
          <ul className="space-y-1">
            {summary.mainWorks.map((work) => (
              <li key={work} className="text-xs text-foreground flex gap-2">
                <span className="text-primary shrink-0">•</span>
                <span className="min-w-0 break-words">{work}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">{summary.noWorksMessage}</p>
        )}
        {summary.estimatedValue && (
          <p className="text-xs pt-1 border-t border-border/60">
            <span className="text-muted-foreground">Szacowana wartość: </span>
            <span className="font-semibold text-foreground">{summary.estimatedValue}</span>
          </p>
        )}
        {summary.confidenceLabel && summary.mainWorks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Pewność rozpoznania:{" "}
            <span className="font-medium text-foreground">{summary.confidenceLabel}</span>
          </p>
        )}
      </div>
    </div>
  );
}
