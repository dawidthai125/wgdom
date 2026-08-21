/**
 * TenderDetailPage hook — async Historical Executed index for IkEntryHost.
 *
 * Initial null ⇒ HISTORICAL_MISS · never blocks tender analysis.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "@/app/app-domain";
import type { HistoricalExecutedIndex } from "./historical-executed-types";
import {
  fingerprintHistoricalAthCandidates,
  discoverHistoricalExecutedAthCandidates,
} from "./historical-executed-discover";
import {
  hydrateHistoricalExecutedIndexFromJobs,
  type HistoricalHydrateReport,
} from "./historical-executed-host-hydrate";

export type UseHistoricalExecutedHostIndexResult = {
  /** null while loading or when no usable history — Expert treats as MISS. */
  historicalIndex: HistoricalExecutedIndex | null;
  status: "idle" | "loading" | "ready" | "empty";
  report: HistoricalHydrateReport | null;
};

export function useHistoricalExecutedHostIndex(
  jobs: readonly Job[] | null | undefined,
  enabled = true,
): UseHistoricalExecutedHostIndexResult {
  const [historicalIndex, setHistoricalIndex] = useState<HistoricalExecutedIndex | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty">("idle");
  const [report, setReport] = useState<HistoricalHydrateReport | null>(null);
  const genRef = useRef(0);
  /** Latest jobs for async hydrate — effect must NOT depend on jobs array identity. */
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const fingerprint = useMemo(() => {
    if (!enabled) return "";
    return fingerprintHistoricalAthCandidates(
      discoverHistoricalExecutedAthCandidates(jobs),
    );
  }, [jobs, enabled]);

  useEffect(() => {
    if (!enabled) {
      setHistoricalIndex(null);
      setStatus("idle");
      setReport(null);
      return;
    }

    const gen = ++genRef.current;
    setStatus("loading");
    // Keep prior index during reload; while loading first time stay null → MISS (non-blocking).
    if (!fingerprint) {
      setHistoricalIndex(null);
      setStatus("empty");
      setReport(null);
      return;
    }

    let cancelled = false;
    const jobsSnapshot = jobsRef.current;
    void (async () => {
      try {
        const result = await hydrateHistoricalExecutedIndexFromJobs({
          jobs: jobsSnapshot,
        });
        if (cancelled || gen !== genRef.current) return;
        setReport(result);
        if (result.index.occurrences.length === 0) {
          setHistoricalIndex(null);
          setStatus("empty");
        } else {
          setHistoricalIndex(result.index);
          setStatus("ready");
        }
      } catch {
        if (cancelled || gen !== genRef.current) return;
        setHistoricalIndex(null);
        setStatus("empty");
        setReport(null);
      }
    })();

    return () => {
      cancelled = true;
    };
    // DF/ARCH R2: fingerprint-stable — raw `jobs` ref churn must not cancel in-flight.
  }, [enabled, fingerprint]);

  return { historicalIndex, status, report };
}
