/** Ustawienia aplikacji — sync w chmurze (Super Admin). */

import { fetchKeysFromCloud, persistKey, APP_SETTINGS_KEY } from "@/lib/cloud-sync";

export { APP_SETTINGS_KEY };

export interface AppSettings {
  /** Podgląd kosztorysów ATH/NOR w przeglądarce (parser best-effort). Domyślnie włączone. */
  athPreviewEnabled: boolean;
  /** Zakładka Przetargi w menu dla Administratora i Moderatora (Super Admin zawsze widzi). */
  tendersTabForStaffEnabled: boolean;
  /** Skan BZP — ile dni wstecz. */
  bzpScanDays: number;
  /** Skan BZP — strony ogólne PL02. */
  bzpScanPages: number;
  /** Skan BZP — strony per kluczowy zamawiający. */
  bzpScanOrgPages: number;
  /** Auto-odświeżenie listy BZP (godziny). */
  bzpAutoRefreshHours: number;
}

export function defaultAppSettings(): AppSettings {
  return {
    athPreviewEnabled: true,
    tendersTabForStaffEnabled: false,
    bzpScanDays: 90,
    bzpScanPages: 4,
    bzpScanOrgPages: 5,
    bzpAutoRefreshHours: 20,
  };
}

function numSetting(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Chmura ma pierwszeństwo — lokalne false z starej wersji nie blokuje podglądu. */
export function mergeAthPreviewEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.athPreviewEnabled === false) return false;
  if (remote?.athPreviewEnabled === true) return true;
  return local.athPreviewEnabled !== false;
}

/** Chmura ma pierwszeństwo — domyślnie wyłączone dla staff. */
export function mergeTendersTabForStaffEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.tendersTabForStaffEnabled === true) return true;
  if (remote?.tendersTabForStaffEnabled === false) return false;
  return local.tendersTabForStaffEnabled === true;
}

export function loadAppSettingsLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    const d = defaultAppSettings();
    if (!raw) return d;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      athPreviewEnabled: parsed.athPreviewEnabled !== false,
      tendersTabForStaffEnabled: parsed.tendersTabForStaffEnabled === true,
      bzpScanDays: numSetting(parsed.bzpScanDays, d.bzpScanDays, 7, 365),
      bzpScanPages: numSetting(parsed.bzpScanPages, d.bzpScanPages, 1, 20),
      bzpScanOrgPages: numSetting(parsed.bzpScanOrgPages, d.bzpScanOrgPages, 1, 20),
      bzpAutoRefreshHours: numSetting(parsed.bzpAutoRefreshHours, d.bzpAutoRefreshHours, 1, 168),
    };
  } catch {
    return defaultAppSettings();
  }
}

function saveAppSettingsLocal(settings: AppSettings): void {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export async function syncAppSettingsFromCloud(): Promise<AppSettings> {
  try {
    const [cloud] = await fetchKeysFromCloud([APP_SETTINGS_KEY]);
    const local = loadAppSettingsLocal();
    if (!cloud || typeof cloud !== "object") return local;
    const remote = cloud as Partial<AppSettings>;
    const merged: AppSettings = mergeAppSettings(remote, local);
    saveAppSettingsLocal(merged);
    return merged;
  } catch {
    return loadAppSettingsLocal();
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  saveAppSettingsLocal(settings);
  await persistKey(APP_SETTINGS_KEY, settings);
}

export function mergeAppSettings(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): AppSettings {
  return {
    athPreviewEnabled: mergeAthPreviewEnabled(remote, local),
    tendersTabForStaffEnabled: mergeTendersTabForStaffEnabled(remote, local),
    bzpScanDays: numSetting(remote?.bzpScanDays, local.bzpScanDays, 7, 365),
    bzpScanPages: numSetting(remote?.bzpScanPages, local.bzpScanPages, 1, 20),
    bzpScanOrgPages: numSetting(remote?.bzpScanOrgPages, local.bzpScanOrgPages, 1, 20),
    bzpAutoRefreshHours: numSetting(remote?.bzpAutoRefreshHours, local.bzpAutoRefreshHours, 1, 168),
  };
}
