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
  Users,
  Scale,
  AlertTriangle,
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

const KPI_ITEMS = [
  { key: "inProgress", label: "W toku", countKey: "inProgress" as const, phaseActive: "in_progress" as const, kind: "phase" as const },
  { key: "handover", label: "Do odbioru", countKey: "handover" as const, phaseActive: "handover" as const, kind: "phase" as const },
  { key: "noTeam", label: "Bez ekipy", countKey: "noTeam" as const, chip: "no_team" as const, kind: "chip" as const },
  { key: "bzp", label: "BZP", countKey: "bzp" as const, chip: "bzp_only" as const, kind: "chip" as const },
  { key: "wmOverdue", label: "WM po terminie", countKey: "wmOverdue" as const, chip: "wm_overdue" as const, kind: "chip" as const },
] as const;

/** 2.1B MIN — tylko wizualizacja KPI (ikony + akcenty); bez wpływu na liczenie/filtry. */
const KPI_VISUAL: Record<
  (typeof KPI_ITEMS)[number]["key"],
  { icon: LucideIcon; idle: string; active: string; iconIdle: string; iconActive: string }
> = {
  inProgress: {
    icon: HardHat,
    idle: "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10",
    active: "border-yellow-500/45 bg-yellow-500/15 text-yellow-900 dark:text-yellow-100",
    iconIdle: "text-yellow-600/70 dark:text-yellow-400/70",
    iconActive: "text-yellow-700 dark:text-yellow-300",
  },
  handover: {
    icon: ClipboardCheck,
    idle: "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10",
    active: "border-orange-500/45 bg-orange-500/15 text-orange-900 dark:text-orange-100",
    iconIdle: "text-orange-600/70 dark:text-orange-400/70",
    iconActive: "text-orange-700 dark:text-orange-300",
  },
  noTeam: {
    icon: Users,
    idle: "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10",
    active: "border-amber-500/45 bg-amber-500/15 text-amber-900 dark:text-amber-100",
    iconIdle: "text-amber-600/70 dark:text-amber-400/70",
    iconActive: "text-amber-700 dark:text-amber-300",
  },
  bzp: {
    icon: Scale,
    idle: "border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10",
    active: "border-violet-500/45 bg-violet-500/15 text-violet-900 dark:text-violet-100",
    iconIdle: "text-violet-600/70 dark:text-violet-400/70",
    iconActive: "text-violet-700 dark:text-violet-300",
  },
  wmOverdue: {
    icon: AlertTriangle,
    idle: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10",
    active: "border-red-500/45 bg-red-500/15 text-red-900 dark:text-red-100",
    iconIdle: "text-red-600/70 dark:text-red-400/70",
    iconActive: "text-red-700 dark:text-red-300",
  },
};

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
    onToggleOpsChip(
      item.key === "noTeam"
        ? opsChipForKpiKey("noTeam")
        : item.key === "bzp"
          ? opsChipForKpiKey("bzp")
          : opsChipForKpiKey("wmOverdue"),
    );
  };

  return (
    <div className="px-4 pt-4 pb-3 max-md:pt-3 max-md:pb-2 space-y-3 max-md:space-y-2 border-b border-border">
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

      <div
        className="-mx-1 px-1 overflow-x-auto overscroll-x-contain scrollbar-thin"
        role="group"
        aria-label="KPI robót"
      >
        <div className="flex flex-nowrap gap-2.5 min-w-max pb-0.5">
          {KPI_ITEMS.map((item) => {
            const active = kpiActive(item);
            const count = opsKpi[item.countKey];
            const visual = KPI_VISUAL[item.key];
            const Icon = visual.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onKpiClick(item)}
                aria-pressed={active}
                title={`${count} — ${item.label}`}
                className={`shrink-0 flex items-center gap-2.5 min-w-[7.25rem] px-3.5 py-3 max-md:py-2 rounded-2xl border text-left transition-colors touch-manipulation ${
                  active ? visual.active : `text-muted-foreground ${visual.idle} hover:text-foreground`
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 ${active ? visual.iconActive : visual.iconIdle}`}
                  aria-hidden
                />
                <span className="flex items-baseline gap-1.5 min-w-0 whitespace-nowrap leading-none">
                  <span className="text-xl max-md:text-lg font-bold tabular-nums tracking-tight">{count}</span>
                  <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="flex rounded-xl border border-border bg-secondary/40 p-0.5"
        role="group"
        aria-label="Widok listy robót"
      >
        {(["list", "queues"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onListViewModeChange(mode)}
            aria-pressed={listViewMode === mode}
            className={`flex-1 px-3 py-2 rounded-[10px] text-xs font-semibold min-h-[44px] transition-colors touch-manipulation ${
              listViewMode === mode
                ? "bg-background text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode === "list" ? "Lista" : "Kolejki"}
          </button>
        ))}
      </div>

      <div className="relative w-full">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Szukaj adresu, klienta…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none min-h-[40px]"
        />
      </div>

      <JobListFilterBar filter={filter} onFilter={onFilterChange} counts={filterCounts} />

      <button
        type="button"
        onClick={() => setShowMoreFilters((v) => !v)}
        aria-expanded={showMoreFilters}
        className={`w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border min-h-[44px] touch-manipulation transition-colors ${
          showMoreFilters || filtersActive
            ? "bg-primary/10 text-foreground border-primary/35"
            : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
        }`}
      >
        Filtry dodatkowe
        <ChevronDown size={14} className={`transition-transform ${showMoreFilters ? "rotate-180" : ""}`} />
      </button>

      {showMoreFilters && (
        <div className="rounded-xl border border-border bg-secondary/25 p-3 space-y-3">
          {activeDirectory.length > 0 && (
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lider realizacji
              </span>
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
        </div>
      )}
    </div>
  );
}
