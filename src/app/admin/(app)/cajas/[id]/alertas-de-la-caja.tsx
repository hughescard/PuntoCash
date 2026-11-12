import * as React from "react";

import { Section } from "@/components/shell/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { ElementoDeLista } from "@/components/patterns/elemento-de-lista";
import { formatAmount } from "@/lib/format";
import {
  alertasActivas,
  desdeDeAlertas,
  historialDeAlertas,
  tituloDeAlerta,
  type AlertaDeCaja,
} from "@/features/network/alertas";
import type { Jornada } from "@/features/network/jornadas";
import { fechaYHora } from "../../jornadas/formato";
import type { BaseDeConsola } from "../../jornadas/[id]/cuerpo-de-jornada";

const HISTORIAL_DE_ALERTAS = 10;
/** Cuántas jornadas se repasan para el historial. */
const JORNADAS_REPASADAS = 5;

/** La alerta con sus cifras: es lo que la administración ve y el trabajador no. */
export function cifras(a: AlertaDeCaja): string {
  if (a.tipo === "billetes-pocos") return `Hay ${a.actual}, el mínimo es ${a.limite}.`;
  const hay = `Hay ${formatAmount(a.actual)} ${a.currency}`;
  return a.tipo === "efectivo-bajo"
    ? `${hay}, el mínimo es ${formatAmount(a.limite)}.`
    : `${hay}, el máximo es ${formatAmount(a.limite)}.`;
}

/**
 * Las alertas de una caja (bloque 6): las que tiene **ahora**, con sus cifras y
 * desde cuándo, y su historial. Una alerta se enciende y se apaga sola; no hay
 * «atendida». Solo cuenta con la jornada abierta: una caja cerrada no opera.
 */
export function AlertasDeLaCaja({
  abierta,
  historial,
  base,
}: {
  abierta: Jornada | null;
  /** Todas sus jornadas, de la más reciente a la más antigua. */
  historial: readonly Jornada[];
  base: BaseDeConsola;
}): React.JSX.Element {
  const activas = abierta ? alertasActivas(abierta) : [];
  const desde = abierta ? desdeDeAlertas(abierta) : new Map<string, string>();
  const anteriores = historialDeAlertas(historial.slice(0, JORNADAS_REPASADAS))
    .filter((t) => t.hasta !== null)
    .slice(0, HISTORIAL_DE_ALERTAS);

  return (
    <Section
      title="Alertas"
      description="Se encienden y se apagan solas según los límites de la sede. El trabajador las ve sin cifras."
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="pt-6">
            {!abierta ? (
              <p className="text-body text-text-secondary">Sin jornada abierta no hay alertas: la caja no está operando.</p>
            ) : activas.length === 0 ? (
              <p className="text-body text-text-primary">Sin alertas ahora.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border" aria-label="Alertas activas">
                {activas.map((a) => (
                  <li key={a.clave} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block font-medium text-text-primary">{tituloDeAlerta(a)}</span>
                      <span className="block text-body-sm text-text-secondary">
                        {cifras(a)}
                        {desde.get(a.clave) ? ` Desde las ${fechaYHora(desde.get(a.clave)!)}.` : ""}
                      </span>
                    </span>
                    <Badge variant="warning">Activa</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {anteriores.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-3 text-label text-text-primary">Historial</h3>
              <ul className="flex flex-col divide-y divide-border" aria-label="Historial de alertas">
                {anteriores.map((t) => (
                  <ElementoDeLista key={`${t.jornadaId}-${t.clave}-${t.desde}`} href={`${base}/jornadas/${t.jornadaId}`}>
                    <span className="block font-medium text-text-primary">{tituloDeAlerta(t)}</span>
                    <span className="block text-body-sm text-text-secondary">
                      {fechaYHora(t.desde)} → {fechaYHora(t.hasta!)}
                    </span>
                  </ElementoDeLista>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Section>
  );
}
