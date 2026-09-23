"use client";

import * as React from "react";

/** Capitalizes the first letter — `Intl` weekday/month names come back lowercase in es-ES. */
function capitalize(value: string): string {
  return value.length ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/**
 * Live clock for the signage header. Sized in `em` from the signage base
 * font size (see `layout.tsx`).
 *
 * Renders a placeholder until hydrated, then ticks every second: a
 * server-rendered timestamp would disagree with the client's the instant it
 * hydrates, and "now" is meaningless pre-hydration anyway on a screen nobody
 * touches.
 */
export function ClockDisplay(): React.JSX.Element {
  const hydrated = React.useSyncExternalStore(subscribeNever, () => true, () => false);

  if (!hydrated) {
    // Reserves the same footprint so the header never jumps on mount.
    return <span className="inline-block h-[3.5em] w-[12em]" aria-hidden="true" />;
  }
  return <LiveClock />;
}

function subscribeNever(): () => void {
  return () => {};
}

/** Only ever rendered in the browser, so it can read the clock when it starts. */
function LiveClock(): React.JSX.Element {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(now);
  const date = capitalize(
    new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(now),
  );

  return (
    <div className="flex shrink-0 flex-col items-end">
      <span className="pc-numeric text-[2.4em] font-bold leading-none tracking-[-0.02em] text-white">
        {time}
      </span>
      <span className="mt-[0.3em] text-[0.9em] leading-tight text-text-on-primary-muted">{date}</span>
    </div>
  );
}
