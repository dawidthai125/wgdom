/**
 * Audyt integralności kw-archive — bez modyfikacji danych.
 * node scripts/audit-archive-integrity.mjs [path-to-json-or-array]
 *
 * JSON: pełny backup { "kw-archive": [...] } lub sama tablica WeekSnapshot[]
 */
import { readFileSync, existsSync } from "fs";

const CANONICAL_DAY_KEYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const LEGACY_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const LEGACY_DAY_SET = new Set(LEGACY_DAY_KEYS);

function loadArchive(path) {
  if (!path || !existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw["kw-archive"])) return raw["kw-archive"];
  return null;
}

function dayKeys(days) {
  if (!days || typeof days !== "object") return [];
  return Object.keys(days);
}

function hasLegacyDayKeys(days) {
  return dayKeys(days).some((k) => LEGACY_DAY_SET.has(k));
}

function missingActiveOnAnyDay(days) {
  if (!days || typeof days !== "object") return { missing: true, details: ["brak obiektu days"] };
  const problems = [];
  for (const k of dayKeys(days)) {
    const d = days[k];
    if (!d || typeof d !== "object") {
      problems.push(`${k}: brak obiektu dnia`);
    } else if (!("active" in d)) {
      problems.push(`${k}: brak pola active`);
    }
  }
  return { missing: problems.length > 0, details: problems };
}

/** Symuluje calcWeekEmployee — crash gdy emp.days[Pn..So] undefined */
function wouldCrashCalcWeekEmployee(emp) {
  const reasons = [];
  if (!emp?.days || typeof emp.days !== "object") {
    return { crash: true, reasons: ["brak days"] };
  }
  for (const k of CANONICAL_DAY_KEYS) {
    const d = emp.days[k];
    if (d === undefined || d === null) {
      reasons.push(`days.${k} undefined → dayTotalHours crash`);
    } else if (typeof d !== "object") {
      reasons.push(`days.${k} nie jest obiektem`);
    } else if (!("active" in d)) {
      // active undefined is falsy, nie crash — ale flagujemy osobno
    }
  }
  if (emp.prevSaturday !== undefined && emp.prevSaturday !== null) {
    const ps = emp.prevSaturday;
    if (typeof ps !== "object" || !("active" in ps)) {
      reasons.push("prevSaturday bez active (getPrevSaturday może zwrócić defaultDay — OK jeśli brak prevSaturday)");
    }
  }
  return { crash: reasons.some((r) => r.includes("undefined")), reasons };
}

/** Symuluje calcWeekNetNoPrevSat (payroll-cycle) — ma fallback ?? */
function wouldCrashBiweeklyCalc(emp) {
  if (!emp?.days) return { crash: false, reasons: [] };
  // calcWeekNetNoPrevSat używa emp.days[d] ?? { active: false, ... } — bezpieczne
  return { crash: false, reasons: [] };
}

function classifyWeekOrigin(week) {
  const id = String(week.id ?? "");
  const from = week.weekFrom ?? "";
  if (id.startsWith("smoke-") || id.startsWith("smoke-etap1d") || id.startsWith("smoke-diag")) {
    return "smoke-test";
  }
  if (from.startsWith("2099")) return "test-year-2099";
  if (from.startsWith("2026") || from.startsWith("2025") || from.startsWith("2024")) return "production-like";
  return "unknown";
}

