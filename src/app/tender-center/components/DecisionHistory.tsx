import { History } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { DECISION_LABEL_PL } from "@/lib/tender-center-decision";
import type {
  OwnerDecisionStats,
  OwnerSystemAlignment,
  OwnerTenderDecisionRecord,
} from "@/lib/tender-center-owner-decisions";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveTitle(id: string, items: TenderPipelineItem[]): string {
  const item = items.find((i) => i.id === id);
  if (!item) return id;
  return item.title.length > 72 ? `${item.title.slice(0, 72)}…` : item.title;
}

function Counter({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center min-w-[72px] ${tone}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className="text-xl font-bold tabular-nums mt-0.5"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {count}
      </p>
    </div>
  );
}

export function DecisionHistory({
  stats,
  snapshotAlignment,
  recent,
  pipelineItems,
  hideCounters = false,
}: {
  stats: OwnerDecisionStats;
  snapshotAlignment: OwnerSystemAlignment;
  recent: OwnerTenderDecisionRecord[];
  pipelineItems: TenderPipelineItem[];
  hideCounters?: boolean;
}) {
  return (
    <section className={`${hideCounters ? "" : "rounded-xl border border-border bg-card overflow-hidden"}`}>
      {!hideCounters && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <History size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Historia decyzji</h2>
        </div>
      )}

      <div className={hideCounters ? "space-y-4" : "p-4 space-y-4"}>
        {!hideCounters && (
          <div className="flex flex-wrap gap-2">
            <Counter label="GO" count={stats.go} tone="border-emerald-500/25 bg-emerald-500/5" />
            <Counter label="HOLD" count={stats.hold} tone="border-amber-500/25 bg-amber-500/5" />
            <Counter label="NO-GO" count={stats.noGo} tone="border-red-500/25 bg-red-500/5" />
          </div>
        )}

        {stats.total > 0 && (
          <div className="rounded-xl bg-secondary/40 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Analiza zgodności
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">System vs Właściciel: </span>
              <strong className="text-primary tabular-nums">{snapshotAlignment.agreementPct}%</strong>
              <span className="text-[10px] text-muted-foreground ml-2">
                ({snapshotAlignment.aligned} z {snapshotAlignment.compared} zgodnych przy zapisie)
              </span>
            </p>
          </div>
        )}

        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Brak zapisanych decyzji — oznacz przetarg na karcie Najlepsza okazja.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ostatnie decyzje
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {recent.map((rec) => {
                const aligned = rec.decision === rec.systemDecision;
                return (
                  <li key={rec.id} className="px-3 py-2.5 bg-card/50 space-y-1">
                    <p className="text-xs font-medium leading-snug">{resolveTitle(rec.id, pipelineItems)}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>
                        Właściciel: <strong className="text-foreground">{rec.decision}</strong>
                        {" "}({DECISION_LABEL_PL[rec.decision]})
                      </span>
                      <span>
                        System: <strong className="text-foreground">{rec.systemDecision}</strong>
                      </span>
                      <span className={aligned ? "text-emerald-600" : "text-amber-600"}>
                        {aligned ? "zgodne" : "rozbieżne"}
                      </span>
                      <span>{fmtWhen(rec.updatedAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
