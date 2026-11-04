import * as React from "react";

import { rutaDeBandera } from "@/features/network/iso-monedas";
import { cn } from "@/lib/utils";

/**
 * Bandera junto al código de una moneda — manual §15: «con bandera opcional
 * como apoyo visual». El código ISO y el nombre siguen siendo lo que
 * identifica; esto es apoyo, así que siempre es decorativo y `aria-hidden`.
 *
 * Todas las banderas salen de un solo sitio: `public/banderas/` y la tabla
 * `BANDERA_DE_MONEDA` de `network/iso-monedas.ts`, junto a la lista ISO 4217.
 * Una moneda que entra a la lista ISO trae su bandera; no hay nada que dibujar
 * aquí. Son archivos SVG (nunca emoji: los indicadores regionales dependen de
 * la fuente emoji del sistema y en Windows se ven como letras sueltas), y cada
 * bandera se descarga solo cuando una pantalla la usa.
 *
 * Se pinta dentro de un `<svg>` con `<image>` para conservar el contrato de
 * siempre (`svg[data-currency-flag]`, 20×14, borde fino).
 */
export function CurrencyFlag({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}): React.JSX.Element | null {
  const href = rutaDeBandera(currency);
  if (!href) return null;

  return (
    <svg
      viewBox="0 0 20 14"
      aria-hidden="true"
      focusable="false"
      data-currency-flag={currency}
      className={cn("h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10", className)}
    >
      <image href={href} width="20" height="14" preserveAspectRatio="xMidYMid slice" />
    </svg>
  );
}
