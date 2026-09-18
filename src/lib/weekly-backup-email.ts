import { API_BASE, API_HEADERS, DATA_KEYS } from "@/lib/cloud-sync";
import { getPipelineColdMemory } from "@/lib/storage/tenders-pipeline-cold";
import { hasLsIndexMarker } from "@/lib/tender-pipeline/tender-pipeline-representation";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";
import { saveLocalJobsSnapshot } from "@/lib/jobs-safety";
import type { Job, WeekSnapshot } from "@/app/app-domain";
import { localIsoDate } from "@/app/app-domain";

const KW_LAST_BACKUP_WEEK_KEY = "kw-last-backup-week";

const TENDERS_PIPELINE_BACKUP_KEY = "kw-tenders-pipeline";

export function collectLocalBackupData(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const k of DATA_KEYS) {
    const v = localStorage.getItem(k);
    if (v) {
      try { data[k] = JSON.parse(v); } catch { /* ignore */ }
    }
  }
  // STORAGE-TIER1-PIPELINE-CONTRACT-01 §9 / §A.6 F (R8) — e-mail backup nigdy nie wysyła INDEX
  // jako FULL. Ścieżka sync (kontrakt `triggerWeeklyBackupEmail`): FULL = RAM/IDB cold memory,
  // inaczej LS wyłącznie klasy LEGACY_* (FULL-compatible §A.4). INDEX ⇒ klucz POMINIĘTY + telemetria.
  if (data[TENDERS_PIPELINE_BACKUP_KEY] != null) {
    const cold = getPipelineColdMemory();
    if (cold != null) {
      data[TENDERS_PIPELINE_BACKUP_KEY] = cold;
    } else if (hasLsIndexMarker(data[TENDERS_PIPELINE_BACKUP_KEY])) {
      delete data[TENDERS_PIPELINE_BACKUP_KEY];
      recordStorageWrite({
        key: TENDERS_PIPELINE_BACKUP_KEY,
        bytes: 0,
        writer: "weekly-backup-email",
        ok: false,
        tier: 1,
        note: "backup_pipeline_incomplete:index_without_full",
      });
    }
  }
  if (overrides) Object.assign(data, overrides);
  return data;
}

/** Email backup — w niedzielę, raz na zarchiwizowany tydzień (po zapisie listy płac). */
export function triggerWeeklyBackupEmail(
  archivedWeekFrom: string,
  archivedWeekTo: string,
  jobsForSnapshot: Job[],
  archiveOverride?: WeekSnapshot[],
): void {
  if (new Date().getDay() !== 0) return;
  if (localStorage.getItem(KW_LAST_BACKUP_WEEK_KEY) === archivedWeekFrom) return;

  const data = collectLocalBackupData(
    archiveOverride ? { "kw-archive": archiveOverride } : undefined,
  );
  if (Object.keys(data).length === 0) return;

  localStorage.setItem(KW_LAST_BACKUP_WEEK_KEY, archivedWeekFrom);
  if (jobsForSnapshot.length > 0) saveLocalJobsSnapshot(jobsForSnapshot);

  fetch(`${API_BASE}/send-backup-email`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      data,
      date: localIsoDate(),
      weekFrom: archivedWeekFrom,
      weekTo: archivedWeekTo,
    }),
  }).catch(() => {});
}
