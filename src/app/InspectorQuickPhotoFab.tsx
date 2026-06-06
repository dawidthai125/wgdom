import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import type { InspectorPhotoLabel } from "@/lib/job-wm";
import type { InspectorDashboardJob } from "@/lib/inspector-dashboard";

const DEFAULT_LABEL: InspectorPhotoLabel = "in_progress";

export function InspectorQuickPhotoFab({
  jobs,
  onUpload,
  disabled,
}: {
  jobs: InspectorDashboardJob[];
  onUpload: (jobId: string, file: File, label: InspectorPhotoLabel) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraJobId, setCameraJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openCameraRef = useRef<(() => void) | null>(null);

  const activeJobs = jobs.filter((j) => j.status === "in_progress");

  useEffect(() => {
    if (cameraJobId && openCameraRef.current) {
      openCameraRef.current();
    }
  }, [cameraJobId]);

  const startCapture = (jobId: string) => {
    setPickerOpen(false);
    setCameraJobId(jobId);
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    const jobId = cameraJobId;
    setCameraJobId(null);
    if (!file || !jobId) return;
    setBusy(true);
    try {
      await onUpload(jobId, file, DEFAULT_LABEL);
    } finally {
      setBusy(false);
    }
  };

  if (activeJobs.length === 0) return null;

  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          if (activeJobs.length === 1) startCapture(activeJobs[0].id);
          else setPickerOpen(true);
        }}
        className="fixed z-40 right-4 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 touch-manipulation"
        style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
        aria-label="Szybkie zdjęcie"
        title="Szybkie zdjęcie — wybierz robotę i otwórz aparat"
      >
        <Camera size={24}/>
      </button>

      {cameraJobId && (
        <HiddenFileInput accept="image/*" capture="environment" onPick={handleFile}>
          {(open) => {
            openCameraRef.current = open;
            return null;
          }}
        </HiddenFileInput>
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[70dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Wybierz robotę</p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-2 rounded-lg hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Zamknij"
              >
                <X size={18}/>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain divide-y divide-border">
              {activeJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => startCapture(job.id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-secondary/40 min-h-[44px] touch-manipulation"
                >
                  <p className="text-sm font-medium truncate">
                    {job.address || "Bez adresu"}
                    {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{job.client || "—"}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
