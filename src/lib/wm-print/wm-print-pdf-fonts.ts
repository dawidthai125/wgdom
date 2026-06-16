/** Noto Sans — czcionka dla generatorów PDF WM Druk (ZI Tauron 2026). */
const ZI_PDF_FONT_PATH = "/fonts/NotoSans-Regular.ttf";

let cachedZiPdfFontBytes: Uint8Array | null = null;

export async function loadWmPrintZiPdfFontBytes(): Promise<Uint8Array> {
  if (cachedZiPdfFontBytes) return cachedZiPdfFontBytes;

  if (typeof window === "undefined") {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    cachedZiPdfFontBytes = new Uint8Array(
      readFileSync(join(process.cwd(), "public", ZI_PDF_FONT_PATH.slice(1))),
    );
    return cachedZiPdfFontBytes;
  }

  const res = await fetch(ZI_PDF_FONT_PATH);
  if (!res.ok) throw new Error(`Nie udało się wczytać czcionki PDF: ${ZI_PDF_FONT_PATH}`);
  cachedZiPdfFontBytes = new Uint8Array(await res.arrayBuffer());
  return cachedZiPdfFontBytes;
}
