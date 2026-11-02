import * as React from "react";

import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Una cifra del total del periodo — **FR-AD-REP-4**. La usan los reportes de las
 * dos consolas: una cifra no se parte nunca en dos líneas, y si hay cifras
 * largas todas bajan de tamaño a la vez, para que las tarjetas se lean iguales.
 *
 * `largo` es la longitud de la cifra más larga del total.
 */
export function Cifra({ etiqueta, valor, largo }: { etiqueta: string; valor: string; largo: number }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="px-4 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</p>
        {/* Una cifra no se parte nunca en dos líneas: si las hay largas, todas bajan de tamaño. */}
        <p
          className={cn(
            "pc-numeric mt-2 whitespace-nowrap text-text-primary",
            /* En el teléfono, dos tarjetas por fila: el tamaño se ajusta a la cifra más larga del total. */
            largo > 12 ? "text-body font-semibold" : largo > 8 ? "text-card-title" : "text-section-title",
            largo > 12 ? "sm:text-section-title" : "sm:text-screen-title",
          )}
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}
