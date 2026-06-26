/** Audit Hub — nawigacja z wpisu feed do istniejących widoków admina. */

import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import type { AuditFeedDeepLink } from "@/lib/audit-hub/types";
import { WM_PRINT_TABS, type WmPrintTab } from "@/lib/wm-print/wm-print-tabs";
import type { View } from "@/app/admin/admin-nav";

export type AuditHubNavigation =
  | { view: "operationalnotes"; noteId: string; openAudit?: boolean }
  | { view: "inspector" }
  | { view: "jobs"; jobId: string; section: JobDetailSection }
  | { view: "wmprint"; tab: WmPrintTab; jobId?: string };

function wmPrintTabLabelPl(tab: WmPrintTab): string {
  const row = WM_PRINT_TABS.find((t) => t.key === tab);
  return row ? `WM Druk · ${row.label}` : "WM Druk";
}

export function resolveAuditHubNavigation(deepLink: AuditFeedDeepLink): AuditHubNavigation | null {
  switch (deepLink.kind) {
    case "operational_note":
      return {
        view: "operationalnotes",
        noteId: deepLink.noteId,
        openAudit: deepLink.openAudit,
      };
    case "inspector_view":
      return { view: "inspector" };
    case "job":
      return { view: "jobs", jobId: deepLink.jobId, section: deepLink.section };
    case "wm_print":
      return { view: "wmprint", tab: deepLink.tab, jobId: deepLink.jobId };
    case "none":
      return null;
    default:
      return null;
  }
}

export function auditHubDeepLinkLabel(deepLink: AuditFeedDeepLink): string | null {
  const nav = resolveAuditHubNavigation(deepLink);
  if (!nav) return null;
  switch (nav.view) {
    case "operationalnotes":
      return nav.openAudit ? "Audyt notatki" : "Notatka operacyjna";
    case "inspector":
      return "Widok Inspektor";
    case "jobs":
      return "Robota";
    case "wmprint":
      return wmPrintTabLabelPl(nav.tab);
    default:
      return "Przejdź";
  }
}

export function auditHubNavigationTargetView(nav: AuditHubNavigation): View {
  return nav.view;
}
