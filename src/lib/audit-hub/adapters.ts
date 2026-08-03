/** Audit Hub MVP-0 — adaptery istniejących źródeł logów → AuditFeedItem. */

import { ACTIVITY_LABELS } from "@/app/app-domain";
import type { JobActivityType } from "@/lib/job-activity";
import { isInspectorActivityType } from "@/lib/job-activity";
import type { DeliveryPackagePublication, DeliveryPackagePublicationStatus } from "@/lib/delivery-package-publications/types";
import { resolveInspectorActivitySection } from "@/lib/inspector-feed-deeplink";
import type { InspectorStatsEvent } from "@/lib/inspector-stats";
import { OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL } from "@/lib/operational-notes-audit-filters";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import {
  SECURITY_AUDIT_ACTION_LABEL_PL,
  type SecurityAuditEntry,
} from "@/lib/security-audit-log";
import {
  normalizeWmPrintHistory,
  wmPrintHistoryOutputTypeLabel,
} from "@/lib/wm-print/history";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import type { WmPrintTab } from "@/lib/wm-print/wm-print-tabs";
import {
  WM_DRUK_AUDIT_ACTION_LABEL_PL,
  type WmDrukAuditEntry,
  type WmDrukAuditModule,
} from "@/lib/wm-druk-audit";
import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import {
  auditFeedItemId,
  type AuditFeedDeepLink,
  type AuditFeedItem,
  type AuditFeedSource,
  type AuditHubInput,
  type AuditHubJob,
} from "@/lib/audit-hub/types";

const DELIVERY_STATUS_LABEL_PL: Record<DeliveryPackagePublicationStatus, string> = {
  ACTIVE: "Publikacja",
  SUPERSEDED: "Zastąpiony",
  REVOKED: "Cofnięty",
};

const INSPECTOR_EVENT_LABEL_PL: Record<InspectorStatsEvent["type"], string> = {
  login: "Logowanie",
  visit: "Wejście",
};

/** P0 — legacy KV / LS może nie mieć pól wymaganych przez typ TS. */
function feedAt(raw: string | undefined | null): string {
  return raw != null ? String(raw) : "";
}

function feedActor(raw: string | undefined | null, fallback = "Administrator"): string {
  const trimmed = (raw ?? "").trim();
  return trimmed || fallback;
}

function jobLabel(job: Pick<AuditHubJob, "address" | "flatNumber" | "client">): string {
  const addr = job.address?.trim() || "Bez adresu";
  const flat = job.flatNumber?.trim();
  return flat ? `${addr} m.${flat}` : addr;
}

function resolveJobActivitySection(type: JobActivityType): JobDetailSection {
  if (isInspectorActivityType(type)) {
    return resolveInspectorActivitySection(type);
  }
  switch (type) {
    case "photo_upload":
    case "photo_approved":
    case "photo_rejected":
      return "photos";
    case "report_add":
    case "report_edit":
    case "report_delete":
      return "reports";
    case "document":
      return "documents";
    case "work_entry":
      return "workers";
    default:
      return "summary";
  }
}

function jobActivityDeepLink(jobId: string, type: JobActivityType): AuditFeedDeepLink {
  return { kind: "job", jobId, section: resolveJobActivitySection(type) };
}

export function adaptOperationalNotesAudit(
  entries: OperationalNoteAuditEntry[],
): AuditFeedItem[] {
  const source: AuditFeedSource = "operational_notes";
  return entries.map((entry) => {
    const title = entry.noteTitleSnapshot?.trim();
    const summary = title
      ? `${OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL[entry.action]} · ${title}`
      : OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL[entry.action];
    const actor = feedActor(entry.displayName, entry.userId || "Administrator");
    return {
      id: auditFeedItemId(source, entry.id),
      at: feedAt(entry.at),
      source,
      action: entry.action,
      actionLabel: OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL[entry.action],
      actor,
      actorUserId: entry.userId,
      summary,
      detail: entry.detail,
      noteId: entry.noteId,
      nativeId: entry.id,
      deepLink: entry.noteId
        ? { kind: "operational_note", noteId: entry.noteId, openAudit: true }
        : { kind: "none" },
    };
  });
}

export function adaptInspectorLoginEvents(events: InspectorStatsEvent[]): AuditFeedItem[] {
  const source: AuditFeedSource = "inspector_login";
  return events.map((event) => {
    const actor = feedActor(event.displayName, "Inspektor");
    const actionLabel = INSPECTOR_EVENT_LABEL_PL[event.type] ?? String(event.type ?? "event");
    return {
      id: auditFeedItemId(source, event.id),
      at: feedAt(event.at),
      source,
      action: event.type,
      actionLabel,
      actor,
      actorUserId: event.userId,
      summary: `${actionLabel} — ${actor}`,
      nativeId: event.id,
      deepLink: { kind: "inspector_view" },
    };
  });
}

export function adaptJobActivityLog(jobs: AuditHubJob[]): AuditFeedItem[] {
  const source: AuditFeedSource = "job_activity";
  const out: AuditFeedItem[] = [];
  for (const job of jobs) {
    const label = jobLabel(job);
    for (const ev of job.activityLog ?? []) {
      const nativeId = `${job.id}:${ev.id}`;
      const actionLabel = ACTIVITY_LABELS[ev.type] ?? ev.type;
      out.push({
        id: auditFeedItemId(source, nativeId),
        at: feedAt(ev.at),
        source,
        action: ev.type,
        actionLabel,
        actor: feedActor(ev.actor),
        summary: (ev.text ?? "").trim() || actionLabel,
        jobId: job.id,
        jobLabel: label,
        nativeId,
        deepLink: jobActivityDeepLink(job.id, ev.type),
      });
    }
  }
  return out;
}

