/**
 * TEMP · JOBS-PHOTOS-LIVE-INSTRUMENTATION-03 — diagnostic release; usuń po domknięciu trace Ownera.
 * Aktywacja in-memory: window.__WG_ENABLE_JOBS_PHOTO_TRACE__ = true lub __WG_JOBS_PHOTOS_LIVE_TRACE__.enable()
 */

import type { Job } from "@/app/app-domain";

const MAX_EVENTS = 12_000;

export type JobsPhotosLiveTraceOrigin =
  | "render"
  | "sync"
  | "pull"
  | "storage"
  | "user"
  | "focus"
  | "visibility";

export type JobsPhotosLiveTraceEvent = {
  seq: number;
  ts: string;
  t: number;
  event: string;
  caller: string;
  origin: JobsPhotosLiveTraceOrigin;
  selectedJobId: string | null;
  selectedJobPhotosLength: number | null;
  selectedJobPhotoIds: string[];
  allJobsCount: number | null;
  stack: string;
  deltaPhotos: number | null;
  prevPhotosLength: number | null;
  extra?: Record<string, unknown>;
};

type SelectedJobSnap = {
  photosLength: number | null;
  photoIds: string[];
};

type JobsPhotosTraceGlobals = {
  __WG_ENABLE_JOBS_PHOTO_TRACE__?: boolean;
  __WG_JOBS_PHOTOS_LIVE_TRACE__?: {
    download: () => void;
    findFirstRegression: () => JobsPhotosLiveTraceEvent | null;
    clear: () => void;
    enable: () => void;
    disable: () => void;
  };
};

let memoryTraceEnabled = false;
let seq = 0;
let selectedJobId: string | null = null;
let lastSelectedSnap: SelectedJobSnap = { photosLength: null, photoIds: [] };
const events: JobsPhotosLiveTraceEvent[] = [];

function traceGlobals(): JobsPhotosTraceGlobals {
  return globalThis as JobsPhotosTraceGlobals;
}

function readWindowTraceFlag(): boolean {
  return traceGlobals().__WG_ENABLE_JOBS_PHOTO_TRACE__ === true;
}

function syncWindowTraceFlag(enabled: boolean): void {
  traceGlobals().__WG_ENABLE_JOBS_PHOTO_TRACE__ = enabled;
}

export function setJobsPhotosLiveTraceEnabled(enabled: boolean): void {
  memoryTraceEnabled = enabled;
  syncWindowTraceFlag(enabled);
  if (enabled) {
    console.info(
      "[jobs-photos-live-trace] ACTIVE · export: __WG_JOBS_PHOTOS_LIVE_TRACE__.download()",
    );
  }
}

export function isJobsPhotosLiveTraceEnabled(): boolean {
  return memoryTraceEnabled || readWindowTraceFlag();
}

export function registerJobsPhotosSelectedJobId(id: string | null): void {
  selectedJobId = id;
}

function snapJob(jobs: Job[] | null | undefined, jobId: string | null): SelectedJobSnap {
  if (!jobId || !Array.isArray(jobs)) return { photosLength: null, photoIds: [] };
  const job = jobs.find((j) => j?.id === jobId);
  const photos = job?.photos || [];
  return {
    photosLength: photos.length,
    photoIds: photos.map((p) => p.id),
  };
}

function captureStack(): string {
  return new Error("jobs-photos-live-trace").stack ?? "";
}

