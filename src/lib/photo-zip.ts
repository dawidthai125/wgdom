import JSZip from "jszip";
import { saveAs } from "file-saver";

export type PhotoZipEntry = { zipPath: string; url: string };

export async function downloadPhotosAsZip(
  zipBaseName: string,
  entries: PhotoZipEntry[],
): Promise<{ ok: true; count: number } | { ok: false; error: string; count: number }> {
  if (entries.length === 0) {
    return { ok: false, error: "Brak zdjęć do spakowania", count: 0 };
  }

  const zip = new JSZip();
  const used = new Set<string>();
  let added = 0;
  const failures: string[] = [];

  for (const entry of entries) {
    let path = entry.zipPath;
    let n = 2;
    while (used.has(path)) {
      const dot = path.lastIndexOf(".");
      path = dot > 0 ? `${path.slice(0, dot)}-${n}${path.slice(dot)}` : `${path}-${n}`;
      n++;
    }
    used.add(path);

    try {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      zip.file(path, await res.blob());
      added++;
    } catch {
      failures.push(path);
    }
  }

  if (added === 0) {
    return { ok: false, error: "Nie udało się pobrać żadnego zdjęcia", count: 0 };
  }

  if (failures.length > 0) {
    zip.file(
      "UWAGA-brakujace.txt",
      `Nie pobrano ${failures.length} plik(ów):\n${failures.map((f) => `- ${f}`).join("\n")}`,
    );
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const safe = zipBaseName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 80);
  saveAs(blob, `${safe}.zip`);
  return { ok: true, count: added };
}
