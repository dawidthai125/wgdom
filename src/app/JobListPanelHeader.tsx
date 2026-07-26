import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  FolderOpen,
  Search,
  ChevronDown,
  CheckSquare,
  Square,
  Trash2,
  HardHat,
  ClipboardCheck,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { JobListFilterBar } from "@/app/JobListStatus";
import {
  LEAD_FILTER_NO_LEAD,
  opsChipForKpiKey,
  type JobListOpsKpi,
  type JobListViewMode,
  type JobOpsChip,
} from "@/lib/job-list-ops";
import type { JobListFilter } from "@/lib/job-list-status";
import type { DirectoryEmployee } from "@/app/app-domain";
import { filterProductionActiveDirectory } from "@/app/app-domain";
import { WgButton, WgField } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_RADIUS_MD,
  WG_RADIUS_SM,
  WG_TOUCH_MIN,
} from "@/lib/wg-ui-tokens";

/** KPI keys — logika kliknięć bez zmian (job-list-ops). */
const KPI_ITEMS = [
  {
    key: "inProgress",
    label: "W toku",
    countKey: "inProgress" as const,
    phaseActive: "in_progress" as const,
    kind: "phase" as const,
    icon: HardHat,
  },
  {
    key: "handover",
    label: "Do odbioru",
    countKey: "handover" as const,
    phaseActive: "handover" as const,
    kind: "phase" as const,
    icon: ClipboardCheck,
  },
  {
    key: "bzp",
    label: "BZP",
    countKey: "bzp" as const,
    chip: "bzp_only" as const,
    kind: "chip" as const,
    icon: Scale,
  },
] as const;

/**
 * WGDOM-UI-01D-B-TOOLBAR — visual polish (TB-DF-01…12).
 * Handlers/props unchanged — presentation only.
 */
