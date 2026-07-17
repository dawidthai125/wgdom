import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import {
  WG_THEME_DEFAULT,
  WG_THEME_STORAGE_KEY,
  WG_THEMES,
} from "@/app/theme/theme-engine";

/**
 * THEME-01C — standard next-themes (dark → class="dark", light → no class).
 */
export function WgdomThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={WG_THEME_DEFAULT}
      enableSystem={false}
      storageKey={WG_THEME_STORAGE_KEY}
      themes={[...WG_THEMES]}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

export { useTheme } from "next-themes";
