/**
 * TEST-HARNESS-01 H3-A — Payroll helpers (read-only mirrors).
 *
 * Mirrors payrollMetrics / production filter WITHOUT importing cloud-sync
 * or app-domain (#H3-009 Zero Protected Core import).
 */
export const WEEK_EMPLOYEES_KEY = "kw-week-employees";
export const WEEK_FROM_KEY = "kw-weekFrom";
export const WEEK_TO_KEY = "kw-weekTo";
export const DIRECTORY_KEY = "kw-directory";

/** H3-001 Stable Assertions marker */
export const H3_001_STABLE_ASSERTIONS = "H3-001";

export const PAYROLL_RO_KEYS = [
  WEEK_EMPLOYEES_KEY,
  WEEK_FROM_KEY,
  WEEK_TO_KEY,
  DIRECTORY_KEY,
];

/**
 * @param {unknown} list
 * @returns {unknown[]}
 */
export function asArray(list) {
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object" && Array.isArray(/** @type {any} */ (list).items)) {
    return /** @type {any} */ (list).items;
  }
  return [];
}

/**
 * @param {unknown} v
 * @returns {string}
 */
export function asIsoDate(v) {
  if (v == null) return "";
  let s = v;
  if (typeof s !== "string") s = String(s);
  s = s.trim();
  // unwrap JSON string values stored as "\"2026-07-14\""
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      s = JSON.parse(s);
    } catch {
      s = s.slice(1, -1);
    }
  }
  const m = String(s).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(s).trim();
}

/**
 * @param {unknown} phone
 * @returns {string|null}
 */
function normalizePhone9(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

/**
 * Mirror of app-domain inferTestAccountHeuristic + isTestDirectoryEmployee.
 * @param {Record<string, unknown>|null|undefined} emp
 */
export function isTestDirectoryEmployeeMirror(emp) {
  if (!emp || typeof emp !== "object") return false;
  if (emp.testAccount === false) return false;
  if (emp.testAccount === true) return true;
  const name = String(emp.name ?? "")
    .trim()
    .toLowerCase();
  const phone9 = normalizePhone9(emp.phone);
  return name === "test" || phone9 === "000000000";
}

/**
 * Mirror of filterProductionWeekEmployees.
 * @param {unknown[]} weekEmployees
 * @param {unknown[]} directory
 */
export function filterProductionWeekEmployeesMirror(weekEmployees, directory) {
  const dir = asArray(directory);
  return asArray(weekEmployees).filter((e) => {
    if (!e || typeof e !== "object") return true;
    const directoryId = /** @type {any} */ (e).directoryId;
    if (!directoryId) return true;
    const d = dir.find((x) => x && /** @type {any} */ (x).id === directoryId);
    return !isTestDirectoryEmployeeMirror(/** @type {any} */ (d));
  });
}

/**
 * @param {unknown} t
 * @returns {number|null}
 */
function parsePayrollTime(t) {
  const m = String(t ?? "").match(/^(\d+):(\d+)$/);
  return m ? +m[1] * 60 + +m[2] : null;
}

/**
 * @param {Record<string, unknown>|undefined} day
 */
function payrollDayHours(day) {
  if (!day?.active) return 0;
  const f = parsePayrollTime(day.from);
  const to = parsePayrollTime(day.to);
  let h = f != null && to != null && to > f ? (to - f) / 60 : 0;
  for (const ex of /** @type {any[]} */ (day.extraHours ?? [])) {
    const ef = parsePayrollTime(ex?.from);
    const et = parsePayrollTime(ex?.to);
    if (ef != null && et != null && et > ef) h += (et - ef) / 60;
  }
  return h;
}

/**
 * Mirror of cloud-sync payrollMetrics — { activeDays, totalHours }.
 * @param {unknown} list
 * @returns {{ activeDays: number, totalHours: number }}
 */
export function payrollMetricsMirror(list) {
  const arr = asArray(list);
  let activeDays = 0;
  let totalHours = 0;
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const emp = /** @type {Record<string, unknown>} */ (item);
    const days = /** @type {Record<string, any>} */ (emp.days || {});
    for (const d of Object.values(days)) {
      if (d?.active) {
        activeDays++;
        totalHours += payrollDayHours(d);
      }
    }
    const ps = /** @type {any} */ (emp.prevSaturday);
    if (ps?.active) {
      activeDays++;
      totalHours += payrollDayHours(ps);
    }
  }
  return { activeDays, totalHours: +totalHours.toFixed(1) };
}

/**
 * H3-001 — compare hours with small eps (not PLN strings).
 * @param {number} a
 * @param {number} b
 * @param {number} [eps]
 */
export function hoursClose(a, b, eps = 0.15) {
  return Math.abs(Number(a) - Number(b)) <= eps;
}

/**
 * Parse hours from UI text.
 * Supports plain decimals and fmtH style: "587h", "12h 30m".
 * @param {string} text
 * @returns {number|null}
 */
export function parseHoursFromUiText(text) {
  const s = String(text || "").replace(/\u00a0/g, " ").trim();
  if (!s || s === "—") return null;

  const fmtH = s.match(/(\d+)\s*h(?:\s+(\d+)\s*m)?/i);
  if (fmtH) {
    const h = Number(fmtH[1]);
    const m = fmtH[2] != null ? Number(fmtH[2]) : 0;
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return +(h + m / 60).toFixed(2);
  }

  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

export function allowEmptyRoster() {
  return process.env.PSB_H3_ALLOW_EMPTY === "1";
}
