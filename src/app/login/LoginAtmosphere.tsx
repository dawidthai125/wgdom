/** Subtle mesh + noise backdrop for login — no neon, no aggressive motion. */

export function LoginAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 55%)," +
            "radial-gradient(ellipse 70% 50% at 85% 20%, color-mix(in oklab, var(--foreground) 6%, transparent), transparent 50%)," +
            "radial-gradient(ellipse 60% 45% at 50% 100%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 55%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "180px 180px",
        }}
      />
    </div>
  );
}
