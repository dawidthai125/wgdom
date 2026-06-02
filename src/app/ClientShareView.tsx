import { useEffect, useState } from "react";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { WorkScopeDisplay } from "@/app/WorkScopeEditor";
import type { WorkerJobReport } from "@/app/app-domain";
import { fmtDate, normalizeWorkerReport } from "@/app/app-domain";
import {
  getReportWorkScopeText,
  reportHasWorkScope,
} from "@/lib/work-scope-text";
import { filterAvailablePhotos, isMediaAttachmentAvailable } from "@/lib/media-filter";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";

interface ClientShareJob {
  address: string;
  flatNumber: string;
  client: string;
  startDate: string;
  endDate: string;
  status: string;
  photos: { publicUrl: string; label: string; caption: string; uploadedAt: string }[];
  workerReports: WorkerJobReport[];
}

export function ClientShareView({ token }: { token: string }) {
  const [job, setJob] = useState<ClientShareJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/client-share?token=${encodeURIComponent(token)}`, {
      headers: { Authorization: API_HEADERS.Authorization },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Nie udało się wczytać");
        setJob(data.job);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Błąd połączenia"))
      .finally(() => setLoading(false));
  }, [token]);

  const LABEL_NAMES: Record<string, string> = { before: "Przed remontem", after: "Po remoncie", progress: "W trakcie", sketch: "Rysunek" };
  const sharePhotos = job ? filterAvailablePhotos(job.photos) : [];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="px-4 py-4 border-b border-border bg-card flex items-center gap-3" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain"/>
        <div>
          <p className="text-sm font-semibold">Podgląd remontu</p>
          <p className="text-[10px] text-muted-foreground">W&G DOM — tylko do odczytu</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        {loading && <p className="text-sm text-muted-foreground text-center py-12">Ładowanie…</p>}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {job && (
          <>
            <div>
              <h1 className="text-xl font-bold">{job.address || "Robota"}{job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}</h1>
              <p className="text-sm text-muted-foreground mt-1">{job.client || "—"}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {job.startDate && `Od ${fmtDate(job.startDate)}`}
                {job.endDate && ` · do ${fmtDate(job.endDate)}`}
                {" · "}{job.status === "completed" ? "Zakończono" : "W trakcie"}
              </p>
            </div>
            {sharePhotos.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Zdjęcia</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sharePhotos.map((p, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-secondary relative">
                      <JobPhotoImg src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="text-[9px] text-white">{LABEL_NAMES[p.label] || p.label}</p>
                        {p.caption && <p className="text-[8px] text-white/80 truncate">{p.caption}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {job.workerReports.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raporty z budowy</p>
                {job.workerReports.map((r) => {
                  const norm = normalizeWorkerReport(r);
                  return (
                    <div key={r.id || norm.submittedAt} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <p className="text-xs text-muted-foreground">{fmtDate(norm.submittedAt.slice(0, 10))} · {norm.workerName}</p>
                      {reportHasWorkScope(norm) && (
                        <WorkScopeDisplay text={getReportWorkScopeText(norm)}/>
                      )}
                      {norm.generalNote && <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{norm.generalNote}</p>}
                      {norm.sketch && isMediaAttachmentAvailable(norm.sketch) && (
                        <JobPhotoImg src={norm.sketch.publicUrl} alt="Rysunek" className="rounded-lg border border-border max-h-48 object-contain w-full bg-secondary"/>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {sharePhotos.length === 0 && job.workerReports.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Brak opublikowanych materiałów — administrator jeszcze nie udostępnił zdjęć ani raportów.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
