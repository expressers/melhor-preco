import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Etiqueta buttons: pill shaped, 44px min touch target on the default size,
// tactile scale(0.97) on press, hover only on real pointers. Smaller sizes
// grow an invisible hit area on touch screens so every target reaches 44px.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem]",
  {
    variants: {
      variant: {
        // Ink: the workhorse primary.
        default:
          "bg-primary text-primary-foreground hover-fine:bg-[color-mix(in_oklch,var(--ink),white_14%)]",
        // Tag yellow with ink text: the one primary CTA per screen.
        tag: "bg-tag text-ink shadow-[inset_0_-1px_0_rgb(17_19_17/0.12)] hover-fine:bg-tag-deep",
        outline:
          "border-ink/20 bg-surface text-ink hover-fine:border-ink/40 hover-fine:bg-paper aria-expanded:bg-paper",
        secondary:
          "bg-paper-2 text-ink hover-fine:bg-[color-mix(in_oklch,var(--paper-2),var(--ink)_6%)] aria-expanded:bg-paper-2",
        ghost:
          "text-ink hover-fine:bg-ink/[0.06] aria-expanded:bg-ink/[0.06]",
        destructive:
          "bg-error text-white hover-fine:bg-[color-mix(in_oklch,var(--error),black_12%)] focus-visible:ring-error/30",
        link: "h-auto! rounded-none px-0! text-ink underline decoration-ink/30 underline-offset-4 hover-fine:decoration-ink active:scale-100!",
      },
      size: {
        default:
          "h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2.5 text-xs pointer-coarse:after:absolute pointer-coarse:after:-inset-2 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 pointer-coarse:after:absolute pointer-coarse:after:-inset-1 gap-1.5 px-3.5 text-[0.8125rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-6 text-[0.9375rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-7 pointer-coarse:after:absolute pointer-coarse:after:-inset-2 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 pointer-coarse:after:absolute pointer-coarse:after:-inset-1 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
