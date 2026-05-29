import { useEffect, useRef, useState, type RefObject } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 72;

export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
  enabled: boolean,
) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const resetPull = () => {
      pullRef.current = 0;
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 6) return;
      startYRef.current = e.touches[0].clientY;
      trackingRef.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!trackingRef.current || refreshingRef.current) return;
      if (el.scrollTop > 6) {
        trackingRef.current = false;
        resetPull();
        return;
      }
      const dy = Math.max(0, e.touches[0].clientY - startYRef.current);
      const damped = Math.min(dy * 0.5, 100);
      pullRef.current = damped;
      setPull(damped);
      if (damped > 10) e.preventDefault();
    };

    const onEnd = async () => {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      const pulled = pullRef.current;
      resetPull();
      if (pulled < PULL_THRESHOLD) return;
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollRef, enabled]);

  return { pull, refreshing, ready: pull >= PULL_THRESHOLD };
}

export function PullToRefreshIndicator({
  pull,
  refreshing,
  ready,
}: {
  pull: number;
  refreshing: boolean;
  ready: boolean;
}) {
  if (pull <= 0 && !refreshing) return null;
  const opacity = refreshing ? 1 : Math.min(1, pull / PULL_THRESHOLD);
  return (
    <div
      className="flex flex-col items-center justify-center pointer-events-none transition-all duration-150"
      style={{ height: refreshing ? 40 : Math.max(0, pull * 0.6), marginBottom: pull > 0 || refreshing ? 4 : 0 }}
      aria-hidden
    >
      <RefreshCw
        size={20}
        className={`text-primary ${refreshing ? "animate-spin" : ""}`}
        style={{
          opacity,
          transform: refreshing ? undefined : `rotate(${Math.min(360, pull * 3)}deg)`,
          color: ready && !refreshing ? "var(--primary)" : undefined,
        }}
      />
      {!refreshing && pull > 24 && (
        <p className="text-[10px] text-muted-foreground mt-1" style={{ opacity }}>
          {ready ? "Puść, aby odświeżyć" : "Ciągnij w dół…"}
        </p>
      )}
    </div>
  );
}
