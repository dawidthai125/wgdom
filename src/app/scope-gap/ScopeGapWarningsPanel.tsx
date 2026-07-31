/**
 * Scope Gap MVP — panel „Luki zakresu” (RO UI).
 * DF: SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01.
 * Flaga OFF: parent nie montuje.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScopeGapReport, ScopeGapSeverity } from "@/lib/scope-gap";
import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";

function severityTone(severity: ScopeGapSeverity): string {
  if (severity === "high") {
    return "bg-rose-500/12 text-rose-800 dark:text-rose-300 border-rose-500/30";
  }
  if (severity === "warn") {
    return "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-sky-500/12 text-sky-800 dark:text-sky-300 border-sky-500/30";
}

function severityLabelPl(severity: ScopeGapSeverity): string {
  if (severity === "high") return "Wysokie";
  if (severity === "warn") return "Ostrzeżenie";
  return "Info";
}

/**
 * Panel „Luki zakresu” — osobna sekcja; bez disable CTA oferty.
 */
export function ScopeGapWarningsPanel({ report }: { report: ScopeGapReport }) {
  const [open, setOpen] = useState(true);

  if (!report.available) {
    return (
      <section
        className="rounded-lg border border-dashed border-border bg-background/70 p-3 space-y-1"
        data-scope-gap-mvp-panel
        data-scope-gap-mvp-available="0"
      >
        <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>Luki zakresu</h3>
        <p className={`${TEUX_FONT_META} text-muted-foreground`}>
          {report.emptyReasonPl ?? "Niedostępne"}
        </p>
        <p className={`${TEUX_FONT_META} text-muted-foreground/80`} data-scope-gap-mvp-engine>
          {report.engineVersion}
        </p>
      </section>
    );
  }

  const count = report.warnings.length;

  return (
    <section
      className="rounded-lg border border-border bg-background/70 p-3 space-y-2"
      data-scope-gap-mvp-panel
      data-scope-gap-mvp-available="1"
      data-scope-gap-mvp-count={String(count)}
      data-scope-gap-mvp-template={report.investmentTemplate}
    >
      <button
        type="button"
        className="w-full text-left touch-manipulation min-h-[44px] flex flex-wrap items-center justify-between gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-scope-gap-mvp-toggle
      >
        <span className={`${TEUX_FONT_CAPTION} font-semibold text-foreground flex items-center gap-1`}>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          Luki zakresu
        </span>
        <span className={`${TEUX_FONT_META} text-muted-foreground tabular-nums`}>
          {count === 0 ? "brak ostrzeżeń" : `${count} ostrzeż.`}
          <span className="ml-2 opacity-70">{report.investmentTemplate}</span>
        </span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/60 pt-2">
          {count === 0 ? (
            <p
              className={`${TEUX_FONT_CAPTION} text-muted-foreground`}
              data-scope-gap-mvp-empty
            >
              {report.emptyReasonPl ?? "Brak typowych ostrzeżeń zakresu (MVP)"}
            </p>
          ) : (
            <ul className="space-y-1.5" data-scope-gap-mvp-list>
              {report.warnings.map((w) => (
                <li
                  key={w.id}
                  className="rounded-md border border-border/70 bg-background/70 px-2 py-1.5"
                  data-scope-gap-mvp-warning={w.code}
                  data-scope-gap-mvp-severity={w.severity}
                >
                  <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground flex flex-wrap items-center gap-2`}>
                    <span
                      className={`${TEUX_FONT_META} rounded-md border px-2 py-0.5 ${severityTone(w.severity)}`}
                    >
                      {severityLabelPl(w.severity)}
                    </span>
                    {w.labelPl}
                  </p>
                  <p className={`${TEUX_FONT_META} text-muted-foreground mt-0.5`}>{w.rationalePl}</p>
                  <p className={`${TEUX_FONT_META} text-muted-foreground/80 mt-0.5`}>
                    {w.evidencePresentPl}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className={`${TEUX_FONT_META} text-muted-foreground`} data-scope-gap-mvp-disclaimer>
            {report.disclaimerPl}
          </p>
          <p className={`${TEUX_FONT_META} text-muted-foreground/80`} data-scope-gap-mvp-engine>
            {report.engineVersion}
          </p>
        </div>
      ) : null}
    </section>
  );
}
