/**
 * Przywrócenie archiwum tygodnia 25.05–30.05.2026 zgodnie z PDF lista-plac-2026-05-25.pdf
 * (wygenerowano 29.05.2026). Backup mobilny miał już złe godziny (76h / wszyscy rozliczeni).
 *
 * node scripts/restore-archive-week-2026-05-25-from-pdf.mjs
 * node scripts/restore-archive-week-2026-05-25-from-pdf.mjs --dry-run
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
if (!anonKey) {
  console.error("Brak VITE_SUPABASE_ANON_KEY w .env");
  process.exit(1);
}

const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;
const headers = {
  Authorization: `Bearer ${anonKey}`,
  apikey: anonKey,
  "Content-Type": "application/json",
};

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const WEEK_FROM = "2026-05-25";
const WEEK_TO = "2026-05-30";

function parseTime(t) {
  const [h, m] = String(t).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) + (Number.isFinite(m) ? m : 0) / 60;
}
function hoursWorked(from, to) {
  const d = parseTime(to) - parseTime(from);
  return d > 0 ? +d.toFixed(2) : 0;
}
function dayExtraHoursOnly(day) {
  return (day.extraHours || []).reduce((s, e) => s + hoursWorked(e.from, e.to), 0);
}
function dayTotalHours(day) {
  const base = day.active ? hoursWorked(day.from, day.to) : 0;
  return +(base + dayExtraHoursOnly(day)).toFixed(2);
}
function defaultDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}
function calcWeekEmployee(emp) {
  const weekHours = +DAYS.reduce((s, d) => s + dayTotalHours(emp.days[d] || defaultDay()), 0).toFixed(2);
  const prev = emp.prevSaturday || defaultDay();
  const prevSatHours = +(prev.active ? hoursWorked(prev.from, prev.to) : 0).toFixed(2);
  const totalHours = +(weekHours + prevSatHours).toFixed(2);
  const weekZaliczka = DAYS.reduce((s, d) => s + (parseFloat((emp.days[d] || defaultDay()).zaliczka) || 0), 0);
  const prevSatZaliczka = parseFloat(prev.zaliczka) || 0;
  const totalZaliczka = weekZaliczka + prevSatZaliczka;
  const totalExtraCosts = (emp.extraCosts || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const rateNum = parseFloat(emp.rate) || 0;
  const weekGross = +(weekHours * rateNum).toFixed(2);
  const prevSatGross = +(prevSatHours * rateNum).toFixed(2);
  const grossPay = +(weekGross + prevSatGross).toFixed(2);
  const netPay = +(grossPay - totalZaliczka + totalExtraCosts).toFixed(2);
  return {
    weekHours,
    prevSatHours,
    totalHours,
    totalZaliczka,
    totalExtraCosts,
    grossPay,
    netPay,
    rateNum,
  };
}

function ex(from, to, description = "Sala Boks Pawel") {
  return { id: randomUUID(), from, to, description };
}
function day(active, from, to, zaliczka = "", extraHours = []) {
  return { active, from, to, zaliczka, ...(extraHours.length ? { extraHours } : {}) };
}
/** Pn, Wt: 9h + 1,5h dodatkowe */
function ukrShort(zaliczka = "") {
  return day(true, "07:00", "16:00", zaliczka, [ex("16:30", "18:00")]);
}
/** Śr–So: 9h + 2,5h dodatkowe */
function ukrLong() {
  return day(true, "07:00", "16:00", "", [ex("16:30", "19:00")]);
}
function std(zaliczka = "") {
  return day(true, "07:00", "16:00", zaliczka);
}
function inactive() {
  return defaultDay();
}

