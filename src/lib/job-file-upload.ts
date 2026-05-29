import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import type { InspectorJobFileKind, JobFileAttachment } from "@/lib/job-documents";

export async function uploadJobFile(
  jobId: string,
  file: File,
  kind: InspectorJobFileKind,
  uploadedBy: string,
): Promise<{ attachment: JobFileAttachment | null; error?: string }> {
  const ext = file.name.split(".").pop() || "pdf";
  const safeName = file.name.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]+/g, "_").slice(0, 80);
  const filename = `${kind}-${Date.now()}-${safeName || `plik.${ext}`}`;

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
        attachment: null,
        error: data.error || `Błąd serwera (${res.status})`,
      };
    }

    return {
      attachment: {
        id: crypto.randomUUID(),
        kind,
        path: data.path,
        publicUrl: data.publicUrl,
        filename: file.name,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { attachment: null, error: "Brak połączenia z internetem" };
  }
}

export async function deleteJobFile(
  storagePath: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/storage-delete`, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({ path: storagePath }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `Błąd serwera (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Brak połączenia z internetem" };
  }
}
