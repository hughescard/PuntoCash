import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * PuntoCash Badge — manual §18 "Badges de estado".
 *
 * "Utilizar etiquetas compactas para estados como Completada, En proceso,
 *  Rechazada o Cancelada. El fondo debe ser tenue y el texto suficientemente
 *  contrastado." Radius: pill (§11).
 *
 * §20 forbids colour as the only carrier of meaning, so every badge always
 * renders its text label, and may carry an icon via `icon`.
 */
/*
 * Geometry follows the approved wireframes: a borderless pill on a soft tint,
 * with the label carrying the meaning. The transparent border keeps the box
 * identical in size to the bordered `accent` variant.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-pill border border-transparent",
    "px-2.5 py-1 text-caption font-medium whitespace-nowrap",
    "[&_svg]:size-3.5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        neutral: "bg-neutral-subtle text-neutral-foreground",
        success: "bg-success-subtle text-success-foreground",
        warning: "bg-warning-subtle text-warning-foreground",
        error: "bg-error-subtle text-error-foreground",
        info: "bg-info-subtle text-info-foreground",
        /* Brand marker — never used to express success/warning/error (§8).
           Keeps its gold hairline, which is a deliberate brand device. */
        accent: "border-accent-border bg-accent-subtle text-accent-foreground",
        primary: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps): React.JSX.Element {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
