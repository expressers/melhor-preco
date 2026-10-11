"use client";

import { useEffect, useState } from "react";

/** Current time, refreshed every `everyMs` (client only; pages are hydration-gated). */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(t);
  }, [everyMs]);
  return now;
}
