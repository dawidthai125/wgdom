import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import {
  EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS,
  OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL,
  OPERATIONAL_NOTE_AUDIT_ACTIONS,
  OPERATIONAL_NOTES_AUDIT_PAGE_SIZE,
  canAccessOperationalNotesAudit,
  collectOperationalNotesAuditFilterOptions,
  filterOperationalNotesAuditLog,
  paginateOperationalNotesAuditLog,
  type OperationalNotesAuditFilters,
} from "@/lib/operational-notes-audit-filters";
import type { AdminSession } from "@/lib/admin-auth";

function fmtAuditDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

export function OperationalNotesAuditPanel({
  auditLog,
  session,
  open,
  onOpenChange,
  initialNoteId,
}: {
  auditLog: OperationalNoteAuditEntry[];
  session: AdminSession | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNoteId?: string | null;
}) {
  const [filters, setFilters] = useState<OperationalNotesAuditFilters>(EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS);
  const [page, setPage] = useState(1);

  const allowed = canAccessOperationalNotesAudit(session);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    if (initialNoteId) {
      setFilters((prev) => ({ ...prev, noteId: initialNoteId }));
    } else {
      setFilters(EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS);
    }
  }, [open, initialNoteId]);

  const filterOptions = useMemo(
    () => collectOperationalNotesAuditFilterOptions(auditLog),
    [auditLog],
  );

  const filtered = useMemo(
    () => (allowed ? filterOperationalNotesAuditLog(auditLog, filters) : []),
    [allowed, auditLog, filters],
  );

  const paged = useMemo(
    () => paginateOperationalNotesAuditLog(filtered, page, OPERATIONAL_NOTES_AUDIT_PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    if (page > paged.totalPages) setPage(paged.totalPages);
  }, [page, paged.totalPages]);

  if (!allowed) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 gap-0 flex flex-col">
        <SheetHeader className="border-b border-border shrink-0">
          <SheetTitle>Audit notatek operacyjnych</SheetTitle>
          <SheetDescription>
            Historia działań — tylko Super Admin · max {auditLog.length} wpisów w chmurze
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 border-b border-border space-y-3 shrink-0 bg-secondary/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Akcja</span>
              <select
                value={filters.action}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, action: e.target.value as OperationalNotesAuditFilters["action"] }));
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 text-sm bg-background rounded-lg border border-border"
              >
                <option value="all">Wszystkie akcje</option>
                {OPERATIONAL_NOTE_AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL[action]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Użytkownik</span>
              <select
                value={filters.userId}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, userId: e.target.value }));
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 text-sm bg-background rounded-lg border border-border"
              >
                <option value="all">Wszyscy</option>
                {filterOptions.users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Notatka</span>
              <select
                value={filters.noteId}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, noteId: e.target.value }));
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 text-sm bg-background rounded-lg border border-border"
              >
                <option value="all">Wszystkie notatki</option>
                {filterOptions.notes.map((n) => (
                  <option key={n.noteId} value={n.noteId}>
                    {n.title || n.noteId}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(e) => {
                setFilters((f) => ({ ...f, search: e.target.value }));
                setPage(1);
              }}
              placeholder="Szukaj w użytkowniku, notatce, szczegółach…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-background rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Wyników: {filtered.length} · strona {paged.page}/{paged.totalPages}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
          {paged.items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Brak wpisów dla wybranych filtrów.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-card border-b border-border text-left">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-semibold w-[28%]">Data</th>
                  <th className="px-3 py-2 font-semibold w-[14%]">Akcja</th>
                  <th className="px-3 py-2 font-semibold w-[16%]">Użytkownik</th>
                  <th className="px-3 py-2 font-semibold w-[18%]">Notatka</th>
                  <th className="px-3 py-2 font-semibold">Szczegóły</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-secondary/40 align-top">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                      {fmtAuditDate(entry.at)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium">
                      {OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL[entry.action] ?? entry.action}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{entry.displayName}</td>
                    <td className="px-3 py-2.5 text-xs truncate max-w-[140px]" title={entry.noteTitleSnapshot}>
                      {entry.noteTitleSnapshot ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {entry.detail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {paged.totalPages > 1 && (
          <div className="shrink-0 border-t border-border p-3 flex items-center justify-between gap-2 bg-card">
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-secondary disabled:opacity-40 min-h-[44px] touch-manipulation"
            >
              <ChevronLeft size={14} />
              Wstecz
            </button>
            <span className="text-xs text-muted-foreground">
              {paged.page} / {paged.totalPages}
            </span>
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
              className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-secondary disabled:opacity-40 min-h-[44px] touch-manipulation"
            >
              Dalej
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
