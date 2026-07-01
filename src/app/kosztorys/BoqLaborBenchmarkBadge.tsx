import type { LaborBenchmarkComparison } from "@/lib/labor-benchmark";
import { LaborBenchmarkStatusBadge } from "@/app/LaborBenchmarkUi";

/** NG-04.2 #006 · NG-04.4 B-01 — adapter cache → badge; empty → „—”. */
export function BoqLaborBenchmarkBadge({
  rowKey,
  cache,
}: {
  rowKey: string;
  cache: ReadonlyMap<string, LaborBenchmarkComparison>;
}) {
  const comparison = cache.get(rowKey);
  if (!comparison) {
    return <span className="text-muted-foreground font-mono">—</span>;
  }

  return (
    <span data-kosztorys-boq-benchmark={comparison.status}>
      <LaborBenchmarkStatusBadge comparison={comparison} compact />
    </span>
  );
}
