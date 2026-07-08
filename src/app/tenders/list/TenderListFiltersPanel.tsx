import { Download, CheckSquare, Square, Pin, BookmarkPlus } from "lucide-react";
import type { TenderActionChip } from "@/lib/tenders-actions";
import {
  TENDERS_LIST_CLIENT_BAR,
  TENDERS_LIST_PRIMARY_QUEUE,
  TENDERS_LIST_SECONDARY_QUEUE,
  TENDERS_LIST_QUICK_BAR,
  type MyQueueCounts,
  type TenderPipelineLocalFilter,
  type TendersListClientBarId,
  type TendersListFavoritePreset,
  type TendersListKpiId,
  type TendersListQueueId,
  type TendersListQuickBarId,
} from "@/lib/tenders-list-ux";
import { TendersLegend } from "@/app/TendersLegend";
import { TenderUxChip } from "@/app/tenders/design-system/TenderUxChip";
import { TEUX_FONT_META } from "@/lib/tender-ux-tokens";

function sectionTitle(text: string) {
  return (
    <p className={`${TEUX_FONT_META} font-semibold uppercase tracking-wide text-muted-foreground`}>
      {text}
    </p>
  );
}

function queueInactiveClass(active: boolean, hasItems: boolean): string {
  if (active || !hasItems) return "";
  return "bg-amber-500/8 text-amber-800 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15";
}

export type TenderListFiltersPanelProps = {
  queueCounts: MyQueueCounts;
  queueFilter: TendersListQueueId | null;
  activeClient: TendersListClientBarId;
  activeQuickBar: TendersListQuickBarId | null;
  strategicClientCounts: Record<string, number>;
  totalItems: number;
  localFilter: TenderPipelineLocalFilter;
  quickFilter: string | null;
  actionChips: TenderActionChip[];
  stats: { active: number; actionable: number; urgent: number; priority: number };
  funnel: {
    new: number;
    seen: number;
    interested: number;
    preparing: number;
    submitted: number;
    won: number;
    lost: number;
    winRate: number | null;
  };
  favorites: TendersListFavoritePreset[];
  bulkMode: boolean;
  mineOnly: boolean;
  onQueueClick: (id: TendersListQueueId) => void;
  onClientClick: (id: TendersListClientBarId) => void;
  onQuickBar: (id: TendersListQuickBarId) => void;
  onQuickFilterToggle: (id: string, active: boolean) => void;
  onLocalFilterChange: (value: TenderPipelineLocalFilter) => void;
  onKpiClick: (kpi: TendersListKpiId) => void;
  onSaveFavorite: () => void;
  onApplyFavorite: (id: string) => void;
  onToggleFavoritePin: (id: string) => void;
  onToggleBulkMode: () => void;
  onExportCsv: () => void;
  onClearFilters: () => void;
  showClearFilters: boolean;
};

