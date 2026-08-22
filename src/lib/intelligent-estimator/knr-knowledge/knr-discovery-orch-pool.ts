/**
 * KL-7-P2C — Bounded concurrency pool (SHAPE from tender-discovery-fork).
 * Default max = KNR_DISCOVERY_ORCH_CONCURRENCY_MAX (3).
 */

import { KNR_DISCOVERY_ORCH_CONCURRENCY_MAX } from "./knr-discovery-orch-types";

export type KnrDiscoveryOrchPoolTelemetry = {
  maxInFlight: number;
  currentInFlight: number;
};

/**
 * Run async tasks with a hard concurrency cap.
 * Returns results in input order.
 */
export async function runWithKnrDiscoveryOrchPool<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  options: {
    concurrency?: number;
    onTelemetry?: (t: KnrDiscoveryOrchPoolTelemetry) => void;
  } = {},
): Promise<T[]> {
  const concurrency = Math.max(
    1,
    Math.min(
      options.concurrency ?? KNR_DISCOVERY_ORCH_CONCURRENCY_MAX,
      KNR_DISCOVERY_ORCH_CONCURRENCY_MAX,
    ),
  );
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  let inFlight = 0;
  let maxInFlight = 0;

  await new Promise<void>((resolve, reject) => {
    const pump = () => {
      while (inFlight < concurrency && nextIndex < tasks.length) {
        const i = nextIndex++;
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        options.onTelemetry?.({ maxInFlight, currentInFlight: inFlight });
        tasks[i]!()
          .then((value) => {
            results[i] = value;
            inFlight -= 1;
            options.onTelemetry?.({ maxInFlight, currentInFlight: inFlight });
            if (nextIndex >= tasks.length && inFlight === 0) resolve();
            else pump();
          })
          .catch(reject);
      }
      if (tasks.length === 0) resolve();
    };
    pump();
  });

  return results;
}

export const KNR_DISCOVERY_ORCH_POOL_P2C_IMPLEMENTED = true as const;
