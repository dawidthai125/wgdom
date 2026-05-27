/** Ustawienia aplikacji — sync w chmurze (Super Admin). */

import { fetchKeysFromCloud, persistKey, APP_SETTINGS_KEY } from "@/lib/cloud-sync";

export { APP_SETTINGS_KEY };

export interface RoleContactPhones {
  super_admin: string;
  admin: string;
  moderator: string;
}

export interface AppSettings {
  /** Podgląd kosztorysów ATH/NOR w przeglądarce (parser best-effort). Domyślnie wyłączone. */
  athPreviewEnabled: boolean;
  /** Numery kontaktowe dla ról admina — inspektor widzi je po najechaniu na autora treści. */
  roleContactPhones: RoleContactPhones;
}

export function defaultRoleContactPhones(): RoleContactPhones {
  return { super_admin: "", admin: "", moderator: "" };
}

export function defaultAppSettings(): AppSettings {
  return { athPreviewEnabled: false, roleContactPhones: defaultRoleContactPhones() };
}

function normalizeRoleContactPhones(raw: unknown): RoleContactPhones {
  const base = defaultRoleContactPhones();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<RoleContactPhones>;
  return {
    super_admin: typeof o.super_admin === "string" ? o.super_admin : base.super_admin,
    admin: typeof o.admin === "string" ? o.admin : base.admin,
    moderator: typeof o.moderator === "string" ? o.moderator : base.moderator,
  };
}

export function loadAppSettingsLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return defaultAppSettings();
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      athPreviewEnabled: parsed.athPreviewEnabled === true,
      roleContactPhones: normalizeRoleContactPhones(parsed.roleContactPhones),
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
      athPreviewEnabled: remote.athPreviewEnabled === true || local.athPreviewEnabled,
      roleContactPhones: normalizeRoleContactPhones(remote.roleContactPhones ?? local.roleContactPhones),
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
