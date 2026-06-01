import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Plus, ChevronUp, ChevronDown, Ruler, Trash2 } from "lucide-react";
import { WorkScopeDisplay } from "@/app/WorkScopeEditor";
import type { WorkerJobReport } from "@/app/app-domain";
import { fmtDate, roomDisplayName } from "@/app/app-domain";
import { getReportWorkScopeText, reportHasWorkScope, scopeTextLineCount } from "@/lib/work-scope-text";
import type { AdminRole } from "@/lib/admin-auth";
import { JobPhotoImg } from "@/app/JobPhotoImg";

export function JobWorkerReportsPanel({
  jobId,
  reports,
  authorName,
  authorAdminRole,
  onAddReport,
  onDelete,
}: {
  jobId: string;
  reports: WorkerJobReport[];
  authorName: string;
  authorAdminRole: AdminRole;
  onAddReport: (report: WorkerJobReport) => void;
  onDelete: (reportId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [reports],
  );

  useEffect(() => {
    if (sorted.length > 0 && !openId) setOpenId(sorted[0].id);
  }, [sorted, openId]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={13} className="text-muted-foreground"/>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Raporty — zakres i wymiary</span>
          {reports.length > 0 && (
            <span className="bg-violet-500/15 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          )}
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
          <Plus size={12}/>{showForm ? "Ukryj formularz" : "Dodaj raport"}
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-border bg-violet-500/5">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ClipboardList size={14} className="text-violet-400"/>Nowy raport
          </p>
          <JobReportForm
            jobId={jobId}
            authorName={authorName}
            authorAdminRole={authorAdminRole}
            onSaved={(report) => { onAddReport(report); setOpenId(report.id); }}
            submitLabel="Zapisz raport"
            description="Te same pola co w trybie pracownika — zakres prac, wymiary pomieszczeń lub foto rysunku."
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Brak zapisanych raportów. Dodaj pierwszy powyżej lub poproś pracownika o wysłanie z telefonu.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((report) => {
            const isOpen = openId === report.id;
            let pokojIdx = 0;
            return (
              <div key={report.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : report.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{report.workerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(report.submittedAt.slice(0, 10))}
                      {reportHasWorkScope(report) && ` · ${scopeTextLineCount(getReportWorkScopeText(report))} linii`}
                      {report.rooms.length > 0 && ` · ${report.rooms.length} pom.`}
                      {report.sketch && " · rysunek"}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0"/> : <ChevronDown size={14} className="text-muted-foreground shrink-0"/>}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 bg-secondary/10">
                    {reportHasWorkScope(report) && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Zakres wykonanych prac</p>
                        <WorkScopeDisplay text={getReportWorkScopeText(report)} className="bg-secondary/30 rounded-xl px-3 py-2"/>
                      </div>
                    )}
                    {report.generalNote && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wiadomość</p>
                        <p className="text-sm">{report.generalNote}</p>
                      </div>
                    )}
                    {report.rooms.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Ruler size={12}/>Wymiary pomieszczeń
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/40">
                                <th className="px-3 py-2 text-left">Pomieszczenie</th>
                                <th className="px-3 py-2 text-right">Dł. (m)</th>
                                <th className="px-3 py-2 text-right">Szer. (m)</th>
                                <th className="px-3 py-2 text-right">Wys. (m)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {report.rooms.map((room) => {
                                const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
                                return (
                                  <tr key={room.id}>
                                    <td className="px-3 py-2">
                                      <p className="font-medium">{roomDisplayName(room, idx)}</p>
                                      {room.note && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{room.note}</p>}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{room.length || "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{room.width || "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{room.height || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {report.sketch && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Rysunek z wymiarami</p>
                        <a href={report.sketch.publicUrl} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
                          <JobPhotoImg src={report.sketch.publicUrl} alt="Rysunek" className="rounded-xl border border-border w-full object-contain bg-secondary max-h-64"/>
                        </a>
                        {report.sketchNote && <p className="text-xs text-muted-foreground mt-2 italic">{report.sketchNote}</p>}
                      </div>
                    )}
                    {report.updatedAt && (
                      <p className="text-[10px] text-muted-foreground">Edytowano: {fmtDate(report.updatedAt.slice(0, 10))}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => { if (window.confirm("Usunąć ten raport?")) onDelete(report.id); }}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={12}/>Usuń raport
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}