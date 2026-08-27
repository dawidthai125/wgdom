/**
 * APF production fetch port — single authorized URL · redirect:manual · timeout.
 *
 * ALL real HTTP for APF MUST go through this adapter (via apf-http-research).
 * No crawling · no asset fetches · no redirect follow.
 */

import { APF_HTTP_TIMEOUT_MS } from "./apf-source-authorization";
import type { ApfHttpFetchPort } from "./apf-http-research";

function resolveRedirectFinalUrl(
  requestUrl: string,
  response: Response,
): string {
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location) {
      try {
        return new URL(location, requestUrl).href;
      } catch {
        return location;
      }
    }
  }
  return response.url || requestUrl;
}

/** Browser / Node fetch with manual redirect handling (no follow). */
export function createApfProductionFetchPort(): ApfHttpFetchPort {
  return {
    async fetch(url, init) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        APF_HTTP_TIMEOUT_MS,
      );
      try {
        const res = await fetch(url, {
          ...init,
          signal: init?.signal ?? controller.signal,
          redirect: "manual",
          headers: {
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "User-Agent": "WGDOM-APF/1.0 (controlled-research)",
          },
        });
        const finalUrl = resolveRedirectFinalUrl(url, res);
        const bodyText =
          res.status >= 300 && res.status < 400 ? "" : await res.text();
        return {
          ok: res.ok,
          status: res.status,
          finalUrl,
          bodyText,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
