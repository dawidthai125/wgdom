/**
 * Model kosztów W&G DOM — lista płac (13 os.), koszty poboczne bez materiałów.
 * Oparcie: Kp remonty ~14%, KZP+KOB w branży często 15–25% kosztów bezpośrednich.
 */

import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";

export interface WeeklyAncillaryLine {
  id: string;
  label: string;
  pln: number;
  detail?: string;
}

export interface WeeklyOperatingCost {
  lines: WeeklyAncillaryLine[];
  totalAncillaryPln: number;
  laborBruttoPln: number;
  employerZusPln: number;
  totalEmployerPln: number;
}

export interface JobIndirectCostBreakdown {
  directLaborBrutto: number;
  employerZus: number;
  ancillaryAllocated: number;
  ancillaryLines: WeeklyAncillaryLine[];
  kpPln: number;
  riskPln: number;
  profitPln: number;
  totalIndirectNoMaterials: number;
  suggestedMinPrice: number;
  jobHours: number;
  jobDays: number;
  weekCount: number;
}

/** Domyślny model z listy płac 25–30.05.2026 (13 os., średnia ~28,6 zł/h). */
export function defaultCostModelFromPayroll(): TenderCompanyCostModel {
  return {
    headcount: 13,
    activeWorkersOnSite: 11,
    avgGrossHourlyPln: 28.62,
    employerBurdenPct: 23,
    fixedOverheadMonthlyPln: 45_000,
    materialPriceIndexPct: 108,
    laborNormIndexPct: 100,
    kpPct: 14,
    profitPct: 8,
    riskReservePct: 4,
    minMarginPct: 5,
    targetPriceDiscountPct: 2,
    vehicleCount: 3,
    fuelPerVehicleWeeklyPln: 200,
    vehicleMaintenanceWeeklyPln: 120,
    toolWearWeeklyPln: 250,
    bhpPerWorkerWeeklyPln: 15,
    parkingTollsWeeklyPln: 80,
    commsWeeklyPln: 50,
    wasteDisposalWeeklyPln: 120,
    smallConsumablesWeeklyPln: 150,
    insuranceWeeklyPln: 200,
    supervisionWeeklyPln: 400,
  };
}

export function fullyLoadedHourly(model: TenderCompanyCostModel): number {
  return model.avgGrossHourlyPln * (1 + model.employerBurdenPct / 100);
}

/** Koszty poboczne tygodniowe (bez materiałów budowlanych). */
export function weeklyAncillaryLines(model: TenderCompanyCostModel): WeeklyAncillaryLine[] {
  const n = model.headcount;
  const v = model.vehicleCount;
  return [
    {
      id: "fuel",
      label: "Paliwo — auta służbowe",
      pln: v * model.fuelPerVehicleWeeklyPln,
      detail: `${v} aut × ${model.fuelPerVehicleWeeklyPln} zł/tyg.`,
    },
    {
      id: "maint",
      label: "Serwis / amortyzacja aut",
      pln: model.vehicleMaintenanceWeeklyPln,
      detail: "Oleje, przeglądy, opony",
    },
    {
      id: "tools",
      label: "Narzędzia i zużycie sprzętu",
      pln: model.toolWearWeeklyPln,
      detail: "Tarcze, wiertła, młotowiertarki, drabiny",
    },
    {
      id: "bhp",
      label: "BHP / odzież robocza",
      pln: n * model.bhpPerWorkerWeeklyPln,
      detail: `${n} os. × ${model.bhpPerWorkerWeeklyPln} zł`,
    },
    {
      id: "parking",
      label: "Parkingi / opłaty drogowe",
      pln: model.parkingTollsWeeklyPln,
    },
    {
      id: "comms",
      label: "Telefony / internet w terenie",
      pln: model.commsWeeklyPln,
    },
    {
      id: "waste",
      label: "Wywóz gruzu / kontenery (udział)",
      pln: model.wasteDisposalWeeklyPln,
    },
    {
      id: "consumables",
      label: "Chemia pomocnicza, taśmy, folia",
      pln: model.smallConsumablesWeeklyPln,
      detail: "Bez głównych materiałów budowlanych",
    },
    {
      id: "insurance",
      label: "OC / ubezpieczenia (udział tygodniowy)",
      pln: model.insuranceWeeklyPln,
    },
    {
      id: "supervision",
      label: "Dojazdy kierownika / koordynacja",
      pln: model.supervisionWeeklyPln,
    },
  ];
}

