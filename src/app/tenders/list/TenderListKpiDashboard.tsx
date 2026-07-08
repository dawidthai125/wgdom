import type { MyQueueCounts, TendersListKpiId, TendersListQueueId } from "@/lib/tenders-list-ux";
import {
  TEUX_FONT_META,
  TEUX_KPI_LABEL,
  TEUX_KPI_VALUE,
} from "@/lib/tender-ux-tokens";

function KpiCell({
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "amber";
  onClick: () => void;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10"
      : "border-border bg-secondary/20 hover:bg-secondary/40";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 min-w-0 text-left w-full transition-colors ${toneClass}`}
    >
      <p className={`${TEUX_KPI_LABEL} truncate`}>{label}</p>
      <p className={`${TEUX_KPI_VALUE} leading-tight mt-0.5 tabular-nums`}>{value}</p>
      <p className={`${TEUX_FONT_META} text-muted-foreground truncate mt-0.5`}>{hint}</p>
    </button>
  );
}

export function TenderListKpiDashboard({
  stats,
  queueCounts,
  onKpiClick,
  onQueueClick,
}: {
  stats: { active: number; actionable: number; urgent: number; priority: number };
  queueCounts: MyQueueCounts;
  onKpiClick: (id: TendersListKpiId) => void;
  onQueueClick: (id: TendersListQueueId) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-2"
      data-testid="tender-list-kpi-dashboard"
      data-ng07-kpi-dashboard
    >
      <KpiCell
        label="Aktywne"
        value={stats.active}
        hint="Wszystkie aktywne"
        onClick={() => onKpiClick("active")}
      />
      <KpiCell
        label="Do zgłoszenia"
        value={stats.actionable}
        hint="Wrocław · remonty"
        tone={stats.actionable > 0 ? "amber" : "default"}
        onClick={() => onKpiClick("actionable")}
      />
      <KpiCell
        label="Kończy się ≤7 dni"
        value={stats.urgent}
        hint="Termin zbliża się"
        tone={stats.urgent > 0 ? "amber" : "default"}
        onClick={() => onKpiClick("urgent")}
      />
      <KpiCell
        label="Wymaga decyzji"
        value={queueCounts.needs_decision}
        hint="Bez Twojej decyzji"
        tone={queueCounts.needs_decision > 0 ? "amber" : "default"}
        onClick={() => onQueueClick("needs_decision")}
      />
    </div>
  );
}
