import { useState, useEffect, type ReactNode } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import {
  DATA_KEYS,
  pushKeysToCloud,
  fetchKeysFromCloud,
  normalizeJobsValue,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  mergeDeletedJobIds,
  getDeletedJobIds,
  saveDeletedJobIds,
  mergeDeletedDirectoryIds,
  getDeletedDirectoryIds,
  saveDeletedDirectoryIds,
  mergeDeletedContactsIds,
  mergeDeletedArchiveIds,
  saveDeletedContactsIds,
  saveDeletedArchiveIds,
  getDeletedContactsIds,
  getDeletedArchiveIds,
  normalizeDeletedJobIds,
  normalizeDeletedDirectoryIds,
  JOBS_DELETED_IDS_KEY,
  DIRECTORY_DELETED_IDS_KEY,
  CONTACTS_DELETED_IDS_KEY,
  ARCHIVE_DELETED_IDS_KEY,
  stripWorkerPinHashesFromDirectory,
  WORKER_PINS_RESET_FLAG,
  ADMIN_PASSWORDS_KEY,
  ADMIN_USERS_CONFIG_KEY,
  APP_SETTINGS_KEY,
  isSupabaseConfigured,
  weekEmployeesListRichness,
} from "@/lib/cloud-sync";
import {
  loadAdminPasswordOverrides,
  mergeAdminPasswordOverrides,
  shouldPushAdminPasswordOverridesOnBootstrap,
  loadAdminUsersConfig,
  mergeAdminUsersConfig,
} from "@/lib/admin-auth";
import { loadAppSettingsLocal, mergeAppSettings, type AppSettings } from "@/lib/app-settings";
import { markCloudBootstrapSuccess } from "@/lib/cloud-bootstrap";

