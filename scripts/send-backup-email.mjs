/**
 * Wyślij backup JSON mailem (Resend przez Edge Function).
 * node scripts/send-backup-email.mjs [email]
 *
 * Preferowany harmonogram: scripts/run-scheduled-backup.mjs --mode email
 */
import {
  EMAIL_KV_KEYS,
  fetchKvBackup,
  getSupabaseConfig,
  kvSummary,
  sendBackupEmail,
} from "./backup-lib.mjs";

const config = getSupabaseConfig();
if (process.argv[2]) config.backupEmail = process.argv[2];

if (!config.anonKey) {
  console.error("Ustaw VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const kv = await fetchKvBackup(EMAIL_KV_KEYS, config);
const s = kvSummary(kv);
console.log(`Backup: jobs=${s.jobs}, directory=${s.directory}, week=${s.weekFrom}–${s.weekTo}`);
console.log(`Wysyłam na ${config.backupEmail}...`);

const result = await sendBackupEmail(kv, config);
console.log("OK — mail wysłany:", result.body);