export function JobListPanelHeader({
  returnNav,
  onAddJob,
  onShowAllFiles,
  totalJobFilesCount,
  search,
  onSearchChange,
  opsKpi,
  filter,
  opsChip,
  onTogglePhaseFilterFromKpi,
  onToggleOpsChip,
  filterCounts,
  onFilterChange,
  directory,
  listViewMode,
  onListViewModeChange,
  workerFilter,
  onWorkerFilterChange,
  leadFilter,
  onLeadFilterChange,
  bulkMode,
  onBulkModeToggle,
  bulkSelectedCount,
  onBulkDelete,
  onBulkClear,
  deleteBusy,
}: {
  returnNav?: { label: string; onBack: () => void };
  onAddJob: () => void;
  onShowAllFiles: () => void;
  totalJobFilesCount: number;
  search: string;
  onSearchChange: (q: string) => void;
  opsKpi: JobListOpsKpi;
  filter: JobListFilter;
  opsChip: JobOpsChip | null;
  onTogglePhaseFilterFromKpi: (phase: "in_progress" | "handover") => void;
  onToggleOpsChip: (chip: JobOpsChip) => void;
  filterCounts: Record<JobListFilter, number>;
  onFilterChange: (f: JobListFilter) => void;
  directory: DirectoryEmployee[];
  listViewMode: JobListViewMode;
  onListViewModeChange: (mode: JobListViewMode) => void;
  workerFilter: string;
  onWorkerFilterChange: (id: string) => void;
  leadFilter: string;
  onLeadFilterChange: (id: string) => void;
  bulkMode: boolean;
  onBulkModeToggle: () => void;
  bulkSelectedCount: number;
  onBulkDelete: () => void;
  onBulkClear: () => void;
  deleteBusy: boolean;
}) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const activeDirectory = filterProductionActiveDirectory(directory);
  const filtersActive = Boolean(opsChip || workerFilter || leadFilter || bulkMode);

  const kpiActive = (item: (typeof KPI_ITEMS)[number]) => {
    if (item.kind === "phase") return filter === item.phaseActive;
    return opsChip === item.chip;
  };

  const onKpiClick = (item: (typeof KPI_ITEMS)[number]) => {
    if (item.kind === "phase") {
      onTogglePhaseFilterFromKpi(item.phaseActive);
      return;
    }
    onToggleOpsChip(opsChipForKpiKey("bzp"));
  };

  return (
    <div
      className={cn(
        // TB-DF-01 / TB-DF-11 — niższy rytm + wyraźne zakończenie przed listą
        "px-4 pt-3 pb-4 md:pt-2.5 md:pb-4",
        "space-y-2.5 md:space-y-2",
        "border-b border-border/60",
      )}
    >
      {returnNav && (
        <button
          type="button"
          onClick={returnNav.onBack}
          className={cn(
            "w-full flex items-center gap-2 text-sm font-medium text-primary px-1 py-1.5",
            WG_RADIUS_SM,
            "hover:bg-primary/10",
            `transition-colors ${WG_DURATION_HOVER}`,
            "motion-reduce:transition-none",
          )}
        >
          <ArrowLeft size={16} />
          Wróć do {returnNav.label}
        </button>
      )}

      {/* TB-DF-02 — 1 Primary · Pliki secondary */}
      <div className="flex gap-2 items-center">
        <WgButton
          type="button"
          variant="primary"
          onClick={onAddJob}
          className={cn(
            "flex-1 md:flex-none md:shrink-0 gap-2 px-4",
            WG_TOUCH_MIN,
            "h-10 md:h-9 text-sm font-medium",
            WG_RADIUS_MD,
          )}
        >
          <Plus size={14} />
          Nowa robota
        </WgButton>
        <WgButton
          type="button"
          variant="secondary"
          onClick={onShowAllFiles}
          className={cn(
            "shrink-0 gap-1.5 px-3",
            WG_TOUCH_MIN,
            "h-10 md:h-9 text-xs font-medium",
            WG_RADIUS_MD,
          )}
          aria-label={
            totalJobFilesCount > 0 ? `Pliki (${totalJobFilesCount})` : "Pliki"
          }
        >
          <FolderOpen size={14} className="shrink-0" />
          <span className="truncate max-w-[7rem] sm:max-w-none">
            Pliki{totalJobFilesCount > 0 ? ` (${totalJobFilesCount})` : ""}
          </span>
        </WgButton>
      </div>

      {/* TB-DF-04 / TB-DF-05 / TB-DF-06 — Search dominant · segment · Filtry */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
        <WgField
          type="search"
          placeholder="Szukaj adresu, klienta…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Szukaj adresu, klienta"
          className="w-full min-w-0 md:flex-1 order-1"
          controlClassName={cn(WG_TOUCH_MIN, "h-11 md:h-10")}
          leading={
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden
            />
          }
        />

        <div className="flex gap-2 order-2 md:contents">
          <div
            className={cn(
              "flex flex-1 md:flex-none rounded-lg border border-border/50 bg-secondary/50 p-0.5",
              "md:order-first",
            )}
            role="group"
            aria-label="Widok listy robót"
          >
            {(["list", "queues"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onListViewModeChange(mode)}
                aria-pressed={listViewMode === mode}
                className={cn(
                  "flex-1 md:flex-none px-3 rounded-md text-xs font-medium",
                  "min-h-[44px] md:min-h-[32px] md:h-8",
                  `transition-colors ${WG_DURATION_HOVER}`,
                  "motion-reduce:transition-none touch-manipulation",
                  listViewMode === mode
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === "list" ? "Lista" : "Kolejki"}
              </button>
            ))}
          </div>

          <WgButton
            type="button"
            variant={showMoreFilters || filtersActive ? "secondary" : "ghost"}
            onClick={() => setShowMoreFilters((v) => !v)}
            aria-expanded={showMoreFilters}
            className={cn(
              "shrink-0 gap-1 px-3 text-xs font-medium",
              WG_TOUCH_MIN,
              "h-11 md:h-9 md:min-h-0",
              WG_RADIUS_SM,
              (showMoreFilters || filtersActive) && "border border-primary/30 bg-primary/10",
            )}
          >
            <span className="md:hidden">Filtry</span>
            <span className="hidden md:inline">Filtry</span>
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform duration-150",
                "motion-reduce:transition-none",
                showMoreFilters && "rotate-180",
              )}
            />
          </WgButton>
        </div>
      </div>

      {/* TB-DF-03 / TB-DF-12 — KPI chips pomocnicze (pod Search, nie Dashboard tiles) */}
      <div
        className="-mx-1 px-1 overflow-x-auto overscroll-x-contain scrollbar-thin"
        role="group"
        aria-label="Szybkie filtry robót"
      >
        <div className="flex flex-nowrap gap-1.5 min-w-max">
          {KPI_ITEMS.map((item) => {
            const active = kpiActive(item);
            const count = opsKpi[item.countKey];
            const Icon = item.icon as LucideIcon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onKpiClick(item)}
                aria-pressed={active}
                title={`${count} — ${item.label}`}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-8 md:h-7 px-2.5",
                  "rounded-md border text-left touch-manipulation",
                  `transition-colors ${WG_DURATION_HOVER}`,
                  "motion-reduce:transition-none",
                  active
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon
                  size={14}
                  className={cn("shrink-0 opacity-70", active && "opacity-100")}
                  aria-hidden
                />
                <span className="text-sm font-semibold tabular-nums leading-none">{count}</span>
                <span className="text-xs font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <JobListFilterBar filter={filter} onFilter={onFilterChange} counts={filterCounts} />

      {showMoreFilters && (
        <div className={cn("rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-3")}>
          {activeDirectory.length > 0 && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Lider realizacji</span>
              <select
                value={leadFilter}
                onChange={(e) => onLeadFilterChange(e.target.value)}
                className="w-full bg-secondary rounded-lg px-3 py-2.5 text-xs border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
              >
                <option value="">Wszyscy liderzy</option>
                <option value={LEAD_FILTER_NO_LEAD}>Bez lidera</option>
                {activeDirectory.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.position ? ` — ${d.position}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {activeDirectory.length > 0 && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Pracownik</span>
              <select
                value={workerFilter}
                onChange={(e) => onWorkerFilterChange(e.target.value)}
                className="w-full bg-secondary rounded-lg px-3 py-2.5 text-xs border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
              >
                <option value="">Wszyscy pracownicy</option>
                {activeDirectory.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.position ? ` — ${d.position}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={onBulkModeToggle}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium",
              "border border-border bg-secondary/60 hover:bg-secondary",
              `transition-colors ${WG_DURATION_HOVER}`,
              "motion-reduce:transition-none min-h-[44px]",
            )}
          >
            {bulkMode ? <CheckSquare size={13} /> : <Square size={13} />}
            {bulkMode ? "Tryb masowy — zaznacz roboty" : "Zaznacz wiele do usunięcia"}
          </button>

          {bulkMode && bulkSelectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/25">
              <span className="text-xs font-medium">{bulkSelectedCount} zaznaczonych</span>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={onBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50 min-h-[36px]"
              >
                <Trash2 size={12} />
                {deleteBusy ? "Usuwanie…" : "Usuń"}
              </button>
              <button
                type="button"
                onClick={onBulkClear}
                className="text-xs text-muted-foreground hover:underline min-h-[36px]"
              >
                Wyczyść
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
