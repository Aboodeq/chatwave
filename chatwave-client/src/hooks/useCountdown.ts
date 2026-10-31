import { useEffect, useState } from "react";

/** Whole seconds left until `endsAt` (a Date.now() timestamp), updating as time passes. */
export function useCountdown(endsAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt <= Date.now()) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
