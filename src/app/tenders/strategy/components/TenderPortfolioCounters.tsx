import { Briefcase } from "lucide-react";
import type { PortfolioDecisionCounts } from "@/lib/tenders-strategy-decision";
import { DECISION_LABEL_PL } from "@/lib/tenders-strategy-decision";
import { PIPELINE_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";
import type { OwnerDecisionStats } from "@/lib/tenders-strategy-owner-decisions";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type {
  OwnerSystemAlignment,
  OwnerTenderDecisionRecord,
} from "@/lib/tenders-strategy-owner-decisions";
import { DecisionHistory } from "@/app/tenders/strategy/components/DecisionHistory";

function Counter({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 text-center ${tone}`}>
      <p
        className="text-3xl sm:text-4xl font-bold tabular-nums leading-none"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {count}
      </p>
      <p className="text-xs font-bold mt-2 tracking-wide">{label}</p>
    </div>
  );
}

function CounterRow({
  title,
  subtitle,
  counts,
}: {
  title: string;
  subtitle: string;
  counts: { GO: number; HOLD: number; "NO-GO": number };
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Counter
          label={DECISION_LABEL_PL.GO}
          count={counts.GO}
          tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        />
        <Counter
          label={DECISION_LABEL_PL.HOLD}
          count={counts.HOLD}
          tone="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        />
        <Counter
          label={DECISION_LABEL_PL["NO-GO"]}
          count={counts["NO-GO"]}
          tone="border-red-500/25 bg-red-500/8 text-red-700 dark:text-red-400"
        />
      </div>
    </div>
  );
}

export function TenderPortfolioPanel({
  systemCounts,
  ownerStats,
  snapshotAlignment,
  recent,
  pipelineItems,
}: {
  systemCounts: PortfolioDecisionCounts;
  ownerStats: OwnerDecisionStats;
  snapshotAlignment: OwnerSystemAlignment;
  recent: OwnerTenderDecisionRecord[];
  pipelineItems: TenderPipelineItem[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Portfel przetargów</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {systemCounts.total} otwartych postępowań
        </span>
      </div>

      <div className="p-4 space-y-6">
        <CounterRow
          title="Rekomendacje systemu"
          subtitle={`${DECISION_LABEL_PL.GO} / ${DECISION_LABEL_PL.HOLD} / ${DECISION_LABEL_PL["NO-GO"]} wg scoringu dla otwartych przetargów`}
          counts={systemCounts}
        />

        <div className="border-t border-border pt-5 space-y-4">
          <CounterRow
            title="Moje decyzje"
            subtitle={`Co oznaczyłeś w ${PIPELINE_LABEL_PL.pipeline} — ${PIPELINE_LABEL_PL.ownerDecisionsKv}`}
            counts={{
              GO: ownerStats.go,
              HOLD: ownerStats.hold,
              "NO-GO": ownerStats.noGo,
            }}
          />
          <DecisionHistory
            stats={ownerStats}
            snapshotAlignment={snapshotAlignment}
            recent={recent}
            pipelineItems={pipelineItems}
            hideCounters
          />
        </div>
      </div>
    </section>
  );
}

/** @deprecated ETAP 5A — użyj TenderPortfolioPanel */
export const TenderPortfolioCounters = TenderPortfolioPanel;
