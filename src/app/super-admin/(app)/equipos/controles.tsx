"use client";

import * as React from "react";

/** El valor que significa «sin filtrar» en todos los desplegables de la consola. */
export const TODAS = "todas";

export const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

/** La casilla de los conmutadores de un listado, con alto táctil a 360px. */
export function Conmutador({
  id,
  checked,
  disabled,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label htmlFor={id} className="flex min-h-control-sm items-center gap-3 text-body text-text-primary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="size-5 shrink-0 accent-primary"
      />
      {children}
    </label>
  );
}
