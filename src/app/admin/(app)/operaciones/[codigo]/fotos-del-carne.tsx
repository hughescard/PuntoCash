import * as React from "react";
import { IdCard } from "lucide-react";

import { Section } from "@/components/shell/app-shell";
import { Card, CardContent } from "@/components/ui";
import type { OperacionDeRed } from "@/features/network/operaciones";
import { CARAS_DEL_CARNE, NOMBRE_DE_CARA, fotosDeOperacion } from "@/features/network/fotos-del-carne";
import { fechaYHora } from "../../jornadas/formato";

/**
 * Las fotos del carné de quien cobró una remesa o un giro (16/11/2026). Las ve
 * la administración —Admin de sede y PuntoCash—, no el trabajador. Las
 * operaciones de otros servicios no tienen bloque.
 */
export function FotosDelCarne({ operacion: o }: { operacion: OperacionDeRed }): React.JSX.Element | null {
  const esEntrega = o.servicio === "Remesa" || (o.servicio === "Giros" && o.transfer?.transferAction === "payout");
  if (!esEntrega) return null;

  const fotos = fotosDeOperacion(o.codigo);

  return (
    <Section title="Carné de quien cobró">
      <Card>
        <CardContent className="pt-6">
          {fotos ? (
            <div className="flex flex-col gap-4">
              <p className="text-body-sm text-text-secondary">
                Fotos hechas por {o.worker} al entregar, el {fechaYHora(fotos.anverso.tomadaEn)}.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                {CARAS_DEL_CARNE.map((cara) => (
                  <figure key={cara} className="flex flex-col gap-2">
                    <figcaption className="text-label text-text-primary">{NOMBRE_DE_CARA[cara]}</figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto en memoria del servidor de la demostración. */}
                    <img
                      src={fotos[cara].dataUrl}
                      alt={`${NOMBRE_DE_CARA[cara]} del carné de ${o.cliente.nombre}`}
                      className="w-full rounded-control border border-border bg-surface-subtle object-contain"
                    />
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-body text-text-secondary">
              <IdCard className="size-5 shrink-0" aria-hidden="true" />
              Esta entrega se registró antes de que se pidiera la foto del carné.
            </p>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
