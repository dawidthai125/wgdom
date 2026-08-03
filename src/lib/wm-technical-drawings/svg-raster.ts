/** WM-RYSUNKI-01 P2 — SVG → PNG @2× (bez watermark). Wzorzec Schematy, thin copy. */

export const DRAWING_PDF_RASTER_SCALE = 2;

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * SVG → PNG @2× (browser canvas).
 * P2: bez watermark (DF OUT).
 */
export async function rasterizeDrawingSvgToPng(
  svg: string,
  width: number,
  height: number,
  scale = DRAWING_PDF_RASTER_SCALE,
): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error("rasterizeDrawingSvgToPng requires browser DOM (canvas)");
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const img = await loadSvgImage(svg);
  ctx.drawImage(img, 0, 0, width, height);

  return dataUrlToBytes(canvas.toDataURL("image/png"));
}
