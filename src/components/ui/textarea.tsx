import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-input bg-surface px-3.5 py-2.5 text-base text-ink transition-[border-color,box-shadow] duration-150 ease-out outline-none placeholder:text-ink-2/70 focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-ink/10 disabled:cursor-not-allowed disabled:bg-paper-2 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
