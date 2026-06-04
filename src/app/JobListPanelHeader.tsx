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
} from "lucide-react";
import { JobListFilterBar, JobListLegend } from "@/app/JobListStatus";
import { opsChipForKpiKey, type JobListOpsKpi, type JobOpsChip } from "@/lib/job-list-ops";
import type { JobListFilter } from "@/lib/job-list-status";
import type { DirectoryEmployee } from "@/app/app-domain";
import { filterProductionActiveDirectory } from "@/app/app-domain";

const KPI_ITEMS = [
  { key: "inProgress", label: "W toku", countKey: "inProgress" as const, phaseActive: "in_progress" as const, kind: "phase" as const },
  { key: "handover", label: "Do odbioru", countKey: "handover" as const, phaseActive: "handover" as const, kind: "phase" as const },
  { key: "noTeam", label: "Bez ekipy", countKey: "noTeam" as const, chip: "no_team" as const, kind: "chip" as const },
  { key: "bzp", label: "BZP", countKey: "bzp" as const, chip: "bzp_only" as const, kind: "chip" as const },
  { key: "wmOverdue", label: "WM po terminie", countKey: "wmOverdue" as const, chip: "wm_overdue" as const, kind: "chip" as const },
] as const;

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
  workerFilter,
  onWorkerFilterChange,
  bulkMode,
  onBulkModeToggle,
  bulkSelectedCount,
  onBulkDelete,
  onBulkClear,
  deleteBusy,
  showJobLegend,
  onShowJobLegendChange,
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
  workerFilter: string;
  onWorkerFilterChange: (id: string) => void;
  bulkMode: boolean;
  onBulkModeToggle: () => void;
  bulkSelectedCount: number;
  onBulkDelete: () => void;
  onBulkClear: () => void;
  deleteBusy: boolean;
  showJobLegend: boolean;
  onShowJobLegendChange: (open: boolean) => void;
}) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const activeDirectory = filterProductionActiveDirectory(directory);
  const filtersActive = Boolean(opsChip || workerFilter || bulkMode);

  const kpiActive = (item: (typeof KPI_ITEMS)[number]) => {
    if (item.kind === "phase") return filter === item.phaseActive;
    return opsChip === item.chip;
  };

  const onKpiClick = (item: (typeof KPI_ITEMS)[number]) => {
    if (item.kind === "phase") {
      onTogglePhaseFilterFromKpi(item.phaseActive);
      return;
    }
    onToggleOpsChip(
      item.key === "noTeam"
        ? opsChipForKpiKey("noTeam")
        : item.key === "bzp"
          ? opsChipForKpiKey("bzp")
          : opsChipForKpiKey("wmOverdue"),
    );
  };

  return (
    <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
      {returnNav && (
        <button
          type="button"
          onClick={returnNav.onBack}
          className="w-full flex items-center gap-2 text-sm font-medium text-primary px-1 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft size={16} />
          Wróć do {returnNav.label}
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddJob}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Plus size={14} />
          Nowa robota
        </button>
        <button
          type="button"
          onClick={onShowAllFiles}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 transition-colors min-h-[44px]"
        >
          <FolderOpen size={14} className="shrink-0" />
          <span className="truncate">
            Pliki{totalJobFilesCount > 0 ? ` (${totalJobFilesCount})` : ""}
          </span>
        </button>
      </div>

      <div className="-mx-1 px-1 overflow-x-auto overscroll-x-contain scrollbar-thin">
        <div className="flex gap-2 min-w-max pb-0.5">
          {KPI_ITEMS.map((item) => {
            const active = kpiActive(item);
            const count = opsKpi[item.countKey];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onKpiClick(item)}
                aria-pressed={active}
                className={`shrink-0 min-w-[5.5rem] px-3 py-2.5 rounded-xl border text-left transition-colors touch-manipulation ${
                  active
                    ? "bg-primary/12 text-foreground border-primary/40"
                    : "bg-secondary/50 text-muted-foreground border-border/70 hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span className="block text-[10px] font-medium leading-tight">{item.label}</span>
                <span className="block text-lg font-semibold tabular-nums leading-tight mt-0.5">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 items-stretch">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Szukaj adresu, klienta…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          aria-expanded={showMoreFilters}
          className={`shrink-0 flex items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium border min-h-[44px] touch-manipulation transition-colors ${
            showMoreFilters || filtersActive
              ? "bg-primary/10 text-foreground border-primary/35"
              : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
          }`}
        >
          Filtry
          <ChevronDown size={14} className={`transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      <JobListFilterBar filter={filter} onFilter={onFilterChange} counts={filterCounts} />

      {showMoreFilters && (
        <div className="rounded-xl border border-border bg-secondary/25 p-3 space-y-3">
          {activeDirectory.length > 0 && (
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pracownik
              </span>
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border border-border bg-secondary/60 hover:bg-secondary transition-colors min-h-[44px]"
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
              <button type="button" onClick={onBulkClear} className="text-xs text-muted-foreground hover:underline min-h-[36px]">
                Wyczyść
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onShowJobLegendChange(!showJobLegend)}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            {showJobLegend ? "Ukryj legendę statusów" : "Co oznaczają statusy? (legenda)"}
          </button>
          {showJobLegend && <JobListLegend compact />}
        </div>
      )}
    </div>
  );
}
