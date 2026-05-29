/** Ustawienia aplikacji — sync w chmurze (Super Admin). */

import { fetchKeysFromCloud, persistKey, APP_SETTINGS_KEY } from "@/lib/cloud-sync";

export { APP_SETTINGS_KEY };

export interface AppSettings {
  /** Podgląd kosztorysów ATH/NOR w przeglądarce (parser best-effort). Domyślnie włączone. */
  athPreviewEnabled: boolean;
}

export function defaultAppSettings(): AppSettings {
  return { athPreviewEnabled: true };
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

export function loadAppSettingsLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return defaultAppSettings();
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      athPreviewEnabled: parsed.athPreviewEnabled !== false,
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
    const merged: AppSettings = {
      athPreviewEnabled: mergeAthPreviewEnabled(remote, local),
    };
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
