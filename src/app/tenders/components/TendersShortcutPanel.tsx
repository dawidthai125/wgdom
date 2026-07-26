import { useMemo } from "react";
import { AlertTriangle, Briefcase, ChevronRight, Scale, type LucideIcon } from "lucide-react";
import { TENDERS_MODULE_LABELS } from "@/lib/tenders-module-labels";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { WgButton, WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN, WG_TYPE_LABEL } from "@/lib/wg-ui-tokens";

const SHORTCUT_TITLE = "Przetargi — skrót";

function ShortcutKpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  /** warn = amber (urgent/won); info = soft GDS (decisions); default = idle */
  tone?: "default" | "warn" | "info";
}) {
  const surface =
    tone === "warn"
      ? "border-amber-500/35 bg-amber-500/5"
      : "border-border/60 bg-secondary/10";
  const iconClass =
    tone === "warn"
      ? "text-amber-500 shrink-0"
      : tone === "info"
        ? "text-primary shrink-0"
        : "text-muted-foreground shrink-0";

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", surface)} data-teux7e-kpi>
      <p className={cn(WG_TYPE_LABEL, "flex items-center gap-1 truncate")}>
        <Icon size={11} className={iconClass} />
        {label}
      </p>
      <p
        className="text-lg font-semibold text-foreground leading-tight mt-0.5"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{hint}</p>
    </div>
  );
}

export function TendersShortcutPanel({
  onOpenTendersStrategy,
}: {
  onOpenTendersStrategy: () => void;
}) {
  const { snapshot, ownerDecisions, openTendersStrategy } = useTendersContext();
  const { pipeline, marketKpi, scoredForForecast } = snapshot;

  const wonWithoutJobCount = useMemo(
    () => pipeline.items.filter((i) => i.status === "won" && !i.linkedJobId).length,
    [pipeline.items],
  );

  const pendingDecisionsCount = useMemo(
    () =>
      scoredForForecast.filter((b) => {
        if (ownerDecisions.getOwnerDecision(b.item.id)) return false;
        return b.opportunity.score >= 55;
      }).length,
    [scoredForForecast, ownerDecisions],
  );

  const handleOpenStrategy = () => {
    openTendersStrategy();
    onOpenTendersStrategy();
  };

  if (pipeline.loading) {
    return (
      <WgCard elevation="soft" padding="sm" radius="md" className="text-center text-sm text-muted-foreground py-6">
        {TENDERS_MODULE_LABELS.loading}
      </WgCard>
    );
  }

  return (
    <WgCard elevation="soft" padding="sm" radius="md" className="overflow-hidden">
      <div className="pb-3 border-b border-border/50">
        <h2 className="text-sm font-semibold text-foreground">{SHORTCUT_TITLE}</h2>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          3 sygnały operacyjne — monitoring, zmiany i Q&A w {TENDERS_MODULE_LABELS.tabs.strategy}
        </p>
      </div>

      <div className="pt-3 space-y-3">
        {pipeline.error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {pipeline.error}
          </p>
        )}

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          data-teux7e-dashboard-kpi
        >
          <ShortcutKpiTile
            label="Pilne terminy"
            value={marketKpi.urgentCount}
            hint="Termin składania ≤7 dni"
            icon={AlertTriangle}
            tone={marketKpi.urgentCount > 0 ? "warn" : "default"}
          />
          <ShortcutKpiTile
            label="Wymagają decyzji"
            value={pendingDecisionsCount}
            hint="Okazje bez Twojej decyzji"
            icon={Scale}
            tone={pendingDecisionsCount > 0 ? "info" : "default"}
          />
          <ShortcutKpiTile
            label="Wygrane bez roboty"
            value={wonWithoutJobCount}
            hint="Wymagają utworzenia roboty"
            icon={Briefcase}
            tone={wonWithoutJobCount > 0 ? "warn" : "default"}
          />
        </div>

        <WgButton
          type="button"
          variant="secondary"
          onClick={handleOpenStrategy}
          className={cn(WG_TOUCH_MIN, "w-full h-11 gap-2 text-sm font-semibold")}
        >
          Przetargi → {TENDERS_MODULE_LABELS.tabs.strategy}
          <ChevronRight size={16} />
        </WgButton>
      </div>
    </WgCard>
  );
}
