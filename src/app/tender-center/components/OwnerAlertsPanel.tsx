import { Bell, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import type { OwnerStrategicAlert, OwnerAlertTone } from "@/lib/tender-center-explain";

function toneIcon(tone: OwnerAlertTone) {
  switch (tone) {
    case "danger":
      return <XCircle size={14} className="text-red-500 shrink-0" />;
    case "warning":
      return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
    case "success":
      return <CheckCircle size={14} className="text-emerald-500 shrink-0" />;
    case "info":
      return <Info size={14} className="text-blue-500 shrink-0" />;
  }
}

function toneBorder(tone: OwnerAlertTone): string {
  switch (tone) {
    case "danger":
      return "border-red-500/25 bg-red-500/5";
    case "warning":
      return "border-amber-500/25 bg-amber-500/5";
    case "success":
      return "border-emerald-500/25 bg-emerald-500/5";
    case "info":
      return "border-blue-500/25 bg-blue-500/5";
  }
}

export function OwnerAlertsPanel({ alerts }: { alerts: OwnerStrategicAlert[] }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Bell size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">Strategiczne alerty właściciela</h2>
        {alerts.length > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {alerts.length}
          </span>
        )}
      </div>
      <div className="p-4">
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Brak aktywnych alertów — sytuacja w normie.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={`rounded-lg border px-3 py-2.5 flex gap-2 ${toneBorder(a.tone)}`}
              >
                {toneIcon(a.tone)}
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-medium leading-snug">{a.message}</p>
                  <p className="text-[9px] text-muted-foreground">Źródło: {a.source}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
