import { useEffect, useState, type ReactNode } from "react";
import { APP_COMMIT, APP_VERSION } from "@/lib/app-version";
import type { LoginCopy } from "@/app/login/login-i18n";
import { LOGIN_PRIVACY_EVENT } from "@/app/login/LoginToolbar";

export function LoginStatusFooter({ copy }: { copy: LoginCopy }) {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const shortCommit = APP_COMMIT.slice(0, 7);

  return (
    <footer className="w-full max-w-md mx-auto mt-10 space-y-5">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Badge>{copy.production}</Badge>
        <Badge>v{APP_VERSION}</Badge>
        <Badge tone={online ? "ok" : "warn"}>{online ? copy.online : copy.offline}</Badge>
        <Badge>
          {copy.build} {APP_VERSION}
        </Badge>
        <Badge>
          {copy.commit} {shortCommit}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
        <span className="font-medium tracking-wide text-foreground/70">WGDOM</span>
        <span aria-hidden>·</span>
        <span>© {new Date().getFullYear()}</span>
        <span aria-hidden>·</span>
        <span>
          {copy.version} {APP_VERSION}
        </span>
        <span aria-hidden>·</span>
        <span>{copy.status}</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          className="hover:text-foreground transition-colors duration-200 underline-offset-2 hover:underline"
          onClick={() => window.dispatchEvent(new Event(LOGIN_PRIVACY_EVENT))}
        >
          {copy.privacy}
        </button>
      </div>
    </footer>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
        : "border-border/60 text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border bg-card/40 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}
