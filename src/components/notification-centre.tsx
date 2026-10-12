"use client";

import { BellIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelative } from "@/lib/format";
import { requestHref } from "@/lib/routes";
import { useHydrated, useMyNotifications, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** In-app notification centre for the current "Ver como" role/user (BRIEF §5). */
export function NotificationCentre() {
  const hydrated = useHydrated();
  const { items, unread } = useMyNotifications();
  const session = useStore((s) => s.session);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const count = hydrated ? unread : 0;
  const userId =
    session.viewAs === "cliente"
      ? (session.currentClientId ?? undefined)
      : session.viewAs === "agente"
        ? (session.currentAgentId ?? undefined)
        : session.viewAs === "operador"
          ? (session.currentOperatorId ?? undefined)
          : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `Notificações, ${count} por ler` : "Notificações"}
        >
          <BellIcon weight={count > 0 ? "fill" : "regular"} />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1 min-w-[1.125rem] rounded-full bg-tag px-1 font-mono text-[0.6875rem] leading-[1.125rem] font-semibold text-ink tabular ring-2 ring-paper"
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">Notificações</p>
          {count > 0 && (
            <Button
              variant="link"
              size="xs"
              className="text-xs"
              onClick={() => markAll(session.viewAs, userId)}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ink-2">Sem notificações por agora.</p>
        ) : (
          <ul className="max-h-[min(26rem,70dvh)] overflow-y-auto overscroll-contain py-1">
            {items.slice(0, 30).map((n) => {
              const body = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn("text-sm leading-snug text-ink", !n.read && "font-semibold")}>
                      {n.title}
                    </span>
                    <time dateTime={n.at} className="shrink-0 font-mono text-[0.6875rem] text-ink-2 tabular">
                      {formatRelative(n.at)}
                    </time>
                  </span>
                  <span className="line-clamp-2 text-[0.8125rem] leading-snug text-ink-2">{n.body}</span>
                </>
              );
              const cls = cn(
                "relative flex flex-col gap-0.5 px-4 py-2.5 pl-6 text-left outline-none focus-visible:bg-paper hover-fine:bg-paper",
                !n.read &&
                  "before:absolute before:top-[0.95rem] before:left-2.5 before:size-1.5 before:bg-tag before:ring-1 before:ring-ink/40",
              );
              return (
                <li key={n.id}>
                  {n.requestId ? (
                    <Link
                      href={requestHref(session.viewAs, n.requestId)}
                      className={cls}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className={cn(cls, "w-full")} onClick={() => markRead(n.id)}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
