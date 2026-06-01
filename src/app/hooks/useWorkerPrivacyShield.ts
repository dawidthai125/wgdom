import { useEffect, useState } from "react";
import { isPrivacyShieldSuppressed } from "@/lib/privacy-shield";

export function useWorkerPrivacyShield(enabled: boolean) {
  const [shield, setShield] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (isPrivacyShieldSuppressed()) return;
      setShield(document.hidden);
    };
    const onBlur = () => {
      if (isPrivacyShieldSuppressed()) return;
      setShield(true);
    };
    const onFocus = () => {
      if (isPrivacyShieldSuppressed()) return;
      setShield(false);
    };
    const blockCtx = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("contextmenu", blockCtx);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", blockCtx);
    };
  }, [enabled]);

  return shield;
}
