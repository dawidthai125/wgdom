import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";

export async function uploadDeliveryPackageZip(
  jobId: string,
  zipVersion: number,
  fileName: string,
  bytes: Uint8Array,
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageFilename = `delivery-package-v${zipVersion}-${safeName}`;

  try {
    const blob = new Blob([bytes], { type: "application/zip" });
    const form = new FormData();
    form.append("file", blob, storageFilename);
    form.append("jobId", jobId);
    form.append("filename", storageFilename);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { error: data.error || `Błąd serwera (${res.status})` };
    }
    return { path: String(data.path), publicUrl: String(data.publicUrl) };
  } catch {
    return { error: "Brak połączenia z internetem" };
  }
}

export function formatDeliveryPackageFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
