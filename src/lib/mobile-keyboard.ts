let initialized = false;

function updateKeyboardInset() {
  const vv = window.visualViewport;
  if (!vv) {
    document.documentElement.style.setProperty("--keyboard-inset", "0px");
    document.documentElement.classList.remove("keyboard-open");
    return;
  }
  const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
  document.documentElement.classList.toggle("keyboard-open", inset > 48);
}

function onFocusIn(e: FocusEvent) {
  const t = e.target;
  if (
    !(t instanceof HTMLInputElement) &&
    !(t instanceof HTMLTextAreaElement) &&
    !(t instanceof HTMLSelectElement)
  ) {
    return;
  }
  if (t.type === "checkbox" || t.type === "radio" || t.type === "range") return;
  window.setTimeout(() => {
    t.scrollIntoView({ block: "center", behavior: "auto" });
  }, 320);
}

/** iOS/Android — wysokość klawiatury + przewinięcie aktywnego pola. */
export function initMobileKeyboard(): () => void {
  if (initialized || typeof window === "undefined") return () => {};
  initialized = true;

  const vv = window.visualViewport;
  vv?.addEventListener("resize", updateKeyboardInset);
  vv?.addEventListener("scroll", updateKeyboardInset);
  document.addEventListener("focusin", onFocusIn);
  updateKeyboardInset();

  return () => {
    vv?.removeEventListener("resize", updateKeyboardInset);
    vv?.removeEventListener("scroll", updateKeyboardInset);
    document.removeEventListener("focusin", onFocusIn);
    document.documentElement.style.setProperty("--keyboard-inset", "0px");
    document.documentElement.classList.remove("keyboard-open");
    initialized = false;
  };
}
