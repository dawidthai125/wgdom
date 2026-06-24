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

/** Wieloliniowa etykieta (pozioma) — linie jedna pod drugą. */
export function svgTextStack(
  x: number,
  y: number,
  lines: string[],
  options: { anchor?: "start" | "middle" | "end"; size?: number; lineHeight?: number } = {},
): string {
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size + 2;
  return lines
    .map((line, i) => svgText(x, y + i * lineHeight, line, { anchor: options.anchor, size }))
    .join("\n");
}

export function svgLine(x1: number, y1: number, x2: number, y2: number, stroke = 1): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="${stroke}" />`;
}

/** Kropki przyłączeń na szynach (V2: większe). */
export const SVG_DOT_RADIUS_BUS = 6;

export function svgDot(cx: number, cy: number, r = 3): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" />`;
}

/** Pionowa linia pomocnicza pod kolumną obwodu (bardzo jasna). */
export function svgColumnGuide(x: number, y1: number, y2: number): string {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#e8e8e8" stroke-width="0.75" />`;
}

export function formatBreakerLabelLines(
  breakerType: string,
  ratedCurrentA: number,
  poles: number,
  ka: number,
): [string, string, string] {
  return [`${breakerType}${ratedCurrentA}A`, `${poles}P`, `${ka}kA`];
}

export function formatRcdLabelLines(
  ratedCurrentA: number,
  sensitivityMa: number,
  poles: number,
  rcdType: string,
): [string, string, string, string] {
  return [`${ratedCurrentA}A`, `${sensitivityMa}mA`, `${poles}P`, rcdType];
}

/** @deprecated single-line — użyj formatBreakerLabelLines w rendererze V1A+ */
export function formatMainBreakerLabel(breakerType: string, ratedCurrentA: number, poles: number, ka: number): string {
  return `${breakerType}${ratedCurrentA}A ${poles}P ${ka}kA`;
}

/** @deprecated single-line — użyj formatBreakerLabelLines w rendererze V1A+ */
export function formatMcbLabel(breakerType: string, ratedCurrentA: number, poles: number, ka: number): string {
  return `${breakerType}${ratedCurrentA}A ${poles}P ${ka}kA`;
}

/** @deprecated single-line — użyj formatRcdLabelLines w rendererze V1A+ */
export function formatRcdLabel(
  ratedCurrentA: number,
  sensitivityMa: number,
  poles: number,
  rcdType: string,
): string {
  return `${ratedCurrentA}A ${sensitivityMa}mA ${poles}P ${rcdType}`;
}
