/**
 * THEME-01C — Theme Engine SSOT (UI-only · standard shadcn/next-themes).
 *
 * :root = Light · .dark = Production Dark · pref `wg-theme` localStorage (#THEME-015).
 */

export const WG_THEME_STORAGE_KEY = "wg-theme" as const;

export type WgThemeId = "dark" | "light";

/** v1 — dark + light only; system deferred to v1.1 (#THEME-001). */
export const WG_THEMES = ["dark", "light"] as const satisfies readonly WgThemeId[];

export const WG_THEME_DEFAULT: WgThemeId = "dark";

/** Standard next-themes document class for dark mode. */
export const WG_THEME_DARK_DOCUMENT_CLASS = "dark";

/** Production dark tokens — dark parity gate (#THEME-012). */
export const WG_PROD_DARK_BACKGROUND = "#111827";

/** Light theme surface — :root background token. */
export const WG_LIGHT_BACKGROUND = "#f4f5f7";

export function isWgThemeId(value: unknown): value is WgThemeId {
  return value === "dark" || value === "light";
}

/** Read persisted theme id (null = default dark). */
export function readStoredWgThemeId(): WgThemeId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(WG_THEME_STORAGE_KEY);
    return isWgThemeId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** FOUC — class on documentElement before React paint. */
export function resolveWgThemeDocumentClass(themeId: WgThemeId | null | undefined): string | null {
  if (themeId === "light") return null;
  return WG_THEME_DARK_DOCUMENT_CLASS;
}

/** Inline FOUC guard — keep in sync with index.html blocking script. */
export function buildThemeFoucInlineScript(): string {
  return `(function(){try{var k=${JSON.stringify(WG_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!==${JSON.stringify("light")}){document.documentElement.classList.add(${JSON.stringify(WG_THEME_DARK_DOCUMENT_CLASS)});}}catch(e){}})();`;
}

/** Parse theme.css for atomic migration smoke (#THEME-020). */
export function parseThemeCssBlocks(css: string): { rootBackground: string | null; darkBackground: string | null } {
  const rootMatch = css.match(/:root\s*\{[^}]*--background:\s*([^;]+);/);
  const darkMatch = css.match(/\.dark\s*\{[^}]*--background:\s*([^;]+);/);
  return {
    rootBackground: rootMatch?.[1]?.trim() ?? null,
    darkBackground: darkMatch?.[1]?.trim() ?? null,
  };
}
