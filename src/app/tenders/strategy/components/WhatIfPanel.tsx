import { useCallback, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import type { Forecast90DaysInput } from "@/lib/tenders-strategy-forecast-90d";
import { utilizationBarTone } from "@/lib/tenders-strategy-forecast-90d";
import {
  computeWhatIfComparison,
  defaultCustomWinTenderIds,
  formatDeltaPct,
  whatIfGoCandidateLabel,
  WHAT_IF_PRESET_LABELS,
  WHAT_IF_PRESET_ORDER,
  type WhatIfPresetId,
} from "@/lib/tenders-strategy-what-if";
import { BASELINE_LABEL_PL, PIPELINE_LABEL_PL } from "@/lib/tenders-strategy-ui-labels-pl";

function deltaTone(delta: number): string {
  if (delta > 5) return "text-orange-600 dark:text-orange-400";
  if (delta < -5) return "text-amber-600 dark:text-amber-400";
  if (delta === 0) return "text-muted-foreground";
  return "text-foreground";
}

function ComparisonResults({
  comparison,
  presetId,
}: {
  comparison: ReturnType<typeof computeWhatIfComparison>;
  presetId: WhatIfPresetId;
}) {
  const biggestAbs = Math.abs(comparison.biggestChangeDeltaPct);
  const showDelta = presetId !== "baseline";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {comparison.horizons.map((h) => {
          const width = Math.min(100, Math.max(4, h.simulatedPct));
          const isBiggest = h.days === comparison.biggestChangeHorizon && showDelta && biggestAbs > 0;
          return (
            <div
              key={h.days}
              className={`rounded-xl border px-3 py-3 space-y-2 ${
                isBiggest ? "border-primary/35 bg-primary/5" : "border-border bg-secondary/25"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tabular-nums">{h.days} dni</p>
                {showDelta && (
                  <span className={`text-[10px] font-bold tabular-nums ${deltaTone(h.deltaPct)}`}>
                    Δ {formatDeltaPct(h.deltaPct)}%
                  </span>
                )}
              </div>
              <p
                className="text-3xl font-bold tabular-nums leading-none"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {h.simulatedPct}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {h.simulatedActiveJobs} równoległych
                {showDelta && (
                  <span className="text-muted-foreground/80">
                    {" "}
                    · stan bazowy {h.baselinePct}%
                  </span>
                )}
              </p>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${utilizationBarTone(h.simulatedPct)}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showDelta && biggestAbs > 0 && (
        <p className="text-xs font-semibold text-center tabular-nums">
          Największa zmiana:{" "}
          <span
            className={
              comparison.biggestChangeDeltaPct > 0
                ? "text-orange-600 dark:text-orange-400"
                : "text-amber-600 dark:text-amber-400"
            }
          >
            {formatDeltaPct(comparison.biggestChangeDeltaPct)}%
          </span>
          {" "}za {comparison.biggestChangeHorizon} dni {BASELINE_LABEL_PL.vsBaseline}
        </p>
      )}

      <p className="text-sm text-foreground/90 leading-snug rounded-lg bg-secondary/30 border border-border px-3 py-2.5">
        {comparison.conclusion}
      </p>

      {presetId === "plus_one_slot" && (
        <p className="text-[10px] text-muted-foreground text-center">
          Limit równoległych: {comparison.maxConcurrentBaseline} → {comparison.maxConcurrentSimulated}
        </p>
      )}
    </>
  );
}

export function WhatIfPanel({
  forecastInput,
  goCandidates,
}: {
  forecastInput: Forecast90DaysInput;
  goCandidates: TenderScoringBundle[];
}) {
  const [presetId, setPresetId] = useState<WhatIfPresetId>("baseline");
  const [customSelectedIds, setCustomSelectedIds] = useState<string[]>([]);
  const [customInitialized, setCustomInitialized] = useState(false);

  const handlePresetClick = useCallback(
    (id: WhatIfPresetId) => {
      setPresetId(id);
      if (id === "custom" && !customInitialized) {
        setCustomSelectedIds(defaultCustomWinTenderIds(goCandidates));
        setCustomInitialized(true);
      }
    },
    [customInitialized, goCandidates],
  );

  const toggleCustomTender = useCallback((tenderId: string) => {
    setCustomSelectedIds((prev) =>
      prev.includes(tenderId)
        ? prev.filter((x) => x !== tenderId)
        : [...prev, tenderId],
    );
  }, []);

  const comparison = useMemo(() => {
    if (presetId === "custom") {
      return computeWhatIfComparison(forecastInput, "custom", customSelectedIds);
    }
    return computeWhatIfComparison(forecastInput, presetId);
  }, [forecastInput, presetId, customSelectedIds]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Co jeśli?</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {BASELINE_LABEL_PL.baseline}: {BASELINE_LABEL_PL.percentGo} · limit {comparison.maxConcurrentBaseline} slotów
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {WHAT_IF_PRESET_ORDER.map((id) => {
            const active = id === presetId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handlePresetClick(id)}
                className={`text-[10px] font-medium px-2.5 py-2 rounded-lg border min-h-[36px] transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {WHAT_IF_PRESET_LABELS[id]}
              </button>
            );
          })}
        </div>

        {presetId === "custom" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Wybierz wygrane starty ({customSelectedIds.length}/{goCandidates.length})
            </p>
            {goCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {PIPELINE_LABEL_PL.noCandidatesInPipeline}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {goCandidates.map((bundle) => {
                  const checked = customSelectedIds.includes(bundle.item.id);
                  const label = whatIfGoCandidateLabel(bundle);
                  return (
                    <li key={bundle.item.id}>
                      <label className="flex items-start gap-2.5 cursor-pointer min-h-[40px] py-1 rounded-lg hover:bg-secondary/40 px-1 -mx-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCustomTender(bundle.item.id)}
                          className="mt-1 shrink-0 rounded border-border"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground block text-[10px] mt-0.5">
                            Opp {bundle.opportunity.score} · {bundle.decision}
                            {bundle.item.title.length > 0 && (
                              <> · {bundle.item.title.slice(0, 40)}{bundle.item.title.length > 40 ? "…" : ""}</>
                            )}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <ComparisonResults comparison={comparison} presetId={presetId} />
      </div>
    </section>
  );
}
