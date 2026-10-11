"use client";

import { ImageBrokenIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ProductPhotoProps {
  /** URL or data URL (local preview / agent upload). */
  src?: string;
  alt: string;
  /** Aspect ratio of the frame. Default "4/3". */
  ratio?: "1/1" | "4/3" | "3/4" | "16/9";
  /** next/image sizes hint, e.g. "(min-width: 768px) 33vw, 100vw". */
  sizes?: string;
  className?: string;
  priority?: boolean;
}

const RATIO = {
  "1/1": "aspect-square",
  "4/3": "aspect-[4/3]",
  "3/4": "aspect-[3/4]",
  "16/9": "aspect-video",
} as const;

/** Product / price-tag photo in a fixed frame; neutral tile if missing or broken. */
export function ProductPhoto({
  src,
  alt,
  ratio = "4/3",
  sizes = "(min-width: 768px) 320px, 100vw",
  className,
  priority,
}: ProductPhotoProps) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-paper-2", RATIO[ratio], className)}>
      {src && !broken ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink-2" role="img" aria-label={alt}>
          <ImageBrokenIcon aria-hidden className="size-6 opacity-60" />
        </div>
      )}
    </div>
  );
}
