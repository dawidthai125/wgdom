import { useEffect, type RefObject } from "react";

function isScrollable(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  if (!/(auto|scroll|overlay)/.test(overflowY)) return false;
  return el.scrollHeight > el.clientHeight + 1;
}

function canConsumeScroll(el: HTMLElement, deltaY: number): boolean {
  if (Math.abs(deltaY) < 0.5) return false;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return false;
  if (deltaY > 0) return el.scrollTop < max - 1;
  return el.scrollTop > 0;
}

/** Szuka pierwszego przewijalnego rodzeństwa poniżej lub rodzica w drzewie flex. */
function findScrollTarget(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from;
  while (node) {
    const parent = node.parentElement;
    if (parent) {
      let afterSelf = false;
      for (const child of parent.children) {
        if (!(child instanceof HTMLElement)) continue;
        if (child === node) {
          afterSelf = true;
          continue;
        }
        if (afterSelf && isScrollable(child)) return child;
      }
      if (isScrollable(parent)) return parent;
    }
    node = parent;
  }
  return null;
}

/**
 * Przekierowuje scroll kółkiem z „martwej strefy” (nagłówek shrink-0)
 * do najbliższego kontenera overflow-y-auto — typowy układ flex w adminie.
 */
export function useWheelScrollForward(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const zone = ref.current;
    if (!zone) return;

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;

      let inner: HTMLElement | null = e.target instanceof HTMLElement ? e.target : null;
      while (inner && inner !== zone) {
        if (isScrollable(inner) && canConsumeScroll(inner, e.deltaY)) return;
        inner = inner.parentElement;
      }

      const scrollEl = findScrollTarget(zone);
      if (!scrollEl) return;

      const prev = scrollEl.scrollTop;
      scrollEl.scrollTop += e.deltaY;
      if (scrollEl.scrollTop !== prev) e.preventDefault();
    };

    zone.addEventListener("wheel", onWheel, { passive: false });
    return () => zone.removeEventListener("wheel", onWheel);
  }, [ref]);
}
