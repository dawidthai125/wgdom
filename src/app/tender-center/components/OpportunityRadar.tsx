import { Radar } from "lucide-react";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import { topDecisionReasons } from "@/lib/tender-center-decision";

function decisionTone(decision: TenderScoringBundle["decision"]): string {
  switch (decision) {
    case "GO":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "HOLD":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "NO-GO":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25";
  }
}

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5 min-w-[72px]">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`text-base font-bold tabular-nums leading-tight ${scoreTone(score)}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {score}
      </p>
    </div>
  );
}

function OpportunityCard({ bundle }: { bundle: TenderScoringBundle }) {
  const { item, opportunity, strategic, decision, decisionLabel } = bundle;
  const reasons = topDecisionReasons(bundle);

  return (
    <article className="rounded-xl border border-border bg-card/80 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {item.organizationName}
            {item.isWroclaw && (
              <span className="ml-1.5 text-primary font-medium">· Wrocław</span>
            )}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ${decisionTone(decision)}`}>
          {decision} · {decisionLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <ScoreBadge label="Opportunity" score={opportunity.score} />
        <ScoreBadge label="Strategic" score={strategic.score} />
        <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Profil okazji</p>
          <p className="text-xs font-semibold text-foreground">{opportunity.label}</p>
        </div>
      </div>

      {reasons.length > 0 && (
        <ul className="text-[10px] text-muted-foreground space-y-0.5">
          {reasons.map((r) => (
            <li key={r} className="leading-snug">{r}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function OpportunityRadar({ ranked }: { ranked: TenderScoringBundle[] }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radar size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Radar okazji</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">Top {ranked.length} · GO / HOLD / NO-GO</span>
      </div>

      <div className="p-4 space-y-3">
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Brak aktywnych przetargów do oceny — odśwież pipeline z BZP.
          </p>
        ) : (
          ranked.map((bundle) => (
            <OpportunityCard key={bundle.item.id} bundle={bundle} />
          ))
        )}
        <p className="text-[10px] text-muted-foreground leading-snug">
          Opportunity Score — atrakcyjność przetargu. Strategic Score — gotowość firmy.
          Decyzja łączy oba wyniki w kontekście trybu rozwoju.
        </p>
      </div>
    </section>
  );
}
