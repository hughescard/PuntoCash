import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Info, Lock, MonitorSmartphone, Pencil } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button, Card, CardContent } from "@/components/ui";
import { cifraDeTablero, formatDate, formatDateTime } from "@/lib/format";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { ResponsiveTable } from "@/components/patterns/responsive-table";
import { getAdminSession } from "@/features/admin/session-server";
import { lineasDeHorario } from "@/features/network/horario";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { WORKER_SERVICES } from "@/features/operations/services";
import { diaEnCuba, saldosDe } from "@/features/network/jornadas";
import { formatAmount } from "@/lib/format";
import { desde, EstadoBadge, fechaYHora } from "../../jornadas/formato";
import { EstadoSede } from "../sedes-list";

export const metadata: Metadata = {
  title: "Administración de sede · Ficha de sede",
  robots: { index: false, follow: false },
};

/**
 * Los servicios que PuntoCash habilita **sede a sede** (**A3**). El catálogo
 * de Worker es más amplio —incluye trámites que no dependen de la sucursal—,
 * así que listarlo entero aquí presentaría como «no habilitado» cosas que
 * nadie habilita a este nivel.
 */
const SERVICIOS_DE_SEDE = ["cambio-moneda", "remesas", "giros"] as const;

/**
 * Ficha de una sede — **§6 del FRD**.
 *
 * La guarda va primero y es la parte que no puede añadirse después sin dejar
 * huecos: **FR-AD-NAV-2** exige comprobar el alcance **antes de representar
 * nada**, y **FR-AD-NAV-3**, que una sede ajena responda exactamente igual que
 * una inexistente. Por eso hay un solo `notFound()` para los dos casos: si se
 * distinguieran, probar identificadores bastaría para saber qué administra
 * otra empresa.
 *
 * ── Sus bloques ──────────────────────────────────────────────────────────
 * Datos maestros, servicios, jornadas de hoy caja por caja (**FR-AD-SEDE-10**),
 * cajas y equipos, kioscos, trabajadores, asignación vigente, la suspensión si
 * la hay y **lo que ve el cliente en la sala** (**FR-AD-SEDE-11**).
 */
