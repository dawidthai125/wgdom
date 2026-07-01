import type { LaborBenchmarkComparison } from "@/lib/labor-benchmark";
import { LaborBenchmarkStatusBadge } from "@/app/LaborBenchmarkUi";

/** NG-04.2 #006 — jedyny adapter cache → LaborBenchmarkStatusBadge (lookup only). */
export function BoqLaborBenchmarkBadge({
  rowKey,
  cache,
}: {
  rowKey: string;
  cache: ReadonlyMap<string, LaborBenchmarkComparison>;
}) {
  const comparison = cache.get(rowKey);
  if (!comparison) return null;

  return (
    <span data-kosztorys-boq-benchmark={comparison.status}>
      <LaborBenchmarkStatusBadge comparison={comparison} compact />
    </span>
  );
}
