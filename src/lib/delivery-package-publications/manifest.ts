import JSZip from "jszip";
import {
  MEASUREMENT_INDEX_CSV_FILE,
  MEASUREMENT_INDEX_TXT_FILE,
} from "@/lib/electrical-measurements/measurement-index-export";
import {
  WM_PRINT_ZIP_FOLDER_ODBIORY,
  WM_PRINT_ZIP_FOLDER_POMIARY,
  WM_PRINT_ZIP_FOLDER_RYSUNKI,
} from "@/lib/wm-print/generate-zip";
import type {
  DeliveryPackageManifestEntry,
  DeliveryPackageManifestFolder,
} from "@/lib/delivery-package-publications/types";

function mimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (ext === "csv") return "text/csv";
  return "application/octet-stream";
}

function displayLabelFromFileName(fileName: string): string {
  if (fileName === MEASUREMENT_INDEX_TXT_FILE) return "INDEX-POMIARY (txt)";
  if (fileName === MEASUREMENT_INDEX_CSV_FILE) return "INDEX-POMIARY (csv)";
  const base = fileName.replace(/\.[^.]+$/, "");
  return base.replace(/^\d+-/, "").replace(/-/g, " ") || fileName;
}

export function folderFromPath(relativePath: string): DeliveryPackageManifestFolder {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length > 1 && parts[0] === WM_PRINT_ZIP_FOLDER_POMIARY) return "Pomiary";
  if (parts.length > 1 && parts[0] === WM_PRINT_ZIP_FOLDER_RYSUNKI) return "Rysunki";
  if (parts.length > 1 && parts[0] === WM_PRINT_ZIP_FOLDER_ODBIORY) return "Odbiory";
  return "Odbiory";
}

function folderSortOrder(f: DeliveryPackageManifestFolder): number {
  if (f === "Odbiory") return 0;
  if (f === "Pomiary") return 1;
  if (f === "Rysunki") return 2;
  return 9;
}

/** Manifest z dokładnie opublikowanych bajtów ZIP (SSOT zawartości). D-P3-19: po udanym ZIP. */
export async function buildDeliveryPackageManifestFromZipBytes(
  bytes: Uint8Array,
): Promise<DeliveryPackageManifestEntry[]> {
  const zip = await JSZip.loadAsync(bytes);
  const entries: DeliveryPackageManifestEntry[] = [];
  const tasks: Promise<void>[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    tasks.push(
      (async () => {
        const parts = relativePath.split("/").filter(Boolean);
        const fileName = parts[parts.length - 1] ?? relativePath;
        let sizeBytes: number | undefined;
        try {
          sizeBytes = (await file.async("uint8array")).byteLength;
        } catch {
          /* ignore */
        }
        entries.push({
          folder: folderFromPath(relativePath),
          fileName,
          relativePath,
          displayLabel: displayLabelFromFileName(fileName),
          mimeType: mimeFromFileName(fileName),
          sizeBytes,
        });
      })(),
    );
  });

  await Promise.all(tasks);

  return entries.sort((a, b) => {
    const fc = folderSortOrder(a.folder) - folderSortOrder(b.folder);
    if (fc !== 0) return fc;
    return a.relativePath.localeCompare(b.relativePath, "pl");
  });
}

export function groupDeliveryPackageManifestByFolder(
  manifest: DeliveryPackageManifestEntry[],
): { folder: DeliveryPackageManifestFolder; files: DeliveryPackageManifestEntry[] }[] {
  const odbior = manifest.filter((e) => e.folder === "Odbiory");
  const pomiary = manifest.filter((e) => e.folder === "Pomiary");
  const rysunki = manifest.filter((e) => e.folder === "Rysunki");
  const out: { folder: DeliveryPackageManifestFolder; files: DeliveryPackageManifestEntry[] }[] = [];
  if (odbior.length > 0) out.push({ folder: "Odbiory", files: odbior });
  if (pomiary.length > 0) out.push({ folder: "Pomiary", files: pomiary });
  if (rysunki.length > 0) out.push({ folder: "Rysunki", files: rysunki });
  return out;
}
