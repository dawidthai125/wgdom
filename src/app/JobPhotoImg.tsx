import { useState } from "react";
import { ImageOff } from "lucide-react";
import { isDeadStorageUrl, UNAVAILABLE_PHOTO_LABEL } from "@/lib/storage-url";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  compact?: boolean;
};

/** Miniatura z obsługą martwych URL-i (stary Supabase) i błędów 404. */
export function JobPhotoImg({ src, alt, className, compact, ...rest }: Props) {
  const dead = isDeadStorageUrl(typeof src === "string" ? src : undefined);
  const [failed, setFailed] = useState(dead);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-secondary text-muted-foreground ${compact ? "p-1" : "p-2"} ${className ?? ""}`}
        title={UNAVAILABLE_PHOTO_LABEL}
      >
        <ImageOff size={compact ? 14 : 20} className="opacity-50 shrink-0" />
        {!compact && (
          <span className="text-[9px] text-center leading-tight mt-1 px-1 opacity-70">Niedostępne</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ""}
      className={className}
      {...rest}
      onError={() => setFailed(true)}
    />
  );
}
