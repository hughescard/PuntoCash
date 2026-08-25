"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * PuntoCash Input — manual §15 "Inputs, selectores y formularios".
 *
 *   Estándar   48px alto, fondo blanco, borde gris claro, radio 8px, label encima.
 *   Importe    56-64px cuando el monto sea el dato principal de la pantalla.
 *   Focus      Borde navy claramente visible; no depender sólo de una sombra.
 *   Error      Borde rojo + mensaje textual específico.
 */
export const inputVariants = cva(
  [
    "w-full rounded-control border bg-surface text-body text-text-primary",
    "transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard)",
    "placeholder:text-text-secondary",
    "outline-none",
    /* Focus: a visible navy border, reinforced (not replaced) by a ring. */
    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
  ],
  {
    variants: {
      size: {
        md: "h-control px-4",
        /* 56px — amount input (§15 "Input de importe"). */
        lg: "h-control-lg px-4 text-amount font-semibold",
        /* 64px — when the amount is the screen's headline figure. */
        xl: "h-control-xl px-5 text-amount font-semibold",
      },
      invalid: {
        true: "border-error focus-visible:border-error focus-visible:ring-error/20",
        false: "border-border hover:border-border-strong",
      },
      /* Right-align figures so decimals line up (§15 / §17). */
      numeric: {
        true: "pc-numeric text-right",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      invalid: false,
      numeric: false,
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">,
    VariantProps<typeof inputVariants> {
  /** Persistent unit shown inside the field, e.g. a currency code. */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

/**
 * Disabled/read-only surfaces belong on the real control only.
 *
 * These must never reach the affix wrapper: CSS `:read-only` matches any
 * element that is not user-editable, so a plain <div> always satisfies it and
 * the wrapper would sit permanently on the disabled surface instead of the
 * white the manual requires (§15 "fondo blanco").
 */
const CONTROL_SURFACE_STATES =
  "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary read-only:bg-surface-subtle";

/** Same states for an affixed input, whose surface is painted by the wrapper. */
const AFFIXED_CONTROL_STATES = "disabled:cursor-not-allowed disabled:text-text-secondary";

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, invalid, numeric, prefix, suffix, ...props },
  ref,
) {
  const affixed = Boolean(prefix || suffix);

  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      // The wrapper paints the surface and the focus ring for affixed fields.
      // globals.css reads this to keep autofill from drawing a second ring.
      data-affixed={affixed || undefined}
      className={cn(
        inputVariants({ size, invalid, numeric }),
        affixed
          ? ["h-full border-0 bg-transparent focus-visible:ring-0", AFFIXED_CONTROL_STATES]
          : CONTROL_SURFACE_STATES,
        prefix ? "pl-0" : undefined,
        suffix ? "pr-0" : undefined,
        className,
      )}
      {...props}
    />
  );

  if (!affixed) return field;

  /* Currency stays visible as a prefix or suffix — never hidden in a
     placeholder (§15 "Formularios financieros"). */
  return (
    <div
      className={cn(
        inputVariants({ size, invalid }),
        "flex items-center gap-3 px-4",
        // The wrapper carries the disabled/read-only surface, since the real
        // <input> inside it is transparent. Scoped with :has() so it reflects
        // the control's actual state rather than the div's.
        "has-[input:disabled]:bg-surface-subtle has-[input:read-only]:bg-surface-subtle",
        "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        invalid && "focus-within:border-error focus-within:ring-error/20",
        className,
      )}
    >
      {prefix ? (
        <span className="shrink-0 text-label font-medium text-text-secondary">{prefix}</span>
      ) : null}
      {field}
      {suffix ? (
        <span className="shrink-0 text-label font-medium text-text-secondary">{suffix}</span>
      ) : null}
    </div>
  );
});

export { Input };
