import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * PuntoCash Alert — manual §18 "Estados, alertas y badges".
 *
 *   Éxito        Verde + icono de check + mensaje breve.
 *   Advertencia  Ámbar + indicación de qué debe revisarse.
 *   Error        Rojo + causa y siguiente acción cuando sea posible.
 *   Información  Azul + contexto útil sin urgencia.
 *
 * Every variant pairs colour with an icon and a text title, because states must
 * never be signalled by colour alone (§20).
 */
export type AlertVariant = "success" | "warning" | "error" | "info";

/*
 * Geometry follows the approved brand sheet (§7 "Estados"): a softly tinted
 * panel with a uniform hairline border of the same hue and a 12px radius. There
 * is no heavy left rail — that was an invention, and it read as a different
 * system from the reference.
 */
const alertVariants = cva(
  ["flex gap-3 rounded-card border px-4 py-3.5", "[&_svg]:size-5 [&_svg]:shrink-0"],
  {
    variants: {
      variant: {
        success: "border-success-border bg-success-subtle",
        warning: "border-warning-border bg-warning-subtle",
        error: "border-error-border bg-error-subtle",
        info: "border-info-border bg-info-subtle",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

/*
 * The brand sheet draws every state glyph as a circled outline (§6), in the
 * same colour as the title — one colour per state inside the panel, rather than
 * a vivid glyph beside a darker heading.
 */
const alertIcon = {
  success: { Icon: CheckCircle2, className: "text-success-foreground" },
  warning: { Icon: AlertTriangle, className: "text-warning-foreground" },
  error: { Icon: XCircle, className: "text-error-foreground" },
  info: { Icon: Info, className: "text-info-foreground" },
} as const;

const alertTitleColor = {
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  error: "text-error-foreground",
  info: "text-info-foreground",
} as const;

/** `title` is redeclared as ReactNode, shadowing the HTML `title` attribute. */
export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant: AlertVariant;
  title: React.ReactNode;
  /** Optional trailing action, e.g. "Reintentar". */
  action?: React.ReactNode;
}

function Alert({
  className,
  variant,
  title,
  action,
  children,
  ...props
}: AlertProps): React.JSX.Element {
  const { Icon, className: iconClass } = alertIcon[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className={cn("mt-px", iconClass)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className={cn("text-label font-semibold", alertTitleColor[variant])}>{title}</p>
        {children ? <div className="mt-1 text-body-sm text-text-primary">{children}</div> : null}
      </div>

      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export { Alert, alertVariants };
