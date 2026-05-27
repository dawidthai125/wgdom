import { useRef, useCallback, type ReactNode } from "react";
import { suppressPrivacyShieldBriefly } from "@/lib/privacy-shield";

const IMAGE_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

/**
 * Niezawodny wybór pliku (Windows / mobile) — ref + programowe click(),
 * zamiast label + sr-only (często psuje się w scroll/overflow).
 */
export function HiddenFileInput({
  accept = IMAGE_ACCEPT,
  multiple,
  capture,
  onPick,
  children,
}: {
  accept?: string;
  multiple?: boolean;
  capture?: "environment" | "user";
  onPick: (files: FileList | null) => void;
  children: (open: () => void) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    suppressPrivacyShieldBriefly(15000);
    inputRef.current?.click();
  }, []);

  return (
    <>
      {children(open)}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        style={{ position: "fixed", top: 0, left: 0, width: "1px", height: "1px" }}
        onChange={(e) => {
          const files = e.target.files;
          suppressPrivacyShieldBriefly(2000);
          onPick(files);
          e.target.value = "";
        }}
      />
    </>
  );
}

export { IMAGE_ACCEPT };
