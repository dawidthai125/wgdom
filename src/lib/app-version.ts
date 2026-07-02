/** Wersja UI — zsynchronizowana z CHANGELOG[0] przez vite define przy buildzie. */
declare const __APP_VERSION__: string;
/** Build Identity — short git commit HEAD (vite define przy buildzie). Detekcja „nowy build". */
declare const __APP_COMMIT__: string;

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

export const APP_COMMIT =
  typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "unknown";
