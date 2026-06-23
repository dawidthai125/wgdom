/** Audit Hub MVP-0 — kanoniczny model wpisu timeline (read-only agregacja). */

import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import type { Job } from "@/app/app-domain";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";
import type { InspectorStatsEvent } from "@/lib/inspector-stats";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import type { WmPrintTab } from "@/lib/wm-print/wm-print-tabs";

export type AuditFeedSource =
  | "operational_notes"
  | "inspector_login"
  | "job_activity"
  | "wm_print"
  | "delivery_package";

export const AUDIT_FEED_SOURCES: AuditFeedSource[] = [
  "operational_notes",
  "inspector_login",
  "job_activity",
  "wm_print",
  "delivery_package",
];

export const AUDIT_FEED_SOURCE_LABEL_PL: Record<AuditFeedSource, string> = {
  operational_notes: "Notatki operacyjne",
  inspector_login: "Inspektor · logowania",
  job_activity: "Roboty",
  wm_print: "WM Druk",
  delivery_package: "Pakiety odbiorowe",
};

export type AuditFeedDeepLink =
  | { kind: "operational_note"; noteId: string; openAudit?: boolean }
  | { kind: "inspector_view" }
  | { kind: "job"; jobId: string; section: JobDetailSection }
  | { kind: "wm_print"; tab: WmPrintTab; jobId?: string }
  | { kind: "none" };

export interface AuditFeedItem {
  /** Stabilny klucz: `${source}:${nativeId}` */
  id: string;
  at: string;
  source: AuditFeedSource;
  action: string;
  actionLabel: string;
  actor: string;
  actorUserId?: string;
  summary: string;
  detail?: string;
  jobId?: string;
  jobLabel?: string;
  noteId?: string;
  nativeId: string;
  deepLink: AuditFeedDeepLink;
}

export type AuditHubJob = Pick<Job, "id" | "address" | "flatNumber" | "client" | "activityLog">;

export interface AuditHubInput {
  operationalNotesAuditLog: OperationalNoteAuditEntry[];
  inspectorLoginEvents: InspectorStatsEvent[];
  jobs: AuditHubJob[];
  wmPrintHistory: WmPrintHistoryEntry[];
  deliveryPackagePublications: DeliveryPackagePublication[];
}

export function auditFeedItemId(source: AuditFeedSource, nativeId: string): string {
  return `${source}:${nativeId}`;
}
