import type { LaborBenchmarkComparison } from "@/lib/labor-benchmark";
import type { KosztorysBoqRowViewModel } from "@/lib/tender-kosztorys-boq-explorer";
import {
  formatBoqAthPrice,
  formatBoqWgdomLine,
  formatBoqWgdomUnit,
} from "@/lib/tender-kosztorys-boq-explorer";
import { BoqLaborBenchmarkBadge } from "@/app/kosztorys/BoqLaborBenchmarkBadge";

/** Many Views — wspólne pola mobile card / desktop table (Principle #001 · #006). */
export function boqRowMobileFields(
  row: KosztorysBoqRowViewModel,
  benchmarkCache: ReadonlyMap<string, LaborBenchmarkComparison>,
) {
  const benchmark = (
    <BoqLaborBenchmarkBadge rowKey={row.rowKey} cache={benchmarkCache} />
  );

  return [
    { label: "j.m.", value: row.unit || "—" },
    { label: "Ilość", value: row.quantity || "—" },
    { label: "KNR", value: row.knrHint || "—" },
    { label: "Cena ATH", value: formatBoqAthPrice(row.athUnitPrice) },
    { label: "Wartość ATH", value: formatBoqAthPrice(row.athTotal) },
    { label: "Cena WGDOM", value: formatBoqWgdomUnit(row.wgdomUnitPln) },
    { label: "Wartość WGDOM", value: formatBoqWgdomLine(row.wgdomLinePln, row.isUnknown) },
    { label: "Benchmark rbh", value: benchmark },
  ];
}

export function BoqRowDesktopCells({
  row,
  benchmarkCache,
}: {
  row: KosztorysBoqRowViewModel;
  benchmarkCache: ReadonlyMap<string, LaborBenchmarkComparison>;
}) {
  return (
    <>
      <td className="px-2 py-1.5 font-mono">{row.lp}</td>
      <td className="px-2 py-1.5">{row.description}</td>
      <td className="px-2 py-1.5">{row.unit || "—"}</td>
      <td className="px-2 py-1.5 text-right font-mono">{row.quantity || "—"}</td>
      <td className="px-2 py-1.5 font-mono text-[10px]">{row.knrHint || "—"}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqAthPrice(row.athUnitPrice)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqAthPrice(row.athTotal)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqWgdomUnit(row.wgdomUnitPln)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqWgdomLine(row.wgdomLinePln, row.isUnknown)}</td>
      <td className="px-2 py-1.5 text-right" data-kosztorys-boq-benchmark-cell>
        <BoqLaborBenchmarkBadge rowKey={row.rowKey} cache={benchmarkCache} />
      </td>
    </>
  );
}