export function logJobsPhotosLiveTrace(input: {
  event: string;
  caller: string;
  origin: JobsPhotosLiveTraceOrigin;
  jobs?: Job[] | null;
  prevJobs?: Job[] | null;
  extra?: Record<string, unknown>;
}): void {
  if (!isJobsPhotosLiveTraceEnabled()) return;

  const snap = snapJob(input.jobs ?? null, selectedJobId);
  const prevSnap = input.prevJobs != null ? snapJob(input.prevJobs, selectedJobId) : lastSelectedSnap;
  const deltaPhotos =
    snap.photosLength != null && prevSnap.photosLength != null
      ? snap.photosLength - prevSnap.photosLength
      : null;

  const row: JobsPhotosLiveTraceEvent = {
    seq: ++seq,
    ts: new Date().toISOString(),
    t: Date.now(),
    event: input.event,
    caller: input.caller,
    origin: input.origin,
    selectedJobId,
    selectedJobPhotosLength: snap.photosLength,
    selectedJobPhotoIds: snap.photoIds,
    allJobsCount: Array.isArray(input.jobs) ? input.jobs.length : null,
    stack: captureStack(),
    deltaPhotos,
    prevPhotosLength: prevSnap.photosLength,
    extra: input.extra,
  };

  events.push(row);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  if (input.jobs != null) {
    lastSelectedSnap = snap;
  }

  const drop =
    prevSnap.photosLength != null &&
    prevSnap.photosLength > 0 &&
    snap.photosLength === 0;
  const resurrect =
    prevSnap.photoIds.length > 0 &&
    snap.photoIds.some((id) => !prevSnap.photoIds.includes(id)) &&
    snap.photosLength != null &&
    prevSnap.photosLength != null &&
    snap.photosLength > prevSnap.photosLength;

  if (drop || resurrect) {
    console.warn("[jobs-photos-live-trace] REGRESSION SIGNAL", {
      event: input.event,
      caller: input.caller,
      drop,
      resurrect,
      prevPhotosLength: prevSnap.photosLength,
      photosLength: snap.photosLength,
      seq: row.seq,
    });
  }
}

export function jobsPhotosLiveTraceDump(): JobsPhotosLiveTraceEvent[] {
  return [...events];
}

export function jobsPhotosLiveTraceFindFirstRegression(): JobsPhotosLiveTraceEvent | null {
  let prev: SelectedJobSnap = { photosLength: null, photoIds: [] };
  for (const ev of events) {
    const snap: SelectedJobSnap = {
      photosLength: ev.selectedJobPhotosLength,
      photoIds: ev.selectedJobPhotoIds,
    };
    const drop =
      prev.photosLength != null && prev.photosLength > 0 && snap.photosLength === 0;
    const resurrect =
      prev.photoIds.length > 0 &&
      snap.photoIds.some((id) => !prev.photoIds.includes(id)) &&
      snap.photosLength != null &&
      prev.photosLength != null &&
      snap.photosLength > prev.photosLength;
    if (drop || resurrect) return ev;
    if (snap.photosLength != null) prev = snap;
  }
  return null;
}

export function jobsPhotosLiveTraceExportJson(): string {
  return JSON.stringify(
    {
      program: "JOBS-PHOTOS-LIVE-INSTRUMENTATION-03",
      exportedAt: new Date().toISOString(),
      selectedJobId,
      eventCount: events.length,
      firstRegression: jobsPhotosLiveTraceFindFirstRegression(),
      events,
    },
    null,
    2,
  );
}

export function jobsPhotosLiveTraceDownload(): void {
  const json = jobsPhotosLiveTraceExportJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobs-photos-live-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function installJobsPhotosLiveTraceGlobals(): void {
  if (readWindowTraceFlag()) {
    memoryTraceEnabled = true;
  }

  traceGlobals().__WG_JOBS_PHOTOS_LIVE_TRACE__ = {
    download: jobsPhotosLiveTraceDownload,
    findFirstRegression: jobsPhotosLiveTraceFindFirstRegression,
    clear: () => {
      events.length = 0;
      seq = 0;
      lastSelectedSnap = { photosLength: null, photoIds: [] };
    },
    enable: () => setJobsPhotosLiveTraceEnabled(true),
    disable: () => setJobsPhotosLiveTraceEnabled(false),
  };

  if (isJobsPhotosLiveTraceEnabled()) {
    console.info(
      "[jobs-photos-live-trace] ACTIVE · export: __WG_JOBS_PHOTOS_LIVE_TRACE__.download()",
    );
  }
}
