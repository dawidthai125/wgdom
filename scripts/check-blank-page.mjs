import { chromium } from "playwright";

const url = process.argv[2] || "https://wgdom.fun/";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

// Pobierz roboty z chmury (zawiera wpis workEntries: null)
let cloudJobs = [];
try {
  const res = await page.evaluate(async () => {
    const r = await fetch("https://kchwyjlnkdlymwvsnfiu.supabase.co/functions/v1/make-server-0afb8820/batch-get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaHd5amxua2RseW13dnNuZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MzQ2NjYsImV4cCI6MjA5NTIxMDY2Nn0.poNOdzj0acEDSpxTGVFL2GaGJE-BEIAnbIJgDnPoOoA",
      },
      body: JSON.stringify({ keys: ["kw-jobs", "kw-directory", "kw-archive"] }),
    });
    const data = await r.json();
    return data.values;
  });
  cloudJobs = res[0] || [];
  await page.evaluate(
    ({ jobs, directory, archive }) => {
      localStorage.setItem("kw-jobs", JSON.stringify(jobs));
      localStorage.setItem("kw-directory", JSON.stringify(directory || []));
      localStorage.setItem("kw-archive", JSON.stringify(archive || []));
      localStorage.setItem("kw-week-employees", "[]");
      localStorage.setItem("kw-weekFrom", JSON.stringify("2026-05-25"));
      localStorage.setItem("kw-weekTo", JSON.stringify("2026-05-30"));
      localStorage.setItem("kw-tenders-company-profile", "null");
      sessionStorage.setItem("wg-session-mode", "admin");
      sessionStorage.setItem(
        "wg-admin-session",
        JSON.stringify({ id: "dawid", role: "super_admin", displayName: "Dawid", login: "Dawid" }),
      );
    },
    { jobs: cloudJobs, directory: res[1], archive: res[2] },
  );
} catch (e) {
  console.error("cloud fetch failed", e);
}

await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(10_000);

const rootText = await page.locator("#root").innerText().catch(() => "");
const hasLogin = await page.getByRole("button", { name: /Panel administracyjny/i }).count();
const hasDashboard = await page.getByText(/Pulpit|Lista płac|Roboty/i).count();
const nullJobs = cloudJobs.filter((j) => j && j.workEntries == null).length;

console.log(JSON.stringify({
  url,
  cloudJobs: cloudJobs.length,
  jobsWithNullWorkEntries: nullJobs,
  rootTextLength: rootText.length,
  rootPreview: rootText.slice(0, 300),
  hasLoginButton: hasLogin > 0,
  hasAppContent: hasDashboard > 0,
  errors: errors.filter((e) => !e.includes("404")).slice(0, 10),
}, null, 2));

await browser.close();
