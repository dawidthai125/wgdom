/**
 * Wyślij pre-feature backup ZIP mailem (Resend przez istniejący endpoint send-payroll-email).
 * node scripts/send-pre-feature-backup-email-2.50.64.mjs [--zip <path>] [--email <addr>]
 *
 * Bez zmian Edge Functions — używa POST /send-payroll-email (custom subject + załącznik base64).
 */
import { readFileSync, existsSync, statSync, mkdirSync, rmSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { getSupabaseConfig, apiHeaders, projectRoot } from "./backup-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VERSION = "2.50.64";
const COMMIT = "c7bc58f";
const TAG = `pre-next-feature-${VERSION}`;
const DEPLOY = "BxMBS2SFGiDxZmkHmwndVpr5RLin";
const DEFAULT_ZIP = resolve(projectRoot, "..", `WGDOM-BACKUP-${VERSION}.zip`);

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const fullZipPath = resolve(arg("--zip", DEFAULT_ZIP));
const coreOnly = args.includes("--core-only");
const config = getSupabaseConfig();
const to = arg("--email", config.backupEmail);
const dateIso = new Date().toISOString();
const BACKUP_DIR = resolve(projectRoot, "..", `WGDOM-BACKUP-${VERSION}`);
const CORE_ZIP = resolve(projectRoot, "..", `WGDOM-BACKUP-${VERSION}-email-core.zip`);

/** Pełny ZIP >40 MB Resend — użyj --core-only (rdzeń KV+docs bez repo). */

function buildCoreZip() {
  const stage = join(BACKUP_DIR, "_email-stage");
  if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  for (const sub of ["database", "docs", "storage"]) {
    const src = join(BACKUP_DIR, sub);
    if (existsSync(src)) {
      execSync(
        `powershell -NoProfile -Command "Copy-Item -Recurse -LiteralPath '${src.replace(/'/g, "''")}' -Destination '${join(stage, sub).replace(/'/g, "''")}'"`,
        { stdio: "pipe" }
      );
    }
  }
  for (const f of ["manifest.json"]) {
    const src = join(BACKUP_DIR, f);
    if (existsSync(src)) {
      execSync(
        `powershell -NoProfile -Command "Copy-Item -LiteralPath '${src.replace(/'/g, "''")}' -Destination '${join(stage, f).replace(/'/g, "''")}'"`,
        { stdio: "pipe" }
      );
    }
  }
  if (existsSync(CORE_ZIP)) rmSync(CORE_ZIP, { force: true });
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stage.replace(/'/g, "''")}\\*' -DestinationPath '${CORE_ZIP.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );
  rmSync(stage, { recursive: true, force: true });
  return CORE_ZIP;
}

let zipPath = fullZipPath;
let attachmentNote = "Pełny archiwum pre-feature (KV, repo bundle, schema, docs, storage manifest).";
if (coreOnly || !existsSync(fullZipPath)) {
  if (!existsSync(BACKUP_DIR)) {
    console.error(`EMAIL BACKUP FAIL — brak katalogu backupu: ${BACKUP_DIR}`);
    process.exit(1);
  }
  zipPath = buildCoreZip();
  attachmentNote =
    "Rdzeń backupu (KV, schema, edge snapshot, docs, storage manifest). Repo bundle/archive: tag git pre-next-feature-2.50.64 lub lokalny WGDOM-BACKUP-2.50.64.zip (52.8 MB — ponad limit Resend 40 MB).";
}

/** Resend: max 40 MB po Base64 — bezpieczny limit surowy ~29 MB */
const RESEND_RAW_MAX = Math.floor((40 * 1024 * 1024 * 3) / 4);

if (!config.anonKey) {
  console.error("EMAIL BACKUP FAIL — brak VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!existsSync(zipPath)) {
  console.error(`EMAIL BACKUP FAIL — brak pliku: ${zipPath}`);
  process.exit(1);
}

const zipStat = statSync(zipPath);
const zipBytes = zipStat.size;
const base64Estimate = Math.ceil((zipBytes * 4) / 3);

console.log("=== WGDOM Pre-Feature Email Backup ===");
console.log("ZIP:", zipPath);
console.log("Rozmiar:", zipBytes, "B (base64 ~", base64Estimate, "B)");
console.log("Odbiorca:", to);

if (zipBytes > RESEND_RAW_MAX) {
  console.warn(
    `UWAGA: ZIP (${(zipBytes / 1024 / 1024).toFixed(2)} MB) przekracza bezpieczny limit Resend (~${(RESEND_RAW_MAX / 1024 / 1024).toFixed(0)} MB surowy / 40 MB po Base64). Próba wysyłki mimo to…`
  );
}

const zipBuf = readFileSync(zipPath);
const base64 = zipBuf.toString("base64");

const subject = `WGDOM Backup v${VERSION}`;
const html = [
  "<h2>W&G DOM — Pre-Feature Backup</h2>",
  "<ul>",
  `<li><strong>Version:</strong> ${VERSION}</li>`,
  `<li><strong>Commit:</strong> ${COMMIT}</li>`,
  `<li><strong>Tag:</strong> ${TAG}</li>`,
  `<li><strong>Deploy:</strong> ${DEPLOY}</li>`,
  `<li><strong>Date:</strong> ${dateIso}</li>`,
  `<li><strong>Backup status:</strong> COMPLETE</li>`,
  "</ul>",
  `<p>Załącznik: <code>${zipPath.split(/[/\\]/).pop()}</code> (${(zipBytes / 1024 / 1024).toFixed(2)} MB)</p>`,
  `<p>${attachmentNote}</p>`,
  `<p>Pełny ZIP lokalnie: <code>${fullZipPath}</code> (${existsSync(fullZipPath) ? `${(statSync(fullZipPath).size / 1024 / 1024).toFixed(2)} MB` : "brak"})</p>`,
  `<p>Storage binaria: <code>WGDOM-BACKUP-${VERSION}-storage-full.zip</code></p>`,
].join("");

const base = `https://${config.projectId}.supabase.co/functions/v1/${config.slug}`;
const res = await fetch(`${base}/send-payroll-email`, {
  method: "POST",
  headers: apiHeaders(config.anonKey),
  body: JSON.stringify({
    to,
    subject,
    html,
    attachments: [
      {
        filename: coreOnly ? `WGDOM-BACKUP-${VERSION}-email-core.zip` : `WGDOM-BACKUP-${VERSION}.zip`,
        content: base64,
      },
    ],
  }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text };
}

const report = {
  verdict: res.ok && body.ok ? "EMAIL BACKUP PASS" : "EMAIL BACKUP FAIL",
  recipient: to,
  messageId: body.id || body.messageId || null,
  delivery: res.ok && body.ok ? "PASS" : "FAIL",
  httpStatus: res.status,
  zipPath,
  zipBytes,
  fullZipPath,
  fullZipBytes: existsSync(fullZipPath) ? statSync(fullZipPath).size : null,
  coreOnly,
  base64Bytes: base64.length,
  resendLimitNote: "Resend max 40 MB po Base64 na email",
  response: body,
};

console.log("\n--- RAPORT ---");
console.log(JSON.stringify(report, null, 2));

if (report.verdict === "EMAIL BACKUP PASS") {
  console.log(`\n${report.verdict}`);
  console.log("Recipient:", report.recipient);
  console.log("Message ID:", report.messageId ?? "(endpoint nie zwraca ID — delivery=PASS po HTTP 200 + ok:true)");
  process.exit(0);
}

console.error(`\n${report.verdict}`);
if (body.error) console.error("Błąd:", typeof body.error === "string" ? body.error : JSON.stringify(body.error));
process.exit(1);
