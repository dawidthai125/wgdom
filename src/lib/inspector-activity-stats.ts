import { isInspectorActivityType, type JobActivity } from "@/lib/job-activity";
import type { JobWmJob } from "@/lib/job-wm";

export type InspectorActivityJob = JobWmJob & {
  startDate: string;
  activityLog?: JobActivity[];
};

export interface InspectorActivityEvent {
  at: string;
  text: string;
  type: string;
  jobId: string;
  jobAddress: string;
  flatNumber: string;
}

export interface InspectorActivityStats {
  jobsTouched: number;
  documentsMarked: number;
  filesUploaded: number;
  photosUploaded: number;
  notesSent: number;
  stageUpdates: number;
  events: InspectorActivityEvent[];
}

function actorMatches(evActor: string, displayName: string): boolean {
  return evActor.trim().toLowerCase() === displayName.trim().toLowerCase();
}

function jobLabel(job: InspectorActivityJob): string {
  return `${job.address || "Bez adresu"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
}

export function collectInspectorEvents(
  jobs: InspectorActivityJob[],
  displayName: string,
  from: Date,
  to: Date,
): InspectorActivityEvent[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const out: InspectorActivityEvent[] = [];

  for (const job of jobs) {
    for (const ev of job.activityLog || []) {
      if (!isInspectorActivityType(ev.type)) continue;
      if (!actorMatches(ev.actor, displayName)) continue;
      const t = Date.parse(ev.at);
      if (Number.isNaN(t) || t < fromMs || t > toMs) continue;
      out.push({
        at: ev.at,
        text: ev.text,
        type: ev.type,
        jobId: job.id,
        jobAddress: jobLabel(job),
        flatNumber: job.flatNumber || "",
      });
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function summarizeInspectorEvents(events: InspectorActivityEvent[]): InspectorActivityStats {
  const jobIds = new Set<string>();
  let documentsMarked = 0;
  let filesUploaded = 0;
  let photosUploaded = 0;
  let notesSent = 0;
  let stageUpdates = 0;

  for (const ev of events) {
    jobIds.add(ev.jobId);
    switch (ev.type) {
      case "inspector_document":
        documentsMarked++;
        break;
      case "inspector_file":
        filesUploaded++;
        break;
      case "inspector_photo":
        photosUploaded++;
        break;
      case "inspector_note":
        notesSent++;
        break;
      case "inspector_stage":
        stageUpdates++;
        break;
      default:
        break;
    }
  }

  return {
    jobsTouched: jobIds.size,
    documentsMarked,
    filesUploaded,
    photosUploaded,
    notesSent,
    stageUpdates,
    events,
  };
}

export function startOfWeekMonday(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(y: number, m: number): Date {
  return new Date(y, m, 1, 0, 0, 0, 0);
}

export function endOfMonth(y: number, m: number): Date {
  return new Date(y, m + 1, 0, 23, 59, 59, 999);
}

export function startOfYear(y: number): Date {
  return new Date(y, 0, 1, 0, 0, 0, 0);
}

export function endOfYear(y: number): Date {
  return new Date(y, 11, 31, 23, 59, 59, 999);
}

export function inspectorGreeting(displayName: string, now = new Date()): string {
  const first = displayName.trim().split(/\s+/)[0] || displayName;
  const h = now.getHours();
  if (h < 18) return `Dzień dobry, ${first}`;
  return `Dobry wieczór, ${first}`;
}

export const MONTH_NAMES_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export function statsForWeek(jobs: InspectorActivityJob[], displayName: string, now = new Date()) {
  const from = startOfWeekMonday(now);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const events = collectInspectorEvents(jobs, displayName, from, to);
  return summarizeInspectorEvents(events);
}

export function statsForMonth(jobs: InspectorActivityJob[], displayName: string, year: number, month: number) {
  const events = collectInspectorEvents(jobs, displayName, startOfMonth(year, month), endOfMonth(year, month));
  return summarizeInspectorEvents(events);
}

export function statsForYear(jobs: InspectorActivityJob[], displayName: string, year: number) {
  const events = collectInspectorEvents(jobs, displayName, startOfYear(year), endOfYear(year));
  return summarizeInspectorEvents(events);
}

export function monthlyBreakdownForYear(
  jobs: InspectorActivityJob[],
  displayName: string,
  year: number,
): { month: number; label: string; stats: InspectorActivityStats }[] {
  return MONTH_NAMES_PL.map((label, month) => ({
    month,
    label,
    stats: statsForMonth(jobs, displayName, year, month),
  }));
}
