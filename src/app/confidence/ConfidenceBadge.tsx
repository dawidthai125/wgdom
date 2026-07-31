/**
 * Confidence MVP — badge + drivers (RO UI).
 * DF: CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01 · etykieta „Pewność analizy”.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  presentConfidenceBadgeModel,
  type ConfidenceReport,
} from "@/lib/confidence-engine";
import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";

function bandTone(band: ConfidenceReport["band"]): string {
  if (band === "high") {
    return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
  }
  if (band === "medium") {
    return "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-rose-500/12 text-rose-800 dark:text-rose-300 border-rose-500/30";
}

/** Wyświetlenie score 0–100. */
export function ConfidenceScore({
  score0to100,
  available,
}: {
  score0to100: number;
  available: boolean;
}) {
  return (
    <span className="tabular-nums font-bold text-foreground" data-confidence-mvp-score>
      {available ? `${score0to100}/100` : "—"}
    </span>
  );
}

/** Lista driverów (expand). */
export function ConfidenceDrivers({ report }: { report: ConfidenceReport }) {
  if (!report.available || report.drivers.length === 0) {
    return (
      <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-confidence-mvp-drivers-empty>
        {report.emptyReasonPl ?? "Brak czynników."}
      </p>
    );
  }
  return (
    <div className="space-y-2" data-confidence-mvp-drivers>
      <ul className="space-y-1.5">
        {report.drivers.map((d) => (
          <li
            key={d.id}
            className="rounded-md border border-border/70 bg-background/70 px-2 py-1.5"
            data-confidence-mvp-driver={d.id}
          >
            <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
              <span className={d.impact >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                {d.impact >= 0 ? "(+)" : "(−)"}
              </span>{" "}
              {d.labelPl.replace(/\s*\([+−]\)\s*$/, "")}
              <span className={`${TEUX_FONT_META} text-muted-foreground font-normal ml-1`}>
                impact {d.impact > 0 ? "+" : ""}
                {d.impact}
              </span>
            </p>
            <p className={`${TEUX_FONT_META} text-muted-foreground`}>{d.evidencePl}</p>
          </li>
        ))}
      </ul>
      <p className={`${TEUX_FONT_META} text-muted-foreground`} data-confidence-mvp-disclaimer>
        {report.disclaimerPl}
      </p>
      <p className={`${TEUX_FONT_META} text-muted-foreground/80`} data-confidence-mvp-formula>
        {report.formulaVersion}
      </p>
    </div>
  );
}

/**
 * Badge „Pewność analizy” — obok S7; bez disable CTA.
 * Flaga OFF: parent nie montuje.
 */
export function ConfidenceBadge({ report }: { report: ConfidenceReport }) {
  const [open, setOpen] = useState(false);
  const model = presentConfidenceBadgeModel(report);

  if (!report.available) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-background/70 px-3 py-2 min-w-0"
        data-confidence-mvp-badge
        data-confidence-mvp-available="0"
        title={model.titleAttr}
      >
        <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
          {model.labelPl}
        </p>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
          Niedostępna
        </p>
        {report.emptyReasonPl ? (
          <p className={`${TEUX_FONT_META} text-muted-foreground mt-0.5`}>{report.emptyReasonPl}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-background/70 px-3 py-2 min-w-0"
      data-confidence-mvp-badge
      data-confidence-mvp-available="1"
      data-confidence-mvp-band={report.band}
      title={model.titleAttr}
    >
      <button
        type="button"
        className="w-full text-left touch-manipulation min-h-[44px]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-confidence-mvp-toggle
      >
        <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1`}>
          {open ? (
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          )}
          {model.labelPl}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2">
          <ConfidenceScore score0to100={report.score0to100} available={report.available} />
          <span
            className={`${TEUX_FONT_META} rounded-md border px-2 py-0.5 ${bandTone(report.band)}`}
            data-confidence-mvp-band-label
          >
            {model.bandLabelPl}
          </span>
        </p>
      </button>
      {open ? (
        <div className="mt-2 border-t border-border/60 pt-2">
          <ConfidenceDrivers report={report} />
        </div>
      ) : null}
    </div>
  );
}
