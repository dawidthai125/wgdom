import { useState } from "react";
import { isUnavailableMediaUrl, markMediaUrlFailed } from "@/lib/media-filter";

type Props = React.ImgHTMLAttributes<HTMLImageElement>;

/** Miniatura — ukryta gdy URL martwy lub plik nie istnieje w storage (404). */
export function JobPhotoImg({ src, alt, className, onError, ...rest }: Props) {
  const url = typeof src === "string" ? src : undefined;
  const initiallyUnavailable = isUnavailableMediaUrl(url);
  const [failed, setFailed] = useState(initiallyUnavailable);

  if (failed || !url) return null;

  return (
    <img
      src={url}
      alt={alt ?? ""}
      className={className}
      {...rest}
      onError={(e) => {
        markMediaUrlFailed(url);
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
