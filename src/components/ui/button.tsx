"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * PuntoCash Button — manual §14 "Botones y acciones".
 *
 *   Primario     48px, navy, texto blanco, radio 8px   → Confirmar operación
 *   Secundario   48px, blanco, borde navy              → Volver · Ver detalle
 *   Terciario    sin fondo, texto navy                 → Cancelar · Ver más
 *   Destructivo  rojo, sólo acciones irreversibles     → Cancelar operación
 *
 * Rules enforced here:
 *   · Minimum height 44px, standard 48px (§14 / §20).
 *   · Gold is never used for destructive, error or success actions (§8).
 *   · Focus is a visible navy ring, not a shadow (§15).
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-control text-label font-semibold",
    "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
    "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
    /* Disabled uses an explicit flat treatment rather than opacity: a
       half-transparent navy fill leaves white text at ~2:1 contrast, which is
       unreadable on an operational screen. */
    "disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-light disabled:text-text-secondary-strong",
        secondary:
          "bg-surface text-primary border border-border-navy hover:bg-primary-subtle active:bg-primary-muted disabled:border-border disabled:text-text-secondary-strong",
        tertiary:
          "bg-transparent text-primary hover:bg-primary-subtle active:bg-primary-muted disabled:text-text-secondary-strong",
        destructive:
          "bg-error text-white hover:bg-error-hover active:bg-error-hover disabled:bg-gray-light disabled:text-text-secondary-strong",
        /* Gold is reserved for brand accent affordances, never for state. */
        accent:
          "bg-accent text-accent-foreground hover:brightness-95 active:brightness-90 disabled:bg-gray-light disabled:text-text-secondary-strong",
      },
      size: {
        /* 44px — absolute minimum touch target (§20). */
        sm: "h-control-sm px-4",
        /* 48px — recommended standard (§14). */
        md: "h-control px-6",
        /* 56px — primary action on amount-led screens. */
        lg: "h-control-lg px-8 text-body",
        /* Square icon-only buttons keep the same heights. */
        icon: "h-control-sm w-control-sm px-0",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js `<Link>`). */
  asChild?: boolean;
  /** Shows a spinner and blocks interaction while an operation is in flight. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  // Slot forwards to a single child, so the spinner is only composed in when
  // this renders a real <button>.
  const showSpinner = loading && !asChild;

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      aria-busy={loading || undefined}
      // `||`, not `??`: an explicit `disabled={false}` must not re-enable a
      // button that is mid-submit, or the control stays clickable and a second
      // submission gets through.
      {...(asChild
        ? { "aria-disabled": disabled || loading || undefined }
        : { disabled: disabled || loading })}
      {...props}
    >
      {showSpinner ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { Button, buttonVariants };
