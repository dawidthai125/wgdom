/**
 * APF labor-market adapter — APF-only HTTP when fetchPort injected.
 *
 * Default port (no fetchPort) remains fail-closed NO_SOURCES (HTTP=0).
 * NORMAL work-rate gates unchanged — APF hosts NOT in KEEP-4.
 */

import {
  isWorkRateFullCatalogueForbidden,
  isWorkRateResearchAllowed,
} from "@/lib/work-catalog/work-rate-legal";
import { evaluateApfEphemeralSelectiveResearchPolicy } from "./apf-ephemeral-selective-research-policy";
import {
  runApfAuthorizedHttpResearch,
  type ApfHttpFetchPort,
} from "./apf-http-research";
import { createApfProductionFetchPort } from "./apf-production-fetch";
import { apfDistinctIdentityKey } from "./query";
import type {
  ApfLaborMarketObservation,
  ApfLaborMarketPort,
  ApfLaborMarketPortResult,
  ApfResearchQuery,
} from "./types";

export type CreateApfLaborMarketPortOptions = {
  fetchPort?: ApfHttpFetchPort | null;
  includeSecondary?: boolean;
  observedAt?: string;
};

function policyDeny(messagePl: string): ApfLaborMarketPortResult {
  return {
    status: "POLICY_DENY",
    observations: [],
    httpCalls: 0,
    messagePl,
  };
}

/** Default labor market port — fail-closed without fetchPort (HTTP=0). */
export function createDefaultApfLaborMarketPort(
  options?: CreateApfLaborMarketPortOptions,
): ApfLaborMarketPort {
  return createApfLaborMarketPort(options);
}

export function createApfLaborMarketPort(
  options?: CreateApfLaborMarketPortOptions,
): ApfLaborMarketPort {
  const fetchPort = options?.fetchPort ?? null;
  const includeSecondary = options?.includeSecondary ?? false;

  return {
    async research(query: ApfResearchQuery): Promise<ApfLaborMarketPortResult> {
      if (!isWorkRateResearchAllowed()) {
        return policyDeny(
          "Work Rate Legal Gate blokuje research — brak PASS / POLICY_DENY.",
        );
      }
      if (!isWorkRateFullCatalogueForbidden()) {
        return policyDeny(
          "Naruszenie invariant: full catalogue musi pozostać FORBIDDEN.",
        );
      }

      const policy = evaluateApfEphemeralSelectiveResearchPolicy({
        unit: query.unit,
      });
      if (policy.policyAuthorization !== "GRANTED") {
        return policyDeny(
          `APF policy DENIED (${policy.denyReason ?? policy.executionBlockReason}).`,
        );
      }
      if (!policy.executionPermitted || !policy.httpPermitted) {
        const distinct = apfDistinctIdentityKey(query);
        return {
          status: "NO_SOURCES",
          observations: [],
          httpCalls: 0,
          messagePl:
            `Brak autoryzowanej trasy APF (klucz ${distinct}, unit=${query.unit}). ` +
            "Execution blocked — NO_SOURCES.",
        };
      }

      if (!fetchPort) {
        const distinct = apfDistinctIdentityKey(query);
        return {
          status: "NO_SOURCES",
          observations: [],
          httpCalls: 0,
          messagePl:
            `APF HTTP adapter wymaga fetchPort (klucz ${distinct}). ` +
            "Bez fetchPort — NO_SOURCES (fail-closed).",
        };
      }

      const result = await runApfAuthorizedHttpResearch({
        query,
        fetchPort,
        includeSecondary,
        observedAt: options?.observedAt,
      });

      if (result.status !== "OK" || !result.observations.length) {
        return {
          status: "NO_SOURCES",
          observations: [],
          httpCalls: result.httpCalls,
          messagePl: result.messagePl ?? "Brak kwalifikujących obserwacji APF.",
        };
      }

      return {
        status: "OK",
        observations: result.observations,
        httpCalls: result.httpCalls,
      };
    },
  };
}

/** Production HTTP port — real fetch via APF adapter only. */
export function createProductionApfLaborMarketPort(
  options?: Omit<CreateApfLaborMarketPortOptions, "fetchPort">,
): ApfLaborMarketPort {
  return createApfHttpLaborMarketPort(createApfProductionFetchPort(), options);
}

/** Explicit HTTP port for Owner-authorized APF routes. */
export function createApfHttpLaborMarketPort(
  fetchPort: ApfHttpFetchPort,
  options?: Omit<CreateApfLaborMarketPortOptions, "fetchPort">,
): ApfLaborMarketPort {
  return createApfLaborMarketPort({ ...options, fetchPort });
}

/** Test helper — fixture market port (HTTP=0, no CatalogWork). */
export function createFixtureApfLaborMarketPort(
  observations: ApfLaborMarketObservation[],
): ApfLaborMarketPort {
  return {
    research(): ApfLaborMarketPortResult {
      if (!observations.length) {
        return {
          status: "EMPTY",
          observations: [],
          httpCalls: 0,
          messagePl: "Fixture port: brak obserwacji rynkowych.",
        };
      }
      return {
        status: "OK",
        observations,
        httpCalls: 0,
      };
    },
  };
}

/** Explicit policy-deny fixture (HTTP=0). */
export function createPolicyDenyApfLaborMarketPort(
  messagePl = "POLICY_DENY (test fixture)",
): ApfLaborMarketPort {
  return {
    research(): ApfLaborMarketPortResult {
      return {
        status: "POLICY_DENY",
        observations: [],
        httpCalls: 0,
        messagePl,
      };
    },
  };
}