export default async function AdminSedePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const { guardado } = await searchParams;
  /* Dos guardas que dicen lo mismo y conviene que lo digan las dos: la sede
     sale de la lista de la sesión, y todo lo que se lee de ella sale de la
     vista con alcance. Si mañana esta pantalla recibiera la sede por otra vía,
     la vista seguiría contestando «no existe» para una sede ajena. */
  const sede = session.sedes.find((s) => s.id === id);
  if (!sede) notFound();

  const red = redEnAlcance(session.scope);
  const asignacion = red.asignacionVigente(sede.id);
  const cajas = red.cajasConHistorico(sede.id);
  const kioscos = red.kioscos(sede.id);
  const trabajadores = red.trabajadores(sede.id);
  const tablero = red.tablero(sede.id);
  const enPantalla = red.promocionesEnPantalla(sede.id);
  const dia = red.diaDeSede(sede.id);
  const hoy = diaEnCuba(new Date());

  return (
    <>
      <PageHeader
        title={sede.name}
        description={sede.locality}
        actions={<EstadoSede status={sede.status} />}
      />

      {/* **FR-AD-SEDE-13**: la suspensión encabeza, con su motivo y su
          consecuencia. Es lo primero que explica por qué la sucursal no está
          operando. */}
      {sede.status === "suspendida" && sede.suspension ? (
        <Alert variant="warning" title="PuntoCash suspendió esta sede" className="mb-8">
          <p>
            <strong>{sede.suspension.reason}</strong>
          </p>
          <p className="mt-2">
            Declarada el {formatDate(new Date(sede.suspension.at))} por {sede.suspension.by}.
            Mientras dure, ningún trabajador de esta sede puede iniciar sesión y no se abren
            jornadas nuevas. Reactivarla es cosa de PuntoCash.
          </p>
        </Alert>
      ) : null}

      {/* Tras guardar, se dice dónde se va a ver: es la razón de editarlo. */}
      {guardado === "1" ? (
        <Alert variant="success" title="Datos guardados" className="mb-8">
          La pantalla informativa de la sucursal pasa a mostrarlos.
        </Alert>
      ) : null}

      <Section
        title="Datos de la sede"
        description="La dirección, el municipio, el teléfono y el horario los mantienes tú. El código y el nombre, PuntoCash."
        actions={
          /* **FR-AD-SEDE-14**. Una sede cerrada ya no exhibe nada. */
          sede.status !== "cerrada" ? (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/admin/sedes/${sede.id}/editar`}>
                <Pencil aria-hidden="true" />
                Editar datos
              </Link>
            </Button>
          ) : null
        }
      >
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {/* El código es dato maestro (**FR-SA-SEDE-5**) y lo que
                  identifica la sede en los listados. Va primero. */}
              <Dato etiqueta="Código" valor={sede.code} />
              <Dato etiqueta="Nombre" valor={sede.name} />
              <Dato etiqueta="Dirección" valor={sede.address} />
              <Dato etiqueta="Municipio y provincia" valor={sede.locality} />
              <Dato etiqueta="Teléfono" valor={sede.phone} />
              <Dato etiqueta="Horario" valor={lineasDeHorario(sede.horario)} />
              <Dato etiqueta="Alta en la red" valor={formatDate(new Date(sede.createdAt))} />
              {asignacion ? (
                /* **FR-AD-SEDE-12**: la asignación vigente, como dato. El
                   historial completo incluye a otros operadores y es del
                   Super Admin (**A1**). */
                <Dato
                  etiqueta="Administras esta sede desde"
                  valor={formatDate(new Date(asignacion.startedAt))}
                />
              ) : null}
            </dl>

            {/* **FR-AD-SEDE-5**: el alcance real de estos datos. Un teléfono
                equivocado aquí es un teléfono equivocado en la TV de la sala
                de espera. */}
            <div className="mt-6 flex gap-3 rounded-card border border-border bg-surface-subtle p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-body-sm text-text-secondary">
                Estos son los datos que tu sucursal exhibe en su pantalla informativa. Si el código
                o el nombre no son correctos, pídeselo a PuntoCash.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Servicios habilitados"
        description="Los habilita PuntoCash. Determinan qué puede ofrecer esta sucursal."
      >
        <Card>
          <CardContent className="pt-6">
            <ul className="flex flex-col gap-3">
              {SERVICIOS_DE_SEDE.map((id) => {
                const servicio = WORKER_SERVICES.find((s) => s.id === id);
                const habilitado = sede.services.includes(id);
                return (
                  <li key={id} className="flex items-center justify-between gap-4">
                    <span className="text-body text-text-primary">{servicio?.name ?? id}</span>
                    {habilitado ? (
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

      {/* FR-AD-SEDE-10: cómo va el día, caja por caja. Una fila se abre en su
          jornada abierta o, si no la tiene, en la última que se cerró. */}
      {dia ? (
        <Section
          title="Jornadas de hoy"
          description={
            dia.cajas.length === 0
              ? "Sin cajas no hay jornadas: la sede todavía no puede abrir ninguna."
              : dia.abiertas === 0
                ? "Ninguna caja tiene una jornada abierta."
                : `${dia.abiertas} de ${dia.cajas.length} ${dia.cajas.length === 1 ? "caja tiene" : "cajas tienen"} una jornada abierta.`
          }
        >
          {/* Sin cajas, la descripción ya lo dice todo: no hay tabla que dibujar. */}
          {dia.cajas.length === 0 ? null : (
            <ResponsiveTable
              rows={dia.cajas}
              rowKey={(c) => c.registerId}
              rowLink={(c) => {
                const j = c.abierta ?? c.ultimaCerrada;
                return j
                  ? {
                      href: `/admin/jornadas/${j.id}`,
                      label: `Ver jornada de ${c.nombre}`,
                    }
                  : null;
              }}
              columns={[
                {
                  key: "caja",
                  header: "Caja",
                  cell: (c) => <span className="font-semibold text-text-primary">{c.nombre}</span>,
                  hiddenOnCard: true,
                },
                {
                  key: "estado",
                  header: "Jornada",
                  cell: (c) =>
                    c.abierta ? (
                      <EstadoBadge estado="abierta" />
                    ) : (
                      <span className="text-text-secondary">
                        {c.ultimaCerrada ? "Cerrada" : "—"}
                      </span>
                    ),
                  hiddenOnCard: true,
                },
                {
                  key: "trabajador",
                  header: "Trabajador",
                  cell: (c) =>
                    c.abierta ? (
                      <span>
                        {c.abierta.workerName}
                        {c.abierta.sesionActiva ? (
                          <span className="text-text-secondary"> · en sesión</span>
                        ) : null}
                      </span>
                    ) : c.ultimaCerrada ? (
                      <span className="text-text-secondary">
                        Última: {c.ultimaCerrada.workerName}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    ),
                },
                {
                  key: "desde",
                  header: "Desde",
                  cell: (c) =>
                    c.abierta ? (
                      `Abierta ${desde(c.abierta.openedAt, hoy)}`
                    ) : c.ultimaCerrada ? (
                      <span className="text-text-secondary">
                        Cerrada desde el {fechaYHora(c.ultimaCerrada.closedAt!)}
                      </span>
                    ) : (
                      <span className="text-text-secondary">
                        Todavía no ha abierto ninguna jornada
                      </span>
                    ),
                },
                {
                  key: "movimientos",
                  header: "Movimientos",
                  numeric: true,
                  cell: (c) =>
                    c.abierta ? (
                      c.abierta.movimientos.length
                    ) : (
                      <span className="text-text-secondary">—</span>
                    ),
                },
              ]}
              cardTitle={(c) => c.nombre}
              cardBadge={(c) =>
                c.abierta ? (
                  <EstadoBadge estado="abierta" />
                ) : c.ultimaCerrada ? (
                  <Badge variant="neutral">Cerrada</Badge>
                ) : null
              }
              empty={null}
            />
          )}
        </Section>
      ) : null}

      <Section
        title="Cajas y sus equipos"
        description="Los mostradores de esta sede y la máquina vinculada a cada uno."
        actions={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <EnlaceSeccion href="/admin/cajas">Gestionar cajas</EnlaceSeccion>
            <EnlaceSeccion href="/admin/equipos">Gestionar equipos</EnlaceSeccion>
          </span>
        }
      >
        {cajas.length === 0 ? (
          <Vacio>
            Esta sede todavía no tiene cajas. Crea al menos una para poder vincular un equipo y
            empezar a operar.
          </Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {cajas.map((caja) => {
                  const equipo = red.equipoDeCaja(caja.id);
                  /* FR-AD-SEDE-7: quién tiene la sesión iniciada y, con jornada abierta, su saldo por moneda. */
                  const abierta = red.jornadaAbiertaDeCaja(caja.id);
                  return (
                    <li
                      key={caja.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
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
                        {abierta ? (
                          <p className="mt-0.5 text-body-sm text-text-secondary">
                            {abierta.sesionActiva
                              ? `${abierta.workerName} con la sesión iniciada`
                              : `Jornada abierta de ${abierta.workerName}, sin sesión iniciada`}
                            {" · "}
                            <span className="pc-numeric">
                              {saldosDe(abierta)
                                .map((m) => `${formatAmount(m.amount)} ${m.currency}`)
                                .join(" · ")}
                            </span>
                          </p>
                        ) : null}
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
      </Section>

      <Section
        title="Kioscos de autoservicio"
        description="Se atan a la sede, no a un mostrador."
        actions={<EnlaceSeccion href="/admin/equipos">Gestionar equipos</EnlaceSeccion>}
      >
        {kioscos.length === 0 ? (
          <Vacio>
            Esta sede no tiene ningún kiosco vinculado. Un kiosco prepara solicitudes que después
            resuelve un trabajador en el mostrador.
          </Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {kioscos.map((kiosco) => (
                  <li
                    key={kiosco.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-body font-medium text-text-primary">{kiosco.label}</p>
                      {/* **FR-AD-SEDE-8** pide el identificador, no solo el
                          rótulo: es el dato por el que se reconoce un equipo
                          cuando hay dos iguales en la misma sala. */}
                      <p className="pc-numeric mt-0.5 text-caption text-text-secondary">
                        {kiosco.id}
                      </p>
                    </div>
                    <p className="text-body-sm text-text-secondary">
                      {kiosco.lastSeenAt
                        ? `Última actividad: ${formatDateTime(new Date(kiosco.lastSeenAt))}`
                        : "Sin actividad registrada"}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>

      <Section
        title="Trabajadores"
        description="Adscritos a esta sede. Un trabajador pertenece a la sede, nunca a una caja."
        actions={
          <EnlaceSeccion href={`/admin/trabajadores?sede=${sede.id}`}>
            Gestionar trabajadores
          </EnlaceSeccion>
        }
      >
        {trabajadores.length === 0 ? (
          <Vacio>Esta sede todavía no tiene personal dado de alta.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {trabajadores.map((trabajador) => (
                  <li
                    key={trabajador.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-body font-medium text-text-primary">
                        {trabajador.fullName}
                      </p>
                      <p className="mt-0.5 text-body-sm text-text-secondary">
                        {trabajador.identifier}
                      </p>
                    </div>
                    {trabajador.status === "activo" ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="neutral">Desactivado</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* **FR-AD-SEDE-11**: lo que muestra hoy la pantalla de la sala, leído del
          mismo sitio que la pantalla. Las monedas no se exhiben, así que no están. */}
      <Section
        title="Tasas"
        description="Las que muestra hoy el tablero de esta sucursal."
        actions={<EnlaceSeccion href={`/admin/tasas/${sede.id}`}>Gestionar tasas</EnlaceSeccion>}
      >
        <Card>
          <CardContent className="pt-6">
            {tablero.length === 0 ? (
              <p className="text-body text-text-secondary">
                No publica ninguna tasa: la pantalla no muestra el tablero.
              </p>
            ) : (
              <table className="w-full text-body">
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
                          <span className="pc-numeric font-semibold text-text-primary">
                            {t.currency}
                          </span>
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
      </Section>

      <Section
        title="Promociones"
        description="Las que están hoy en la pantalla informativa de esta sucursal."
        actions={<EnlaceSeccion href="/admin/promociones">Gestionar promociones</EnlaceSeccion>}
      >
        <Card>
          <CardContent className="pt-6">
            {enPantalla.length === 0 ? (
              <p className="text-body text-text-secondary">Ninguna promoción en pantalla hoy.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {enPantalla.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    {p.imagen ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- imagen de la promoción */
                      <img
                        src={p.imagen}
                        alt=""
                        className="h-14 w-20 shrink-0 rounded-control bg-surface-subtle object-contain"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <Link
                        href={`/admin/promociones/${p.id}` as Route}
                        className="font-semibold text-text-primary underline-offset-4 hover:underline"
                      >
                        {p.titulo}
                      </Link>
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

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  /** Varias líneas, como el horario, van una debajo de otra. */
  valor: string | readonly string[];
}): React.JSX.Element {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      {typeof valor === "string" ? (
        <dd className="mt-1 text-body text-text-primary">{valor}</dd>
      ) : (
        valor.map((linea) => (
          <dd key={linea} className="mt-1 text-body text-text-primary">
            {linea}
          </dd>
        ))
      )}
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rounded-card border border-border bg-surface px-6 py-8 text-center text-body text-text-secondary">
      {children}
    </div>
  );
}

function EnlaceSeccion({
  href,
  children,
}: {
  href:
    | "/admin/cajas"
    | "/admin/equipos"
    | `/admin/trabajadores?sede=${string}`
    | "/admin/promociones"
    | `/admin/tasas/${string}`;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      href={href as Route}
      className="inline-flex items-center gap-1.5 text-label font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
