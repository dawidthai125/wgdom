import { chromium } from "playwright";

const page = await (await chromium.launch({ headless: true })).newPage();
let localArchive = null;
try {
  await page.goto("http://127.0.0.1:5213", { timeout: 8000 });
  await page.waitForSelector("text=Panel administracyjny", { timeout: 15_000 });
  localArchive = await page.evaluate(() => JSON.parse(localStorage.getItem("kw-archive") || "[]"));
} catch {
  localArchive = null;
}
await page.context().browser()?.close();

if (!localArchive) {
  console.log(JSON.stringify({ source: "local-preview-5213", available: false }, null, 2));
} else {
  const CANON = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
  const LEG = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const crashEmp = (emp) => CANON.some((k) => emp?.days?.[k] == null);
  const stats = { weeks: localArchive.length, y2099: 0, smoke: 0, legacy: 0, crash: 0, noWE: 0 };
  for (const w of localArchive) {
    if (String(w.weekFrom).startsWith("2099")) stats.y2099++;
    if (String(w.id).match(/^smoke/i)) stats.smoke++;
    if (w.weekEmployees == null) stats.noWE++;
    for (const e of w.weekEmployees || []) {
      if (Object.keys(e.days || {}).some((k) => LEG.has(k))) stats.legacy++;
      if (crashEmp(e)) stats.crash++;
    }
  }
  console.log(JSON.stringify({ source: "local-preview-5213", available: true, stats, ids: localArchive.map((w) => ({ id: w.id, from: w.weekFrom })).slice(0, 10) }, null, 2));
}
