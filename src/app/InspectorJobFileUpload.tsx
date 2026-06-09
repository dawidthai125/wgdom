import { Upload } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import {
  type JobFileKind,
  JOB_FILE_KIND_LABELS,
  jobFileUploadAccept,
  jobFileUploadError,
} from "@/lib/job-documents";

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
        <button
          type="button"
          disabled={busy}
          onClick={open}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
        >
          <Upload size={14}/>
          {label}
        </button>
      )}
    </HiddenFileInput>
  );
}
