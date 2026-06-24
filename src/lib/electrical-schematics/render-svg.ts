import {
  assertApartment1fRenderable,
  renderApartment1fV1Svg,
} from "@/lib/electrical-schematics/layout/apartment-1f-v1";
import {
  assertApartment3fRenderable,
  renderApartment3fV1Svg,
} from "@/lib/electrical-schematics/layout/apartment-3f-v1";
import { parseSingleLineDiagram } from "@/lib/electrical-schematics/normalize";
import type { SingleLineDiagram } from "@/lib/electrical-schematics/types";

/** Wersja renderera SVG — bump przy zmianie layoutu/symboli. */
export const SCHEMATIC_RENDER_VERSION = 2;

export class SchematicRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchematicRenderError";
  }
}

export interface RenderSchematicSvgResult {
  svg: string;
  renderVersion: number;
}

function dispatchLayout(diagram: SingleLineDiagram): string {
  switch (diagram.layoutProfile) {
    case "apartment-3f-v1":
      assertApartment3fRenderable(diagram);
      return renderApartment3fV1Svg(diagram);
    case "apartment-1f-v1":
      assertApartment1fRenderable(diagram);
      return renderApartment1fV1Svg(diagram);
    default:
      throw new SchematicRenderError(`Unsupported layoutProfile: ${diagram.layoutProfile}`);
  }
}

/** Główny entry point — SingleLineDiagram → SVG string. */
export function renderSchematicSvg(diagram: SingleLineDiagram): string {
  const normalized = parseSingleLineDiagram(diagram);
  if (!normalized) throw new SchematicRenderError("Invalid SingleLineDiagram");
  return dispatchLayout(normalized);
}

/** SVG + renderVersion (cache KV: renderedSvg / renderVersion). */
export function renderSchematicSvgWithMeta(diagram: SingleLineDiagram): RenderSchematicSvgResult {
  return {
    svg: renderSchematicSvg(diagram),
    renderVersion: SCHEMATIC_RENDER_VERSION,
  };
}

/** Zapisuje cache renderu na diagramie (bez mutacji wejścia). */
export function attachRenderedSvgCache(diagram: SingleLineDiagram): SingleLineDiagram {
  const { svg, renderVersion } = renderSchematicSvgWithMeta(diagram);
  return {
    ...diagram,
    renderedSvg: svg,
    renderVersion,
    updatedAt: diagram.updatedAt,
  };
}