function auditArchive(weeks, sourceLabel) {
  const report = {
    source: sourceLabel,
    totalWeeks: weeks.length,
    issues: {
      year2099: [],
      missingWeekEmployees: [],
      emptyWeekEmployees: [],
      legacyDayKeys: [],
      missingActive: [],
      crashOnExpand: [],
      smokeOrTestIds: [],
    },
    summary: {},
    examples: {},
  };

  for (const week of weeks) {
    const weekRef = {
      id: week.id,
      weekFrom: week.weekFrom,
      weekTo: week.weekTo,
      origin: classifyWeekOrigin(week),
      savedAt: week.savedAt,
    };

    if (String(week.weekFrom ?? "").startsWith("2099") || String(week.weekTo ?? "").startsWith("2099")) {
      report.issues.year2099.push(weekRef);
    }

    if (String(week.id ?? "").match(/^smoke/i)) {
      report.issues.smokeOrTestIds.push(weekRef);
    }

    const wes = week.weekEmployees;
    if (wes === undefined || wes === null) {
      report.issues.missingWeekEmployees.push({ ...weekRef, note: "brak pola weekEmployees" });
    } else if (!Array.isArray(wes) || wes.length === 0) {
      report.issues.emptyWeekEmployees.push({ ...weekRef, note: "weekEmployees puste" });
    } else {
      for (const emp of wes) {
        const empRef = {
          ...weekRef,
          empId: emp.id,
          empName: emp.name,
        };

        if (hasLegacyDayKeys(emp.days)) {
          report.issues.legacyDayKeys.push({
            ...empRef,
            dayKeys: dayKeys(emp.days),
          });
        }

        const activeCheck = missingActiveOnAnyDay(emp.days);
        if (activeCheck.missing) {
          report.issues.missingActive.push({
            ...empRef,
            dayKeys: dayKeys(emp.days),
            details: activeCheck.details,
          });
        }

        const prevActive = missingActiveOnAnyDay(emp.prevSaturday);
        if (emp.prevSaturday && prevActive.missing) {
          report.issues.missingActive.push({
            ...empRef,
            scope: "prevSaturday",
            details: prevActive.details,
          });
        }

        const crash = wouldCrashCalcWeekEmployee(emp);
        if (crash.crash) {
          report.issues.crashOnExpand.push({
            ...empRef,
            dayKeys: dayKeys(emp.days),
            reasons: crash.reasons,
          });
        }
      }
    }

    // Tygodnie bez weekEmployees nie crashują expand (pokazują komunikat) — ale employees summary może być
  }

  report.summary = {
    totalWeeks: weeks.length,
    year2099: report.issues.year2099.length,
    smokeOrTestIds: report.issues.smokeOrTestIds.length,
    missingWeekEmployees: report.issues.missingWeekEmployees.length,
    emptyWeekEmployees: report.issues.emptyWeekEmployees.length,
    legacyDayKeys: report.issues.legacyDayKeys.length,
    missingActive: report.issues.missingActive.length,
    crashOnExpand: report.issues.crashOnExpand.length,
    productionWeeks: weeks.filter((w) => classifyWeekOrigin(w) === "production-like").length,
    cleanProductionWeeks: 0,
  };

  const prodWeeks = weeks.filter((w) => classifyWeekOrigin(w) === "production-like");
  report.summary.cleanProductionWeeks = prodWeeks.filter((week) => {
    const wes = week.weekEmployees ?? [];
    if (wes.length === 0) return true; // stary format — nie crashuje
    return wes.every((emp) => !wouldCrashCalcWeekEmployee(emp).crash && !hasLegacyDayKeys(emp.days));
  }).length;

  report.examples = {
    year2099: report.issues.year2099.slice(0, 3),
    legacyDayKeys: report.issues.legacyDayKeys.slice(0, 3),
    missingActive: report.issues.missingActive.slice(0, 3),
    crashOnExpand: report.issues.crashOnExpand.slice(0, 3),
    missingWeekEmployees: report.issues.missingWeekEmployees.slice(0, 3),
    emptyWeekEmployees: report.issues.emptyWeekEmployees.slice(0, 3),
    smokeOrTestIds: report.issues.smokeOrTestIds.slice(0, 3),
    sampleProductionWeek: prodWeeks[0]
      ? {
          id: prodWeeks[0].id,
          weekFrom: prodWeeks[0].weekFrom,
          weekTo: prodWeeks[0].weekTo,
          weekEmployeesCount: prodWeeks[0].weekEmployees?.length ?? 0,
          sampleDayKeys: prodWeeks[0].weekEmployees?.[0]?.days
            ? Object.keys(prodWeeks[0].weekEmployees[0].days)
            : null,
          samplePnActive: prodWeeks[0].weekEmployees?.[0]?.days?.Pn?.active,
        }
      : null,
  };

  return report;
}

const inputPath = process.argv[2];
const sources = [];

if (inputPath) {
  const data = loadArchive(inputPath);
  if (data) sources.push({ label: inputPath, weeks: data });
}

const defaultCloud = "scripts/audit-cloud-archive-snapshot.json";
if (!inputPath && existsSync(defaultCloud)) {
  sources.push({ label: "cloud-produkcja (Supabase batch-get)", weeks: loadArchive(defaultCloud) });
}

if (sources.length === 0) {
  console.error("Brak danych. Uruchom: node scripts/fetch-cloud-backup.mjs scripts/audit-cloud-archive-snapshot.json");
  process.exit(1);
}

const allReports = sources.map((s) => auditArchive(s.weeks, s.label));
console.log(JSON.stringify(allReports, null, 2));
