import { useEffect, useMemo, useState } from "react";
import { Building2, Library, Settings2, Tags } from "lucide-react";
import { TenderCompanyProfilePanel } from "@/app/TenderCompanyProfilePanel";
import { CompanyQualificationProfilePanel } from "@/app/CompanyQualificationProfilePanel";
import { TenderPriceBasePanel } from "@/app/TenderPriceBasePanel";
import { TenderKeywordsPanel } from "@/app/TenderKeywordsPanel";
import { WorkCatalogView } from "@/app/work-catalog/WorkCatalogView";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import {
  TENDERS_COMPANY_SECTION_LABELS,
  TENDERS_MODULE_LABELS,
  type TendersCompanySectionId,
} from "@/lib/tenders-module-labels";
import {
  GROWTH_MODE_LABELS,
  type GrowthMode,
} from "@/lib/tenders-strategy-growth-mode";
import {
  loadTendersCompanySection,
  saveTendersCompanySection,
} from "@/lib/tenders-module-nav";
import {
  TEUX_FONT_CAPTION,
  TEUX_TRANSITION_FAST,
} from "@/lib/tender-ux-tokens";

const SECTION_ORDER: TendersCompanySectionId[] = [
  "profile",
  "workcatalog",
  "pricebase",
  "settings",
];

/**
 * NG-TENDERS-WORKSPACE-01 — hub Firma (Configuration + Admin).
 * Sekcje wewnętrzne — nie top-level tabs.
 */
export function TendersCompanyTab({
  canViewWorkCatalog = false,
}: {
  canViewWorkCatalog?: boolean;
}) {
  const { bumpProfileVersion, snapshot, setActiveTab } = useTendersContext();
  const { pipeline, growthModeState, setGrowthMode, health } = snapshot;
  const modes = Object.keys(GROWTH_MODE_LABELS) as GrowthMode[];

  const visibleSections = useMemo(
    () => SECTION_ORDER.filter((id) => id !== "workcatalog" || canViewWorkCatalog),
    [canViewWorkCatalog],
  );

  const [section, setSectionState] = useState<TendersCompanySectionId>(() => {
    const loaded = loadTendersCompanySection();
    if (loaded === "workcatalog" && !canViewWorkCatalog) return "profile";
    return loaded;
  });

  useEffect(() => {
    if (section === "workcatalog" && !canViewWorkCatalog) {
      setSectionState("profile");
      saveTendersCompanySection("profile");
    }
  }, [section, canViewWorkCatalog]);

  const setSection = (next: TendersCompanySectionId) => {
    if (next === "workcatalog" && !canViewWorkCatalog) return;
    setSectionState(next);
    saveTendersCompanySection(next);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      data-tenders-company-hub
    >
      <div className="shrink-0 px-4 sm:px-6 pt-3 pb-2 border-b border-border/60 space-y-2">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">{TENDERS_MODULE_LABELS.tabs.company}</h2>
        </div>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
          Konfiguracja firmy i wyceny — poza codzienną kolejką przetargów.
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Sekcje Firmy"
        >
          {visibleSections.map((id) => {
            const selected = section === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-tenders-company-section={id}
                onClick={() => setSection(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border text-xs font-medium ${TEUX_TRANSITION_FAST} ${
                  selected
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {id === "profile" && <Building2 size={13} aria-hidden />}
                {id === "workcatalog" && <Library size={13} aria-hidden />}
                {id === "pricebase" && <Tags size={13} aria-hidden />}
                {id === "settings" && <Settings2 size={13} aria-hidden />}
                {TENDERS_COMPANY_SECTION_LABELS[id]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {section === "profile" && (
          <>
            <p className="text-xs text-muted-foreground">
              Limity wadium, równoległe roboty i dane ofertowe — wpływają na scoring i prognozę.
            </p>
            <TenderCompanyProfilePanel onSaved={() => bumpProfileVersion()} />
            <CompanyQualificationProfilePanel onSaved={() => bumpProfileVersion()} />
          </>
        )}

        {section === "workcatalog" && canViewWorkCatalog && (
          <div className="min-h-0">
            <WorkCatalogView layout="embedded" />
          </div>
        )}

        {section === "pricebase" && (
          <TenderPriceBasePanel onSaved={() => bumpProfileVersion()} />
        )}

        {section === "settings" && (
          <div className="space-y-4">
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
                  Wpływa na wagi indeksu kondycji i rekomendacje w Przeglądzie.
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
                Zaawansowane ustawienia auto-sync i harmonogramu pobierania ogłoszeń — planowane w kolejnej iteracji.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className="mt-2 text-[11px] text-primary hover:underline"
              >
                Odświeżanie kolejki — zakładka Kolejka → „Odśwież z BZP”
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
