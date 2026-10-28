import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock, MonitorSmartphone, Pencil } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cifraDeTablero, formatAmount, formatDate } from "@/lib/format";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { findSedeById } from "@/features/network/sedes";
import { adminUsersOf, findOperatorById, OPERATORS } from "@/features/network/operators";
import { listarEventos } from "@/features/network/audit";
import { estadoDeSede, historialDeSede } from "@/features/network/assignments";
import { maskEmail } from "@/features/auth/two-factor";
import { CATALOGO_MONEDAS } from "@/features/network/currencies";
import { lineasDeHorario } from "@/features/network/horario";
import { jornadasDeSede, saldosDe } from "@/features/network/jornadas";
import { WORKER_SERVICES } from "@/features/operations/services";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { fechaCorta, fechaYHora } from "@/app/admin/(app)/jornadas/formato";
import { EstadoDeSedeBadge } from "../../_compartido/estado-de-sede";
import { AccionesDeEstado, Asignar, CambiarServicios, Revocar, type JornadaAbierta } from "./acciones-sede";

export const metadata: Metadata = {
  title: "Super administración · Ficha de sede",
  robots: { index: false, follow: false },
};

/** Los servicios que se habilitan sede a sede; el resto del catálogo no depende de la sucursal. */
const SERVICIOS_DE_SEDE = ["cambio-moneda", "remesas", "giros"] as const;

/**
 * Ficha de una sede: los siete bloques del requisito.
 *
 *   1. Datos de la sede · 2. Servicios habilitados · 3. Asignación vigente ·
 *   4. Historial de asignaciones · 5. Cajas y equipos · 6. Trabajadores ·
 *   7. Contenido público (monedas, tasas y promociones que exhibe).
 *
 * Cajas, equipos, trabajadores y contenido público son **de solo lectura**:
 * los gestiona el operador. Aquí no hay ningún control para cambiarlos, ni
 * siquiera deshabilitado.
 */
