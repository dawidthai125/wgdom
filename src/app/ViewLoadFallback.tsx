/** Krótki fallback przy lazy-load paneli (mobile + desktop). */
export function ViewLoadFallback({ label = "Ładowanie…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[40dvh] w-full">
      <div className="flex flex-col items-center gap-2.5 text-muted-foreground px-4">
        <div
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
        <p className="text-xs text-center">{label}</p>
      </div>
    </div>
  );
}
