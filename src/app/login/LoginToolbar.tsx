import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CompanyMusicPlayer } from "@/app/components/CompanyMusicPlayer";
import { LoginThemeControl } from "@/app/login/LoginThemeControl";
import type { LoginCopy, LoginLocale } from "@/app/login/login-i18n";

export const LOGIN_PRIVACY_EVENT = "wgdom-login-privacy";

export function LoginToolbar({
  copy,
  locale,
  onLocaleChange,
}: {
  copy: LoginCopy;
  locale: LoginLocale;
  onLocaleChange: (locale: LoginLocale) => void;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const onPrivacy = () => setPrivacyOpen(true);
    window.addEventListener(LOGIN_PRIVACY_EVENT, onPrivacy);
    return () => window.removeEventListener(LOGIN_PRIVACY_EVENT, onPrivacy);
  }, []);

  return (
    <>
      <div
        className="absolute top-0 right-0 z-20 flex items-center gap-0.5 p-3 sm:p-4"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <div className="flex items-center gap-0.5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md px-1 py-0.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <LoginThemeControl copy={copy} />
          <CompanyMusicPlayer />
          <button
            type="button"
            title={copy.language}
            aria-label={copy.language}
            onClick={() => onLocaleChange(locale === "pl" ? "en" : "pl")}
            className="flex h-9 min-w-9 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors duration-200"
          >
            <Globe size={14} strokeWidth={1.75} />
            <span>{locale}</span>
          </button>
          <button
            type="button"
            title={copy.about}
            aria-label={copy.about}
            onClick={() => setAboutOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors duration-200"
          >
            <Info size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <LoginDialog
        open={aboutOpen}
        title={copy.about}
        body={copy.aboutBody}
        closeLabel={copy.close}
        onClose={() => setAboutOpen(false)}
      />
      <LoginDialog
        open={privacyOpen}
        title={copy.privacy}
        body={copy.privacyBody}
        closeLabel={copy.close}
        onClose={() => setPrivacyOpen(false)}
      />
    </>
  );
}

function LoginDialog({
  open,
  title,
  body,
  closeLabel,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[120] bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="fixed z-[121] left-1/2 top-1/2 w-[min(calc(100vw-2rem),380px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-border/60 bg-card/95 backdrop-blur-xl p-8 shadow-[0_16px_48px_rgba(0,0,0,0.14)]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200"
                aria-label={closeLabel}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