export function weeklyOperatingCost(model: TenderCompanyCostModel): WeeklyOperatingCost {
  const lines = weeklyAncillaryLines(model);
  const totalAncillaryPln = lines.reduce((s, l) => s + l.pln, 0);
  const laborBruttoPln = model.headcount * 45 * model.avgGrossHourlyPln;
  const employerZusPln = laborBruttoPln * (model.employerBurdenPct / 100);
  return {
    lines,
    totalAncillaryPln: +totalAncillaryPln.toFixed(0),
    laborBruttoPln: +laborBruttoPln.toFixed(0),
    employerZusPln: +employerZusPln.toFixed(0),
    totalEmployerPln: +(laborBruttoPln + employerZusPln + totalAncillaryPln).toFixed(0),
  };
}

function roundPln(n: number): number {
  return Math.round(n / 10) * 10;
}

function distinctWeeksFromDates(dates: string[]): string[] {
  const weeks = new Set<string>();
  for (const iso of dates) {
    if (!iso) continue;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    weeks.add(dt.toISOString().slice(0, 10));
  }
  return [...weeks];
}

/** Koszt pośredni robota (bez materiałów) z wpisów godzin na budowie. */
export function computeJobIndirectCost(
  workEntries: { date: string; hours: number; rate: number }[],
  model: TenderCompanyCostModel,
  opts?: { companyHoursSameWeek?: number },
): JobIndirectCostBreakdown {
  const directLaborBrutto = workEntries.reduce((s, e) => s + e.hours * e.rate, 0);
  const jobHours = workEntries.reduce((s, e) => s + e.hours, 0);
  const jobDays = new Set(workEntries.map((e) => e.date)).size;
  const weekKeys = distinctWeeksFromDates(workEntries.map((e) => e.date));
  const weekCount = Math.max(weekKeys.length, 1);

  const employerZus = directLaborBrutto * (model.employerBurdenPct / 100);
  const weeklyAncillary = weeklyAncillaryLines(model);
  const weeklyAncillaryTotal = weeklyAncillary.reduce((s, l) => s + l.pln, 0);

  const capacityHoursPerWeek = model.headcount * 45;
  let ancillaryAllocated = 0;
  const ancillaryLines: WeeklyAncillaryLine[] = [];

  for (const wk of weekKeys.length ? weekKeys : ["single"]) {
    const weekEntries = weekKeys.length
      ? workEntries.filter((e) => {
          const [y, m, d] = e.date.split("-").map(Number);
          const dt = new Date(y, m - 1, d, 12, 0, 0);
          const day = dt.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          dt.setDate(dt.getDate() + diff);
          return dt.toISOString().slice(0, 10) === wk;
        })
      : workEntries;
    const weekJobHours = weekEntries.reduce((s, e) => s + e.hours, 0);
    const denom = opts?.companyHoursSameWeek && opts.companyHoursSameWeek > 0
      ? opts.companyHoursSameWeek
      : capacityHoursPerWeek;
    const share = Math.min(1, weekJobHours / denom);

    for (const line of weeklyAncillary) {
      const part = line.pln * share;
      ancillaryAllocated += part;
      const existing = ancillaryLines.find((a) => a.id === line.id);
      if (existing) existing.pln += part;
      else ancillaryLines.push({ ...line, pln: part });
    }
  }

  ancillaryAllocated = roundPln(ancillaryAllocated);
  for (const l of ancillaryLines) l.pln = roundPln(l.pln);

  const directBase = directLaborBrutto + employerZus + ancillaryAllocated;
  const kpPln = roundPln(directBase * (model.kpPct / 100));
  const subtotal = directBase + kpPln;
  const riskPln = roundPln(subtotal * (model.riskReservePct / 100));
  const profitPln = roundPln((subtotal + riskPln) * (model.profitPct / 100));
  const totalIndirectNoMaterials = roundPln(subtotal + riskPln);
  const suggestedMinPrice = roundPln(totalIndirectNoMaterials + profitPln);

  return {
    directLaborBrutto: roundPln(directLaborBrutto),
    employerZus: roundPln(employerZus),
    ancillaryAllocated,
    ancillaryLines: ancillaryLines.filter((l) => l.pln > 0),
    kpPln,
    riskPln,
    profitPln,
    totalIndirectNoMaterials,
    suggestedMinPrice,
    jobHours: +jobHours.toFixed(1),
    jobDays,
    weekCount,
  };
}

/** Tygodniowy udział stałych firmy (KZP) na jedną robotę równoległą. */
export function weeklyFixedOverheadShare(model: TenderCompanyCostModel, maxConcurrentProjects: number): number {
  return model.fixedOverheadMonthlyPln / 4.33 / Math.max(maxConcurrentProjects, 1);
}

export function fmtPlnShort(n: number): string {
  return `${Math.round(n).toLocaleString("pl-PL")} zł`;
}
