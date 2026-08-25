import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PuntoCash logotype — manual §2 "Logotipo".
 *
 *   Isotipo    Pin de ubicación en dorado.
 *   Wordmark   "PUNTO CASH", contraste entre navy/blanco y dorado según fondo.
 *   Descriptor "CASA DE CAMBIO" como línea secundaria.
 *   Variantes  Fondo oscuro · fondo claro · monocromática.
 *
 * The wordmark is set in Montserrat Bold, as on the approved brand sheet. The
 * mark is drawn as a single evenodd path so the counter stays transparent and
 * reads correctly on navy, white and cream alike.
 */

type LogoVariant = "onLight" | "onDark" | "mono";
type LogoSize = "sm" | "md" | "lg" | "xl" | "2xl";

/** `descMt` scales the wordmark-to-descriptor step with the lockup. */
const sizes = {
  sm: { mark: "h-5", word: "text-[0.9375rem]", desc: "text-[0.4375rem]", gap: "gap-2", descMt: "mt-0.5" },
  md: { mark: "h-7", word: "text-[1.25rem]", desc: "text-[0.5rem]", gap: "gap-2.5", descMt: "mt-1" },
  lg: { mark: "h-10", word: "text-[1.75rem]", desc: "text-[0.6875rem]", gap: "gap-3.5", descMt: "mt-1.5" },
  /* Full brand presence — sign-in and other full-screen brand surfaces (§7). */
  xl: { mark: "h-16", word: "text-[2.5rem]", desc: "text-[0.75rem]", gap: "gap-4", descMt: "mt-2" },
  /* Lead brand surface: the sign-in panel, where the logo is the subject. */
  "2xl": {
    mark: "h-19",
    word: "text-[2.9375rem]",
    desc: "text-[0.875rem]",
    gap: "gap-5",
    descMt: "mt-2.5",
  },
} as const satisfies Record<
  LogoSize,
  { mark: string; word: string; desc: string; gap: string; descMt: string }
>;

const wordmarkColors = {
  onLight: { punto: "text-navy", cash: "text-gold", desc: "text-text-secondary" },
  onDark: { punto: "text-white", cash: "text-gold", desc: "text-text-on-primary-muted" },
  mono: { punto: "text-current", cash: "text-current", desc: "text-current opacity-70" },
} as const satisfies Record<LogoVariant, { punto: string; cash: string; desc: string }>;

/** The isotype on its own — for tight spaces (§2 "Tamaño mínimo"). */
export function LogoMark({
  className,
  variant = "onLight",
}: {
  className?: string;
  variant?: LogoVariant;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      aria-hidden="true"
      className={cn("w-auto shrink-0", variant === "mono" ? "text-current" : "text-gold", className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.373 0 0 5.373 0 12c0 8.4 10.02 18.62 11.29 19.88a1 1 0 0 0 1.42 0C13.98 30.62 24 20.4 24 12 24 5.373 18.627 0 12 0Zm0 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** Renders the "CASA DE CAMBIO" descriptor line (§2). */
  showDescriptor?: boolean;
  className?: string;
}

export function Logo({
  variant = "onLight",
  size = "md",
  showDescriptor = false,
  className,
}: LogoProps): React.JSX.Element {
  const s = sizes[size];
  const c = wordmarkColors[variant];

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark variant={variant} className={s.mark} />

      <span className="inline-flex flex-col justify-center">
        <span className={cn("font-bold leading-none tracking-[-0.01em]", s.word)}>
          <span className={c.punto}>PUNTO</span>
          <span className={c.cash}> CASH</span>
        </span>

        {showDescriptor ? (
          <span
            className={cn(
              "font-medium uppercase leading-none tracking-[0.28em]",
              s.descMt,
              s.desc,
              c.desc,
            )}
          >
            Casa de cambio
          </span>
        ) : null}
      </span>
    </span>
  );
}
