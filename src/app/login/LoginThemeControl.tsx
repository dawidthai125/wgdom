import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "@/app/theme/WgdomThemeProvider";
import type { LoginCopy } from "@/app/login/login-i18n";

const PREF_KEY = "wg-login-theme-pref" as const;
export type LoginThemePref = "light" | "dark" | "system";

function readPref(): LoginThemePref {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  try {
    const existing = localStorage.getItem("wg-theme");
    if (existing === "light") return "light";
  } catch {
    /* ignore */
  }
  return "dark";
}

function writePref(pref: LoginThemePref) {
  try {
    localStorage.setItem(PREF_KEY, pref);
  } catch {
    /* ignore */
  }
}

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Light / Dark / System for login chrome.
 * Uses existing next-themes setTheme("light"|"dark") — does not change WgdomThemeProvider.
 */
export function LoginThemeControl({ copy }: { copy: LoginCopy }) {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const [pref, setPref] = useState<LoginThemePref>(readPref);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    writePref(pref);
    if (pref === "system") {
      setTheme(systemTheme());
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => setTheme(systemTheme());
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    setTheme(pref);
  }, [pref, setTheme]);

  useEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  const active = (resolvedTheme ?? theme ?? "dark") as string;
  const Icon = pref === "system" ? Monitor : active === "dark" ? Moon : Sun;

  const options: { id: LoginThemePref; label: string; icon: typeof Sun }[] = [
    { id: "light", label: copy.themeLight, icon: Sun },
    { id: "dark", label: copy.themeDark, icon: Moon },
    { id: "system", label: copy.themeSystem, icon: Monitor },
  ];

  const panel =
    open && pos
      ? createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden />
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: 0.2 }}
                className="fixed z-[101] w-44 rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5"
                style={{ top: pos.top, right: pos.right }}
                role="menu"
                aria-label={copy.theme}
              >
                {options.map((opt) => {
                  const OptIcon = opt.icon;
                  const selected = pref === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setPref(opt.id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
                        selected
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <OptIcon size={15} strokeWidth={1.75} />
                      {opt.label}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={copy.theme}
        aria-label={copy.theme}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors duration-200"
      >
        <Icon size={16} strokeWidth={1.75} />
      </button>
      {panel}
    </div>
  );
}
