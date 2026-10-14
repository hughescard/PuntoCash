import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Info, Lock, MonitorSmartphone, TriangleAlert } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Card, CardContent } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { WORKER_SERVICES } from "@/features/operations/services";
import { EstadoSede } from "../sedes-list";

export const metadata: Metadata = {
  title: "Administración de sede · Ficha de sede",
  robots: { index: false, follow: false },
};

/**
 * Los servicios que PuntoCash habilita **sede a sede** (**A3**). El catálogo
 * de Worker es más amplio —incluye trámites que no dependen de la sucursal—,
 * así que listarlo entero aquí presentaría como «no habilitado» cosas que
 * nadie habilita a este nivel. Vivirá en el dominio cuando §12 y §13 lo
 * necesiten; hasta entonces está aquí, a la vista.
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
 * ── Qué bloques hay y cuáles faltan ──────────────────────────────────────
 * Están los cinco que el dominio puede contestar hoy: datos maestros,
 * servicios, cajas y equipos, kioscos y trabajadores, más la asignación
 * vigente y la suspensión. Faltan **jornada en curso** (**FR-AD-SEDE-10**) y
 * **contenido público** (**FR-AD-SEDE-11**), que dependen de §9, §12, §13 y
 * §14; se anuncian como pendientes en lugar de dibujarse vacíos, porque un
 * bloque vacío se lee como «esta sede no tiene nada», que es otra cosa.
 */
export default async function AdminSedePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
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

      <Section
        title="Datos de la sede"
        description="Estos datos los gestiona PuntoCash."
      >
        {/* **FR-AD-SEDE-4**: ni un control de edición, ni siquiera
            deshabilitado. Un campo apagado invita a buscar cómo encenderlo. */}
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
              <Dato etiqueta="Horario" valor={sede.hours} />
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
                de espera, y no se puede corregir desde esta consola. */}
            <div className="mt-6 flex gap-3 rounded-card border border-border bg-surface-subtle p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-body-sm text-text-secondary">
                Estos son los datos que tu sucursal exhibe en su kiosco y en su pantalla
                informativa. Si alguno no es correcto, pídeselo a PuntoCash: desde aquí no se
                pueden cambiar.
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

      <Section
        title="Cajas y sus equipos"
        description="Los mostradores de esta sede y la máquina vinculada a cada uno."
        actions={<EnlaceSeccion href="/admin/cajas">Gestionar cajas</EnlaceSeccion>}
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
                      <p className="pc-numeric mt-0.5 text-caption text-text-secondary">{kiosco.id}</p>
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
        actions={<EnlaceSeccion href="/admin/trabajadores">Gestionar trabajadores</EnlaceSeccion>}
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

      <Section title="Lo que llega con sus propias secciones">
        <Card>
          <CardContent className="flex gap-3 pt-6">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden="true" />
            <div>
              <p className="text-body text-text-primary">
                La <strong>jornada en curso</strong> y el <strong>contenido público</strong> de esta
                sucursal —sus monedas, sus pares con la tasa vigente y sus promociones activas— se
                incorporan a esta ficha cuando existan sus secciones.
              </p>
              <p className="mt-2 text-body-sm text-text-secondary">
                Se anuncian aquí en vez de dibujarse vacíos: un bloque en blanco se leería como
                «esta sede no tiene nada», que es una afirmación distinta.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }): React.JSX.Element {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
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
  href: "/admin/cajas" | "/admin/equipos" | "/admin/trabajadores";
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-label font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
