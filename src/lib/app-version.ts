/** Wersja UI — zsynchronizowana z CHANGELOG[0] przez vite define przy buildzie. */
declare const __APP_VERSION__: string;

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