function wmDrukModuleToTab(module: WmDrukAuditModule): WmPrintTab {
  if (module === "schematics") return "schematy";
  if (module === "katalog") return "katalog";
  if (module === "drawings") return "rysunki";
  return "pomiary";
}

export function adaptWmDrukAudit(entries: WmDrukAuditEntry[]): AuditFeedItem[] {
  const source: AuditFeedSource = "wm_druk";
  return entries.map((entry) => {
    const actionLabel = WM_DRUK_AUDIT_ACTION_LABEL_PL[entry.action] ?? entry.action;
    const tab = wmDrukModuleToTab(entry.module);
    return {
      id: auditFeedItemId(source, entry.id),
      at: feedAt(entry.at),
      source,
      action: entry.action,
      actionLabel,
      actor: feedActor(entry.actor),
      actorUserId: entry.actorUserId,
      summary: entry.summary,
      detail: entry.detail,
      jobId: entry.jobId,
      jobLabel: entry.rapNumber ? `RAP ${entry.rapNumber}` : undefined,
      nativeId: entry.id,
      deepLink: { kind: "wm_print", tab, jobId: entry.jobId },
    };
  });
}

export function adaptWmPrintHistory(history: WmPrintHistoryEntry[]): AuditFeedItem[] {
  const source: AuditFeedSource = "wm_print";
  return normalizeWmPrintHistory(history).map((entry) => ({
    id: auditFeedItemId(source, entry.id),
    at: feedAt(entry.timestamp),
    source,
    action: entry.outputType,
    actionLabel: wmPrintHistoryOutputTypeLabel(entry.outputType),
    actor: feedActor(entry.userName),
    actorUserId: entry.userId,
    summary: `${entry.templateName} · ${entry.jobName}`,
    jobId: entry.jobId,
    jobLabel: entry.jobName,
    nativeId: entry.id,
    deepLink: { kind: "wm_print", tab: "historia", jobId: entry.jobId },
  }));
}

export function adaptDeliveryPackagePublications(
  publications: DeliveryPackagePublication[],
  jobs: AuditHubJob[],
): AuditFeedItem[] {
  const source: AuditFeedSource = "delivery_package";
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  return publications.map((pub) => {
    const job = jobById.get(pub.jobId);
    const label = job ? jobLabel(job) : pub.jobId;
    const actionLabel = DELIVERY_STATUS_LABEL_PL[pub.status];
    const actor = feedActor(pub.publishedByUserName);
    return {
      id: auditFeedItemId(source, pub.id),
      at: feedAt(pub.publishedAt),
      source,
      action: pub.status,
      actionLabel,
      actor,
      actorUserId: pub.publishedByUserId,
      summary: `Pakiet odbiorowy v${pub.zipVersion} · ${pub.fileCount} plików`,
      detail: pub.fileName,
      jobId: pub.jobId,
      jobLabel: label,
      nativeId: pub.id,
      deepLink: { kind: "wm_print", tab: "odbiory", jobId: pub.jobId },
    };
  });
}

export function adaptSecurityAuditLog(entries: SecurityAuditEntry[]): AuditFeedItem[] {
  const source: AuditFeedSource = "security_log";
  return entries.map((entry) => {
    const actionLabel = SECURITY_AUDIT_ACTION_LABEL_PL[entry.action] ?? entry.action;
    return {
      id: auditFeedItemId(source, entry.id),
      at: feedAt(entry.at),
      source,
      action: entry.action,
      actionLabel,
      actor: feedActor(entry.actor),
      actorUserId: entry.actorUserId,
      summary: entry.summary,
      detail: entry.detail,
      nativeId: entry.id,
      deepLink: { kind: "none" },
      severity: entry.severity,
    };
  });
}

export function sortAuditFeed(items: AuditFeedItem[]): AuditFeedItem[] {
  return [...items].sort(
    (a, b) => (b.at ?? "").localeCompare(a.at ?? "") || a.id.localeCompare(b.id),
  );
}

/** Usuwa duplikaty po `id` — pierwszy wpis wygrywa (stabilność przy ponownym merge). */
export function dedupeAuditFeed(items: AuditFeedItem[]): AuditFeedItem[] {
  const byId = new Map<string, AuditFeedItem>();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return sortAuditFeed([...byId.values()]);
}

export function buildAuditFeed(input: AuditHubInput): AuditFeedItem[] {
  const merged = [
    ...adaptOperationalNotesAudit(input.operationalNotesAuditLog),
    ...adaptInspectorLoginEvents(input.inspectorLoginEvents),
    ...adaptJobActivityLog(input.jobs),
    ...adaptWmPrintHistory(input.wmPrintHistory),
    ...adaptWmDrukAudit(input.wmDrukAuditLog ?? []),
    ...adaptDeliveryPackagePublications(input.deliveryPackagePublications, input.jobs),
    ...adaptSecurityAuditLog(input.securityAuditLog),
  ];
  return dedupeAuditFeed(merged);
}

export function countAuditFeedBySource(items: AuditFeedItem[]): Record<AuditFeedSource, number> {
  const counts: Record<AuditFeedSource, number> = {
    operational_notes: 0,
    inspector_login: 0,
    job_activity: 0,
    wm_print: 0,
    wm_druk: 0,
    delivery_package: 0,
    security_log: 0,
  };
  for (const item of items) counts[item.source] += 1;
  return counts;
}
