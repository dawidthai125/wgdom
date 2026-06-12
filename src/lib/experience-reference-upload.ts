/**
 * P2-F.4 — upload dokumentów referencji / protokołu do profilu wykonawcy (storage).
 */

import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import type { ExperienceDocumentFile } from "@/lib/company-qualification-profile";

export const EXPERIENCE_STORAGE_JOB_ID = "kw-company-experience";

export function experienceDocumentUploadError(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!/\.(pdf|docx?)$/.test(name)) {
    return "Dozwolone formaty: PDF, DOC, DOCX";
  }
  if (file.size > 25 * 1024 * 1024) {
    return "Plik jest za duży (max 25 MB)";
  }
  return null;
}

function safeStorageFilename(original: string): string {
  const base = original.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${base}`;
}

export async function uploadExperienceDocument(
  file: File,
  uploadedBy = "admin",
): Promise<{ doc: ExperienceDocumentFile | null; error?: string }> {
  const validationError = experienceDocumentUploadError(file);
  if (validationError) {
    return { doc: null, error: validationError };
  }

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", EXPERIENCE_STORAGE_JOB_ID);
    form.append("filename", safeStorageFilename(file.name));

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { doc: null, error: data.error || `Błąd serwera (${res.status})` };
    }

    return {
      doc: {
        id: crypto.randomUUID(),
        filename: file.name,
        path: data.path,
        publicUrl: data.publicUrl,
        mimeType: file.type || undefined,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
      },
    };
  } catch {
    return { doc: null, error: "Brak połączenia z internetem" };
  }
}
