import { useState, useEffect, useRef, type ReactNode } from "react";
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
  persistBootstrapMergedKey,
  evaluatePayrollResurrectionFenceForBundle,
  safeSetLocalStorageJson,
  safeSetLocalStorageRaw,
  safeRemoveLocalStorageKey,
} from "@/lib/cloud-sync";
import { getPayrollWeekRange } from "@/lib/payroll-cycle";
import {
  loadAdminPasswordOverrides,
  mergeAdminPasswordOverrides,
  shouldPushAdminPasswordOverridesOnBootstrap,
  loadAdminUsersConfig,
  mergeAdminUsersConfig,
} from "@/lib/admin-auth";
import { loadAppSettingsLocal, mergeAppSettings, type AppSettings } from "@/lib/app-settings";
import {
  markCloudBootstrapSuccess,
  publishBootstrapPayrollHandoff,
  signalBootstrapPayrollLateRehydrate,
} from "@/lib/cloud-bootstrap";
import {
  markCloudFreshnessAfterBootstrapFailure,
  markCloudFreshnessAfterBootstrapSuccess,
} from "@/lib/cloud-freshness-gate";
import { cloudSyncMutationGuard, enqueueKwWeekEmployeesWrite } from "@/lib/cloud-sync-mutation-guard";
import {
  payrollTraceBumpRosterRevision,
  payrollTraceCreateBootstrapPushId,
  payrollTraceCreateSyncTraceId,
  payrollTraceEmit,
  rosterTraceSnapshot,
} from "@/lib/payroll-runtime-trace";
import { pwrReconcile } from "@/lib/payroll-week-roster-bundle";
import { logPayrollBootstrapTraceFromWeekKeys } from "@/lib/payroll-bootstrap-runtime-trace";
import {
  PAYROLL_WEEK_META_KEY,
  buildPayrollWeekMetaPlaceholder,
  getExpectedPayrollRevision,
  normalizePayrollWeekMeta,
  writePayrollWeekMetaToLs,
} from "@/lib/payroll-week-meta";
import { APP_VERSION } from "@/lib/app-version";
import {
  BOOTSTRAP_OFFLINE_TIMEOUT_MS,
  isCloudBootstrapReady,
  resolveBootstrapPhaseOpen,
  type BootstrapPhase,
} from "@/lib/cloud-loader-bootstrap-gate";

const PAYROLL_BOOTSTRAP_PERSIST_KEYS = [
  "kw-weekFrom",
  "kw-weekTo",
  "kw-week-employees",
] as const satisfies ReadonlyArray<(typeof BOOTSTRAP_CORE_KEYS)[number]>;

