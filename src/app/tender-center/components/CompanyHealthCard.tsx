/**
 * @legacy ETAP 5A — nie montowany w OwnerDashboard (zastąpiony przez CommandCenterHero).
 * Raport: docs/tender-center-pro-legacy-components.md
 */
import { Activity } from "lucide-react";
import {
  type CompanyHealthResult,
  HEALTH_LABEL_PL,
  type HealthDimension,
} from "@/lib/tender-center-health";
import type { HealthExplanation } from "@/lib/tender-center-explain";
import { ExplainBullets, ExplainToggle } from "@/app/tender-center/components/ExplainBullets";

const DIMENSION_LABELS: Record<HealthDimension, string> = {
  O: "Operacje",
  Z: "Zasoby",
  F: "Finanse",
  R: "Rynek",
  D: "Doświadczenie",
};

function labelTone(label: CompanyHealthResult["label"]): string {
  switch (label) {
    case "healthy":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    case "stable":
      return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25";
    case "strained":
      return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25";
    case "at_risk":
      return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25";
  }
}

function dimensionBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export function CompanyHealthCard({
  health,
  explanation,
}: {
  health: CompanyHealthResult;
  explanation?: HealthExplanation | null;
}) {
  const tone = labelTone(health.label);
  const dimensions = (["O", "Z", "F", "R", "D"] as HealthDimension[]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Kondycja firmy</h2>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tone}`}>
          {HEALTH_LABEL_PL[health.label]}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Index</p>
            <p
              className="text-4xl font-bold text-primary leading-none mt-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {health.index}
            </p>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <p className="text-xs text-muted-foreground leading-snug">{health.recommendation}</p>
            <p className="text-[10px] text-muted-foreground">
              Wolne sloty dziś: <strong className="text-foreground">{health.freeSlots}</strong>
              {" · "}
              Obciążenie pipeline: <strong className="text-foreground">{Math.round(health.overloadIndex * 100)}%</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {dimensions.map((key) => {
            const score = health.dimensions[key];
            return (
              <div key={key} className="rounded-lg bg-secondary/40 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{key}</span>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {score}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{DIMENSION_LABELS[key]}</p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dimensionBarColor(score)}`}
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {explanation && (
          <ExplainToggle label={`Dlaczego Health Index ${explanation.index}?`}>
            <p className="text-[10px] text-muted-foreground mb-2 leading-snug">{explanation.summary}</p>
            <ExplainBullets plus={explanation.plus} minus={explanation.minus} />
          </ExplainToggle>
        )}
      </div>
    </section>
  );
}
