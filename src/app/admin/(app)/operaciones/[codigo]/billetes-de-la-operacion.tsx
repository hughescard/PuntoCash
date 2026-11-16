import * as React from "react";

import { Section } from "@/components/shell/app-shell";
import { Card, CardContent } from "@/components/ui";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { todasLasDenominaciones } from "@/features/network/denominaciones";
import type { Jornada } from "@/features/network/jornadas";

/**
 * Los billetes de una operación (bloque 4): por cada movimiento que dejó en el
 * libro de su jornada, lo que entró y lo que salió, billete a billete. Sin
 * saldos: solo lo que movió la operación.
 */
export function BilletesDeLaOperacion({ jornada, codigo }: { jornada: Jornada; codigo: string }): React.JSX.Element | null {
  const movimientos = jornada.movimientos.filter((m) => m.operationCode === codigo && m.billetes && Object.keys(m.billetes).length > 0);
  if (movimientos.length === 0) return null;
  return (
    <Section title="Billetes de la operación">
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {movimientos.map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
              <p className="text-label text-text-primary">
                {m.concepto} · {m.currency}
              </p>
              <BilletesDelMovimiento
                billetes={m.billetes!}
                currency={m.currency}
                tipos={todasLasDenominaciones(m.currency)}
                nombre={`${m.concepto} ${m.currency}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </Section>
  );
}
