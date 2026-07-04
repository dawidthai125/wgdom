import { useState, useEffect, type ReactNode } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import {
  DATA_KEYS,
  BOOTSTRAP_CORE_KEYS,
  pushKeysToCloud,
  fetchKeysFromCloud,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  mergeDeletedJobIds,
  getDeletedJobIds,
  saveDeletedJobIds,
  mergeDeletedDirectoryIds,
  getDeletedDirectoryIds,
  saveDeletedDirectoryIds,
  mergeDeletedArchiveIds,
  saveDeletedArchiveIds,
  getDeletedContactsIds,
  getDeletedArchiveIds,
  normalizeDeletedJobIds,
  normalizeDeletedDirectoryIds,
  readLocalStorageDataKey,
  fetchAndMergeDeferredBootstrap,
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
  bootstrapMergedShouldPersist,
  bootstrapMergedShouldPush,
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
import { cloudSyncMutationGuard } from "@/lib/cloud-sync-mutation-guard";
import {
  payrollTraceBumpRosterRevision,
  payrollTraceCreateBootstrapPushId,
  payrollTraceCreateSyncTraceId,
  payrollTraceEmit,
  rosterTraceSnapshot,
} from "@/lib/payroll-runtime-trace";

export function CloudLoader({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const coreKeys = [...BOOTSTRAP_CORE_KEYS];
    const fallback = setTimeout(() => setReady(true), 3000);
    const startDeferredPhase = () => {
      void fetchAndMergeDeferredBootstrap();
    };

    payrollTraceCreateSyncTraceId();
    payrollTraceEmit("sync.bootstrap.start", "HTTP_IN", "info", { trigger: "bootstrap" as const });

    fetchKeysFromCloud([
      ...coreKeys,
      JOBS_DELETED_IDS_KEY,
      DIRECTORY_DELETED_IDS_KEY,
      ARCHIVE_DELETED_IDS_KEY,
      ADMIN_PASSWORDS_KEY,
      ADMIN_USERS_CONFIG_KEY,
      APP_SETTINGS_KEY,
    ], { trigger: "bootstrap" })
      .then(async (allValues) => {
        payrollTraceEmit("sync.bootstrap.merge", "MERGE", "info", {});
        const values = allValues.slice(0, coreKeys.length);
        const cloudDeleted = normalizeDeletedJobIds(allValues[coreKeys.length]);
        const cloudDirDeleted = normalizeDeletedDirectoryIds(allValues[coreKeys.length + 1]);
        const cloudArchiveDeleted = normalizeDeletedJobIds(allValues[coreKeys.length + 2]);
        const cloudAdminPw = allValues[coreKeys.length + 3];
        const cloudAdminUsers = allValues[coreKeys.length + 4];
        const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
        saveDeletedJobIds(mergedDeleted);
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
        saveDeletedDirectoryIds(mergedDirDeleted);
        const mergedArchiveDeleted = mergeDeletedArchiveIds(getDeletedArchiveIds(), cloudArchiveDeleted);
        saveDeletedArchiveIds(mergedArchiveDeleted);
        const mergedContactsDeleted = getDeletedContactsIds();

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

        const cloudAppSettings = allValues[coreKeys.length + 5];
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

        const localValues = DATA_KEYS.map((key) => readLocalStorageDataKey(key));
        const cloudValues = DATA_KEYS.map((key) => {
          const idx = coreKeys.indexOf(key as (typeof BOOTSTRAP_CORE_KEYS)[number]);
          return idx >= 0 ? values[idx] : null;
        });

        let mergedBundle = mergeAllDataKeys(
          localValues,
          cloudValues,
          mergedDeleted,
          mergedDirDeleted,
          mergedContactsDeleted,
          mergedArchiveDeleted,
        );
        mergedBundle = applyBootstrapPayrollMerge(mergedBundle, localValues, cloudValues);

        coreKeys.forEach((key) => {
          const i = DATA_KEYS.indexOf(key);
          const cloudVal = cloudValues[i];
          const merged = mergedBundle[i];
          if (bootstrapMergedShouldPersist(key, merged)) {
            localStorage.setItem(key, JSON.stringify(merged));
            if (key === "kw-week-employees" && Array.isArray(merged)) {
              const wf = String(mergedBundle[DATA_KEYS.indexOf("kw-weekFrom")] ?? "");
              const wt = String(mergedBundle[DATA_KEYS.indexOf("kw-weekTo")] ?? "");
              payrollTraceBumpRosterRevision();
              payrollTraceEmit("sync.bootstrap.ls.persist", "LS", "info", {
                key,
                roster: rosterTraceSnapshot(merged, wf, wt, "MERGED", "PRESENT"),
              });
            }
          }
          const shouldPush = bootstrapMergedShouldPush(key, merged, cloudVal);
          if (
            (globalThis as { __wgdomPayrollPipelineDebug?: boolean }).__wgdomPayrollPipelineDebug &&
            key === "kw-week-employees"
          ) {
            console.warn("[wgdom payroll RC-B] bootstrap.bootstrapMergedShouldPush", {
              key,
              mergedCount: Array.isArray(merged) ? merged.length : 0,
              cloudCount: Array.isArray(cloudVal) ? cloudVal.length : 0,
              shouldPush,
            });
          }
          if (key === "kw-week-employees") {
            payrollTraceEmit("sync.bootstrap.push.decision", "MERGE", "info", {
              key,
              shouldPush,
              mergedCount: Array.isArray(merged) ? merged.length : 0,
              cloudCount: Array.isArray(cloudVal) ? cloudVal.length : 0,
            });
          }
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
          const replaceWeekEmployeesKeys = pushKeys.includes("kw-week-employees")
            ? (["kw-week-employees"] as const)
            : ([] as const);
          const empPushIdx = pushKeys.indexOf("kw-week-employees");
          if ((globalThis as { __wgdomPayrollPipelineDebug?: boolean }).__wgdomPayrollPipelineDebug) {
            console.warn("[wgdom payroll RC-B] bootstrap.pushKeysToCloud.before", {
              payloadCount:
                empPushIdx >= 0 && Array.isArray(pushValues[empPushIdx])
                  ? pushValues[empPushIdx].length
                  : null,
              replaceWeekEmployeesKeys: [...replaceWeekEmployeesKeys],
              forceReplaceWeekEmployees: replaceWeekEmployeesKeys.length > 0,
            });
          }
          const bootstrapPushId = pushKeys.includes("kw-week-employees")
            ? payrollTraceCreateBootstrapPushId()
            : undefined;
          if (empPushIdx >= 0 && bootstrapPushId) {
            const wf = String(mergedBundle[DATA_KEYS.indexOf("kw-weekFrom")] ?? "");
            const wt = String(mergedBundle[DATA_KEYS.indexOf("kw-weekTo")] ?? "");
            payrollTraceEmit("sync.bootstrap.kv_push", "HTTP_OUT", "info", {
              bootstrapPushId,
              replaceWeekEmployeesKeys: ["kw-week-employees"],
              weekEmpPayload: rosterTraceSnapshot(pushValues[empPushIdx], wf, wt, "MERGED", "PRESENT"),
              trigger: "bootstrap_push" as const,
            });
          }
          void pushKeysToCloud(
            [...pushKeys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY, CONTACTS_DELETED_IDS_KEY, ARCHIVE_DELETED_IDS_KEY],
            [...pushValues, mergedDeleted, mergedDirDeleted, mergedContactsDeleted, mergedArchiveDeleted],
            {
              replaceJobsKeys: pushKeys.includes("kw-jobs") ? ["kw-jobs"] : [],
              replaceDirectoryKeys: pushKeys.includes("kw-directory") ? ["kw-directory"] : [],
              replaceWeekEmployeesKeys: [...replaceWeekEmployeesKeys],
            },
          ).catch(() => {});
        }

        markCloudBootstrapSuccess();
        cloudSyncMutationGuard.reset();
        payrollTraceEmit("sync.bootstrap.ready", "APPLY", "info", {});
        startDeferredPhase();
      })
      .catch(() => {
        startDeferredPhase();
      })
      .finally(() => {
        clearTimeout(fallback);
        setReady(true);
      });
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
