import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Job } from "@/app/app-domain";
import {
  buildRapRegistryRows,
  filterRapRegistryRows,
  RAP_REGISTRY_STATUS_LABELS,
  rapRegistryAvailableYears,
  type RapRegistryFilters,
  type RapRegistryRow,
} from "@/lib/electrical-measurements/measurement-catalog";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementRegistryState,
  ElectricalMeasurementRegistryStatus,
} from "@/lib/electrical-measurements/types";

function registryStatusBadgeClass(status: RapRegistryRow["status"]): string {
  if (status === "ACTIVE") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  return "bg-muted text-muted-foreground";
}

export function RapRegistryPanel({
  jobs,
  measurements,
  registry,
  onOpenJobInJobs,
}: {
  jobs: Job[];
  measurements: ElectricalMeasurement[];
  registry: ElectricalMeasurementRegistryState;
  onOpenJobInJobs?: (jobId: string) => void;
}) {
  const allRows = useMemo(
    () => buildRapRegistryRows(registry, measurements, jobs),
    [registry, measurements, jobs],
  );

  const [filters, setFilters] = useState<RapRegistryFilters>({ status: "ALL" });

  const filteredRows = useMemo(() => filterRapRegistryRows(allRows, filters), [allRows, filters]);
  const years = useMemo(() => rapRegistryAvailableYears(allRows), [allRows]);

  const openJob = (jobId: string) => {
    onOpenJobInJobs?.(jobId);
  };

  return (
    <div className="space-y-3 min-w-0">
      <p className="text-sm text-muted-foreground">
        Rejestr numerów RAP (kw-electrical-measurement-registry) — wieloletnie archiwum bez raportów testowych.
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Rok</label>
          <select
            value={filters.year ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value || undefined }))}
            className="mt-0.5 block px-3 py-2 rounded-lg border border-border bg-card text-sm min-w-[100px]"
          >
            <option value="">Wszystkie</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Wyszukaj RAP</label>
          <input
            value={filters.rapQuery ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, rapQuery: e.target.value }))}
            placeholder="45 · RAP-45 · RAP-45-2026"
            className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Adres</label>
          <div className="relative mt-0.5">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.addressQuery ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, addressQuery: e.target.value }))}
              placeholder="Kleczkowska…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Robota</label>
          <input
            value={filters.jobQuery ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, jobQuery: e.target.value }))}
            placeholder="Zakres / id roboty…"
            className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</label>
          <select
            value={filters.status ?? "ALL"}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value as RapRegistryFilters["status"],
              }))
            }
            className="mt-0.5 block px-3 py-2 rounded-lg border border-border bg-card text-sm min-w-[120px]"
          >
            <option value="ALL">Wszystkie</option>
            {(Object.keys(RAP_REGISTRY_STATUS_LABELS) as ElectricalMeasurementRegistryStatus[]).map((s) => (
              <option key={s} value={s}>
                {RAP_REGISTRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Numer RAP</th>
                <th className="px-3 py-2 font-medium">Adres</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Robota</th>
                <th className="px-3 py-2 font-medium hidden lg:table-cell">Status</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Brak wpisów w rejestrze RAP.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-secondary/40">
                    <td className="px-3 py-2.5">
                      {onOpenJobInJobs ? (
                        <button
                          type="button"
                          onClick={() => openJob(row.jobId)}
                          className="font-medium font-mono text-xs text-primary hover:underline"
                        >
                          {row.rapNumber}
                        </button>
                      ) : (
                        <span className="font-medium font-mono text-xs">{row.rapNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 truncate max-w-[180px]">
                      {onOpenJobInJobs ? (
                        <button
                          type="button"
                          onClick={() => openJob(row.jobId)}
                          className="text-left hover:text-primary hover:underline truncate max-w-full"
                        >
                          {row.address}
                        </button>
                      ) : (
                        row.address
                      )}
                    </td>
                    <td className="px-3 py-2.5 truncate max-w-[160px] hidden md:table-cell text-muted-foreground">
                      <span className="block truncate" title={row.jobName}>
                        {row.jobName}
                      </span>
                      <span className="text-[10px] font-mono opacity-70">{row.jobId}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${registryStatusBadgeClass(row.status)}`}
                      >
                        {RAP_REGISTRY_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filteredRows.length} wpis(ów) · źródło: kw-electrical-measurement-registry</p>
    </div>
  );
}
