import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, MonitorSmartphone } from "lucide-react";

import { Section } from "@/components/shell/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { ElementoDeLista } from "@/components/patterns/elemento-de-lista";
import { formatAmount } from "@/lib/format";
import { inventarioParaMostrar, type Jornada } from "@/features/network/jornadas";
import { TIPO_DE_SOLICITUD, type Solicitud } from "@/features/network/aprobaciones";
import type { Register } from "@/features/network/registers";
import type { Terminal } from "@/features/network/devices";
import { InventarioDeCaja } from "../../jornadas/inventario";
import { DiferenciaDeApertura, EstadoBadge, fechaYHora, hora } from "../../jornadas/formato";
import type { BaseDeConsola } from "../../jornadas/[id]/cuerpo-de-jornada";

/**
 * La ficha de una caja: cómo está **ahora mismo**. Es lo que se busca al
 * entrar en Cajas: si está abierta y quién la tiene, qué efectivo hay dentro
 * (cerrada, lo que quedó al cerrarla: el efectivo se queda en la caja hasta la
 * próxima apertura), lo que se ha movido en la jornada en curso, lo que espera
 * aprobación y sus jornadas anteriores. Jornadas sigue siendo la vista por
 * turnos; desde aquí se salta a cada una.
 *
 * La comparten Admin y Super Admin; `base` decide a dónde llevan los enlaces.
 */

const ULTIMOS = 8;
const HISTORIAL = 10;

