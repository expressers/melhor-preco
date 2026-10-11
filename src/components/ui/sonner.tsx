"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

// Light-only app: no theme switching.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon weight="fill" className="size-[1.125rem] text-success" />,
        info: <InfoIcon weight="fill" className="size-[1.125rem] text-info" />,
        warning: <WarningIcon weight="fill" className="size-[1.125rem] text-warning" />,
        error: <XCircleIcon weight="fill" className="size-[1.125rem] text-error" />,
        loading: <SpinnerIcon className="size-[1.125rem] animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
