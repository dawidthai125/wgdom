import { Settings2 } from "lucide-react";
import {
  GROWTH_MODE_LABELS,
  type GrowthMode,
} from "@/lib/tenders-strategy-growth-mode";
import { TenderKeywordsPanel } from "@/app/TenderKeywordsPanel";
import { useTendersContext } from "@/app/tenders/context/TendersContext";

export function TendersSettingsTab() {
  const { snapshot, setActiveTab } = useTendersContext();
  const { pipeline, growthModeState, setGrowthMode, health } = snapshot;
  const modes = Object.keys(GROWTH_MODE_LABELS) as GrowthMode[];

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2">
        <Settings2 size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">Ustawienia przetargów</h2>
      </div>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Słowa kluczowe skanowania BZP</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Własne dopiski do wbudowanego słownika — wpływają na trafność i filtr „Do zgłoszenia”.
          </p>
        </div>
        <div className="p-4">
          <TenderKeywordsPanel onSaved={() => void pipeline.resyncKeywords()} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Tryb rozwoju firmy</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Wpływa na wagi indeksu kondycji i rekomendacje w zakładce Strategia.
            {health.suggestedGrowthMode !== growthModeState.mode && (
              <span className="block mt-1 text-amber-700 dark:text-amber-400">
                System sugeruje: {GROWTH_MODE_LABELS[health.suggestedGrowthMode]}
              </span>
            )}
          </p>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setGrowthMode(mode)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border min-h-[40px] transition-colors ${
                growthModeState.mode === mode
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {GROWTH_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Skan BZP — w przygotowaniu
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Zaawansowane ustawienia auto-sync i harmonogramu pobierania ogłoszeń — planowane w kolejnej iteracji modułu Przetargi.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className="mt-2 text-[11px] text-primary hover:underline"
        >
          Odświeżanie listy — zakładka Lista → „Odśwież z BZP”
        </button>
      </section>
    </div>
  );
}
