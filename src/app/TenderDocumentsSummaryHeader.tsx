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
  const { completeness } = summary;
  const readiness = completeness.valuationReadiness;
  const stats = completeness.stats;

  return (
    <section
      className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden"
      aria-label="Podsumowanie dokumentów"
      data-tenders-documents-summary-header
      data-ap2-s1-completeness
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
        <p className={TEUX_FONT_META}>
          Ostatnia analiza:{" "}
          <span className="font-medium text-foreground">{summary.lastAnalysisLabel}</span>
        </p>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* AP2-S1 — Gotowość do wyceny (at-a-glance) */}
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

        {/* Highlights */}
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

        {/* Stats from existing dossier */}
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
