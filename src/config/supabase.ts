/**
 * Konfiguracja Supabase z zmiennych środowiskowych (Vite: VITE_*).
 * Lokalnie: plik .env w katalogu projektu.
 * Produkcja: Vercel → Settings → Environment Variables.
 */

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const functionSlug =
  (import.meta.env.VITE_SUPABASE_FUNCTION_SLUG as string | undefined) ||
  "make-server-0afb8820";

if (!projectId || !anonKey) {
  console.warn(
    "[W&G DOM] Brak VITE_SUPABASE_PROJECT_ID lub VITE_SUPABASE_ANON_KEY. " +
      "Ustaw je w .env (dev) lub w Vercel → Environment Variables (prod).",
  );
}

export const supabaseProjectId = projectId ?? "";
export const supabaseAnonKey = anonKey ?? "";
export const supabaseFunctionSlug = functionSlug;

export const supabaseFunctionsBase = projectId
  ? `https://${projectId}.supabase.co/functions/v1/${functionSlug}`
  : "";

export function isSupabaseConfigured(): boolean {
  return Boolean(projectId && anonKey);
}
