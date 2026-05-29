let initialized = false;

/** Wysokość i offset widocznego obszaru (Chrome, zoom, pasek zakładek, PWA). */
function updateAppViewport() {
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--app-viewport-offset-top", `${Math.round(offsetTop)}px`);

  // Desktop: przypadkowy scroll dokumentu chowa górny pasek pod UI przeglądarki
  if (window.matchMedia("(min-width: 768px)").matches && window.scrollY > 0) {
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
