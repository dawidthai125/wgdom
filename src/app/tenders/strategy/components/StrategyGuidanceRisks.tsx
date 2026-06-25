import { AlertTriangle } from "lucide-react";
import type { StrategyRiskBullet } from "@/lib/tender-strategy-ux";

function toneClass(tone: StrategyRiskBullet["tone"]): string {
  switch (tone) {
    case "danger":
      return "border-red-500/30 bg-red-500/8 text-red-800 dark:text-red-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/8 text-amber-900 dark:text-amber-200";
    default:
      return "border-border bg-secondary/25 text-foreground";
  }
}

export function StrategyGuidanceRisks({ risks }: { risks: StrategyRiskBullet[] }) {
  if (risks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-border/70 bg-secondary/20 px-3 py-3">
        Brak istotnych ryzyk wskazanych na dziś.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {risks.map((risk) => (
        <li
          key={risk.id}
          className={`flex gap-2 rounded-lg border px-3 py-2.5 text-sm leading-snug ${toneClass(risk.tone)}`}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5 opacity-80" aria-hidden />
          <span>{risk.text}</span>
        </li>
      ))}
    </ul>
  );
}
