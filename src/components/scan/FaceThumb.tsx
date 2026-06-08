"use client";

import * as React from "react";
import { User, Loader2 } from "lucide-react";
import { facePhotoStore } from "@/lib/facePhotoStore";
import { cn } from "@/lib/utils";

interface Props {
  faceCaptureId?: string | null;
  size?: number; // px square
  className?: string;
  alt?: string;
  onClick?: (objectUrl: string) => void;
}

/**
 * Thumbnail wajah lazy-load dari IndexedDB. Object URL otomatis di-revoke
 * saat unmount.
 */
export function FaceThumb({
  faceCaptureId,
  size = 40,
  className,
  alt = "",
  onClick,
}: Props) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let local: string | null = null;
    if (faceCaptureId) {
      setLoading(true);
      facePhotoStore
        .getObjectUrl(faceCaptureId)
        .then((u) => {
          if (cancelled) {
            if (u) URL.revokeObjectURL(u);
            return;
          }
          local = u;
          setUrl(u);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setUrl(null);
    }
    return () => {
      cancelled = true;
      if (local) URL.revokeObjectURL(local);
    };
  }, [faceCaptureId]);

  const style = { width: size, height: size };
  const baseClass = cn(
    "shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-hairline",
    className,
  );

  if (!faceCaptureId) {
    return (
      <div
        className={cn(
          baseClass,
          "flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-ink-subtle",
        )}
        style={style}
        aria-label="Tanpa foto"
      >
        <User className="h-1/2 w-1/2" />
      </div>
    );
  }

  if (loading || !url) {
    return (
      <div
        className={cn(
          baseClass,
          "flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-ink-subtle",
        )}
        style={style}
      >
        <Loader2 className="h-1/3 w-1/3 animate-spin" />
      </div>
    );
  }

  const handleClick = onClick
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(url);
      }
    : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      style={style}
      onClick={handleClick}
      className={cn(
        baseClass,
        "object-cover",
        onClick && "cursor-zoom-in transition hover:ring-2 hover:ring-blue-400/60",
      )}
    />
  );
}
