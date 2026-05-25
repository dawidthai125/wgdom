/** Nakładka daty i adresu na zdjęciu przed wysłaniem. */
export async function watermarkedFile(file: File, lines: string[]): Promise<File> {
  const textLines = lines.map((l) => l.trim()).filter(Boolean);
  if (textLines.length === 0) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pad = Math.max(10, Math.round(canvas.width * 0.025));
  const fontSize = Math.max(13, Math.round(canvas.width * 0.032));
  ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  const lineH = fontSize + 5;
  const boxH = textLines.length * lineH + pad * 2;

  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(0, canvas.height - boxH, canvas.width, boxH);
  ctx.fillStyle = "#ffffff";
  textLines.forEach((line, i) => {
    ctx.fillText(line, pad, canvas.height - boxH + pad + fontSize + i * lineH);
  });

  const mime = file.type || "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.9));
  if (!blob) return file;
  return new File([blob], file.name, { type: mime });
}

export function jobWatermarkLines(address: string, flatNumber: string): string[] {
  const addr = `${address || "Robota"}${flatNumber ? ` m.${flatNumber}` : ""}`;
  const date = new Date().toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return [addr, date, "W&G DOM"];
}
