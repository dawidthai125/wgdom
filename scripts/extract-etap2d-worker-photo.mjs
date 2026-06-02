/**
 * ETAP 2D — extract WorkerPhotoView from App.tsx → WorkerPhotoView.tsx
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = join(root, "src/app/App.tsx");
const outPath = join(root, "src/app/WorkerPhotoView.tsx");

const app = readFileSync(appPath, "utf8");
const lines = app.split("\n");

const startIdx = lines.findIndex((l) => l.includes("function WorkerPhotoView("));
const endIdx = lines.findIndex((l, i) => i > startIdx && l === "}");
// WorkerPhotoView ends with closing brace of function — find export line after it
let funcEnd = startIdx;
let depth = 0;
for (let i = startIdx; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
  }
  if (i > startIdx && depth === 0) {
    funcEnd = i;
    break;
  }
}

const body = lines.slice(startIdx, funcEnd + 1);
// change function to export function
body[0] = body[0].replace(/^function WorkerPhotoView/, "export function WorkerPhotoView");

const header = `import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { useWorkerPrivacyShield } from "@/app/hooks/useWorkerPrivacyShield";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { appendJobActivity } from "@/lib/job-activity";
import {
  Camera, Eye, ImagePlus, Lock, LogOut, MapPin, CalendarDays, Wallet,
  HelpCircle, ChevronUp, ChevronDown, CloudOff, ArrowLeft, Search, Receipt,
  Archive, Edit2, Trash2, CheckCircle2, ClipboardList,
} from "lucide-react";
import {
  fetchKeysFromCloud,
  normalizeJobsValue,
  mergeJobsById,
  mergeWeekEmployees,
  mergeArchive,
  pushKeysToCloudSafe,
  getDeletedJobIds,
  mergeDeletedJobIds,
  saveDeletedJobIds,
  normalizeDeletedJobIds,
  JOBS_DELETED_IDS_KEY,
  isDataKey,
} from "@/lib/cloud-sync";
import { saveLocalJobsSnapshot } from "@/lib/jobs-safety";
import type {
  WeekEmployee,
  WeekSnapshot,
  PhotoEntry,
  WorkerJobReport,
  Job,
  EmployeeExtraCost,
} from "@/app/app-domain";
import {
  fmt,
  fmtH,
  fmtDate,
  getWeekRange,
  calcWeekEmployee,
  extraCostStatus,
  PHOTO_STATUS_LABELS,
  EXTRA_COST_STATUS_LABELS,
  workerTodayWorkInfo,
  normalizeJobsList,
  jobWorkerReports,
  normalizeWorkerReport,
  fridayIsoOfWeek,
  findWeekEmployeeForWorker,
  workerPayoutHistory,
  weekDayColumns,
  scheduleCellFor,
  todayIsoDate,
  applyWriteTimestamps,
  uploadPhoto,
  prepareWatermarkedPhoto,
  uploadReceipt,
} from "@/app/app-domain";
import { JobReportForm } from "@/app/JobReportForm";
import { getReportWorkScopeText, reportHasWorkScope } from "@/lib/work-scope-text";
import { syncJobDocuments, clearReportDocSaOverrideFromReport } from "@/lib/job-documents";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto, queuedPhotoCount } from "@/lib/photo-queue";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import { PullToRefreshIndicator, usePullToRefresh } from "@/app/usePullToRefresh";
import { onNativeAppResume, registerNativeBackHandler } from "@/lib/native-app-bridge";

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T | ((p: T) => T)) => {
    setState((prev) => {
      const incoming = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      if (Object.is(prev, incoming)) return prev;
      if (!isDataKey(key)) {
        try { localStorage.setItem(key, JSON.stringify(incoming)); } catch { /* ignore */ }
        return incoming;
      }
      const next = applyWriteTimestamps(key, prev, incoming) as T;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try { setState(JSON.parse(e.newValue) as T); } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  return [state, set];
}

`;

const out = header + body.join("\n") + "\n";
writeFileSync(outPath, out, "utf8");

// Remove from App.tsx: comment block + function
const newLines = [
  ...lines.slice(0, startIdx - 2), // remove comment line + blank before function
  "",
  'export { WorkerPhotoView } from "@/app/WorkerPhotoView";',
  ...lines.slice(funcEnd + 1),
];

// Fix export line - replace old WorkerPhotoView export
const fixed = newLines
  .join("\n")
  .replace(
    /export \{ LoginScreen \} from "@\/app\/LoginScreen";\nexport \{ AppInner, WorkerPhotoView \};/,
    'export { LoginScreen } from "@/app/LoginScreen";\nexport { WorkerPhotoView } from "@/app/WorkerPhotoView";\nexport { AppInner };',
  );

writeFileSync(appPath, fixed, "utf8");

console.log(`Extracted WorkerPhotoView: lines ${startIdx + 1}-${funcEnd + 1}`);
console.log(`Removed ${funcEnd - startIdx + 3} lines from App.tsx (incl. comment)`);
console.log(`Wrote ${out.split("\n").length} lines to WorkerPhotoView.tsx`);
