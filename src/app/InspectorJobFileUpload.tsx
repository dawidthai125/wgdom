import { Upload } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import {
  type InspectorJobFileKind,
  KOSZTORYS_PICKER_ACCEPT,
  ZLECENIE_ACCEPT,
  kosztorysUploadError,
  zlecenieUploadError,
} from "@/lib/job-documents";

export function InspectorJobFileUpload({
  kind,
  busy,
  hasFile,
  onPick,
  onError,
  className = "",
}: {
  kind: InspectorJobFileKind;
  busy: boolean;
  hasFile: boolean;
  onPick: (file: File) => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const accept = kind === "zlecenie" ? ZLECENIE_ACCEPT : KOSZTORYS_PICKER_ACCEPT;
  const label = busy ? "Wgrywanie…" : hasFile ? "Wgraj nową wersję" : "Wgraj plik";

  return (
    <HiddenFileInput
      accept={accept}
      onPick={(files) => {
        const file = files?.[0];
        if (!file) return;
        const err = kind === "zlecenie" ? zlecenieUploadError(file.name) : kosztorysUploadError(file.name);
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
