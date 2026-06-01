/**
 * Jednorazowe czyszczenie po migracji Supabase:
 * - lista płac bieżącego tygodnia (od 2026-06-01): zerowanie godzin/dni
 * - usunięcie martwych URL-i storage (stary projekt kchwyjlnkdlymwvsnfiu)
 *
 * node scripts/cleanup-dead-storage-and-payroll.mjs
 * Opcjonalnie: --dry-run (tylko podgląd)
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const photosOnly = process.argv.includes("--photos-only");

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

const projectId = process.env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
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

const OLD_PROJECT = "kchwyjlnkdlymwvsnfiu";
const WEEK_CLEAR_FROM = "2026-06-01";

const PAYROLL_DAY_KEYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultPayrollDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}

function defaultPayrollDays() {
  return Object.fromEntries(PAYROLL_DAY_KEYS.map((d) => [d, defaultPayrollDay()]));
}

function isDeadStorageUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  if (url.includes(OLD_PROJECT)) return true;
  if (url.includes("make-0afb8820-photos") && !url.includes(projectId)) return true;
  return false;
}

function stripWeekEmployeeHours(emp) {
  if (!emp || typeof emp !== "object") return emp;
  return {
    ...emp,
    days: defaultPayrollDays(),
    prevSaturday: defaultPayrollDay(),
    extraCosts: [],
    settled: false,
    settledUpdatedAt: undefined,
  };
}

function cleanPhotoEntry(p) {
  if (!p || typeof p !== "object") return null;
  const url = p.publicUrl || p.url || "";
  const path = p.path || "";
  if (isDeadStorageUrl(url) || isDeadStorageUrl(path)) return null;
  return p;
}

function cleanJobFiles(files) {
  if (!Array.isArray(files)) return files;
  return files.filter((f) => {
    if (!f || typeof f !== "object") return false;
    return !isDeadStorageUrl(f.publicUrl) && !isDeadStorageUrl(f.path);
  });
}

function cleanSketch(sketch) {
  if (!sketch || typeof sketch !== "object") return sketch;
  if (isDeadStorageUrl(sketch.publicUrl) || isDeadStorageUrl(sketch.path)) return null;
  return sketch;
}

function cleanJob(job) {
  if (!job || typeof job !== "object") return job;
  const photos = (job.photos || []).map(cleanPhotoEntry).filter(Boolean);
  const jobFiles = cleanJobFiles(job.jobFiles);
  const inspectorPhotos = (job.inspectorPhotos || [])
    .map((p) => cleanPhotoEntry(p))
    .filter(Boolean);
  const workerReports = (job.workerReports || []).map((r) => {
    if (!r || typeof r !== "object") return r;
    const sketch = cleanSketch(r.sketch);
    return { ...r, sketch: sketch ?? null };
  });
  let sketch = job.sketch;
  if (sketch) sketch = cleanSketch(sketch);

  return {
    ...job,
    photos,
    jobFiles,
    inspectorPhotos,
    workerReports,
    ...(sketch !== undefined ? { sketch } : {}),
  };
}

function cleanTenderItem(item) {
  if (!item || typeof item !== "object") return item;
  const out = { ...item };
  if (out.uploadedFile) {
    const u = out.uploadedFile;
    if (
      isDeadStorageUrl(u.publicUrl) ||
      isDeadStorageUrl(u.path) ||
      (typeof u.url === "string" && isDeadStorageUrl(u.url))
    ) {
      out.uploadedFile = null;
    }
  }
  if (Array.isArray(out.externalDocs)) {
    out.externalDocs = out.externalDocs
      .map((d) => {
        if (!d || typeof d !== "object") return d;
        const url = d.url || d.publicUrl || "";
        if (isDeadStorageUrl(url) || isDeadStorageUrl(d.storagePath)) return null;
        return d;
      })
      .filter(Boolean);
  }
  if (out.externalDocDiscovery?.files) {
    const files = out.externalDocDiscovery.files.filter((f) => {
      if (!f || typeof f !== "object") return false;
      return !isDeadStorageUrl(f.publicUrl) && !isDeadStorageUrl(f.path) && !isDeadStorageUrl(f.url);
    });
    out.externalDocDiscovery = files.length
      ? { ...out.externalDocDiscovery, files }
      : { ...out.externalDocDiscovery, files: [] };
  }
  return out;
}

async function api(path, body, method = "POST") {
  const res = await fetch(`${base}${path}`, { method, headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0, 400)}`);
  return json;
}

async function main() {
  const keys = ["kw-week-employees", "kw-weekFrom", "kw-weekTo", "kw-jobs", "kw-tenders-pipeline"];
  const { values } = await api("/batch-get", { keys });
  const [emps, weekFrom, weekTo, jobs, tenders] = values;

  console.log(`Tydzień w chmurze: ${weekFrom} – ${weekTo}`);

  let newEmps = emps;
  if (!photosOnly && weekFrom >= WEEK_CLEAR_FROM) {
    newEmps = (emps || []).map(stripWeekEmployeeHours);
    const before = (emps || []).reduce((n, e) => {
      const days = e?.days || {};
      return n + Object.values(days).filter((d) => d?.active).length;
    }, 0);
    const after = newEmps.reduce((n, e) => {
      const days = e?.days || {};
      return n + Object.values(days).filter((d) => d?.active).length;
    }, 0);
    console.log(`Lista płac: ${emps?.length ?? 0} osób, aktywne dni ${before} → ${after}`);
  } else if (photosOnly) {
    console.log("Lista płac: pominięto (--photos-only)");
  } else {
    console.log(`Lista płac: pominięto (weekFrom ${weekFrom} < ${WEEK_CLEAR_FROM})`);
  }

  let photosRemoved = 0;
  const newJobs = (jobs || []).map((j) => {
    const before = (j.photos || []).length;
    const cleaned = cleanJob(j);
    photosRemoved += before - (cleaned.photos || []).length;
    return cleaned;
  });
  console.log(`Roboty: usunięto ${photosRemoved} martwych zdjęć z ${jobs?.length ?? 0} zleceń`);

  let tenderFilesCleared = 0;
  const newTenders = (tenders || []).map((t) => {
    const had = t.uploadedFile ? 1 : 0;
    const c = cleanTenderItem(t);
    if (had && !c.uploadedFile) tenderFilesCleared++;
    return c;
  });
  console.log(`Przetargi: wyczyszczono uploadedFile u ${tenderFilesCleared} pozycji`);

  if (dryRun) {
    console.log("--dry-run: bez zapisu do chmury");
    return;
  }

  const setKeys = photosOnly ? ["kw-jobs", "kw-tenders-pipeline"] : ["kw-week-employees", "kw-jobs", "kw-tenders-pipeline"];
  const setValues = photosOnly ? [newJobs, newTenders] : [newEmps, newJobs, newTenders];

  if (!photosOnly) {
    await api("/batch-del", { keys: ["kw-week-employees"] });
    console.log("batch-del kw-week-employees OK");
  }

  await api("/batch-set", {
    keys: setKeys,
    values: setValues,
    replaceJobsKeys: ["kw-jobs"],
    ...(photosOnly ? {} : { replaceWeekEmployeesKeys: ["kw-week-employees"] }),
  });
  console.log("batch-set OK:", setKeys.join(", "));

  const verify = await api("/batch-get", {
    keys: photosOnly ? ["kw-jobs"] : ["kw-week-employees", "kw-jobs"],
  });
  const verifyValues = verify.values;
  const vEmps = photosOnly ? null : verifyValues[0];
  const vJobs = photosOnly ? verifyValues[0] : verifyValues[1];
  const activeLeft = photosOnly
    ? "—"
    : (vEmps || []).reduce((n, e) => {
        const days = e?.days || {};
        return n + Object.values(days).filter((d) => d?.active).length;
      }, 0);
  let deadPhotosLeft = 0;
  for (const j of vJobs || []) {
    for (const p of j.photos || []) {
      const u = typeof p === "string" ? p : p?.publicUrl || "";
      if (isDeadStorageUrl(u)) deadPhotosLeft++;
    }
  }
  console.log(`Weryfikacja: aktywne dni=${activeLeft}, martwe zdjęcia w jobs=${deadPhotosLeft}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
