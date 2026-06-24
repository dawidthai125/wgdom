import type { SchematicStatus } from "@/lib/electrical-schematics/types";

export const SCHEMATIC_PDF_RASTER_SCALE = 2;

export const SCHEMATIC_DRAFT_WATERMARK_TEXT = "WERSJA ROBOCZA";

/** Rysuje watermark draft na canvas (DESIGN FREEZE § D.2). */
export function drawDraftWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text = SCHEMATIC_DRAFT_WATERMARK_TEXT,
): void {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-45 * Math.PI) / 180);
  ctx.font = "bold 52px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(120, 120, 120, 0.3)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

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
 * Draft: watermark WERSJA ROBOCZA; final: brak watermark.
 */
export async function rasterizeSchematicSvgToPng(
  svg: string,
  width: number,
  height: number,
  status: SchematicStatus,
  scale = SCHEMATIC_PDF_RASTER_SCALE,
): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error("rasterizeSchematicSvgToPng requires browser DOM (canvas)");
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

  if (status === "draft") {
    drawDraftWatermarkOnCanvas(ctx, width, height);
  }

  return dataUrlToBytes(canvas.toDataURL("image/png"));
}

/** Node / smoke — raster przez Playwright (devDependency). */
export async function rasterizeSchematicSvgToPngPlaywright(
  svg: string,
  width: number,
  height: number,
  status: SchematicStatus,
  scale = SCHEMATIC_PDF_RASTER_SCALE,
): Promise<Uint8Array> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const bytes = await page.evaluate(
      async ({ svgMarkup, w, h, s, isDraft, watermarkText }) => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * s);
        canvas.height = Math.round(h * s);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");

        ctx.scale(s, s);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);

        const img = new Image();
        const url = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }));
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("svg load fail"));
          img.src = url;
        });
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        if (isDraft) {
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate((-45 * Math.PI) / 180);
          ctx.font = "bold 52px Arial, Helvetica, sans-serif";
          ctx.fillStyle = "rgba(120, 120, 120, 0.3)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }

        const data = canvas.toDataURL("image/png").split(",")[1] ?? "";
        const binary = atob(data);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        return Array.from(arr);
      },
      {
        svgMarkup: svg,
        w: width,
        h: height,
        s: scale,
        isDraft: status === "draft",
        watermarkText: SCHEMATIC_DRAFT_WATERMARK_TEXT,
      },
    );
    return new Uint8Array(bytes);
  } finally {
    await browser.close();
  }
}
