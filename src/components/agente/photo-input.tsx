"use client";

import { CameraIcon, XIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ProductPhoto } from "@/components/product-photo";
import { cn } from "@/lib/utils";

/**
 * Downscale a photo to a JPEG data URL so it fits in localStorage.
 * Phones shoot 4000px+ images of several MB; a price label reads fine at 960px.
 */
export async function compressImage(file: File, maxSide = 960, quality = 0.62): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface PhotoInputProps {
  value: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  /** Visible label of the add button. */
  label?: string;
  /** "environment" (rear camera, default) or "user" (selfie). */
  capture?: "environment" | "user";
  maxSide?: number;
  className?: string;
}

/** Camera-first photo picker with local previews. Opens the rear camera on phones. */
export function PhotoInput({
  value,
  onChange,
  max = 3,
  label = "Tirar foto",
  capture = "environment",
  maxSide,
  className,
}: PhotoInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const full = value.length >= max;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const room = max - value.length;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        next.push(await compressImage(file, maxSide));
      } catch {
        toast.error("Não foi possível ler esta imagem. Tente outra foto.");
      }
    }
    if (files.length > room) toast.info(`Pode juntar no máximo ${max} fotos.`);
    if (next.length) onChange([...value, ...next]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {value.map((src, i) => (
            <li key={`${i}-${src.slice(-16)}`} className="relative">
              <ProductPhoto src={src} alt={`Foto ${i + 1}`} ratio="1/1" sizes="120px" />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                className="press absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-ink text-surface outline-none focus-visible:ring-3 focus-visible:ring-tag"
                aria-label={`Remover foto ${i + 1}`}
              >
                <XIcon className="size-4" weight="bold" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <label
          htmlFor={id}
          className={cn(
            "press flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-ink/35 bg-surface text-[0.9375rem] font-medium text-ink outline-none has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ink/15 hover-fine:border-ink",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <CameraIcon className="size-5" aria-hidden />
          {busy ? "A preparar foto…" : value.length ? `${label} (${value.length}/${max})` : label}
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            capture={capture}
            multiple={max - value.length > 1}
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}
