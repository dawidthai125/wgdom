/**
 * APF controlled HTTP research — injectable fetch · bounded budget · fail-closed.
 */

import { validateApfHttpRequest } from "./apf-http-guard";
import { parseApfMeasurementPriceHtml } from "./apf-measurement-html-parse";
import { selectApfMeasurementRowsForQuery } from "./apf-measurement-semantic-match";
import { evaluateApfEphemeralSelectiveResearchPolicy } from "./apf-ephemeral-selective-research-policy";
import {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  resolveApfFetchUrlForRoute,
  type ApfEphemeralSelectiveAuthorizedRoute,
} from "./apf-source-authorization";
import { apfDistinctIdentityKey } from "./query";
import type {
  ApfLaborMarketObservation,
  ApfLaborMarketPortResult,
  ApfResearchQuery,
} from "./types";

export type ApfHttpFetchResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
  bodyText: string;
};

export type ApfHttpFetchPort = {
  fetch(url: string, init?: { signal?: AbortSignal }): Promise<ApfHttpFetchResult>;
};

export type RunApfAuthorizedHttpResearchInput = {
  query: ApfResearchQuery;
  fetchPort: ApfHttpFetchPort;
  routes?: readonly ApfEphemeralSelectiveAuthorizedRoute[];
  observedAt?: string;
  /** When true, include SECONDARY route observations (never averaged in candidate). */
  includeSecondary?: boolean;
};

function rowToObservation(
  row: ReturnType<typeof parseApfMeasurementPriceHtml>[number],
  route: ApfEphemeralSelectiveAuthorizedRoute,
  query: ApfResearchQuery,
  observedAt: string,
): ApfLaborMarketObservation {
  const slug = row.descriptionPl
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);
  return {
    evidenceId: `apf-${route.sourceId}-${slug}-${row.unitRatePln}`,
    unitRatePln: row.unitRatePln,
    unit: query.unit,
    sourceUnit: row.sourceUnit,
    sourceId: route.sourceId,
    sourceUrl: route.url,
    sourceRole: route.role,
    pricingBasis: row.pricingBasis,
    netGross: row.netGross,
    laborOnly: true,
    observedAt,
    summaryPl: row.descriptionPl,
    distinctKey: apfDistinctIdentityKey(query),
    tableCode: null,
    knrInferred: false,
  };
}

export async function runApfAuthorizedHttpResearch(
  input: RunApfAuthorizedHttpResearchInput,
): Promise<ApfLaborMarketPortResult & { routesAttempted: string[] }> {
  const policy = evaluateApfEphemeralSelectiveResearchPolicy({
    unit: input.query.unit,
  });
  if (policy.policyAuthorization !== "GRANTED" || !policy.routeAuthorized) {
    return {
      status: "NO_SOURCES",
      observations: [],
      httpCalls: 0,
      messagePl: "Brak autoryzowanej trasy APF — NO_SOURCES.",
      routesAttempted: [],
    };
  }

  const routes =
    input.routes ??
    APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES.filter(
      (r) => r.role === "PRIMARY" || (input.includeSecondary && r.role === "SECONDARY"),
    );

  const observedAt = input.observedAt ?? new Date().toISOString().slice(0, 10);
  const observations: ApfLaborMarketObservation[] = [];
  const routesAttempted: string[] = [];
  let httpCalls = 0;

  for (const route of routes) {
    if (httpCalls >= 1) break;

    const fetchUrl = resolveApfFetchUrlForRoute(route);

    const guard = validateApfHttpRequest({
      requestUrl: fetchUrl,
      requestCount: httpCalls + 1,
    });
    if (!guard.ok) {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls,
        messagePl: guard.messagePl,
        routesAttempted,
      };
    }

    routesAttempted.push(`${route.sourceId}::${route.categoryKey}`);

    let bodyText = "";
    let finalUrl = route.url;
    try {
      const res = await input.fetchPort.fetch(fetchUrl);
      httpCalls += 1;
      if (!res.ok || res.status < 200 || res.status >= 300) {
        return {
          status: "NO_SOURCES",
          observations: [],
          httpCalls,
          messagePl: `APF HTTP ${res.status} — parser failure / NO_SOURCES.`,
          routesAttempted,
        };
      }
      bodyText = res.bodyText;
      finalUrl = res.finalUrl;
    } catch {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls,
        messagePl: "APF HTTP timeout/error — NO_SOURCES.",
        routesAttempted,
      };
    }

    const redirectGuard = validateApfHttpRequest({
      requestUrl: fetchUrl,
      finalUrl,
      requestCount: httpCalls,
    });
    if (!redirectGuard.ok) {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls,
        messagePl: redirectGuard.messagePl,
        routesAttempted,
      };
    }

    const parsed = parseApfMeasurementPriceHtml({
      html: bodyText,
      sourceId: route.sourceId,
      sourceUrl: route.url,
    });
    if (!parsed.length) {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls,
        messagePl: "Parser APF: brak wierszy PER_MEASUREMENT — NO_SOURCES.",
        routesAttempted,
      };
    }

    const matched = selectApfMeasurementRowsForQuery({
      queryDescription: input.query.description,
      queryUnit: input.query.unit,
      rows: parsed,
    });
    if (!matched.length) {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls,
        messagePl: "Content mismatch / brak dopasowania semantycznego — NO_SOURCES.",
        routesAttempted,
      };
    }

    for (const row of matched) {
      observations.push(rowToObservation(row, route, input.query, observedAt));
    }
  }

  if (!observations.length) {
    return {
      status: "NO_SOURCES",
      observations: [],
      httpCalls,
      messagePl: "Brak kwalifikujących obserwacji APF.",
      routesAttempted,
    };
  }

  return {
    status: "OK",
    observations,
    httpCalls,
    routesAttempted,
  };
}