export function CloudLoader({ children }: { children: ReactNode }) {
  const [bootstrapPhase, setBootstrapPhase] = useState<BootstrapPhase>("PENDING");
  const fetchSettledRef = useRef(false);
  const bootstrapPhaseRef = useRef<BootstrapPhase>("PENDING");

  useEffect(() => {
    const coreKeys = [...BOOTSTRAP_CORE_KEYS];
    fetchSettledRef.current = false;
    let cancelled = false;

    const openBootstrapPhase = (next: Exclude<BootstrapPhase, "PENDING">) => {
      setBootstrapPhase((prev) => {
        const resolved = resolveBootstrapPhaseOpen(prev, next);
        bootstrapPhaseRef.current = resolved;
        if (resolved !== prev) {
          logPayrollBootstrapTraceFromWeekKeys({
            caller: "CloudLoader",
            reason: `bootstrap_phase_${resolved.toLowerCase()}`,
          });
          if (resolved === "TIMEOUT") {
            markCloudFreshnessAfterBootstrapFailure("bootstrap_timeout");
          } else if (resolved === "FAILED") {
            markCloudFreshnessAfterBootstrapFailure("bootstrap_failed");
          }
        }
        return resolved;
      });
    };

    const offlineTimeoutId = setTimeout(() => {
      if (cancelled || fetchSettledRef.current) return;
      openBootstrapPhase("TIMEOUT");
    }, BOOTSTRAP_OFFLINE_TIMEOUT_MS);

    const startDeferredPhase = () => {
      void fetchAndMergeDeferredBootstrap();
    };

    payrollTraceCreateSyncTraceId();
    payrollTraceEmit("sync.bootstrap.start", "HTTP_IN", "info", { trigger: "bootstrap" as const });
    logPayrollBootstrapTraceFromWeekKeys({
      caller: "CloudLoader",
      reason: "bootstrap_start",
    });

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
        if (cancelled) return;
        payrollTraceEmit("sync.bootstrap.merge", "MERGE", "info", {});
        const values = allValues.slice(0, coreKeys.length);
        const cloudDeleted = normalizeDeletedJobIds(allValues[coreKeys.length]);
        const cloudDirDeleted = normalizeDeletedDirectoryIds(allValues[coreKeys.length + 1]);
        const cloudArchiveDeleted = normalizeDeletedJobIds(allValues[coreKeys.length + 2]);
        const cloudAdminPw = allValues[coreKeys.length + 3];
        const cloudAdminUsers = allValues[coreKeys.length + 4];
        const cloudAppSettings = allValues[coreKeys.length + 5];
        const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
        saveDeletedJobIds(mergedDeleted);
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
        saveDeletedDirectoryIds(mergedDirDeleted);
        const mergedArchiveDeleted = mergeDeletedArchiveIds(getDeletedArchiveIds(), cloudArchiveDeleted);
        saveDeletedArchiveIds(mergedArchiveDeleted);
        const mergedContactsDeleted = getDeletedContactsIds();

        const localAdminPw = loadAdminPasswordOverrides();
        const mergedAdminPw = mergeAdminPasswordOverrides(localAdminPw, cloudAdminPw);
        const localAdminUsers = loadAdminUsersConfig();
        const mergedAdminUsers = mergeAdminUsersConfig(localAdminUsers, cloudAdminUsers);

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

        const calendar = getPayrollWeekRange();
        const resurrectionFence = evaluatePayrollResurrectionFenceForBundle(
          localValues,
          cloudValues,
          calendar.from,
          calendar.to,
        );

        const wfIdx = DATA_KEYS.indexOf("kw-weekFrom");
        const wtIdx = DATA_KEYS.indexOf("kw-weekTo");
        const empIdxBootstrap = DATA_KEYS.indexOf("kw-week-employees");
        const wfBoot = String(mergedBundle[wfIdx] ?? "");
        const wtBoot = String(mergedBundle[wtIdx] ?? "");
        const empsBoot = mergedBundle[empIdxBootstrap];
        if (wfBoot && wtBoot && Array.isArray(empsBoot)) {
          pwrReconcile({ weekFrom: wfBoot, weekTo: wtBoot, roster: empsBoot as never[] });
        }

        // Fetch+merge OK → handoff przed persist LS (QuotaExceeded nie blokuje App z rosterem)
        const payrollHandoff =
          Array.isArray(empsBoot) && empsBoot.length > 0
            ? {
                weekEmployees: empsBoot as unknown[],
                weekFrom: wfBoot,
                weekTo: wtBoot,
              }
            : null;
        if (payrollHandoff) {
          publishBootstrapPayrollHandoff(payrollHandoff);
        }

        try {
          const [metaRaw] = await fetchKeysFromCloud([PAYROLL_WEEK_META_KEY]);
          writePayrollWeekMetaToLs(normalizePayrollWeekMeta(metaRaw, wfBoot, wtBoot));
        } catch { /* offline — revision 0 until first CAS push */ }

        const persistCoreKey = (key: (typeof BOOTSTRAP_CORE_KEYS)[number]) => {
          const i = DATA_KEYS.indexOf(key);
          const cloudVal = cloudValues[i];
          const merged = mergedBundle[i];
          const shouldPersist = bootstrapMergedShouldPersist(
            key,
            merged,
            resurrectionFence.preferCloudEmptyRoster,
          );
          if (key === "kw-week-employees") {
            const empCount = Array.isArray(merged) ? merged.length : 0;
            logPayrollBootstrapTraceFromWeekKeys({
              caller: "CloudLoader",
              reason: shouldPersist ? "bootstrap_persist_roster" : "bootstrap_persist_skipped_empty",
              targetFrom: mergedBundle[wfIdx],
              targetTo: mergedBundle[wtIdx],
              cloudFrom: cloudValues[wfIdx],
              cloudTo: cloudValues[wtIdx],
              localFrom: localValues[wfIdx],
              localTo: localValues[wtIdx],
              employeeCount: empCount,
              employeeCountBefore: Array.isArray(localValues[i]) ? localValues[i].length : 0,
              persistKwWeekEmployees: shouldPersist,
              persistSkipped: !shouldPersist,
              bootstrapPersistEmpty: !shouldPersist && empCount === 0,
              bootstrapPersist14: shouldPersist && empCount === 14,
            });
          }
          const persistResult = persistBootstrapMergedKey(key, merged);
          if (shouldPersist && key === "kw-week-employees" && Array.isArray(merged)) {
            if (persistResult.ok) {
              logPayrollBootstrapTraceFromWeekKeys({
                caller: "localStorage.setItem",
                reason: "bootstrap_ls_write_week_employees",
                targetFrom: wfBoot,
                targetTo: wtBoot,
                employeeCount: merged.length,
                persistKwWeekEmployees: true,
                bootstrapPersist14: merged.length === 14,
                bootstrapPersistEmpty: merged.length === 0,
              });
              payrollTraceBumpRosterRevision();
              payrollTraceEmit("sync.bootstrap.ls.persist", "LS", "info", {
                key,
                roster: rosterTraceSnapshot(merged, wfBoot, wtBoot, "MERGED", "PRESENT"),
              });
            } else if (persistResult.storageFailure) {
              logPayrollBootstrapTraceFromWeekKeys({
                caller: "CloudLoader",
                reason: "bootstrap_ls_storage_failure_week_employees",
                targetFrom: wfBoot,
                targetTo: wtBoot,
                employeeCount: merged.length,
                persistKwWeekEmployees: false,
                persistSkipped: true,
              });
            }
          }
          const shouldPush = bootstrapMergedShouldPush(key, merged, cloudVal, resurrectionFence);
          if (key === "kw-week-employees") {
            payrollTraceEmit("sync.bootstrap.push.decision", "MERGE", "info", {
              key,
              shouldPush,
              mergedCount: Array.isArray(merged) ? merged.length : 0,
              cloudCount: Array.isArray(cloudVal) ? cloudVal.length : 0,
              resurrectionFence: resurrectionFence.reason,
            });
          }
          if (shouldPush) {
            pushKeys.push(key);
            pushValues.push(merged);
          }
        };

        // Payroll LS first — quota ma chronić roster przed jobs/directory
        for (const key of PAYROLL_BOOTSTRAP_PERSIST_KEYS) {
          persistCoreKey(key);
        }
        // TIMEOUT already opened App with stale LS — same-window setItem ≠ storage event.
        // Signal App to rehydrate React from merged roster (no settledUpdatedAt bump).
        if (payrollHandoff && bootstrapPhaseRef.current === "TIMEOUT") {
          signalBootstrapPayrollLateRehydrate(payrollHandoff);
          logPayrollBootstrapTraceFromWeekKeys({
            caller: "CloudLoader",
            reason: "bootstrap_timeout_late_rehydrate",
            targetFrom: wfBoot,
            targetTo: wtBoot,
            employeeCount: payrollHandoff.weekEmployees.length,
          });
        }
        for (const key of coreKeys) {
          if ((PAYROLL_BOOTSTRAP_PERSIST_KEYS as readonly string[]).includes(key)) continue;
          persistCoreKey(key);
        }

        // Admin meta AFTER payroll — nie zużywaj quota przed rosterem
        if (Object.keys(mergedAdminPw).length > 0) {
          safeSetLocalStorageJson(ADMIN_PASSWORDS_KEY, mergedAdminPw);
        } else {
          safeRemoveLocalStorageKey(ADMIN_PASSWORDS_KEY);
        }
        safeSetLocalStorageJson(ADMIN_USERS_CONFIG_KEY, mergedAdminUsers);
        if (cloudAppSettings && typeof cloudAppSettings === "object") {
          const localSettings = loadAppSettingsLocal();
          const cloudS = cloudAppSettings as AppSettings;
          const mergedSettings: AppSettings = mergeAppSettings(cloudS, localSettings);
          safeSetLocalStorageJson(APP_SETTINGS_KEY, mergedSettings);
        }

        if (localStorage.getItem(WORKER_PINS_RESET_FLAG) !== "1") {
          try {
            const raw = localStorage.getItem("kw-directory");
            const parsed = raw ? JSON.parse(raw) : [];
            const arr = Array.isArray(parsed) ? parsed : [];
            const { directory: stripped } = stripWorkerPinHashesFromDirectory(arr);
            safeSetLocalStorageJson("kw-directory", stripped);
            if (isSupabaseConfigured()) {
              await pushKeysToCloud(
                ["kw-directory", DIRECTORY_DELETED_IDS_KEY],
                [stripped, mergedDirDeleted],
                { replaceDirectoryKeys: ["kw-directory"] },
              );
            }
            safeSetLocalStorageRaw(WORKER_PINS_RESET_FLAG, "1");
          } catch {
            /* ponowi przy następnym wejściu */
          }
        }

        if (pushKeys.length > 0) {
          const empPushIdx = pushKeys.indexOf("kw-week-employees");
          const payrollCasPush = empPushIdx >= 0;
          if (payrollCasPush && !pushKeys.includes(PAYROLL_WEEK_META_KEY)) {
            pushKeys.push(PAYROLL_WEEK_META_KEY);
            pushValues.push(buildPayrollWeekMetaPlaceholder(wfBoot, wtBoot));
          }
          const bootstrapPushId = payrollCasPush
            ? payrollTraceCreateBootstrapPushId()
            : undefined;
          const keysOut = [
            ...pushKeys,
            JOBS_DELETED_IDS_KEY,
            DIRECTORY_DELETED_IDS_KEY,
            CONTACTS_DELETED_IDS_KEY,
            ARCHIVE_DELETED_IDS_KEY,
          ];
          const valuesOut = [
            ...pushValues,
            mergedDeleted,
            mergedDirDeleted,
            mergedContactsDeleted,
            mergedArchiveDeleted,
          ];
          const pushOptsBase = {
            replaceJobsKeys: pushKeys.includes("kw-jobs") ? ["kw-jobs"] : [],
            replaceDirectoryKeys: pushKeys.includes("kw-directory") ? ["kw-directory"] : [],
            replaceWeekEmployeesKeys: [] as string[],
            clientAppVersion: APP_VERSION,
            skipCloudFreshnessGate: true,
          };
          if (payrollCasPush) {
            // GO9.2 — serialize bootstrap payroll CAS on the same FIFO as domain writers;
            // read expectedRevision fresh inside the slot (not before enqueue).
            void enqueueKwWeekEmployeesWrite(async () => {
              const expectedRevision = getExpectedPayrollRevision();
              if (empPushIdx >= 0 && bootstrapPushId) {
                payrollTraceEmit("sync.bootstrap.kv_push", "HTTP_OUT", "info", {
                  bootstrapPushId,
                  payrollWeekCas: true,
                  expectedRevision,
                  weekEmpPayload: rosterTraceSnapshot(
                    pushValues[empPushIdx],
                    wfBoot,
                    wtBoot,
                    "MERGED",
                    "PRESENT",
                  ),
                  trigger: "bootstrap_push" as const,
                });
              }
              await pushKeysToCloud(keysOut, valuesOut, {
                ...pushOptsBase,
                payrollWeekCas: true,
                expectedRevision,
              });
            }).catch(() => {});
          } else {
            void pushKeysToCloud(keysOut, valuesOut, {
              ...pushOptsBase,
              payrollWeekCas: false,
            }).catch(() => {});
          }
        }

        markCloudBootstrapSuccess();
        markCloudFreshnessAfterBootstrapSuccess();
        // GO9.2 — reset clears suppress/tokens only; idle write-chain may reset, in-flight preserved
        cloudSyncMutationGuard.reset();
        payrollTraceEmit("sync.bootstrap.ready", "APPLY", "info", {});
        let lsEmpCount = 0;
        try {
          const raw = localStorage.getItem("kw-week-employees");
          lsEmpCount = raw ? (JSON.parse(raw) as unknown[]).length : 0;
        } catch { /* ignore */ }
        logPayrollBootstrapTraceFromWeekKeys({
          caller: "CloudLoader",
          reason: "bootstrap_ready",
          targetFrom: mergedBundle[wfIdx],
          targetTo: mergedBundle[wtIdx],
          employeeCount: lsEmpCount,
          employeeCountAfter: Array.isArray(mergedBundle[empIdxBootstrap])
            ? (mergedBundle[empIdxBootstrap] as unknown[]).length
            : 0,
        });
        startDeferredPhase();
        // SUCCESS = fetch + merge zakończone — niezależnie od storageFailure LS
        openBootstrapPhase("SUCCESS");
      })
      .catch(() => {
        if (cancelled) return;
        startDeferredPhase();
        openBootstrapPhase("FAILED");
      })
      .finally(() => {
        fetchSettledRef.current = true;
        clearTimeout(offlineTimeoutId);
      });

    return () => {
      cancelled = true;
      clearTimeout(offlineTimeoutId);
    };
  }, []);

  const ready = isCloudBootstrapReady(bootstrapPhase);

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