export default async function SuperAdminSedePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hecho?: string; guardado?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id } = await params;
  const { hecho, guardado } = await searchParams;
  const sede = findSedeById(id);
  if (!sede) notFound();

  const red = redEnAlcance(GLOBAL_SCOPE);
  const estado = estadoDeSede(sede);
  const tramos = historialDeSede(sede.id);
  const vigente = tramos.find((t) => !t.endedAt) ?? null;
  const pasados = tramos.filter((t) => t.endedAt).slice().reverse();
  const operador = vigente ? findOperatorById(vigente.operatorId) : null;
  /* Quiénes administran esta sede: los usuarios del operador que la tiene.
     Son los mismos para todas sus sedes —hay un principal por entidad, no uno
     por sede (decisión del 28/10)—, y la pantalla lo dice para que nadie los
     tome por personas asignadas a esta sucursal. */
  const administradores = operador ? adminUsersOf(operador.id) : [];
  const cajas = red.cajasConHistorico(sede.id);
  const kioscos = red.kioscos(sede.id);
  const trabajadores = red.trabajadores(sede.id);
  const monedas = red.monedas(sede.id);
  const tablero = red.tablero(sede.id);
  const enPantalla = red.promocionesEnPantalla(sede.id);
  const ahora = new Date();
  const cerrada = sede.status === "cerrada";
  const jornadasAbiertas: JornadaAbierta[] = jornadasDeSede(sede.id)
    .filter((j) => j.closedAt === null)
    .map((j) => ({ id: j.id, caja: j.cajaNombre, trabajador: j.workerName, desde: fechaYHora(j.openedAt) }));
  const suspensiones = listarEventos({ branchId: sede.id }).filter(
    (e) => e.type === "sede.suspendida" || e.type === "sede.reactivada",
  );
  const aviso = hecho ? AVISOS[hecho] : guardado === "1" ? AVISOS.guardado : undefined;

  return (
    <>
      <PageHeader
        title={sede.name}
        description={`${sede.code} · ${sede.locality}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/sedes">
              <ArrowLeft aria-hidden="true" />
              Volver a Sedes
            </Link>
          </Button>
        }
      />

      <div className="mb-8 flex flex-col gap-4">
        {aviso ? (
          <Alert variant="success" title={aviso.titulo}>
            {aviso.texto}
          </Alert>
        ) : null}
        <div>
          <EstadoDeSedeBadge estado={estado} />
        </div>
        <AvisoDeEstado
          estado={estado}
          suspension={sede.suspension}
          operador={operador?.name ?? null}
        />
      </div>

      {/* 1 · Datos */}
      <Section
        title="Datos de la sede"
        description={
          estado === "sin-asignar"
            ? "Son públicos: se ven en el kiosco y en la pantalla de la sucursal. Mientras no tenga operador, los mantiene PuntoCash."
            : "Son públicos: se ven en el kiosco y en la pantalla de la sucursal. El código y el nombre los mantiene PuntoCash; la dirección, el teléfono y el horario, su operador."
        }
        actions={
          cerrada ? null : (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/super-admin/sedes/${sede.id}/editar` as Route}>
                <Pencil aria-hidden="true" />
                Editar datos
              </Link>
            </Button>
          )
        }
      >
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Dato etiqueta="Código" valor={sede.code} numerico />
              <Dato etiqueta="Nombre" valor={sede.name} />
              <Dato etiqueta="Dirección" valor={sede.address} />
              <Dato etiqueta="Municipio y provincia" valor={sede.locality} />
              <Dato etiqueta="Teléfono" valor={sede.phone} numerico />
              <Dato etiqueta="Horario" valor={lineasDeHorario(sede.horario)} />
              <Dato etiqueta="Alta en la red" valor={formatDate(new Date(sede.createdAt))} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      {/* 2 · Servicios */}
      <Section
        title="Servicios habilitados"
        description="Lo que esta sucursal puede ofrecer."
        actions={
          cerrada ? null : (
            <CambiarServicios
              sedeId={sede.id}
              servicios={SERVICIOS_DE_SEDE.map((sid) => ({ id: sid, nombre: WORKER_SERVICES.find((x) => x.id === sid)?.name ?? sid }))}
              habilitados={sede.services}
            />
          )
        }
      >
        <Card>
          <CardContent className="pt-6">
            <ul className="flex flex-col gap-3">
              {SERVICIOS_DE_SEDE.map((sid) => {
                const servicio = WORKER_SERVICES.find((s) => s.id === sid);
                return (
                  <li key={sid} className="flex items-center justify-between gap-4">
                    <span className="text-body text-text-primary">{servicio?.name ?? sid}</span>
                    {sede.services.includes(sid) ? (
                      <Badge variant="success">Habilitado</Badge>
                    ) : (
                      <Badge variant="neutral" icon={<Lock aria-hidden="true" />}>
                        No habilitado
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </Section>

      {/* 3 · Asignación vigente */}
      <Section
        title="Asignación vigente"
        actions={
          cerrada ? null : vigente && operador ? (
            <Revocar sedeId={sede.id} sedeNombre={sede.name} operador={operador.name} jornadasAbiertas={jornadasAbiertas} />
          ) : (
            <Asignar
              sedeId={sede.id}
              sedeNombre={sede.name}
              operadores={OPERATORS.filter((o) => o.status === "activo")
                .map((o) => ({ id: o.id, nombre: o.name }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))}
              hoy={fechaCorta(ahora.toISOString())}
            />
          )
        }
      >
        <Card>
          <CardContent className="pt-6">
            {vigente && operador ? (
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Dato
                  etiqueta="Operador"
                  valor={
                    <Link
                      href={`/super-admin/operadores/${operador.id}` as Route}
                      className="font-medium text-text-primary underline-offset-4 hover:underline"
                    >
                      {operador.name}
                    </Link>
                  }
                />
                <Dato
                  etiqueta="Desde"
                  valor={`${fechaCorta(vigente.startedAt)} · ${transcurrido(vigente.startedAt, ahora)}`}
                />
                <div className="sm:col-span-2">
                  <Dato etiqueta="Motivo" valor={vigente.startedReason} />
                </div>
              </dl>
            ) : (
              <p className="text-body text-text-secondary">
                Esta sede no tiene operador. Hasta que se le asigne uno, nadie puede crearle cajas ni sus trabajadores
                pueden entrar.
              </p>
            )}

            {operador ? (
              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-body font-semibold text-text-primary">Administradores</h3>

                {administradores.length === 0 ? (
                  <p className="mt-3 text-body-sm text-warning-foreground">
                    Esta empresa no tiene ningún usuario: nadie puede poner la sede en marcha. Se resuelve desde la
                    ficha del operador.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col divide-y divide-border">
                    {administradores.map((u) => (
                      /* En el teléfono se apila a la izquierda: en una fila
                         con «justify-between», el estado quedaba centrado. */
                      <li
                        key={u.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3"
                      >
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-body font-medium text-text-primary">
                            {u.fullName}
                            {u.isPrincipal ? <Badge variant="info">Principal</Badge> : null}
                          </p>
                          <p className="mt-0.5 text-body-sm text-text-secondary">
                            {u.identifier} · {maskEmail(u.email)}
                          </p>
                          <p className="pc-numeric mt-0.5 text-body-sm text-text-secondary">{u.phone}</p>
                        </div>
                        <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
                          {u.status === "activo" ? (
                            <Badge variant="success">Activo</Badge>
                          ) : (
                            <Badge variant="neutral">Desactivado</Badge>
                          )}
                          <span className="text-caption text-text-secondary">
                            {u.lastAccessAt ? `Último acceso: ${fechaYHora(u.lastAccessAt)}` : "Nunca ha entrado"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Section>

      {/* 4 · Historial */}
      <Section
        title="Historial de asignaciones"
        description="Todos los operadores que tuvo antes. Es un registro: no se edita ni se borra."
      >
        {pasados.length === 0 ? (
          <Vacio>Ningún operador anterior.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ol className="flex flex-col divide-y divide-border">
                {pasados.map((t) => {
                  const op = findOperatorById(t.operatorId);
                  return (
                    <li key={t.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 lg:grid-cols-[16rem_1fr] lg:gap-6">
                      <div>
                        <p className="text-body font-medium text-text-primary">{op?.name ?? t.operatorId}</p>
                        <p className="pc-numeric text-body-sm text-text-secondary">
                          {fechaCorta(t.startedAt)} – {fechaCorta(t.endedAt!)}
                        </p>
                      </div>
                      <dl className="grid gap-2 text-body-sm">
                        <div>
                          <dt className="inline text-text-secondary">Inicio: </dt>
                          <dd className="inline text-text-primary">{t.startedReason}</dd>
                        </div>
                        <div>
                          <dt className="inline text-text-secondary">Fin: </dt>
                          <dd className="inline text-text-primary">{t.endedReason}</dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* Estado: suspender, reactivar, cerrar, y su historial */}
      <Section
        title="Estado de la sede"
        description="Suspender corta el acceso a toda la sede y se revierte. Cerrar es definitivo."
      >
        {cerrada ? null : (
          <AccionesDeEstado
            sedeId={sede.id}
            sedeNombre={sede.name}
            suspendida={sede.status === "suspendida"}
            jornadasAbiertas={jornadasAbiertas}
            cajas={cajas.filter((c) => c.status === "activa").length}
            equipos={red.equipos(sede.id).length}
          />
        )}
        <h3 className="mt-6 mb-3 text-body font-semibold text-text-primary">Historial de suspensiones</h3>
        {suspensiones.length === 0 ? (
          <Vacio>Nunca ha estado suspendida.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ol className="flex flex-col divide-y divide-border">
                {suspensiones.map((e) => (
                  <li key={e.id} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {e.type === "sede.suspendida" ? "Suspendida" : "Reactivada"}
                      </p>
                      <p className="pc-numeric text-body-sm text-text-secondary">{fechaYHora(e.at)}</p>
                    </div>
                    <div className="text-body-sm">
                      <p className="text-text-primary">{e.reason}</p>
                      <p className="text-text-secondary">{e.actorName}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* 5 · Cajas y equipos */}
      <Section title="Cajas y equipos" description="Los monta y los gestiona su operador. Aquí solo se consultan.">
        <h3 className="mb-3 text-body font-semibold text-text-primary">Cajas</h3>
        {cajas.length === 0 ? (
          <Vacio>
            {operador
              ? `Esta sede todavía no tiene cajas. Las crea su administrador, ${operador.name}.`
              : "Esta sede todavía no tiene cajas. Las creará su administrador cuando se le asigne un operador."}
          </Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {cajas.map((caja) => {
                  const equipo = red.equipoDeCaja(caja.id);
                  const abierta = red.jornadaAbiertaDeCaja(caja.id);
                  return (
                    <li key={caja.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-body font-medium text-text-primary">{caja.name}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-body-sm text-text-secondary">
                          {equipo ? (
                            <>
                              <MonitorSmartphone className="size-4 shrink-0" aria-hidden="true" />
                              {equipo.label}
                            </>
                          ) : (
                            <span className="text-warning-foreground">Sin equipo vinculado</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-body-sm text-text-secondary">
                          {abierta ? (
                            <>
                              {abierta.sesionActiva
                                ? `${abierta.workerName} con la sesión iniciada`
                                : `Jornada abierta de ${abierta.workerName}, sin sesión iniciada`}
                              {" · desde el "}
                              {fechaYHora(abierta.openedAt)}
                              {" · "}
                              <span className="pc-numeric">
                                {saldosDe(abierta)
                                  .map((m) => `${formatAmount(m.amount)} ${m.currency}`)
                                  .join(" · ")}
                              </span>
                            </>
                          ) : (
                            "Sin jornada abierta"
                          )}
                        </p>
                      </div>
                      {caja.status === "activa" ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="neutral">Retirada</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <h3 className="mt-6 mb-3 text-body font-semibold text-text-primary">Kioscos</h3>
        {kioscos.length === 0 ? (
          <Vacio>Ningún kiosco vinculado.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {kioscos.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-body font-medium text-text-primary">{k.label}</p>
                      <p className="pc-numeric mt-0.5 text-caption text-text-secondary">{k.id}</p>
                    </div>
                    <p className="text-body-sm text-text-secondary">
                      {k.lastSeenAt ? `Última actividad: ${fechaYHora(k.lastSeenAt)}` : "Sin actividad registrada"}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* 6 · Trabajadores */}
      <Section title="Trabajadores" description="Adscritos a esta sede. Los da de alta su operador.">
        {trabajadores.length === 0 ? (
          <Vacio>Esta sede todavía no tiene personal dado de alta.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {trabajadores.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-body font-medium text-text-primary">{t.fullName}</p>
                      <p className="mt-0.5 text-body-sm text-text-secondary">{t.identifier}</p>
                    </div>
                    {t.status === "activo" ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Desactivado</Badge>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* 7 · Contenido público */}
      <Section
        title="Contenido público"
        description="Lo que esta sucursal exhibe en su pantalla y su kiosco: las monedas que maneja, las tasas que publica y sus promociones."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-body font-semibold text-text-primary">Monedas de su lista</h3>
              {monedas.length === 0 ? (
                <p className="mt-2 text-body-sm text-text-secondary">Ninguna moneda en su lista.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {monedas.map((m) => (
                    <li key={m.code} className="inline-flex items-center gap-2 rounded-control border border-border px-3 py-1.5">
                      <CurrencyFlag currency={m.code} />
                      <span className="pc-numeric text-body-sm font-semibold text-text-primary">{m.code}</span>
                      <span className="text-body-sm text-text-secondary">
                        {CATALOGO_MONEDAS.find((c) => c.code === m.code)?.name ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-body font-semibold text-text-primary">Tasas que publica hoy</h3>
              {tablero.length === 0 ? (
                <p className="mt-2 text-body-sm text-text-secondary">No publica ninguna tasa.</p>
              ) : (
                <table className="mt-3 w-full text-body">
                  <thead>
                    <tr className="text-left text-caption uppercase tracking-wide text-text-secondary">
                      <th className="pb-2 font-medium">Moneda</th>
                      <th className="pb-2 text-right font-medium">Compra</th>
                      <th className="pb-2 text-right font-medium">Venta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tablero.map((t) => (
                      <tr key={t.currency}>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-2">
                            <CurrencyFlag currency={t.currency} />
                            <span className="pc-numeric font-semibold text-text-primary">{t.currency}</span>
                          </span>
                        </td>
                        <td className="pc-numeric py-2 text-right">{cifraDeTablero(t.buy)}</td>
                        <td className="pc-numeric py-2 text-right">{cifraDeTablero(t.sell)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <h3 className="text-body font-semibold text-text-primary">Promociones en pantalla hoy</h3>
            {enPantalla.length === 0 ? (
              <p className="mt-2 text-body-sm text-text-secondary">Ninguna promoción en pantalla hoy.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {enPantalla.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    {p.imagen ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- imagen de la promoción */
                      <img src={p.imagen} alt="" className="h-14 w-20 shrink-0 rounded-control bg-surface-subtle object-contain" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">{p.titulo}</p>
                      <p className="mt-0.5 text-body-sm text-text-secondary">{p.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Piezas
 * ---------------------------------------------------------------------- */

/** Lo que dice la ficha al volver de una acción (`?hecho=`). */
const AVISOS: Readonly<Record<string, { titulo: string; texto: string }>> = {
  guardado: { titulo: "Datos guardados", texto: "La pantalla y el kiosco de la sucursal pasan a mostrarlos." },
  servicios: { titulo: "Servicios actualizados", texto: "La sede los ofrece o deja de ofrecerlos desde ahora." },
  asignada: { titulo: "Sede asignada", texto: "Sus administradores ya la ven en su consola y pueden ponerla en marcha." },
  revocada: {
    titulo: "Asignación revocada",
    texto: "La sede queda sin operador. Sus cajas, equipos y trabajadores siguen ahí para el próximo.",
  },
  suspendida: { titulo: "Sede suspendida", texto: "Ningún trabajador de la sede puede iniciar sesión." },
  reactivada: { titulo: "Sede reactivada", texto: "Sus trabajadores ya pueden iniciar sesión." },
  cerrada: { titulo: "Sede cerrada", texto: "Su historial sigue disponible." },
};

function AvisoDeEstado({
  estado,
  suspension,
  operador,
}: {
  estado: ReturnType<typeof estadoDeSede>;
  suspension: { reason: string; at: string; by: string } | undefined;
  operador: string | null;
}): React.JSX.Element | null {
  switch (estado) {
    case "suspendida":
      return (
        <Alert variant="warning" title="Suspendida por PuntoCash">
          {suspension ? (
            <p>
              <strong>{suspension.reason}</strong> · desde el {fechaCorta(suspension.at)}, por {suspension.by}.
            </p>
          ) : null}
          <p className="mt-1">Ningún trabajador de esta sede puede iniciar sesión ni abrir jornadas nuevas.</p>
        </Alert>
      );
    case "operador-suspendido":
      return (
        <Alert variant="warning" title="Su operador está suspendido">
          Mientras {operador ?? "su operador"} lo esté, nadie de esta sede puede iniciar sesión. La sede en sí no está
          suspendida.
        </Alert>
      );
    case "sin-asignar":
      return (
        <Alert variant="info" title="Sin operador">
          No puede operar hasta que se entregue a un operador.
        </Alert>
      );
    case "cerrada":
      return (
        <Alert variant="info" title="Cerrada">
          Es el final de su ciclo de vida. Su historial sigue disponible.
        </Alert>
      );
    default:
      return null;
  }
}

function Dato({
  etiqueta,
  valor,
  numerico,
}: {
  etiqueta: string;
  valor: React.ReactNode | readonly string[];
  numerico?: boolean;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{etiqueta}</dt>
      <dd className={`mt-1 text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>
        {Array.isArray(valor) ? (
          <ul className="flex flex-col gap-0.5">
            {valor.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          (valor as React.ReactNode)
        )}
      </dd>
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-body text-text-secondary">{children}</p>
      </CardContent>
    </Card>
  );
}

/** «hace 9 meses», «hace 12 días», «hoy». */
function transcurrido(iso: string, ahora: Date): string {
  const dias = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  if (dias < 60) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses < 24) return `hace ${meses} meses`;
  return `hace ${Math.floor(meses / 12)} años`;
}
