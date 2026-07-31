import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import type { InspectorPhotoLabel } from "@/lib/job-wm";
import type { InspectorDashboardJob } from "@/lib/inspector-dashboard";
import { cn } from "@/app/components/ui/utils";
import { WgButton, WgModalFrame } from "@/app/ui";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

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
      <WgButton
        type="button"
        variant="primary"
        size="icon"
        disabled={disabled || busy}
        onClick={() => {
          if (activeJobs.length === 1) startCapture(activeJobs[0].id);
          else setPickerOpen(true);
        }}
        className={cn(
          "fixed z-40 right-4 w-14 h-14 min-h-14 min-w-14 rounded-full shadow-lg shadow-primary/25",
          "hover:scale-105 active:scale-95 transition-transform touch-manipulation",
        )}
        style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
        aria-label="Szybkie zdjęcie"
        title="Szybkie zdjęcie — wybierz robotę i otwórz aparat"
      >
        <Camera size={24}/>
      </WgButton>

      {cameraJobId && (
        <HiddenFileInput accept="image/*" capture="environment" onPick={handleFile}>
          {(open) => {
            openCameraRef.current = open;
            return null;
          }}
        </HiddenFileInput>
      )}

      <WgModalFrame
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        showHeader={false}
        variant="sheet"
        surface="solid"
        size="md"
        zIndex={50}
        aria-label="Wybierz robotę"
        className="max-h-[70dvh] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-sm font-semibold">Wybierz robotę</p>
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPickerOpen(false)}
            className={cn(WG_TOUCH_MIN, "h-11 w-11 rounded-lg hover:bg-secondary")}
            aria-label="Zamknij"
          >
            <X size={18}/>
          </WgButton>
        </div>
        <div className="overflow-y-auto overscroll-contain divide-y divide-border min-h-0">
          {activeJobs.map((job) => (
            <WgButton
              key={job.id}
              type="button"
              variant="ghost"
              onClick={() => startCapture(job.id)}
              className={cn(
                WG_TOUCH_MIN,
                "w-full h-auto rounded-none justify-start text-left px-4 py-3.5 hover:bg-secondary/40 touch-manipulation",
              )}
            >
              <span className="min-w-0 block">
                <span className="text-sm font-medium truncate block">
                  {job.address || "Bez adresu"}
                  {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
                </span>
                <span className="text-xs text-muted-foreground truncate block">{job.client || "—"}</span>
              </span>
            </WgButton>
          ))}
        </div>
      </WgModalFrame>
    </>
  );
}
