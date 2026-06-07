import { useMemo } from "react";
import { TrendingUp, Trophy, Clock, Banknote } from "lucide-react";
import {
  type RecoverableCharge,
  fmtRecoverableAmount,
  computeRecoverableChargesTimeStats,
  computeRecoverableChargesTopLists,
} from "@/lib/recoverable-charges";

export function RecoverableChargesInsightsSection({
  charges,
  onSelectCharge,
}: {
  charges: RecoverableCharge[];
  onSelectCharge?: (chargeId: string) => void;
}) {
  const timeStats = useMemo(() => computeRecoverableChargesTimeStats(charges), [charges]);
  const topLists = useMemo(() => computeRecoverableChargesTopLists(charges), [charges]);
  const hasData = charges.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-primary shrink-0" />
        <p className="text-sm font-semibold">📈 Statystyki odzyskiwania</p>
      </div>

      {!hasData ? (
        <p className="text-xs text-muted-foreground">
          Brak pozycji — statystyki i rankingi pojawią się po dodaniu pierwszych rozliczeń.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <KpiTile label="Odzyskano w miesiącu" value={fmtRecoverableAmount(timeStats.monthRecovered)} accent />
            <KpiTile label="Odzyskano w roku" value={fmtRecoverableAmount(timeStats.yearRecovered)} />
            <KpiTile
              label="Średni czas odzyskania"
              value={timeStats.averageRecoveryDays != null ? `${timeStats.averageRecoveryDays} dni` : "—"}
            />
            <KpiTile label="Liczba zamkniętych pozycji" value={String(timeStats.settledCount)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <TopList
              icon={Trophy}
              title="🏆 Największe do odzyskania"
              items={topLists.largestOutstanding}
              emptyText="Brak nierozliczonych pozycji."
              onSelectCharge={onSelectCharge}
            />
            <TopList
              icon={Clock}
              title="🕒 Najstarsze pozycje"
              items={topLists.oldestOutstanding}
              emptyText="Brak nierozliczonych pozycji."
              onSelectCharge={onSelectCharge}
            />
            <TopList
              icon={Banknote}
              title="💰 Największe odzyskane"
              items={topLists.largestRecovered}
              emptyText="Brak w pełni rozliczonych pozycji."
              onSelectCharge={onSelectCharge}
            />
          </div>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p
        className={`text-base font-bold mt-1 ${accent ? "text-primary" : ""}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
    </div>
  );
}

function TopList({
  icon: Icon,
  title,
  items,
  emptyText,
  onSelectCharge,
}: {
  icon: typeof Trophy;
  title: string;
  items: { chargeId: string; title: string; amount: number; statusLabel: string }[];
  emptyText: string;
  onSelectCharge?: (chargeId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-primary shrink-0" />
        <p className="text-xs font-semibold">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const row = (
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtRecoverableAmount(item.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.statusLabel}</p>
              </div>
            );
            if (onSelectCharge) {
              return (
                <button
                  key={item.chargeId}
                  type="button"
                  onClick={() => onSelectCharge(item.chargeId)}
                  className="w-full text-left rounded-lg border border-border/80 bg-card/60 px-2.5 py-2 hover:bg-secondary/50 transition-colors"
                >
                  {row}
                </button>
              );
            }
            return (
              <div key={item.chargeId} className="rounded-lg border border-border/80 bg-card/60 px-2.5 py-2">
                {row}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
