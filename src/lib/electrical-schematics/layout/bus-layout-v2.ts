/** V2 — rozciągnięcie kolumn na pełną szerokość + dynamiczna szyna (bez stałego busEndX). */

export interface BusLayoutV2Options {
  viewBoxWidth: number;
  feedBackboneX: number;
  marginX: number;
  minCircuitSpacing: number;
  busColumnTail: number;
}

export interface BusLayoutV2Result {
  columnXs: number[];
  busStartX: number;
  busEndX: number;
}

/**
 * Kolumny równomiernie na [feedBackboneX … width−marginX].
 * Szyna: min(backbone, pierwsza kolumna) → ostatnia kolumna + tail.
 */
export function resolveBusLayoutV2(count: number, options: BusLayoutV2Options): BusLayoutV2Result {
  const { viewBoxWidth, feedBackboneX, marginX, minCircuitSpacing, busColumnTail } = options;
  const layoutEndX = viewBoxWidth - marginX;

  if (count <= 0) {
    return { columnXs: [], busStartX: feedBackboneX, busEndX: layoutEndX };
  }

  if (count === 1) {
    const x = feedBackboneX + (layoutEndX - feedBackboneX) / 2;
    return {
      columnXs: [x],
      busStartX: Math.min(feedBackboneX, x),
      busEndX: x + busColumnTail,
    };
  }

  const layoutStartX = feedBackboneX;
  const span = layoutEndX - layoutStartX;
  const spacing = span / (count - 1);
  if (spacing < minCircuitSpacing) {
    throw new Error(
      `Layout V2: ${count} circuits need spacing ${spacing.toFixed(1)}px < min ${minCircuitSpacing}px`,
    );
  }

  const columnXs = Array.from({ length: count }, (_, i) => layoutStartX + i * spacing);
  const firstX = columnXs[0];
  const lastX = columnXs[count - 1];

  return {
    columnXs,
    busStartX: Math.min(feedBackboneX, firstX),
    busEndX: lastX + busColumnTail,
  };
}
