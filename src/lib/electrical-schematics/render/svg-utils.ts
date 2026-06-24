/** Pomocnicze funkcje SVG — WM-SCHEMATY-V1 renderer. */

export function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function svgText(
  x: number,
  y: number,
  text: string,
  options: { anchor?: "start" | "middle" | "end"; size?: number; rotate?: number } = {},
): string {
  const anchor = options.anchor ?? "start";
  const size = options.size ?? 11;
  const safe = escapeXml(text);
  if (options.rotate) {
    return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" text-anchor="${anchor}" transform="rotate(${options.rotate} ${x} ${y})">${safe}</text>`;
  }
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" text-anchor="${anchor}">${safe}</text>`;
}

export function svgLine(x1: number, y1: number, x2: number, y2: number, stroke = 1): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="${stroke}" />`;
}

export function svgDot(cx: number, cy: number, r = 3): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" />`;
}

export function formatMainBreakerLabel(breakerType: string, ratedCurrentA: number, poles: number, ka: number): string {
  return `${breakerType}${ratedCurrentA}A ${poles}P ${ka}kA`;
}

export function formatMcbLabel(breakerType: string, ratedCurrentA: number, poles: number, ka: number): string {
  return `${breakerType}${ratedCurrentA}A ${poles}P ${ka}kA`;
}

export function formatRcdLabel(
  ratedCurrentA: number,
  sensitivityMa: number,
  poles: number,
  rcdType: string,
): string {
  return `${ratedCurrentA}A ${sensitivityMa}mA ${poles}P ${rcdType}`;
}
