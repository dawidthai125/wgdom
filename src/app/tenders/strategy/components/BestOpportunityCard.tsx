import { useState } from "react";
import { Target, ExternalLink, Calendar, Building2, Hash, Wallet, ChevronDown, Star } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { TenderJobLinkButtons } from "@/app/tenders/strategy/components/TenderJobLinkButtons";
import { DECISION_LABEL_PL, type TenderDecision, type TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { topDecisionReasons } from "@/lib/tenders-strategy-decision";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import { daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import { estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";
import { MetricHelpTooltip } from "@/app/tenders/strategy/components/MetricHelpTooltip";
import { OPPORTUNITY_LABEL_PL, PIPELINE_LABEL_PL, SECTION_LABEL_PL, STRATEGIC_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";
import { buildBestOpportunityLite } from "@/lib/tender-strategy-ux";

function fmtPln(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDeadline(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function decisionTone(decision: TenderScoringBundle["decision"], active = false): string {
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

function systemDecisionBadgeTone(decision: TenderScoringBundle["decision"]): string {
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
          className={`text-xs font-medium px-3 py-2 rounded-lg border min-h-[40px] transition-colors ${decisionTone(d, current === d)}`}
        >
          {DECISION_LABEL_PL[d]}
        </button>
      ))}
    </div>
  );
}

export function BestOpportunityCard({
  bundle,
  ownerRecord,
  onSetDecision,
  onOpenTender,
  onCreateJobFromTender,
  onOpenJob,
  liteDefault = false,
  legacyDecisionDemoted = false,
}: {
  bundle: TenderScoringBundle | null;
  ownerRecord?: OwnerTenderDecisionRecord | null;
  onSetDecision?: (bundle: TenderScoringBundle, decision: TenderDecision) => void;
  onOpenTender?: (tenderId: string) => void;
  onCreateJobFromTender?: (item: TenderPipelineItem) => void;
  onOpenJob?: (jobId: string) => void;
  /** UX.2S — domyślnie skrót, pełna analiza po rozwinięciu. */
  liteDefault?: boolean;
  /** S2 — Expert ON: demote „Moja decyzja” · hide write via omit onSetDecision. */
  legacyDecisionDemoted?: boolean;
}) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(!liteDefault);
  const lite = buildBestOpportunityLite(bundle, ownerRecord);
  const ownerDecisionLabel = legacyDecisionDemoted
    ? "Lejek / compatibility (legacy)"
    : "Moja decyzja";

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-testid="strategy-best-opportunity"
      data-s2-strategy-decision={legacyDecisionDemoted ? "demoted" : "legacy"}
    >
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {liteDefault ? <Star size={16} className="text-amber-500" /> : <Target size={16} className="text-primary" />}
          <h2 className="text-sm font-semibold">Najlepsza okazja</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showFullAnalysis && bundle && bundle.item.status === "won" && (
            <TenderJobLinkButtons
              item={bundle.item}
              onCreateJob={onCreateJobFromTender}
              onOpenJob={onOpenJob}
              size="compact"
            />
          )}
          {bundle && onOpenTender && (
            <button
              type="button"
              onClick={() => onOpenTender(bundle.item.id)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline min-h-[36px] px-2"
            >
              <ExternalLink size={12} />
              Otwórz przetarg
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!bundle || !lite ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Brak aktywnych przetargów — odśwież {PIPELINE_LABEL_PL.pipeline} z BZP.
          </p>
        ) : !showFullAnalysis ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold leading-snug">{lite.title}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex gap-x-1.5">
                <dt className="text-muted-foreground shrink-0">Termin:</dt>
                <dd className="font-medium">{lite.deadlineLabel}</dd>
              </div>
              <div className="flex gap-x-1.5">
                <dt className="text-muted-foreground shrink-0">Rekomendacja:</dt>
                <dd className="font-medium">{lite.systemDecisionLabel} · {lite.score} pkt</dd>
              </div>
              <div className="flex gap-x-1.5 sm:col-span-2">
                <dt className="text-muted-foreground shrink-0">{ownerDecisionLabel}:</dt>
                <dd className="font-medium">{lite.ownerDecisionLabel ?? "— brak —"}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setShowFullAnalysis(true)}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
              data-testid="strategy-best-opportunity-expand"
            >
              <ChevronDown size={12} />
              Pokaż analizę
            </button>
          </div>
        ) : (
          <>
            {liteDefault && (
              <button
                type="button"
                onClick={() => setShowFullAnalysis(false)}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium mb-3"
                data-testid="strategy-best-opportunity-collapse"
              >
                <ChevronDown size={12} className="rotate-180" />
                Ukryj analizę
              </button>
            )}
          <article className="space-y-4">
            <div className="space-y-1">
              <p className="text-base sm:text-lg font-semibold leading-snug">{bundle.item.title}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                <Building2 size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Zamawiający</p>
                  <p className="font-medium leading-snug">{bundle.item.organizationName}</p>
                  {bundle.item.isWroclaw && (
                    <span className="text-primary text-[10px] font-medium">Wrocław</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                <Hash size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Numer BZP</p>
                  <p className="font-mono font-medium">{bundle.item.bzpNumber || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                <Calendar size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Termin składania</p>
                  <p className="font-medium">
                    {fmtDeadline(bundle.item.submittingOffersDate)}
                    {(() => {
                      const days = daysUntilTenderDeadline(bundle.item.submittingOffersDate);
                      return days != null && days >= 0 ? (
                        <span className="text-muted-foreground ml-1">({days} dni)</span>
                      ) : null;
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                <Wallet size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Wartość kontraktu</p>
                  <p className="font-medium tabular-nums">
                    {(() => {
                      const val = estimatedValuePlnFromItem(bundle.item, bundle.item.swzAnalysis ?? null);
                      return val != null ? fmtPln(val) : "—";
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-0.5">
                  {OPPORTUNITY_LABEL_PL.short}
                  <MetricHelpTooltip metricId="opportunity-score" />
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums mt-0.5 ${scoreTone(bundle.opportunity.score)}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {bundle.opportunity.score}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-0.5">
                  {STRATEGIC_LABEL_PL.short}
                  <MetricHelpTooltip metricId="strategic-score" />
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums mt-0.5 ${scoreTone(bundle.strategic.score)}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {bundle.strategic.score}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 flex flex-col items-center justify-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{SECTION_LABEL_PL.system}</p>
                <span className={`mt-1 text-sm font-bold px-2 py-0.5 rounded-lg border ${systemDecisionBadgeTone(bundle.decision)}`}>
                  {DECISION_LABEL_PL[bundle.decision]}
                </span>
                <p className="text-[9px] text-muted-foreground mt-0.5">{bundle.decisionLabel}</p>
              </div>
            </div>

            {onSetDecision && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Moja decyzja
                </p>
                <DecisionButtons
                  current={ownerRecord?.decision ?? null}
                  onSelect={(d) => onSetDecision(bundle, d)}
                />
                {ownerRecord && ownerRecord.decision !== bundle.decision && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">
                    Rozbieżność z rekomendacją systemu ({DECISION_LABEL_PL[bundle.decision]})
                  </p>
                )}
              </div>
            )}

            {legacyDecisionDemoted && !onSetDecision && (
              <div
                className="rounded-xl border border-border bg-secondary/20 px-3 py-3 space-y-1"
                data-s2-strategy-legacy-ro
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {ownerDecisionLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  PRIMARY decyzja człowieka: Decision Workspace. Zapis GO/HOLD/NO-GO z tej karty wyłączony.
                </p>
                {ownerRecord && (
                  <p className="text-xs font-medium">
                    Ostatni zapis lejka: {DECISION_LABEL_PL[ownerRecord.decision]}
                  </p>
                )}
              </div>
            )}

            {topDecisionReasons(bundle).length > 0 && (
              <div className="rounded-xl bg-secondary/25 border border-border px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Najważniejsze powody
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {topDecisionReasons(bundle).map((r) => (
                    <li key={r} className="leading-snug flex gap-1.5">
                      <span className="text-primary shrink-0">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
          </>
        )}
      </div>
    </section>
  );
}
