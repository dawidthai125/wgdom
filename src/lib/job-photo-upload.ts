import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import type { InspectorPhotoEntry } from "@/lib/job-wm";

export async function uploadInspectorPhoto(
  jobId: string,
  file: File,
  uploadedBy: string,
  caption = "",
): Promise<{ entry: InspectorPhotoEntry | null; error?: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `inspector-${Date.now()}.${ext}`;

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("filename", filename);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        entry: null,
        error: data.error || `Błąd serwera (${res.status})`,
      };
    }

    return {
      entry: {
        id: crypto.randomUUID(),
        path: data.path,
        publicUrl: data.publicUrl,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        caption: caption.trim() || undefined,
      },
    };
  } catch {
    return { entry: null, error: "Brak połączenia z internetem" };
  }
}
