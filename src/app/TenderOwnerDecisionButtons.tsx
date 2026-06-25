import { DECISION_LABEL_PL, type TenderDecision } from "@/lib/tenders-strategy-decision";

function decisionTone(decision: TenderDecision, active: boolean): string {
  if (!active) return "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70";
  switch (decision) {
    case "GO":
      return "border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
    case "HOLD":
      return "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "NO-GO":
      return "border-red-500/50 bg-red-500/15 text-red-800 dark:text-red-300";
    default:
      return "border-border bg-secondary/40";
  }
}

export function TenderOwnerDecisionButtons({
  current,
  onSelect,
}: {
  current: TenderDecision | null;
  onSelect: (d: TenderDecision) => void;
}) {
  const options: TenderDecision[] = ["GO", "HOLD", "NO-GO"];
  return (
    <div className="flex flex-wrap gap-1.5" data-tender-decision-buttons>
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(d); }}
          className={`text-xs font-medium px-3 py-2.5 rounded-lg border min-h-[44px] transition-colors ${decisionTone(d, current === d)}`}
        >
          {DECISION_LABEL_PL[d]}
        </button>
      ))}
    </div>
  );
}
