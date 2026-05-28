import { Capacitor } from "@capacitor/core";

export type DeepLinkRoute =
  | { type: "job"; jobId: string }
  | { type: "payroll"; empId?: string };

let pendingRoute: DeepLinkRoute | null = null;

export function consumePendingDeepLink(): DeepLinkRoute | null {
  const route = pendingRoute;
  pendingRoute = null;
  return route;
}

export function parseDeepLink(raw: string): DeepLinkRoute | null {
  try {
    const url = new URL(raw);

    if (url.protocol === "wgdom:") {
      const host = url.hostname.toLowerCase();
      const parts = url.pathname.split("/").filter(Boolean);

      if (host === "job" || host === "jobs") {
        const id = parts[0] || url.searchParams.get("id");
        if (id) return { type: "job", jobId: id };
      }
      if (host === "payroll" || host === "placa") {
        const empId = parts[0] || url.searchParams.get("emp") || undefined;
        return { type: "payroll", empId };
      }
    }

    if (url.hostname === "wgdom.fun" || url.hostname.endsWith(".vercel.app")) {
      const m = url.pathname.match(/^\/open\/job\/([^/]+)/);
      if (m?.[1]) return { type: "job", jobId: m[1] };
      const m2 = url.pathname.match(/^\/open\/payroll\/?([^/]*)/);
      if (m2) return { type: "payroll", empId: m2[1] || undefined };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function dispatchRoute(route: DeepLinkRoute) {
  pendingRoute = route;
  window.dispatchEvent(new CustomEvent("wgdom-deeplink", { detail: route }));
}

/** Deep linki natywne (wgdom://) i web (/open/job/…). */
export function initDeepLinks(): () => void {
  if (typeof window === "undefined") return () => {};

  const params = new URLSearchParams(window.location.search);
  const open = params.get("open");
  const id = params.get("id");
  if (open === "job" && id) dispatchRoute({ type: "job", jobId: id });
  else if (open === "payroll") dispatchRoute({ type: "payroll", empId: params.get("emp") || undefined });

  if (!Capacitor.isNativePlatform()) return () => {};

  let removeOpen: (() => void) | undefined;

  void import("@capacitor/app").then(({ App }) => {
    void App.getLaunchUrl().then((result) => {
      if (result?.url) {
        const route = parseDeepLink(result.url);
        if (route) dispatchRoute(route);
      }
    });

    App.addListener("appUrlOpen", ({ url }) => {
      const route = parseDeepLink(url);
      if (route) dispatchRoute(route);
    }).then((handle) => {
      removeOpen = () => void handle.remove();
    });
  });

  return () => removeOpen?.();
}
