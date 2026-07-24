import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/theme/WgdomThemeProvider";
import type { WgThemeId } from "@/app/theme/theme-engine";

/**
 * SSOT przełącznika motywu (Jasny/Ciemny) — ta sama logika co THEME-01D.1 w AdminTopbar.
 * Nie zmienia Providera ani storageKey — tylko UI + setTheme("light"|"dark").
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const activeTheme = (resolvedTheme ?? theme ?? "dark") as WgThemeId;
  const isDark = activeTheme === "dark";
  const themeToggleTitle = isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={themeToggleTitle}
      aria-label={themeToggleTitle}
      className={
        className ??
        "flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      }
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