export function TenderListFiltersPanel(props: TenderListFiltersPanelProps) {
  const {
    queueCounts,
    queueFilter,
    activeClient,
    activeQuickBar,
    strategicClientCounts,
    totalItems,
    localFilter,
    quickFilter,
    actionChips,
    stats,
    funnel,
    favorites,
    bulkMode,
    onQueueClick,
    onClientClick,
    onQuickBar,
    onQuickFilterToggle,
    onLocalFilterChange,
    onKpiClick,
    onSaveFavorite,
    onApplyFavorite,
    onToggleFavoritePin,
    onToggleBulkMode,
    onExportCsv,
    onClearFilters,
    showClearFilters,
  } = props;

  return (
    <div
      className="rounded-lg border border-border bg-secondary/30 px-2.5 py-2.5 space-y-2.5"
      data-tender-list-filters-panel
    >
      <section className="space-y-1.5" aria-label="Moja kolejka">
        {sectionTitle("Moja kolejka")}
        <div className="flex flex-wrap gap-2 items-center">
          {TENDERS_LIST_PRIMARY_QUEUE.map(({ id, label }) => {
            const count = queueCounts[id];
            const active = queueFilter === id;
            return (
              <TenderUxChip
                key={id}
                variant="queue"
                pressed={active}
                onClick={() => onQueueClick(id)}
                className={queueInactiveClass(active, count > 0)}
              >
                {label}{count > 0 ? ` (${count})` : ""}
              </TenderUxChip>
            );
          })}
        </div>
      </section>

      <section className="space-y-1.5" aria-label="Klienci">
        {sectionTitle("Klienci")}
        <div className="flex flex-wrap gap-2 items-center">
          {TENDERS_LIST_CLIENT_BAR.map(({ id, label }) => {
            const count = id === "all" ? totalItems : strategicClientCounts[id] ?? 0;
            const active = activeClient === id && !queueFilter;
            return (
              <TenderUxChip
                key={id}
                variant="client"
                pressed={active}
                onClick={() => onClientClick(id)}
                title={id === "all" ? "Wszyscy zamawiający" : label}
              >
                {label}{id !== "all" && count > 0 ? ` (${count})` : ""}
              </TenderUxChip>
            );
          })}
        </div>
      </section>

      <div className="space-y-1.5">
        {sectionTitle("Operacyjne")}
        <div className="flex flex-wrap gap-2 items-center">
          {TENDERS_LIST_QUICK_BAR.map(({ id, label }) => (
            <TenderUxChip
              key={id}
              variant="filter"
              pressed={activeQuickBar === id}
              onClick={() => onQuickBar(id)}
            >
              {label}
            </TenderUxChip>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {sectionTitle("Kolejka — pozostałe")}
        <div className="flex flex-wrap gap-2 items-center">
          {TENDERS_LIST_SECONDARY_QUEUE.map(({ id, label }) => {
            const count = queueCounts[id];
            const active = queueFilter === id;
            return (
              <TenderUxChip
                key={id}
                variant="queue"
                pressed={active}
                onClick={() => onQueueClick(id)}
                className={queueInactiveClass(active, count > 0)}
              >
                {label}{count > 0 ? ` (${count})` : ""}
              </TenderUxChip>
            );
          })}
        </div>
      </div>

      {actionChips.length > 0 && (
        <div className="space-y-1.5">
          {sectionTitle("Alerty")}
          <div className="flex flex-wrap gap-2 items-center">
            {actionChips.map((chip) => {
              const active = quickFilter === chip.id;
              return (
                <TenderUxChip
                  key={chip.id}
                  variant="action"
                  pressed={active}
                  onClick={() => onQuickFilterToggle(chip.id, active)}
                >
                  {chip.label}{chip.count > 0 ? ` (${chip.count})` : ""}
                </TenderUxChip>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {sectionTitle("Zakres listy")}
        <select
          value={localFilter}
          onChange={(e) => onLocalFilterChange(e.target.value as TenderPipelineLocalFilter)}
          className="w-full bg-secondary rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none min-h-[44px] lg:min-h-0"
          aria-label="Zakres listy przetargów"
        >
          <option value="actionable">Do zgłoszenia (Wrocław · remont budynków)</option>
          <option value="active">Wszystkie aktywne</option>
          <option value="priority">Kluczowi zamawiający</option>
          <option value="wroclaw">Tylko Wrocław</option>
          <option value="high">Wysoka trafność</option>
          <option value="archive">Archiwum (termin minął)</option>
          <option value="all">Pełna lista</option>
        </select>
      </div>

      <div className="space-y-1.5">
        {sectionTitle("Statystyki")}
        <div className={`flex flex-wrap gap-x-3 gap-y-1 ${TEUX_FONT_META} text-muted-foreground tabular-nums`}>
          <button type="button" onClick={() => onKpiClick("active")} className="hover:text-foreground underline-offset-2 hover:underline min-h-[44px] lg:min-h-0 px-1">
            {stats.active} aktywnych
          </button>
          <button type="button" onClick={() => onKpiClick("actionable")} className="hover:text-foreground underline-offset-2 hover:underline min-h-[44px] lg:min-h-0 px-1">
            {stats.actionable} do zgłoszenia
          </button>
          <button type="button" onClick={() => onKpiClick("urgent")} className="hover:text-foreground underline-offset-2 hover:underline min-h-[44px] lg:min-h-0 px-1">
            {stats.urgent} kończy się ≤7 dni
          </button>
          <button type="button" onClick={() => onKpiClick("priority")} className="hover:text-foreground underline-offset-2 hover:underline min-h-[44px] lg:min-h-0 px-1">
            {stats.priority} kluczowych
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {sectionTitle("Pipeline")}
        <div className={`flex flex-wrap gap-x-3 gap-y-0.5 ${TEUX_FONT_META} text-muted-foreground`}>
          <span>Nowe: <strong className="text-foreground">{funnel.new}</strong></span>
          <span>Obejrzane: <strong className="text-foreground">{funnel.seen}</strong></span>
          <span>Interesuje: <strong className="text-violet-600">{funnel.interested}</strong></span>
          <span>Oferta: <strong className="text-foreground">{funnel.preparing}</strong></span>
          <span>Złożone: <strong className="text-foreground">{funnel.submitted}</strong></span>
          <span>Wygrane: <strong className="text-emerald-600">{funnel.won}</strong></span>
          <span>Przegrane: <strong className="text-foreground">{funnel.lost}</strong></span>
          {funnel.winRate != null && (
            <span>Skuteczność: <strong className="text-primary">{funnel.winRate}%</strong></span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {sectionTitle("Moje presety")}
          <button
            type="button"
            onClick={onSaveFavorite}
            className={`inline-flex items-center gap-1 ${TEUX_FONT_META} text-primary hover:underline min-h-[44px] lg:min-h-0`}
          >
            <BookmarkPlus size={12} />
            Zapisz bieżące
          </button>
        </div>
        {favorites.length === 0 ? (
          <p className={`${TEUX_FONT_META} text-muted-foreground`}>
            Zapis lokalny w przeglądarce — pełna kombinacja filtrów.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {favorites.map((fav) => (
              <span key={fav.id} className="inline-flex items-center gap-0.5">
                <TenderUxChip variant="filter" pressed={false} onClick={() => onApplyFavorite(fav.id)} title={fav.name}>
                  {fav.name}
                </TenderUxChip>
                <button
                  type="button"
                  onClick={() => onToggleFavoritePin(fav.id)}
                  className={`p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center ${fav.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title={fav.pinned ? "Odepnij" : "Przypnij"}
                  aria-label={fav.pinned ? "Odepnij preset" : "Przypnij preset"}
                >
                  <Pin size={11} className={fav.pinned ? "fill-current" : ""} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {sectionTitle("Narzędzia")}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleBulkMode}
            aria-pressed={bulkMode}
            aria-label={bulkMode ? "Wyłącz zaznaczanie wielu przetargów" : "Włącz zaznaczanie wielu przetargów"}
            data-teux7c-bulk-toggle
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs min-h-[44px] ${
              bulkMode ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {bulkMode ? <CheckSquare size={14} /> : <Square size={14} />}
            {bulkMode ? "Wyłącz zaznaczanie" : "Zaznacz wiele"}
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary/80 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary min-h-[44px]"
          >
            <Download size={14} />
            Eksport CSV
          </button>
          {showClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className={`${TEUX_FONT_META} text-muted-foreground hover:text-foreground underline px-2 min-h-[44px] lg:min-h-0`}
            >
              Wyczyść filtry
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {sectionTitle("Legenda")}
        <TendersLegend compact />
      </div>
    </div>
  );
}
