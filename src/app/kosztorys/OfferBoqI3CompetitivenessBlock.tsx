/**
 * AI-COST-02-I3 — sekcja Konkurencyjność (RO) w Explain 02-B.
 * Presentational only · flaga I3 ∧ 02-B gate w panelu hosta.
 */

import { useMemo, useState } from "react";
import { TEUX_FONT_CAPTION, TEUX_FONT_META } from "@/lib/tender-ux-tokens";
import {
  i3BandLabelPl,
  type I3CompetitivenessView,
  type I3LineCompetitiveness,
  type I3MarketSource,
} from "@/lib/ai-cost-02-i3-competitiveness";

const TOP_N = 10;

function marketSourceLabelPl(src: I3MarketSource): string {
  if (src === "market_quotes") return "marketQuotes";
  if (src === "controlled_market") return "controlled_market";
  return "—";
}

function formatDelta(deltaPct: number | null): string {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return "—";
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}

function bandPriority(row: I3LineCompetitiveness): number {
  if (row.isOutlier) return 0;
  if (row.band === "above_market") return 1;
  if (row.band === "below_market") return 2;
  if (row.band === "in_band") return 3;
  return 4;
}

export function OfferBoqI3CompetitivenessBlock({
  view,
  lineMeta,
  onFocusLine,
}: {
  view: I3CompetitivenessView;
  /** lp / description z Explain — RO display. */
  lineMeta: Map<string, { lp: string; description: string }>;
  onFocusLine: (lineId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const s = view.summary;

  const ranked = useMemo(() => {
    const copy = [...view.lines];
    copy.sort((a, b) => {
      const p = bandPriority(a) - bandPriority(b);
      if (p !== 0) return p;
      return (b.lineDirectPln || 0) - (a.lineDirectPln || 0);
    });
    return copy;
  }, [view.lines]);

  const visible = showAll ? ranked : ranked.slice(0, TOP_N);
  const hidden = Math.max(0, ranked.length - visible.length);

  return (
    <section
      className="rounded-lg border border-border bg-background/60 p-3 space-y-3"
      data-ai-cost-02-i3-competitiveness
    >
      <div className="space-y-1">
        <h3 className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
          Konkurencyjność (RO)
        </h3>
        <p className={`${TEUX_FONT_META} text-muted-foreground`}>
          Pozycja wyceny względem rynku (±10% · outlier &gt;25%). Bez zapisu Quotes · bez
          Bid.
        </p>
      </div>

      {s.lineCount === 0 ? (
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>Brak pozycji do oceny.</p>
      ) : (
        <>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            data-ai-cost-02-i3-summary
          >
            <SummaryChip label="Poniżej" value={String(s.below)} />
            <SummaryChip label="W paśmie" value={String(s.inBand)} />
            <SummaryChip label="Powyżej" value={String(s.above)} />
            <SummaryChip label="Brak benchmarku" value={String(s.noBenchmark)} />
            <SummaryChip label="Outlier" value={String(s.outlierCount)} />
            <SummaryChip
              label="Direct powyżej"
              value={
                s.aboveDirectShare > 0
                  ? `${Math.round(s.aboveDirectShare * 100)}%`
                  : "0%"
              }
            />
          </div>

          {s.withBenchmark === 0 ? (
            <p
              className={`${TEUX_FONT_CAPTION} text-muted-foreground`}
              data-ai-cost-02-i3-no-benchmark-all
            >
              Brak benchmarku rynkowego (marketQuotes / controlled_market) — to nie oznacza
              „powyżej rynku”.
            </p>
          ) : null}

          <ul className="space-y-1" data-ai-cost-02-i3-lines>
            {visible.map((row) => {
              const meta = lineMeta.get(row.lineId);
              return (
                <li key={row.lineId}>
                  <button
                    type="button"
                    className="w-full text-left rounded-md border border-border/70 px-2.5 py-2 min-h-[44px] touch-manipulation hover:bg-secondary/30"
                    onClick={() => onFocusLine(row.lineId)}
                    data-ai-cost-02-i3-line={row.lineId}
                    data-ai-cost-02-i3-band={row.band}
                  >
                    <span className="font-mono text-xs">{meta?.lp ?? "—"}</span>{" "}
                    <span className={`${TEUX_FONT_CAPTION} text-foreground`}>
                      {meta?.description ?? row.lineId}
                    </span>
                    <span className={`${TEUX_FONT_META} text-muted-foreground block`}>
                      {i3BandLabelPl(row.band, row.isOutlier)} · Δ {formatDelta(row.deltaPct)} ·{" "}
                      {marketSourceLabelPl(row.marketSource)}
                      {row.controlledMarketUsed ? " · CM" : ""}
                      {row.ckHint.present && row.ckHint.labelPl
                        ? ` · ${row.ckHint.labelPl}`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {hidden > 0 && !showAll ? (
            <button
              type="button"
              className={`${TEUX_FONT_CAPTION} min-h-[44px] touch-manipulation text-foreground underline-offset-2 hover:underline`}
              onClick={() => setShowAll(true)}
              data-ai-cost-02-i3-show-more
            >
              Pokaż więcej (+{hidden})
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 px-2 py-1.5">
      <p className={`${TEUX_FONT_META} text-muted-foreground`}>{label}</p>
      <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>{value}</p>
    </div>
  );
}
