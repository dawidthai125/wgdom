import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  DOCUMENT_TYPES,
  DOC_LABELS,
  REQUIRED_DOCS,
  type DocType,
} from "@/lib/job-documents";
import { collectJobDocuments, type MediaSeparationSource } from "@/lib/media-separation";
import {
  HOUSING_TYPE_LABELS,
  STOVE_TYPE_LABELS_FULL,
  isJobHousingSet,
  type HousingType,
  type StoveType,
} from "@/lib/job-meta";

export type JobPackSource = MediaSeparationSource & {
  startDate: string;
  endDate: string;
  status: "in_progress" | "completed";
  keysHandedOver: boolean;
  notes: string;
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
  documents: Record<DocType, boolean>;
};

export type PackFileEntry = {
  zipPath: string;
  url: string;
};

function safeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim() || "plik";
}

function jobTitle(job: JobPackSource): string {
  return `${job.address || "Bez-adresu"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
}

function packSlug(job: JobPackSource): string {
  const base = (job.address || "robota")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const flat = job.flatNumber ? `-m${job.flatNumber.replace(/\W/g, "")}` : "";
  return `${base || "robota"}${flat}`.toLowerCase();
}

function buildReadme(job: JobPackSource): string {
  const lines: string[] = [
    "W&G DOM — pakiet dokumentów do odbioru",
    "=====================================",
    "",
    `Adres: ${jobTitle(job)}`,
    `Klient: ${job.client || "—"}`,
    `Data rozpoczęcia: ${job.startDate || "—"}`,
    `Data zakończenia: ${job.endDate || "—"}`,
    `Status: ${job.status === "completed" ? "Zdana" : "W trakcie"}`,
    `Klucze: ${job.keysHandedOver ? "Zdane" : "Nie zdane"}`,
    `Lokal: ${isJobHousingSet(job) ? HOUSING_TYPE_LABELS[job.housingType] : "—"}`,
    `Kuchenka: ${job.stoveType ? STOVE_TYPE_LABELS_FULL[job.stoveType] : "—"}`,
    "",
    "Checklist dokumentów:",
  ];
  for (const doc of DOCUMENT_TYPES) {
    const mark = job.documents[doc] ? "[✓]" : "[ ]";
    lines.push(`  ${mark} ${DOC_LABELS[doc]}`);
  }
  const missing = REQUIRED_DOCS.filter((d) => !job.documents[d]);
  if (missing.length > 0) {
    lines.push("", "Brakuje (wymagane):", missing.map((d) => `  - ${DOC_LABELS[d]}`).join("\n"));
  }
  if (job.notes?.trim()) {
    lines.push("", "Notatki wewnętrzne:", job.notes.trim());
  }
  lines.push("", `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`, `ID roboty: ${job.id}`);
  return lines.join("\n");
}

/** Lista dokumentów do spakowania (zlecenie + kosztorys — bez obrazów). */
export function collectJobDocumentPackEntries(job: JobPackSource): PackFileEntry[] {
  const entries: PackFileEntry[] = [];
  const usedPaths = new Set<string>();

  const add = (zipPath: string, url: string) => {
    if (!url?.trim()) return;
    let path = zipPath;
    let n = 2;
    while (usedPaths.has(path)) {
      const dot = zipPath.lastIndexOf(".");
      if (dot > 0) path = `${zipPath.slice(0, dot)}-${n}${zipPath.slice(dot)}`;
      else path = `${zipPath}-${n}`;
      n++;
    }
    usedPaths.add(path);
    entries.push({ zipPath: path, url });
  };

  const dateFolder = (iso: string) => (iso || "").slice(0, 10) || "bez-daty";

  for (const f of collectJobDocuments(job)) {
    const folder =
      f.kind === "zlecenie" ? "zlecenie"
      : f.kind === "plan_techniczny" ? "plan-techniczny"
      : "kosztorys";
    add(`${folder}/${dateFolder(f.uploadedAt)}/${safeFilename(f.filename || `${f.kind}.pdf`)}`, f.publicUrl);
  }

  return entries;
}

/** @deprecated Użyj collectJobDocumentPackEntries — tylko dokumenty (20.5A.8). */
export function collectJobPackEntries(job: JobPackSource): PackFileEntry[] {
  return collectJobDocumentPackEntries(job);
}

export function jobPackHasDocuments(job: JobPackSource): boolean {
  return collectJobDocumentPackEntries(job).length > 0;
}

/** @deprecated */
export function jobPackHasFiles(job: JobPackSource): boolean {
  return jobPackHasDocuments(job);
}

/** Pobiera pliki, pakuje ZIP i zapisuje na dysk. */
export async function downloadJobDocumentsPack(
  job: JobPackSource,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fileEntries = collectJobDocumentPackEntries(job);
  const zip = new JSZip();
  zip.file("README-dokumentacja.txt", buildReadme(job));

  const total = fileEntries.length;
  let done = 0;
  onProgress?.(done, total);

  const failures: string[] = [];
  for (const entry of fileEntries) {
    try {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(entry.zipPath, blob);
    } catch {
      failures.push(entry.zipPath);
    }
    done++;
    onProgress?.(done, total);
  }

  if (failures.length > 0) {
    zip.file(
      "UWAGA-brakujace-pliki.txt",
      `Nie udało się pobrać ${failures.length} plik(ów):\n\n${failures.map((f) => `- ${f}`).join("\n")}`,
    );
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `wgdom-pakiet-${packSlug(job)}-${date}.zip`);
  return { ok: true };
}
