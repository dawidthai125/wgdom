import { API_BASE, API_HEADERS, DATA_KEYS } from "@/lib/cloud-sync";
import { saveLocalJobsSnapshot } from "@/lib/jobs-safety";
import type { Job, WeekSnapshot } from "@/app/app-domain";
import { localIsoDate } from "@/app/app-domain";

const KW_LAST_BACKUP_WEEK_KEY = "kw-last-backup-week";

export function collectLocalBackupData(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const k of DATA_KEYS) {
    const v = localStorage.getItem(k);
    if (v) {
      try { data[k] = JSON.parse(v); } catch { /* ignore */ }
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
