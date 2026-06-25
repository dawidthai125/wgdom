import { Lightbulb } from "lucide-react";

export function StrategyGuidanceWhy({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-border/70 bg-secondary/20 px-3 py-3">
        Brak dodatkowych uzasadnień — szczegóły w karcie rekomendacji powyżej.
      </p>
    );
  }

  return (
    <ul className="space-y-2 rounded-xl border border-border bg-card px-4 py-3">
      {bullets.map((text) => (
        <li key={text} className="flex gap-2 text-sm text-foreground leading-snug">
          <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" aria-hidden />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
