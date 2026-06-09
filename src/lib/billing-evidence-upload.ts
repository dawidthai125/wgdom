import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import type { JobNoteAttachment } from "@/lib/job-wm";

export const MAX_BILLING_EVIDENCE_BYTES = 8 * 1024 * 1024;
export const MAX_BILLING_EVIDENCE_IMAGES = 3;
export const MAX_BILLING_EVIDENCE_PDFS = 1;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const PDF_EXT = new Set(["pdf"]);

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  return PDF_EXT.has(fileExtension(file.name));
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    const ext = fileExtension(file.name);
    return ext === "" || IMAGE_EXT.has(ext) || file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
  }
  return IMAGE_EXT.has(fileExtension(file.name));
}

/** Walidacja pliku dowodu billing (client-side). */
export function validateBillingEvidenceFile(file: File): string | null {
  if (file.size > MAX_BILLING_EVIDENCE_BYTES) {
    return `Plik „${file.name}” przekracza limit 8 MB.`;
  }
  if (!isImageFile(file) && !isPdfFile(file)) {
    return `Niedozwolony typ pliku „${file.name}”. Dozwolone: JPG, PNG, WEBP, PDF.`;
  }
  return null;
}

export async function uploadBillingEvidence(
  jobId: string,
  chargeId: string,
  file: File,
  uploadedBy: string,
): Promise<{ attachment: JobNoteAttachment | null; error?: string }> {
  return uploadBillingAttachment(jobId, chargeId, file, uploadedBy, "charge");
}

/** Sprint 20.5A.6 — dowód przy propozycji billing (przed utworzeniem pozycji). */
export async function uploadBillingProposalEvidence(
  jobId: string,
  proposalId: string,
  file: File,
  uploadedBy: string,
): Promise<{ attachment: JobNoteAttachment | null; error?: string }> {
  return uploadBillingAttachment(jobId, proposalId, file, uploadedBy, "proposal");
}

async function uploadBillingAttachment(
  jobId: string,
  entityId: string,
  file: File,
  uploadedBy: string,
  entityKind: "charge" | "proposal",
): Promise<{ attachment: JobNoteAttachment | null; error?: string }> {
  const validationError = validateBillingEvidenceFile(file);
  if (validationError) {
    return { attachment: null, error: validationError };
  }

  const isPdf = isPdfFile(file);
  const safeName = file.name.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]+/g, "_").slice(0, 60);
  const entityPart = entityId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  const fallbackName = isPdf ? "dowod.pdf" : "zdjecie.jpg";
  const prefix = entityKind === "proposal" ? "billing-proposal-" : "billing-evidence-";
  const filename = `${prefix}${entityPart}-${Date.now()}-${safeName || fallbackName}`;

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
        kind: isPdf ? "pdf" : "image",
        path: data.path,
        publicUrl: data.publicUrl,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
      },
    };
  } catch {
    return { attachment: null, error: "Brak połączenia z internetem" };
  }
}
