/**
 * APF HTTP guard — exact route · HTTPS · no redirect escape · bounded budget.
 */

import {
  APF_HTTP_MAX_REQUESTS_PER_RESEARCH,
  apfAuthorizedRouteHostsMatch,
  apfAuthorizedUrlsMatch,
  isApfAuthorizedHost,
  resolveApfAuthorizedRouteByUrl,
} from "./apf-source-authorization";

export type ApfHttpGuardRejectReason =
  | "NOT_HTTPS"
  | "HOST_NOT_AUTHORIZED"
  | "URL_NOT_AUTHORIZED"
  | "REDIRECT_ESCAPE"
  | "REQUEST_BUDGET_EXCEEDED";

export type ApfHttpGuardResult =
  | {
      ok: true;
      requestUrl: string;
      finalUrl: string;
      route: NonNullable<ReturnType<typeof resolveApfAuthorizedRouteByUrl>>;
    }
  | { ok: false; reason: ApfHttpGuardRejectReason; messagePl: string };

export function validateApfHttpRequest(input: {
  requestUrl: string;
  finalUrl?: string | null;
  requestCount?: number;
}): ApfHttpGuardResult {
  const requestCount = input.requestCount ?? 1;
  if (requestCount > APF_HTTP_MAX_REQUESTS_PER_RESEARCH) {
    return {
      ok: false,
      reason: "REQUEST_BUDGET_EXCEEDED",
      messagePl: "Przekroczono bounded request budget APF (max 1 URL).",
    };
  }

  let request: URL;
  try {
    request = new URL(input.requestUrl);
  } catch {
    return {
      ok: false,
      reason: "URL_NOT_AUTHORIZED",
      messagePl: "Nieprawidłowy URL żądania APF.",
    };
  }

  if (request.protocol !== "https:") {
    return {
      ok: false,
      reason: "NOT_HTTPS",
      messagePl: "APF dopuszcza wyłącznie HTTPS.",
    };
  }

  if (request.search.length > 0 || request.hash.length > 0) {
    return {
      ok: false,
      reason: "URL_NOT_AUTHORIZED",
      messagePl:
        "Query string / hash niedozwolone — APF wymaga literal exact URL bez parametrów.",
    };
  }

  if (!isApfAuthorizedHost(request.hostname)) {
    return {
      ok: false,
      reason: "HOST_NOT_AUTHORIZED",
      messagePl: `Host ${request.hostname} nie jest autoryzowany dla APF.`,
    };
  }

  const route = resolveApfAuthorizedRouteByUrl(input.requestUrl);
  if (!route) {
    return {
      ok: false,
      reason: "URL_NOT_AUTHORIZED",
      messagePl: "URL nie jest na liście autoryzowanych tras APF (exact match).",
    };
  }

  const finalUrl = String(input.finalUrl ?? input.requestUrl);
  let final: URL;
  try {
    final = new URL(finalUrl);
  } catch {
    return {
      ok: false,
      reason: "REDIRECT_ESCAPE",
      messagePl: "Nieprawidłowy final URL po fetch.",
    };
  }

  if (final.protocol !== "https:") {
    return {
      ok: false,
      reason: "NOT_HTTPS",
      messagePl: "Redirect poza HTTPS — zablokowany.",
    };
  }

  if (final.search.length > 0 || final.hash.length > 0) {
    return {
      ok: false,
      reason: "REDIRECT_ESCAPE",
      messagePl: "Final URL z query/hash — zablokowany.",
    };
  }

  if (!isApfAuthorizedHost(final.hostname)) {
    return {
      ok: false,
      reason: "REDIRECT_ESCAPE",
      messagePl: "Redirect na nieautoryzowany host — zablokowany.",
    };
  }

  if (!apfAuthorizedUrlsMatch(finalUrl, route.url) && !apfAuthorizedRouteHostsMatch(finalUrl, route.url)) {
    return {
      ok: false,
      reason: "REDIRECT_ESCAPE",
      messagePl: "Redirect poza autoryzowany exact URL — zablokowany.",
    };
  }

  return {
    ok: true,
    requestUrl: input.requestUrl,
    finalUrl,
    route,
  };
}
