import * as React from "react";
import { Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { tarifaDelTramo } from "@/components/patterns/tarifa-de-giro";
import { WORKER_SERVICES } from "@/features/operations/services";
import { inicioDeTramo, TARIFA_POR_SERVICIO, type TarifaDeGiro } from "@/features/network/tarifas";
import { importe, textoDelTramo } from "@/lib/formato-de-tarifa";
import type { VistaDeCaja } from "@/features/worker/vista";

/**
 * Tarifas vigentes — lo que se le cobra al cliente además del importe, para
 * que el trabajador conteste delante de él sin empezar una operación
 * (decisión del 24/11/2026). Es la pareja de «Tasas vigentes», y no una
 * pantalla, por la misma razón por la que Tasas tampoco la tiene.
 *
 * Va **por servicio**: hoy solo Enviar giro lleva tarifa, pero un servicio
 * nuevo con tarifa es un grupo más. Debajo, los servicios de la sede que no
 * llevan tarifa, porque «¿y esto cuánto me cuesta?» también se pregunta de
 * ellos. Si la sede no ofrece ningún servicio con tarifa, la tarjeta no sale.
 *
 * El importe exacto de un giro lo da Enviar giro: aquí no se redondea nada.
 */
export function TarifasVigentes({
  vista,
  glyph: Glyph,
  desdeCuando,
}: {
  vista: Pick<VistaDeCaja, "servicios" | "monedas" | "tarifasDeGiro" | "tarifasDesde">;
  glyph: React.ComponentType<{ icon: LucideIcon }>;
  desdeCuando: (iso: string) => string;
}): React.JSX.Element | null {
  const ofrecidos = WORKER_SERVICES.filter((s) => s.status === "available" && vista.servicios.includes(s.id));
  const conTarifa = ofrecidos.filter((s) => TARIFA_POR_SERVICIO[s.id]?.tipo === "por-tramos");
  if (conTarifa.length === 0) return null;

  /* Lo que no lleva tarifa, dicho como lo dice el trabajador: un servicio
     entero (Remesas) o la otra operación de uno que sí la lleva (Cobrar giro). */
  const sinTarifa = ofrecidos.flatMap((s) => {
    const t = TARIFA_POR_SERVICIO[s.id];
    if (!t) return [];
    return t.tipo === "sin-tarifa" ? [s.name] : [t.sinTarifa];
  });

  return (
    <Card className="flex flex-col" role="region" aria-labelledby="tarifas-vigentes">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Glyph icon={Receipt} />
          <CardTitle id="tarifas-vigentes">Tarifas vigentes</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        {conTarifa.map((s) => {
          const t = TARIFA_POR_SERVICIO[s.id];
          if (!t || t.tipo !== "por-tramos") return null;
          /* Hoy el único servicio con tarifa es Giros, y su tarifa va por moneda. */
          const porMoneda = s.id === "giros" ? vista.tarifasDeGiro : {};
          const monedas = vista.monedas.filter((m) => porMoneda[m] !== undefined);
          const sinPolitica = vista.monedas.filter((m) => porMoneda[m] === undefined);
          return (
            <section key={s.id} aria-label={`Tarifa de ${t.operacion}`}>
              <h3 className="text-label font-semibold text-text-primary">{t.operacion}</h3>
              <p className="mt-0.5 text-body-sm text-text-secondary">
                La paga {t.quienPaga.charAt(0).toLowerCase() + t.quienPaga.slice(1)} Se calcula sobre lo que recibe el
                beneficiario.
              </p>

              {monedas.length === 0 ? (
                <p className="mt-3 text-body-sm text-text-primary">Hoy no se puede enviar en ninguna moneda de tu caja.</p>
              ) : (
                <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {monedas.map((code) => (
                    <TarifaDeMoneda
                      key={code}
                      code={code}
                      tarifa={porMoneda[code]!}
                      desde={vista.tarifasDesde[code] ? desdeCuando(vista.tarifasDesde[code]!) : null}
                    />
                  ))}
                </ul>
              )}

              {sinPolitica.length > 0 ? (
                <p className="mt-3 text-body-sm text-text-secondary">
                  No se envía en {sinPolitica.join(", ")}: PuntoCash no le ha puesto tarifa.
                </p>
              ) : null}
            </section>
          );
        })}
      </CardContent>

      <CardFooter>
        <span className="text-caption text-text-secondary">
          {sinTarifa.length > 0 ? `Sin tarifa: ${sinTarifa.join(", ")}. ` : ""}Las fija PuntoCash, igual en todas las sedes.
        </span>
      </CardFooter>
    </Card>
  );
}

function TarifaDeMoneda({
  code,
  tarifa,
  desde,
}: {
  code: string;
  tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">;
  desde: string | null;
}): React.JSX.Element {
  return (
    <li className="rounded-control border border-border" aria-label={`Tarifa en ${code}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-semibold text-text-primary">
          <CurrencyFlag currency={code} />
          {code}
        </span>
        {desde ? <span className="text-caption text-text-secondary">Desde {desde}</span> : null}
      </div>
      <dl className="flex flex-col gap-1.5 px-4 py-3 text-body-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-text-secondary">Giro mínimo</dt>
          <dd className="pc-numeric font-medium text-text-primary">{importe(tarifa.minimo)}</dd>
        </div>
        {tarifa.tramos.map((t, i) => (
          <div key={i} className="flex justify-between gap-3">
            <dt className="pc-numeric text-text-secondary">{tramoCorto(tarifa, i)}</dt>
            <dd className="pc-numeric shrink-0 font-medium text-text-primary">{tarifaDelTramo(t, code)}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

/**
 * Un tramo en pocas palabras: el giro mínimo va justo encima, así que basta
 * con decir hasta dónde llega cada uno («Hasta 100,00», incluido) y el último,
 * «Más de 500,00». Con un solo tramo, desde el mínimo. Así cabe en una línea
 * en las tres columnas a 1280.
 */
function tramoCorto(tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">, i: number): string {
  const t = tarifa.tramos[i]!;
  if (t.hasta !== null) return `Hasta ${importe(t.hasta)}`;
  return i === 0 ? textoDelTramo({ ...t, ...inicioDeTramo(tarifa, i) }) : `Más de ${importe(tarifa.tramos[i - 1]!.hasta ?? tarifa.minimo)}`;
}