export function CuerpoDeCaja({
  caja,
  equipo,
  abierta,
  cerrada,
  historial,
  pendientes,
  base,
}: {
  caja: Register;
  equipo: Terminal | null;
  abierta: Jornada | null;
  /** La última cerrada, si no hay abierta: lo que hay dentro ahora. */
  cerrada: Jornada | null;
  /** Todas sus jornadas, de la más reciente a la más antigua. */
  historial: readonly Jornada[];
  pendientes: readonly Solicitud[];
  base: BaseDeConsola;
}): React.JSX.Element {
  const actual = abierta ?? cerrada;
  const anteriores = historial.filter((j) => j.id !== abierta?.id).slice(0, HISTORIAL);
  const ultimos = abierta ? [...abierta.movimientos].reverse().slice(0, ULTIMOS) : [];

  return (
    <>
      <Section title="Ahora">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato
                etiqueta="Estado"
                valor={
                  caja.status === "retirada" ? (
                    <Badge variant="neutral">Caja retirada</Badge>
                  ) : abierta ? (
                    <EstadoBadge estado="abierta" />
                  ) : cerrada ? (
                    <EstadoBadge estado={cerrada.estado} />
                  ) : (
                    <span className="text-text-secondary">Sin jornadas todavía</span>
                  )
                }
              />
              {abierta ? (
                <>
                  <Dato
                    etiqueta="Trabajador"
                    valor={
                      <>
                        {abierta.workerName}
                        <span className="block text-body-sm text-text-secondary">
                          {abierta.sesionActiva ? "Con la sesión iniciada" : "Sin sesión iniciada"}
                        </span>
                      </>
                    }
                  />
                  <Dato etiqueta="Abierta desde" valor={fechaYHora(abierta.openedAt)} />
                </>
              ) : cerrada ? (
                <>
                  <Dato
                    etiqueta={cerrada.estado === "forzada" ? "Cierre forzado por" : "Cerrada por"}
                    valor={cerrada.estado === "forzada" ? (cerrada.cierreForzado?.por ?? "—") : cerrada.workerName}
                  />
                  <Dato etiqueta="Cerrada el" valor={fechaYHora(cerrada.closedAt!)} />
                </>
              ) : null}
              <Dato
                etiqueta="Equipo"
                valor={
                  equipo ? (
                    <span className="inline-flex items-center gap-2">
                      <MonitorSmartphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {equipo.label}
                    </span>
                  ) : (
                    <span className="text-warning-foreground">Sin equipo vinculado</span>
                  )
                }
              />
              {actual ? (
                <Dato
                  etiqueta={abierta ? "Jornada en curso" : "Última jornada"}
                  valor={
                    <Link
                      href={`${base}/jornadas/${actual.id}` as Route}
                      className="font-semibold underline underline-offset-4 hover:text-primary"
                    >
                      Ver la jornada
                    </Link>
                  }
                />
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </Section>

      {actual ? (
        <Section
          title={abierta ? "Efectivo ahora" : cerrada?.estado === "forzada" ? "Efectivo en libros al forzar el cierre" : "Efectivo al cerrar"}
          description={
            abierta
              ? "Lo que hay en la caja en este momento, por moneda y denominación."
              : cerrada?.estado === "forzada"
                ? "Nadie lo contó: es lo que decían los libros. Se cuenta al abrir la próxima jornada."
                : "Lo que quedó dentro al cerrar. Sigue en la caja hasta la próxima apertura."
          }
        >
          <Card>
            <CardContent className="pt-6">
              <InventarioDeCaja inventario={inventarioParaMostrar(actual)} todoAbierto />
            </CardContent>
          </Card>
        </Section>
      ) : null}

      {pendientes.length > 0 ? (
        <Section title="Pendiente de aprobar" description="Las diferencias de esta caja que esperan resolución.">
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border" aria-label="Pendiente de aprobar">
                {pendientes.map((s) => (
                  <ElementoDeLista
                    key={s.id}
                    href={`${base}/aprobaciones/${s.id}`}
                    label={`${base === "/admin" ? "Resolver" : "Ver"} la ${TIPO_DE_SOLICITUD[s.tipo].toLowerCase()} de ${s.workerName} en ${s.currency}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-text-primary">
                        {TIPO_DE_SOLICITUD[s.tipo]} · {s.workerName}
                      </span>
                      <span className="block text-body-sm text-text-secondary">{fechaYHora(s.fechaHora)}</span>
                    </span>
                    <DiferenciaDeApertura currency={s.currency} diferencia={s.diferencia} motivo={s.motivo} />
                  </ElementoDeLista>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Section>
      ) : null}

      {abierta ? (
        <Section
          title="Últimos movimientos"
          description={
            abierta.movimientos.length > ULTIMOS
              ? `Los ${ULTIMOS} más recientes de ${abierta.movimientos.length} en la jornada en curso.`
              : "Los de la jornada en curso, del más reciente al más antiguo."
          }
        >
          <Card>
            <CardContent className="pt-6">
              {ultimos.length === 0 ? (
                <p className="text-body-sm text-text-secondary">Todavía no hay movimientos en esta jornada.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border" aria-label="Últimos movimientos">
                  {ultimos.map((m) => {
                    const contenido = (
                      <>
                        <span className="flex min-w-0 items-baseline gap-3">
                          <span className="pc-numeric shrink-0 text-body-sm text-text-secondary">{hora(m.fechaHora)}</span>
                          <span className="truncate text-text-primary">{m.concepto}</span>
                        </span>
                        <span
                          className={`pc-numeric shrink-0 font-semibold ${m.amount < 0 ? "text-text-primary" : "text-success-foreground"}`}
                        >
                          {m.amount > 0 ? "+" : ""}
                          {formatAmount(m.amount)} {m.currency}
                        </span>
                      </>
                    );
                    /* Super Admin solo consulta y no tiene detalle de movimiento: la fila es plana. */
                    return base === "/admin" ? (
                      <ElementoDeLista
                        key={m.id}
                        href={`/admin/jornadas/${abierta.id}/movimientos/${m.id}`}
                        className="flex items-center justify-between gap-4"
                      >
                        {contenido}
                      </ElementoDeLista>
                    ) : (
                      <li key={m.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                        {contenido}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href={`${base}/jornadas/${abierta.id}` as Route}
                className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-text-primary underline underline-offset-4 hover:text-primary"
              >
                Todos los movimientos en la jornada
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </Section>
      ) : null}

      <Section
        title="Jornadas anteriores"
        description={anteriores.length === HISTORIAL ? `Las ${HISTORIAL} más recientes. Las demás, en Jornadas.` : undefined}
      >
        {anteriores.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Esta caja todavía no ha cerrado ninguna jornada.</p>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border" aria-label="Jornadas anteriores">
                {anteriores.map((j) => (
                  <ElementoDeLista
                    key={j.id}
                    href={`${base}/jornadas/${j.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-text-primary">
                        {fechaYHora(j.openedAt)} · {j.workerName}
                      </span>
                      <span className="block text-body-sm text-text-secondary">
                        {j.closedAt ? `Hasta el ${fechaYHora(j.closedAt)}` : "Sin cerrar"} · {j.movimientos.length}{" "}
                        {j.movimientos.length === 1 ? "movimiento" : "movimientos"}
                      </span>
                    </span>
                    <EstadoBadge estado={j.estado} />
                  </ElementoDeLista>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
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
