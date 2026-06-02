/**
 * @legacy ETAP 5A — nie montowany w OwnerDashboard (decyzje na BestOpportunityCard).
 * Raport: docs/tender-center-pro-legacy-components.md
 */
import { GitCompare, Scale } from "lucide-react";
import type { TenderDecision, TenderScoringBundle } from "@/lib/tender-center-decision";
import { DECISION_LABEL_PL, topDecisionReasons } from "@/lib/tender-center-decision";
import type { OwnerTenderDecisionRecord } from "@/lib/tender-center-owner-decisions";
import type { OwnerSystemAlignment } from "@/lib/tender-center-owner-decisions";
import { explainStrategicDecision } from "@/lib/tender-center-explain";
import { ExplainReasonList, ExplainToggle } from "@/app/tender-center/components/ExplainBullets";

function decisionTone(decision: TenderDecision, active = false): string {
  const base =
    decision === "GO"
      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
      : decision === "HOLD"
        ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
        : "border-red-500/40 text-red-700 dark:text-red-400";
  return active
    ? `${base} bg-primary/10 ring-2 ring-primary/30 font-semibold`
    : `${base} bg-secondary/30 hover:bg-secondary/60`;
}

function decisionBadgeTone(decision: TenderDecision): string {
  switch (decision) {
    case "GO":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "HOLD":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "NO-GO":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25";
  }
}

function DecisionCompareRow({
  system,
  owner,
}: {
  system: TenderDecision;
  owner: TenderDecision | null;
}) {
  const mismatch = owner != null && owner !== system;
  return (
    <div className={`rounded-lg border px-3 py-2 space-y-1.5 ${mismatch ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/20"}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>
          <span className="text-muted-foreground">System: </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${decisionBadgeTone(system)}`}>
            {system}
          </span>
          <span className="text-muted-foreground text-[10px] ml-1">({DECISION_LABEL_PL[system]})</span>
        </span>
        <span>
          <span className="text-muted-foreground">Moja decyzja: </span>
          {owner ? (
            <>
              <strong>{owner}</strong>
              <span className="text-muted-foreground text-[10px] ml-1">({DECISION_LABEL_PL[owner]})</span>
            </>
          ) : (
            <span className="text-muted-foreground italic">— nie oznaczono</span>
          )}
        </span>
      </div>
      {mismatch && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400">
          Rozbieżność z rekomendacją systemu
        </p>
      )}
    </div>
  );
}

function DecisionButtons({
  current,
  onSelect,
}: {
  current: TenderDecision | null;
  onSelect: (d: TenderDecision) => void;
}) {
  const options: TenderDecision[] = ["GO", "HOLD", "NO-GO"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onSelect(d)}
          className={`text-[10px] font-medium px-2.5 py-1.5 rounded-lg border min-h-[36px] transition-colors ${decisionTone(d, current === d)}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function DecisionCard({
  bundle,
  ownerRecord,
  onSelect,
}: {
  bundle: TenderScoringBundle;
  ownerRecord: OwnerTenderDecisionRecord | null;
  onSelect: (d: TenderDecision) => void;
}) {
  const { item, opportunity, strategic, decision } = bundle;
  const reasons = topDecisionReasons(bundle);
  const stratExplain = explainStrategicDecision(bundle);

  return (
    <article className="rounded-xl border border-border bg-card/80 p-3.5 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {item.organizationName}
          {item.bzpNumber && <span className="ml-1.5 font-mono">{item.bzpNumber}</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] tabular-nums">
        <span className="px-2 py-1 rounded bg-secondary">Opportunity: <strong>{opportunity.score}</strong></span>
        <span className="px-2 py-1 rounded bg-secondary">Strategic: <strong>{strategic.score}</strong></span>
      </div>

      <DecisionCompareRow system={decision} owner={ownerRecord?.decision ?? null} />

      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Oznacz decyzję</p>
        <DecisionButtons current={ownerRecord?.decision ?? null} onSelect={onSelect} />
      </div>

      {reasons.length > 0 && (
        <ul className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border pt-2">
          {reasons.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <ExplainToggle label={`Strategic — dlaczego ${decision}?`}>
        <p className="text-[10px] text-muted-foreground mb-2">{stratExplain.summary}</p>
        <ExplainReasonList reasons={stratExplain.reasons} title={`Powody (${strategic.score} pkt strategic)`} />
      </ExplainToggle>
    </article>
  );
}

export function DecisionCenter({
  ranked,
  getOwnerDecision,
  onSetDecision,
  liveAlignment,
}: {
  ranked: TenderScoringBundle[];
  getOwnerDecision: (id: string) => OwnerTenderDecisionRecord | null;
  onSetDecision: (bundle: TenderScoringBundle, decision: TenderDecision) => void;
  liveAlignment: OwnerSystemAlignment;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Centrum decyzji</h2>
          </div>
          <span className="text-[10px] text-muted-foreground">Radar okazji · decyzja właściciela</span>
        </div>
        {liveAlignment.compared > 0 && (
          <div className="flex items-center gap-2 text-xs rounded-lg bg-secondary/40 px-3 py-2">
            <GitCompare size={14} className="text-primary shrink-0" />
            <span>
              <span className="text-muted-foreground">Zgodność z systemem (bieżąca): </span>
              <strong className="text-primary tabular-nums">{liveAlignment.agreementPct}%</strong>
              <span className="text-muted-foreground text-[10px] ml-1">
                ({liveAlignment.aligned}/{liveAlignment.compared})
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Brak przetargów na radarze — odśwież pipeline z BZP.
          </p>
        ) : (
          ranked.map((bundle) => (
            <DecisionCard
              key={bundle.item.id}
              bundle={bundle}
              ownerRecord={getOwnerDecision(bundle.item.id)}
              onSelect={(d) => onSetDecision(bundle, d)}
            />
          ))
        )}
        <p className="text-[10px] text-muted-foreground leading-snug">
          Decyzje zapisywane lokalnie ({`kw-tender-decisions`}). System ocenia na podstawie scoringu;
          właściciel może nadpisać werdykt.
        </p>
      </div>
    </section>
  );
}
