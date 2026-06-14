import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";

const WM_PRINT_STORAGE_JOB_ID = "wm-print";

export async function uploadWmPrintTemplateFile(
  templateId: string,
  file: File,
  fileId?: string,
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fid = fileId ?? crypto.randomUUID();
  const safeName = `template-${templateId}-${fid}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", WM_PRINT_STORAGE_JOB_ID);
    form.append("filename", safeName);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { error: data.error || `Błąd serwera (${res.status})` };
    }
    return { path: data.path, publicUrl: data.publicUrl };
  } catch {
    return { error: "Brak połączenia z internetem" };
  }
}

export async function uploadWmPrintJobDocumentFile(
  jobId: string,
  file: File,
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("filename", `wm-print-${safeName}`);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { error: data.error || `Błąd serwera (${res.status})` };
    }
    return { path: data.path, publicUrl: data.publicUrl };
  } catch {
    return { error: "Brak połączenia z internetem" };
  }
}

export async function fetchWmPrintFileBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie można pobrać pliku (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}
