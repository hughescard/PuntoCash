import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Section } from "@/components/shell/app-shell";
import { Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import type { Jornada } from "@/features/network/jornadas";
import { saldosDe } from "@/features/network/jornadas";
import type { Solicitud } from "@/features/network/aprobaciones";
import { diaEnCuba, Diferencia, DiferenciaDeApertura, EstadoBadge, fechaYHora, hora } from "../formato";
import { MovimientosDeJornada } from "./movimientos-de-jornada";

/**
 * EL CUERPO DE UNA JORNADA, en solo lectura: la jornada, su apertura, sus
 * saldos, su cierre y su libro de movimientos.
 *
 * Lo comparten las dos consolas. Admin lo enmarca con lo suyo —forzar el
 * cierre, los avisos de conciliación— y Super administración con lo suyo,
 * que no incluye ninguna acción. Lo de dentro es el mismo registro y debe
 * leerse igual en las dos: si se escribiera dos veces, acabaría diciendo
 * cosas distintas del mismo hecho.
 *
 * `base` decide la raíz de los enlaces. Con `/super-admin` además se apagan
 * los dos destinos que esa consola no tiene: el detalle de un movimiento y
 * la ficha de una solicitud de aprobación, que son herramientas del mercante
 * para resolver un descuadre, no del dueño de la red para registrarlo.
 */
export type BaseDeConsola = "/admin" | "/super-admin";

export function CuerpoDeJornada({
  j,
  base,
  trabajadorVisible,
  solicitudes,
}: {
  j: Jornada;
  base: BaseDeConsola;
  /** Si la ficha del trabajador está al alcance de quien mira. */
  trabajadorVisible: boolean;
  /** Las solicitudes de aprobación de esta jornada, para decir en qué quedó cada diferencia. */
  solicitudes: readonly Solicitud[];
}): React.JSX.Element {
  const saldos = saldosDe(j);
  const previo = j.apertura.cierreAnterior;
  const solicitudDe = (tipo: "cierre" | "apertura", currency: string) =>
    solicitudes.find((x) => x.tipo === tipo && x.currency === currency) ?? null;

  return (
    <>
  <Section title="La jornada">
    <Card>
      <CardContent className="pt-6">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="Estado" valor={<EstadoBadge estado={j.estado} />} />
          <Dato
            etiqueta="Trabajador"
            valor={
              trabajadorVisible ? (
                <Link href={`${base}/trabajadores/${j.workerId}` as Route} className="underline underline-offset-4 hover:text-primary">
                  {j.workerName}
                </Link>
              ) : (
                j.workerName
              )
            }
          />
          <Dato etiqueta="Equipo" valor={j.equipo ? `${j.equipo.label} · ${j.equipo.id}` : "—"} />
          <Dato etiqueta="Apertura" valor={fechaYHora(j.openedAt)} />
          <Dato
            etiqueta="Cierre"
            valor={
              j.closedAt
                ? diaEnCuba(j.closedAt) === diaEnCuba(j.openedAt)
                  ? hora(j.closedAt)
                  : fechaYHora(j.closedAt)
                : "Abierta"
            }
          />
        </dl>
      </CardContent>
    </Card>
  </Section>

  {/* FR-AD-JOR-18 y 19: lo que encontró quien abrió, contra lo que dejó el cierre anterior. */}
  <Section
    title="Apertura"
    description={
      previo
        ? undefined
        : "Es la primera jornada registrada de esta caja: no hay un cierre anterior con el que comparar."
    }
  >
    <Card>
      <CardContent className="pt-6">
        {previo ? (
          <p className="mb-4 text-body-sm text-text-secondary">
            Comparada con el cierre de la{" "}
            <Link href={`${base}/jornadas/${previo.jornadaId}` as Route} className="font-semibold text-text-primary underline underline-offset-4">
              jornada anterior
            </Link>{" "}
            de esta caja ({previo.workerName}, {fechaYHora(previo.closedAt)}).
            {previo.sinArqueo
              ? " Ese fue un cierre forzado: lo dejado es el saldo en libros, y este es el primer conteo de la caja desde entonces."
              : null}
          </p>
        ) : null}
        <ul className="flex flex-col divide-y divide-border">
          {j.apertura.monedas.map((m) => (
            <li
              key={m.currency}
              className={
                previo
                  ? "grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr_1fr_1.5fr] sm:items-start"
                  : "grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:items-start"
              }
            >
              <span className="inline-flex items-center gap-2">
                <CurrencyFlag currency={m.currency} />
                <span className="pc-numeric font-semibold">{m.currency}</span>
              </span>
              {previo ? (
                <span className="pc-numeric text-body-sm text-text-secondary">
                  Dejado {m.dejado === null ? "—" : formatAmount(m.dejado)}
                </span>
              ) : null}
              <span className="pc-numeric text-body-sm text-text-secondary">Contado {formatAmount(m.contado)}</span>
              {previo ? (
                <span className="flex flex-col">
                  {m.diferencia === 0 ? (
                    <span className="font-semibold text-text-primary">Coincide</span>
                  ) : (
                    <DiferenciaDeApertura currency={m.currency} diferencia={m.diferencia} motivo={m.motivo} />
                  )}
                  {m.observaciones ? <span className="text-body-sm text-text-secondary">{m.observaciones}</span> : null}
                  <EstadoDeAprobacion solicitud={solicitudDe("apertura", m.currency)} base={base} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  </Section>

  <Section title={j.estado === "abierta" ? "Saldos" : "Saldos al cerrar"}>
    <Card>
      <CardContent className="pt-6">
        <table className="w-full text-body">
          <thead>
            <tr className="text-left text-caption uppercase tracking-wide text-text-secondary">
              <th className="pb-2 font-medium">Moneda</th>
              <th className="pb-2 text-right font-medium">Fondeo inicial</th>
              <th className="pb-2 text-right font-medium">{j.estado === "abierta" ? "Ahora" : "Final"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {saldos.map((s) => (
              <tr key={s.currency}>
                <td className="py-2">
                  <span className="inline-flex items-center gap-2">
                    <CurrencyFlag currency={s.currency} />
                    <span className="pc-numeric font-semibold">{s.currency}</span>
                  </span>
                </td>
                <td className="pc-numeric py-2 text-right">
                  {formatAmount(j.fondeo.find((f) => f.currency === s.currency)?.amount ?? 0)}
                </td>
                <td className="pc-numeric py-2 text-right font-semibold">{formatAmount(s.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </Section>

  {j.arqueo ? (
    <Section title="Cierre" description={`Confirmado por ${j.workerName} el ${fechaYHora(j.arqueo.confirmadoAt)}.`}>
      <Card>
        <CardContent className="pt-6">
          <ul className="flex flex-col divide-y divide-border">
            {j.arqueo.monedas.map((m) => (
              <li key={m.currency} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr_1fr_1.5fr] sm:items-center">
                <span className="inline-flex items-center gap-2">
                  <CurrencyFlag currency={m.currency} />
                  <span className="pc-numeric font-semibold">{m.currency}</span>
                </span>
                <span className="pc-numeric text-body-sm text-text-secondary">Esperado {formatAmount(m.esperado)}</span>
                <span className="pc-numeric text-body-sm text-text-secondary">Contado {formatAmount(m.contado)}</span>
                <span className="flex flex-col">
                  <Diferencia currency={m.currency} diferencia={m.diferencia} />
                  {m.motivo ? <span className="text-body-sm text-text-secondary">{m.motivo}</span> : null}
                  <EstadoDeAprobacion solicitud={solicitudDe("cierre", m.currency)} base={base} />
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Section>
  ) : null}

  <Section title="Movimientos">
    <MovimientosDeJornada
      jornadaId={j.id}
      base={base}
      conDetalle={base === "/admin"}
      rows={j.movimientos.map((m) => ({
        id: m.id,
        hora: hora(m.fechaHora),
        operacion: m.operationCode ?? null,
        tipo: m.tipo,
        concepto: m.concepto,
        currency: m.currency,
        amount: m.amount,
        saldoDespues: m.saldoDespues,
      }))}
    />
  </Section>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
    </div>
  );
}

/** En qué quedó la solicitud de una diferencia. Con enlace solo donde hay a dónde ir. */
function EstadoDeAprobacion({
  solicitud,
  base,
}: {
  solicitud: Solicitud | null;
  base: BaseDeConsola;
}): React.JSX.Element | null {
  if (!solicitud) return null;
  const texto =
    solicitud.estado === "pendiente"
      ? "Pendiente de aprobación"
      : `${solicitud.estado === "aprobada" ? "Aprobada" : "Rechazada"} por ${solicitud.resolucion?.por ?? "la administración"}`;
  const clase =
    solicitud.estado === "pendiente"
      ? "w-fit text-body-sm font-semibold text-warning-foreground"
      : "w-fit text-body-sm text-text-secondary";

  if (base !== "/admin") return <span className={clase}>{texto}</span>;
  return (
    <Link href={`/admin/aprobaciones/${solicitud.id}` as Route} className={`${clase} underline underline-offset-4 hover:text-primary`}>
      {texto}
    </Link>
  );
}
