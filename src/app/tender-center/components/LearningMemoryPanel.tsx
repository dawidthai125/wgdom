import { Brain } from "lucide-react";
import {
  getLearningStats,
  topLearningReasons,
  type LearningStats,
} from "@/lib/tender-center-learning";

export function LearningMemoryPanel({ stats }: { stats: LearningStats }) {
  const topReasons = topLearningReasons(stats, 5);

  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Łącznie</p>
          <p
            className="text-2xl font-bold tabular-nums mt-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">GO</p>
          <p
            className="text-2xl font-bold tabular-nums mt-1 text-emerald-700 dark:text-emerald-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.go}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">HOLD</p>
          <p
            className="text-2xl font-bold tabular-nums mt-1 text-amber-700 dark:text-amber-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.hold}
          </p>
        </div>
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-3 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">NO-GO</p>
          <p
            className="text-2xl font-bold tabular-nums mt-1 text-red-700 dark:text-red-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.noGo}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/15 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide">Top 5 powodów</p>
        </div>
        {topReasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak zapisanych powodów — podejmij decyzję GO/HOLD/NO-GO przy najlepszej okazji.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {topReasons.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{r.label}</span>
                <span
                  className="font-bold tabular-nums text-primary"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ({r.count})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
