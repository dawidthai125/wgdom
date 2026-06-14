/** KPI Notatek operacyjnych na Pulpicie (P2B). */

import type { AdminSession } from "@/lib/admin-auth";
import { adminIsInspector } from "@/lib/admin-auth";
import {
  filterOperationalNotesForViewer,
  type OperationalNote,
} from "@/lib/operational-notes";
import {
  countUnreadOperationalNotes,
  type OperationalNoteReadReceipt,
} from "@/lib/operational-notes-read-state";

export type OperationalNotesDashboardSummary = {
  total: number;
  unread: number;
  fromInspector: number;
  lastActivity: { title: string; at: string } | null;
};

function activeVisibleNotes(
  notes: OperationalNote[],
  session: AdminSession | null | undefined,
): OperationalNote[] {
  return filterOperationalNotesForViewer(notes, session).filter((n) => n.status === "active");
}

export function computeOperationalNotesDashboardSummary(
  notes: OperationalNote[],
  readState: OperationalNoteReadReceipt[],
  session: AdminSession | null | undefined,
): OperationalNotesDashboardSummary {
  if (!session) {
    return { total: 0, unread: 0, fromInspector: 0, lastActivity: null };
  }

  const visibleActive = activeVisibleNotes(notes, session);
  const unread = countUnreadOperationalNotes(notes, readState, session);
  const fromInspector = visibleActive.filter((n) => n.authorRole === "inspector").length;

  let lastActivity: OperationalNotesDashboardSummary["lastActivity"] = null;
  for (const note of visibleActive) {
    if (!lastActivity || note.lastActivityAt > lastActivity.at) {
      lastActivity = { title: note.title || "—", at: note.lastActivityAt };
    }
  }

  return {
    total: visibleActive.length,
    unread,
    fromInspector,
    lastActivity,
  };
}

/** Inspektor nie ma dostępu do Pulpitu admina — widget tylko dla staff. */
export function canShowOperationalNotesDashboardWidget(
  session: AdminSession | null | undefined,
): boolean {
  if (!session) return false;
  return !adminIsInspector(session.role);
}
