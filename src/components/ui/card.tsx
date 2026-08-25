import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PuntoCash Card — manual §16 "Tarjetas y contenedores".
 *
 *   Fondo      Blanco
 *   Radio      12px
 *   Padding    20-24px
 *   Borde      1px gris claro cuando se requiera separación
 *   Sombra     Mínima y sutil; evitar efecto ecommerce
 *   Separación 24px entre bloques principales
 *
 * "Las tarjetas deben agrupar información relacionada, no fragmentar cada dato
 * en un bloque independiente."
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `accent` raises an amount summary above the rest of the card (§16). */
  tone?: "default" | "subtle" | "accent";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, tone = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-card border shadow-card",
        tone === "default" && "border-border bg-surface",
        tone === "subtle" && "border-border bg-surface-subtle",
        /* Gold reads as a hairline accent, never as a filled surface (§3).
           Secondary text darkens on cream so it still clears AA (§20). */
        tone === "accent" &&
          "border-accent-border bg-surface-brand [--color-text-secondary:var(--color-text-secondary-strong)]",
        className,
      )}
      {...props}
    />
  );
});

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("flex items-start justify-between gap-4 px-6 pt-6 pb-4", className)}
        {...props}
      />
    );
  },
);

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h3 ref={ref} className={cn("text-card-title text-text-primary", className)} {...props} />;
  },
);

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("mt-1 text-caption text-text-secondary", className)} {...props} />;
});

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />;
  },
);

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-3 border-t border-border px-6 py-4", className)}
        {...props}
      />
    );
  },
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
