import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import type { JobAttachment } from "@/lib/job-attachments";
import {
  buildJobAttachmentStorageFilename,
  jobAttachmentUploadError,
} from "@/lib/job-attachments";

export async function uploadJobAttachment(
  jobId: string,
  file: File,
  uploadedBy: string,
): Promise<{ attachment: JobAttachment | null; error?: string }> {
  const validationError = jobAttachmentUploadError(file);
  if (validationError) {
    return { attachment: null, error: validationError };
  }

  const storageFilename = buildJobAttachmentStorageFilename(file.name);

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("filename", storageFilename);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        attachment: null,
        error: data.error || `Błąd serwera (${res.status})`,
      };
    }

    return {
      attachment: {
        id: crypto.randomUUID(),
        filename: file.name,
        path: data.path,
        publicUrl: data.publicUrl,
        mimeType: file.type || undefined,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        sizeBytes: file.size,
      },
    };
  } catch {
    return { attachment: null, error: "Brak połączenia z internetem" };
  }
}
