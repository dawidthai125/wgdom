let initialized = false;

function isDesktopViewport(): boolean {
  return window.matchMedia("(min-width: 768px)").matches;
}

/** Wysokość i offset widocznego obszaru — tylko desktop admin (Chrome, zoom, pasek zakładek). */
function updateAppViewport() {
  if (!isDesktopViewport()) {
    document.documentElement.style.removeProperty("--app-height");
    document.documentElement.style.removeProperty("--app-viewport-offset-top");
    return;
  }

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--app-viewport-offset-top", `${Math.round(offsetTop)}px`);

  if (window.scrollY > 0) {
    window.scrollTo(0, 0);
  }
}

export function initAppViewport(): () => void {
  if (initialized || typeof window === "undefined") return () => {};
  initialized = true;

  updateAppViewport();
  window.visualViewport?.addEventListener("resize", updateAppViewport);
  window.visualViewport?.addEventListener("scroll", updateAppViewport);
  window.addEventListener("resize", updateAppViewport);

  return () => {
    window.visualViewport?.removeEventListener("resize", updateAppViewport);
    window.visualViewport?.removeEventListener("scroll", updateAppViewport);
    window.removeEventListener("resize", updateAppViewport);
    document.documentElement.style.removeProperty("--app-height");
    document.documentElement.style.removeProperty("--app-viewport-offset-top");
    initialized = false;
  };
}
