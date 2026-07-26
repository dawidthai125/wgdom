import {
  analysisStepStateToTone,
  mapAnalysisStepStateLabel,
  type TenderDocumentsTabSummary,
} from "@/lib/tender-documents-tab-summary";
import type { DocumentsTrustBadgeView } from "@/lib/tender-trust-ui";
import { TrustBadge } from "@/app/tenders/trust/TrustBadge";
import { TenderUxSectionTitle } from "@/app/tenders/design-system/TenderUxSectionTitle";
import { TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import {
  formatDetectedRolesSummary,
  presenceSymbol,
  valuationReadinessBadge,
  valuationReadinessToneClass,
  type DocCompletenessPresence,
  type DocCompletenessSlot,
} from "@/lib/tender-documentation-completeness";
import {
  confidenceLabelPl,
  type IntelligenceConfidence,
  type IntelligenceFact,
} from "@/lib/tender-deep-intelligence";

function presenceToneClass(presence: DocCompletenessPresence): string {
  switch (presence) {
    case "found":
      return "text-emerald-700 dark:text-emerald-400";
    case "not_applicable":
      return "text-sky-700 dark:text-sky-400";
    case "unknown":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

function confidenceToneClass(c: IntelligenceConfidence): string {
  switch (c) {
    case "high":
      return "text-emerald-700 dark:text-emerald-400";
    case "medium":
      return "text-amber-800 dark:text-amber-300";
    default:
      return "text-muted-foreground";
  }
}

function KeyFactRow({ fact }: { fact: IntelligenceFact }) {
  return (
    <div className="min-w-0 border-b border-border/40 last:border-0 py-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className={`${TEUX_FONT_META} text-muted-foreground`}>{fact.label}</p>
        <span className={`${TEUX_FONT_META} ${confidenceToneClass(fact.confidence)}`}>
          pewność: {confidenceLabelPl(fact.confidence)}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground break-words">{fact.value}</p>
      <p className={`${TEUX_FONT_META} text-muted-foreground mt-0.5`}>
        Źródło: {fact.sourceDoc}
        {fact.sourceSection ? ` · ${fact.sourceSection}` : ""}
      </p>
    </div>
  );
}

function CompletenessSlotRow({ slot }: { slot: DocCompletenessSlot }) {
  const detail = slot.detailPl ? ` (${slot.detailPl})` : "";
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs min-w-0">
      <span className="shrink-0" aria-hidden>
        {presenceSymbol(slot.presence)}
      </span>
      <span className={`font-medium min-w-0 break-words ${presenceToneClass(slot.presence)}`}>
        {slot.label}{detail}
      </span>
    </div>
  );
}

export function TenderDocumentsSummaryHeader({
  summary,
  trustBadge,
}: {
  summary: TenderDocumentsTabSummary;
  trustBadge?: DocumentsTrustBadgeView | null;
}) {
  const { completeness, analysisHistory, journeyStages, glance, deepIntelligence } = summary;
  const readiness = completeness.valuationReadiness;
  const stats = completeness.stats;
  const showJourney = summary.analysisBusy
    || journeyStages.some((s) => s.state === "active");
  const keyFacts = deepIntelligence.keyFacts;

  return (
    <section
      className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden"
      aria-label="Podsumowanie dokumentów"
      data-tenders-documents-summary-header
      data-ap2-s1-completeness
      data-ap2-s2-auto-ux
      data-ap2-s3-deep-intelligence
    >
      <div className="px-4 py-2.5 border-b border-primary/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <TenderUxSectionTitle className="text-primary">
            Podsumowanie dokumentów
          </TenderUxSectionTitle>
          {trustBadge && (
            <TrustBadge
              level={trustBadge.level}
              labelPl={trustBadge.labelPl}
              title={trustBadge.title}
            />
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* AP2-S2 — Ostatnia analiza */}
        <div
          className="rounded-lg border border-primary/15 bg-background/60 px-3 py-2.5"
          data-ap2-s2-analysis-history
        >
          <p className={`${TEUX_FONT_META} text-muted-foreground mb-0.5`}>
            Ostatnia analiza
          </p>
          <p className="text-sm font-semibold text-foreground">
            {analysisHistory.headline}
          </p>
          <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 ${TEUX_FONT_META} text-muted-foreground`}>
            <span>
              Status:{" "}
              <span className="font-medium text-foreground">{analysisHistory.statusLabelPl}</span>
            </span>
            <span>
              Dokumenty:{" "}
              <span className="font-medium text-foreground">{analysisHistory.documentCount}</span>
            </span>
            {analysisHistory.relativeLabel && (
              <span>
                <span className="font-medium text-foreground">{analysisHistory.relativeLabel}</span>
              </span>
            )}
          </div>
        </div>

        {/* AP2-S2 — postęp etapów */}
        {showJourney && (
          <div data-ap2-s2-journey-progress className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <TenderUxSectionTitle className="text-muted-foreground">
                Postęp analizy
              </TenderUxSectionTitle>
              {summary.activeStageLabel && (
                <p className={`${TEUX_FONT_META} text-amber-800 dark:text-amber-300 font-medium`}>
                  {summary.activeStageLabel}
                </p>
              )}
            </div>
            <div
              className="h-1.5 rounded-full bg-secondary overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(summary.progressRatio * 100)}
              aria-label="Postęp analizy dokumentów"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${Math.max(8, Math.round(summary.progressRatio * 100))}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {journeyStages.map((stage) => (
                <span
                  key={stage.id}
                  className={`inline-flex items-center ${TEUX_FONT_META} font-medium px-2 py-0.5 rounded-md border ${
                    stage.state === "done"
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25"
                      : stage.state === "active"
                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25"
                        : "bg-secondary/60 text-muted-foreground border-border"
                  }`}
                >
                  {stage.state === "done" ? "✓ " : stage.state === "active" ? "● " : ""}
                  {stage.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AP2-S3 — Najważniejsze informacje */}
        {keyFacts.length > 0 && (
          <div
            className="rounded-lg border border-primary/15 bg-background/60 px-3 py-2.5"
            data-ap2-s3-key-facts
          >
            <TenderUxSectionTitle className="text-muted-foreground mb-1">
              Najważniejsze informacje
            </TenderUxSectionTitle>
            <p className={`${TEUX_FONT_META} text-muted-foreground mb-2`}>
              Skrót z treści dokumentów — każda pozycja ma źródło i poziom pewności.
            </p>
            <div className="space-y-0">
              {keyFacts.map((f) => (
                <KeyFactRow key={f.id} fact={f} />
              ))}
            </div>
            {(deepIntelligence.przedmiar.workGroups.length > 1
              || deepIntelligence.przedmiar.knrCatalogs.length > 0) && (
              <div className={`mt-2 pt-2 border-t border-primary/10 ${TEUX_FONT_META} text-muted-foreground`}>
                {deepIntelligence.przedmiar.workGroups.length > 0 && (
                  <p>
                    Grupy robót:{" "}
                    <span className="font-medium text-foreground">
                      {deepIntelligence.przedmiar.workGroups.slice(0, 5).join(" · ")}
                    </span>
                  </p>
                )}
                {deepIntelligence.hasUmowaSignal && (
                  <p className="mt-0.5">
                    Wykryto projekt umowy — klauzule wyodrębnione bez oceny ryzyka.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* AP2-S1 — Gotowość do wyceny */}
        <div
          className="rounded-lg border border-primary/15 bg-background/60 px-3 py-2.5"
          data-ap2-s1-valuation-readiness
        >
          <p className={`${TEUX_FONT_META} text-muted-foreground mb-0.5`}>
            Gotowość do przygotowania wyceny
          </p>
          <p className={`text-sm font-semibold ${valuationReadinessToneClass(readiness.level)}`}>
            <span aria-hidden>{valuationReadinessBadge(readiness.level)} </span>
            {readiness.labelPl}
          </p>
          {readiness.hint && (
            <p className={`${TEUX_FONT_META} text-muted-foreground mt-1`}>{readiness.hint}</p>
          )}
        </div>

        {/* AP2-S2 — rekomendacja + ryzyko (REUSE fit + S1) */}
        {(glance.recommendationLabel || glance.riskLabel) && (
          <div
            className={`grid gap-2 sm:grid-cols-2 ${TEUX_FONT_META}`}
            data-ap2-s2-glance
          >
            {glance.recommendationLabel && (
              <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                <p className="text-muted-foreground mb-0.5">Rekomendacja (profil)</p>
                <p className="font-medium text-foreground">{glance.recommendationLabel}</p>
              </div>
            )}
            {glance.riskLabel && (
              <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                <p className="text-muted-foreground mb-0.5">Ryzyko</p>
                <p className="font-medium text-foreground">{glance.riskLabel}</p>
              </div>
            )}
          </div>
        )}

        {/* AP2-S1 — Kompletność dokumentacji */}
        <div data-ap2-s1-doc-completeness>
          <TenderUxSectionTitle className="text-muted-foreground mb-1.5">
            Kompletność dokumentacji
          </TenderUxSectionTitle>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {completeness.slots.map((slot) => (
              <CompletenessSlotRow key={slot.id} slot={slot} />
            ))}
          </div>
        </div>

        {(completeness.highlights.found.length > 0
          || completeness.highlights.missing.length > 0
          || completeness.highlights.info.length > 0) && (
          <div className={`grid gap-2 sm:grid-cols-3 ${TEUX_FONT_META}`}>
            {completeness.highlights.found.length > 0 && (
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5">
                  Wykryte
                </p>
                <p className="text-muted-foreground">{completeness.highlights.found.join(" · ")}</p>
              </div>
            )}
            {completeness.highlights.missing.length > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground mb-0.5">
                  Brakujące (nie błąd)
                </p>
                <p className="text-muted-foreground">{completeness.highlights.missing.join(" · ")}</p>
              </div>
            )}
            {completeness.highlights.info.length > 0 && (
              <div>
                <p className="font-semibold text-sky-800 dark:text-sky-300 mb-0.5">
                  Informacje
                </p>
                <p className="text-muted-foreground">{completeness.highlights.info.join(" · ")}</p>
              </div>
            )}
          </div>
        )}

        <div
          className={`flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-primary/10 ${TEUX_FONT_META} text-muted-foreground`}
          data-ap2-s1-analysis-stats
        >
          <span>
            Dokumenty:{" "}
            <span className="font-medium text-foreground">{stats.documentCount}</span>
          </span>
          <span>
            Załączniki (scan):{" "}
            <span className="font-medium text-foreground">{stats.attachmentCount}</span>
          </span>
          {stats.przedmiarRowCount > 0 && (
            <span>
              Pozycje przedmiaru:{" "}
              <span className="font-medium text-foreground">{stats.przedmiarRowCount}</span>
            </span>
          )}
          {stats.branchCount > 0 && (
            <span>
              Branże/sekcje:{" "}
              <span className="font-medium text-foreground">
                {stats.branchCount}
                {stats.branchLabels.length > 0 ? ` (${stats.branchLabels.slice(0, 3).join(", ")})` : ""}
              </span>
            </span>
          )}
          {stats.pageCount != null && (
            <span>
              Strony:{" "}
              <span className="font-medium text-foreground">{stats.pageCount}</span>
            </span>
          )}
          {stats.detectedRoles.length > 0 && (
            <span className="basis-full">
              Role:{" "}
              <span className="font-medium text-foreground">
                {formatDetectedRolesSummary(stats.detectedRoles)}
              </span>
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-primary/10 space-y-1.5">
          <TenderUxSectionTitle className="text-muted-foreground">
            Gotowość procesu
          </TenderUxSectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {summary.processReadiness.map((row) => {
              const tone = analysisStepStateToTone(row.state);
              return (
                <span
                  key={row.id}
                  className={`inline-flex items-center gap-1 ${TEUX_FONT_META} font-medium px-2 py-0.5 rounded-md border ${
                    tone === "ok"
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25"
                      : tone === "pending"
                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25"
                        : tone === "warn"
                          ? "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/25"
                          : "bg-secondary/60 text-muted-foreground border-border"
                  }`}
                  title={row.label}
                >
                  {row.label}
                  <span className="opacity-80">· {mapAnalysisStepStateLabel(row.state)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