export function CloudLoader({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const keys = [...DATA_KEYS];
    const fallback = setTimeout(() => setReady(true), 3000);

    fetchKeysFromCloud([
      ...keys,
      JOBS_DELETED_IDS_KEY,
      DIRECTORY_DELETED_IDS_KEY,
      CONTACTS_DELETED_IDS_KEY,
      ARCHIVE_DELETED_IDS_KEY,
      ADMIN_PASSWORDS_KEY,
      ADMIN_USERS_CONFIG_KEY,
      APP_SETTINGS_KEY,
    ])
      .then(async (allValues) => {
        const values = allValues.slice(0, keys.length);
        const cloudDeleted = normalizeDeletedJobIds(allValues[keys.length]);
        const cloudDirDeleted = normalizeDeletedDirectoryIds(allValues[keys.length + 1]);
        const cloudContactsDeleted = normalizeDeletedJobIds(allValues[keys.length + 2]);
        const cloudArchiveDeleted = normalizeDeletedJobIds(allValues[keys.length + 3]);
        const cloudAdminPw = allValues[keys.length + 4];
        const cloudAdminUsers = allValues[keys.length + 5];
        const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
        saveDeletedJobIds(mergedDeleted);
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
        saveDeletedDirectoryIds(mergedDirDeleted);
        const mergedContactsDeleted = mergeDeletedContactsIds(getDeletedContactsIds(), cloudContactsDeleted);
        saveDeletedContactsIds(mergedContactsDeleted);
        const mergedArchiveDeleted = mergeDeletedArchiveIds(getDeletedArchiveIds(), cloudArchiveDeleted);
        saveDeletedArchiveIds(mergedArchiveDeleted);

        const localAdminPw = loadAdminPasswordOverrides();
        const mergedAdminPw = mergeAdminPasswordOverrides(localAdminPw, cloudAdminPw);
        if (Object.keys(mergedAdminPw).length > 0) {
          localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(mergedAdminPw));
        } else {
          localStorage.removeItem(ADMIN_PASSWORDS_KEY);
        }

        const localAdminUsers = loadAdminUsersConfig();
        const mergedAdminUsers = mergeAdminUsersConfig(localAdminUsers, cloudAdminUsers);
        localStorage.setItem(ADMIN_USERS_CONFIG_KEY, JSON.stringify(mergedAdminUsers));

        const cloudAppSettings = allValues[keys.length + 6];
        if (cloudAppSettings && typeof cloudAppSettings === "object") {
          const localSettings = loadAppSettingsLocal();
          const cloudS = cloudAppSettings as AppSettings;
          const mergedSettings: AppSettings = mergeAppSettings(cloudS, localSettings);
          localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(mergedSettings));
        }

        const pushKeys: string[] = [];
        const pushValues: unknown[] = [];

        if (
          isSupabaseConfigured() &&
          shouldPushAdminPasswordOverridesOnBootstrap(localAdminPw, cloudAdminPw, mergedAdminPw)
        ) {
          pushKeys.push(ADMIN_PASSWORDS_KEY);
          pushValues.push(mergedAdminPw);
        }
        if (isSupabaseConfigured() && JSON.stringify(mergedAdminUsers) !== JSON.stringify(cloudAdminUsers ?? { roleOverrides: {}, customUsers: [] })) {
          pushKeys.push(ADMIN_USERS_CONFIG_KEY);
          pushValues.push(mergedAdminUsers);
        }

        const localValues = keys.map((key) => {
          try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw) as unknown;
          } catch { /* ignore */ }
          return null;
        });

        let mergedBundle = mergeAllDataKeys(
          localValues,
          values,
          mergedDeleted,
          mergedDirDeleted,
          mergedContactsDeleted,
          mergedArchiveDeleted,
        );
        mergedBundle = applyBootstrapPayrollMerge(mergedBundle, localValues, values);

        keys.forEach((key, i) => {
          const cloudVal = values[i];
          const merged = mergedBundle[i];
          const hasRealData = merged != null && !(Array.isArray(merged) && merged.length === 0) && merged !== "";
          if (hasRealData || (key === "kw-weekFrom" || key === "kw-weekTo") && merged) {
            localStorage.setItem(key, JSON.stringify(merged));
          }

          if (!isSupabaseConfigured()) return;

          const cloudEmpty = cloudVal == null || (Array.isArray(cloudVal) && cloudVal.length === 0);
          const richnessIncreased =
            key === "kw-week-employees"
              ? weekEmployeesListRichness(merged) > weekEmployeesListRichness(cloudVal) + 1
              : key === "kw-jobs"
                ? normalizeJobsValue(merged).length > normalizeJobsValue(cloudVal).length
                : Array.isArray(merged) && Array.isArray(cloudVal) && merged.length > cloudVal.length;

          const shouldPush =
            (cloudEmpty && hasRealData) ||
            richnessIncreased ||
            (hasRealData && JSON.stringify(merged) !== JSON.stringify(cloudVal));

          if (shouldPush) {
            pushKeys.push(key);
            pushValues.push(merged);
          }
        });

        if (localStorage.getItem(WORKER_PINS_RESET_FLAG) !== "1") {
          try {
            const raw = localStorage.getItem("kw-directory");
            const parsed = raw ? JSON.parse(raw) : [];
            const arr = Array.isArray(parsed) ? parsed : [];
            const { directory: stripped } = stripWorkerPinHashesFromDirectory(arr);
            localStorage.setItem("kw-directory", JSON.stringify(stripped));
            if (isSupabaseConfigured()) {
              await pushKeysToCloud(
                ["kw-directory", DIRECTORY_DELETED_IDS_KEY],
                [stripped, mergedDirDeleted],
                { replaceDirectoryKeys: ["kw-directory"] },
              );
            }
            localStorage.setItem(WORKER_PINS_RESET_FLAG, "1");
          } catch {
            /* ponowi przy następnym wejściu */
          }
        }

        if (pushKeys.length > 0) {
          // Push w tle — nie blokuj startu UI (batch-get ~2–3 s wystarczy)
          void pushKeysToCloud(
            [...pushKeys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY, CONTACTS_DELETED_IDS_KEY, ARCHIVE_DELETED_IDS_KEY],
            [...pushValues, mergedDeleted, mergedDirDeleted, mergedContactsDeleted, mergedArchiveDeleted],
            {
              replaceJobsKeys: pushKeys.includes("kw-jobs") ? ["kw-jobs"] : [],
              replaceDirectoryKeys: pushKeys.includes("kw-directory") ? ["kw-directory"] : [],
              replaceWeekEmployeesKeys: pushKeys.includes("kw-week-employees") ? ["kw-week-employees"] : [],
            },
          ).catch(() => {});
        }

        markCloudBootstrapSuccess();
      })
      .catch(() => {})
      .finally(() => { clearTimeout(fallback); setReady(true); });
  }, []);

  if (!ready) return (
    <div style={{fontFamily:"'Inter',sans-serif", height:"100dvh"}} className="flex bg-background text-foreground items-center justify-center flex-col gap-4">
      <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain"/>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
        Ładowanie danych...
      </div>
    </div>
  );

  return <>{children}</>;
}
