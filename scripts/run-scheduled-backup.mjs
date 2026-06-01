/**
 * Harmonogram backupu W&G DOM.
 *
 *   node scripts/run-scheduled-backup.mjs --mode local     # niedziela — pełny backup na dysk
 *   node scripts/run-scheduled-backup.mjs --mode email      # piątek 18:00 — mail z JSON
 *   node scripts/run-scheduled-backup.mjs --mode both       # oba
 *
 * Opcje:
 *   --out <dir>       katalog docelowy (tylko local)
 *   --keep <n>        ile ostatnich kopii zostawić (domyślnie 12)
 *   --email <addr>    nadpisanie adresu (tylko email)
 */
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from "fs";
import { join } from "path";
import {
  EMAIL_KV_KEYS,
  fullBackupKvKeys,
  getSupabaseConfig,
  fetchKvBackup,
  kvSummary,
  sendBackupEmail,
  projectRoot,
} from "./backup-lib.mjs";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const mode = arg("--mode", "local");
const full = args.includes("--full");
const keep = Math.max(1, parseInt(arg("--keep", "12"), 10) || 12);
const emailOverride = arg("--email", null);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const today = new Date().toISOString().slice(0, 10);

const config = getSupabaseConfig();
if (emailOverride) config.backupEmail = emailOverride;

function pruneOldBackups(baseDir, keepCount) {
  if (!baseDir) return;
  let entries = [];
  try {
    entries = readdirSync(baseDir)
      .filter((n) => n.startsWith("wgdom-full-"))
      .map((n) => ({ name: n, mtime: statSync(join(baseDir, n)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return;
  }
  for (const old of entries.slice(keepCount)) {
    const p = join(baseDir, old.name);
    console.log("Usuwam starą kopię:", p);
    rmSync(p, { recursive: true, force: true });
  }
}

async function runLocal() {
  const outRoot = arg("--out", join(projectRoot, "backups", "auto", `wgdom-full-${stamp}`));
  mkdirSync(outRoot, { recursive: true });

  console.log("=== Backup lokalny (pełny KV) ===");
  console.log("Katalog:", outRoot);

  const keys = fullBackupKvKeys(today);
  const kv = await fetchKvBackup(keys, config);
  writeFileSync(join(outRoot, "kv-data.json"), JSON.stringify(kv, null, 2), "utf8");

  const summary = {
    exportedAt: new Date().toISOString(),
    schedule: "sunday-local",
    projectId: config.projectId,
    ...kvSummary(kv),
  };
  writeFileSync(join(outRoot, "manifest.json"), JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(
    join(outRoot, "README.txt"),
    [
      "W&G DOM — automatyczny backup (niedziela)",
      `Data: ${summary.exportedAt}`,
      "",
      "Przywracanie:",
      `  .\\scripts\\restore-backup-to-supabase.ps1 -BackupPath "${join(outRoot, "kv-data.json")}" -AnonKey "<anon>"`,
      "",
      "NIE wrzucaj na GitHub — zawiera hasła adminów.",
    ].join("\n"),
    "utf8",
  );

  pruneOldBackups(join(projectRoot, "backups", "auto"), keep);

  console.log(
    `OK — jobs=${summary.jobs}, pracownicy=${summary.directory}, archiwum=${summary.archiveWeeks} tyg.`,
  );
  return outRoot;
}

async function runEmail() {
  console.log("=== Backup email (piątek) ===");
  console.log("Adres:", config.backupEmail);
  console.log("Zakres:", full ? "PEŁNY (wszystkie klucze KV)" : "standardowy");

  const keys = full ? fullBackupKvKeys(today) : EMAIL_KV_KEYS;
  const kv = await fetchKvBackup(keys, config);
  const s = kvSummary(kv);
  console.log(`Dane: jobs=${s.jobs}, directory=${s.directory}, tydzień=${s.weekFrom}–${s.weekTo}`);

  const result = await sendBackupEmail(kv, config);
  console.log("OK — mail wysłany:", result.body);
  return result;
}

console.log(`W&G DOM scheduled backup — mode=${mode}, ${new Date().toISOString()}`);

try {
  if (mode === "local" || mode === "both") await runLocal();
  if (mode === "email" || mode === "both") await runEmail();
  if (!["local", "email", "both"].includes(mode)) {
    console.error("Nieznany --mode. Użyj: local | email | both");
    process.exit(1);
  }
} catch (e) {
  console.error("BŁĄD backupu:", e.message || e);
  process.exit(1);
}
