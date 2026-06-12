/**
 * Prezentacja prognozy obłożenia — sloty równoległych robót (20.7C.1).
 * Bez logiki biznesowej; dane z silnika forecast / KPI.
 */

export type ForecastSlotsDisplay = {
  active: number;
  capacity: number;
  overBy: number;
  /** np. „4 / 4 slotów” */
  primaryLabel: string;
  /** np. „(+2 ponad limit)” — null gdy w limicie */
  overLabel: string | null;
  /** Szerokość paska 0–100 (do wizualizacji, bez eksponowania %) */
  barWidthPct: number;
  /** Do koloru paska — stosunek active/capacity × 100 (bez capu w silniku) */
  utilizationPct: number;
};

/**
 * Formatuje obłożenie jako zajęte sloty vs limit równoległych realizacji.
 */
export function formatForecastSlots(
  activeJobs: number,
  maxConcurrentProjects: number,
): ForecastSlotsDisplay {
  const capacity = Math.max(maxConcurrentProjects, 1);
  const active = Math.max(0, Math.round(activeJobs));
  const overBy = Math.max(0, active - capacity);
  const utilizationPct = Math.round((active / capacity) * 100);
  const barWidthPct = Math.min(100, Math.max(4, utilizationPct));

  return {
    active,
    capacity,
    overBy,
    primaryLabel: `${active} / ${capacity} slotów`,
    overLabel: overBy > 0 ? `(+${overBy} ponad limit)` : null,
    barWidthPct,
    utilizationPct,
  };
}
