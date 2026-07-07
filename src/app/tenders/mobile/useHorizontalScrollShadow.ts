import { useEffect, useState, type RefObject } from "react";

export type HorizontalScrollShadow = {
  left: boolean;
  right: boolean;
};

export function useHorizontalScrollShadow(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): HorizontalScrollShadow {
  const [shadow, setShadow] = useState<HorizontalScrollShadow>({
    left: false,
    right: false,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) {
      setShadow({ left: false, right: false });
      return;
    }

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setShadow({
        left: el.scrollLeft > 4,
        right: maxScroll > 4 && el.scrollLeft < maxScroll - 4,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef, enabled]);

  return shadow;
}
