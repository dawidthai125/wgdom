import { Upload } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import {
  type JobFileKind,
  JOB_FILE_KIND_LABELS,
  jobFileUploadAccept,
  jobFileUploadError,
} from "@/lib/job-documents";
import { WgButton } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

export function InspectorJobFileUpload({
  kind,
  busy,
  hasFile,
  onPick,
  onError,
  className = "",
  buttonLabel,
}: {
  kind: JobFileKind;
  busy: boolean;
  hasFile: boolean;
  onPick: (file: File) => void;
  onError?: (message: string) => void;
  className?: string;
  /** Np. „Dodaj plan techniczny” — domyślnie wg kind. */
  buttonLabel?: string;
}) {
  const accept = jobFileUploadAccept(kind);
  const defaultLabel = hasFile ? "Wgraj nową wersję" : `Wgraj ${JOB_FILE_KIND_LABELS[kind].toLowerCase()}`;
  const label = busy ? "Wgrywanie…" : (buttonLabel ?? defaultLabel);

  return (
    <HiddenFileInput
      accept={accept}
      onPick={(files) => {
        const file = files?.[0];
        if (!file) return;
        const err = jobFileUploadError(kind, file.name);
        if (err) {
          onError?.(err);
          return;
        }
        onPick(file);
      }}
    >
      {(open) => (
        <WgButton
          type="button"
          variant="primary"
          disabled={busy}
          onClick={open}
          className={cn(
            "w-full gap-2 text-xs font-medium",
            WG_TOUCH_MIN,
            "h-11",
            className,
          )}
        >
          <Upload size={14}/>
          {label}
        </WgButton>
      )}
    </HiddenFileInput>
  );
}