/** Dane z PDF (29.05.2026) — rozpis dni + statusy rozliczenia */
const WEEK_EMPLOYEES_SPEC = [
  {
    id: "we-1",
    directoryId: "dir-1",
    name: "Piotrek Ukraina",
    position: "Kombinator",
    rate: "28.43",
    phone: "",
    settled: false,
    days: { Pn: ukrShort(), Wt: ukrShort(), Sr: ukrLong(), Cz: ukrLong(), Pt: ukrLong(), So: ukrLong() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-2",
    directoryId: "dir-2",
    name: "Michal Ukraina",
    position: "Rybak",
    rate: "29.50",
    settled: false,
    days: { Pn: ukrShort(), Wt: ukrShort(), Sr: ukrLong(), Cz: ukrLong(), Pt: ukrLong(), So: ukrLong() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-3",
    directoryId: "dir-3",
    name: "Kola Ukraina",
    position: "Kolega Rybakow",
    rate: "25",
    settled: false,
    days: { Pn: ukrShort("500"), Wt: ukrShort(), Sr: ukrLong(), Cz: ukrLong(), Pt: ukrLong(), So: ukrLong() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-4",
    directoryId: "dir-4",
    name: "Kamil Elektryk",
    position: "Elektryk",
    rate: "30",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [
      {
        id: randomUUID(),
        description: "Casotrama - rozdzielnia, gniazdka, kostki",
        amount: "200",
        status: "approved",
      },
    ],
  },
  {
    id: "we-5",
    directoryId: "dir-5",
    name: "Adam",
    position: "Wariat",
    rate: "30",
    settled: true,
    days: { Pn: std("50"), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: day(true, "07:00", "13:00"),
    extraCosts: [],
  },
  {
    id: "we-6",
    directoryId: "dir-6",
    name: "Rafal",
    position: "Lekarz",
    rate: "30",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-7",
    directoryId: "dir-7",
    name: "Kamil Zabka",
    position: "Amator",
    rate: "29",
    settled: true,
    days: {
      Pn: std(),
      Wt: day(true, "09:00", "16:00"),
      Sr: std(),
      Cz: std(),
      Pt: std(),
      So: inactive(),
    },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-8",
    directoryId: "dir-8",
    name: "Tomek Od Lukasza",
    position: "Pomocnik/Majster",
    rate: "30",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-9",
    directoryId: "dir-9",
    name: "Marcin",
    position: "Mistrz Hydrauliki",
    rate: "42.50",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [
      { id: randomUUID(), description: "chemia", amount: "25", status: "approved" },
    ],
  },
  {
    id: "we-10",
    directoryId: "dir-10",
    name: "Grzesiek",
    position: "Rybak zawodowy",
    rate: "36.67",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-11",
    directoryId: "dir-11",
    name: "Mikolaj",
    position: "Mistrz Grupy zryw",
    rate: "40",
    settled: true,
    days: { Pn: std("500"), Wt: std(), Sr: inactive(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-12",
    directoryId: "dir-12",
    name: "Tomek od Mikolaja",
    position: "Pomocnik Mistrza",
    rate: "30",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
  {
    id: "we-13",
    directoryId: "dir-13",
    name: "Jaroslaw",
    position: "Kierowca zawodowy",
    rate: "30",
    settled: true,
    days: { Pn: std(), Wt: std(), Sr: std(), Cz: std(), Pt: std(), So: inactive() },
    prevSaturday: defaultDay(),
    extraCosts: [],
  },
];

async function main() {
  const weekEmployees = WEEK_EMPLOYEES_SPEC.map((e) => ({
    ...e,
    dataUpdatedAt: "2026-05-29T12:00:00.000Z",
  }));

  /** „Do wypłaty” z PDF dla wypłaty co 2 tyg. (ten + poprzedni tydzień 18–23.05) */
  const PDF_BIWEEKLY_NET = {
    "Piotrek Ukraina": 3569.81,
    "Michal Ukraina": 3641.5,
    "Kola Ukraina": 2562.5,
  };

  const employees = weekEmployees.map((emp) => {
    const c = calcWeekEmployee(emp);
    return {
      name: emp.name,
      position: emp.position,
      rate: c.rateNum,
      weekHours: c.weekHours,
      prevSatHours: c.prevSatHours,
      totalHours: c.totalHours,
      grossPay: c.grossPay,
      totalZaliczka: c.totalZaliczka,
      totalExtraCosts: c.totalExtraCosts,
      netPay: PDF_BIWEEKLY_NET[emp.name] ?? c.netPay,
      settled: emp.settled,
    };
  });

  const calcTotals = {
    totalHours: +employees.reduce((s, e) => s + e.totalHours, 0).toFixed(2),
    totalGross: +employees.reduce((s, e) => s + e.grossPay, 0).toFixed(2),
    totalZaliczka: +employees.reduce((s, e) => s + e.totalZaliczka, 0).toFixed(2),
    totalNet: +employees.reduce((s, e) => s + e.netPay, 0).toFixed(2),
  };

  /** Wypłata w sobotę z PDF (tygodniówki + co 2 tyg.) */
  const PDF_SATURDAY_NET = 23978.46;
  const PDF_WEEK_HOURS = 646;
  const PDF_GROSS = 20085.96;
  const PDF_ZAL = 1050;

  console.log("Obliczone z rozpisu dni:");
  console.log(calcTotals);
  console.log("PDF (29.05):", {
    totalHours: PDF_WEEK_HOURS,
    totalGross: PDF_GROSS,
    totalZaliczka: PDF_ZAL,
    saturdayNet: PDF_SATURDAY_NET,
  });
  console.log("Rozliczeni:", employees.filter((e) => e.settled).length, "/ 13");

  const bg = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys: ["kw-archive"] }),
  }).then((r) => r.json());
  const archive = bg.values[0] || [];
  const idx = archive.findIndex((w) => w.weekFrom === WEEK_FROM);
  if (idx < 0) {
    console.error("Brak tygodnia", WEEK_FROM, "w archiwum");
    process.exit(1);
  }
  const prev = archive[idx];

  const restored = {
    ...prev,
    weekFrom: WEEK_FROM,
    weekTo: WEEK_TO,
    savedAt: "2026-05-29T18:00:00.000Z",
    employees,
    weekEmployees,
    totalEmployees: 13,
    totalHours: PDF_WEEK_HOURS,
    totalGross: PDF_GROSS,
    totalZaliczka: PDF_ZAL,
    totalNet: PDF_SATURDAY_NET,
    backlogNote: "Przywrócono z PDF lista-plac-2026-05-25.pdf (29.05.2026)",
  };

  if (dryRun) {
    console.log("\n--dry-run: podgląd pierwszych 3 pracowników");
    for (const e of employees.slice(0, 3)) {
      console.log(e.name, "h:", e.totalHours, "net:", e.netPay, "settled:", e.settled);
    }
    return;
  }

  const nextArchive = [...archive];
  nextArchive[idx] = restored;

  const res = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys: ["kw-archive"], values: [nextArchive] }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("batch-set failed:", res.status, text);
    process.exit(1);
  }
  console.log("\nZapisano kw-archive — tydzień", WEEK_FROM, "–", WEEK_TO);

  const verify = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keys: ["kw-archive"] }),
  }).then((r) => r.json());
  const v = (verify.values[0] || []).find((w) => w.weekFrom === WEEK_FROM);
  console.log("Weryfikacja chmura:", {
    totalNet: v?.totalNet,
    totalHours: v?.totalHours,
    settled: (v?.employees || []).filter((e) => e.settled).length,
    piotrek: v?.employees?.find((e) => e.name?.includes("Piotrek")),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
