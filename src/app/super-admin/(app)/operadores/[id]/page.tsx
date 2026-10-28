import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button, Card, CardContent } from "@/components/ui";
import { maskEmail } from "@/features/auth/two-factor";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES } from "@/features/network/sedes";
import { adminUsersOf, administradorPrincipalDe, findOperatorById } from "@/features/network/operators";
import { asignacionVigente, estadoDeSede, historialDeOperador } from "@/features/network/assignments";
import { listarEventos } from "@/features/network/audit";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { resumenDeOperador } from "@/features/super-admin/operadores";
import { fechaCorta, fechaYHora } from "@/app/admin/(app)/jornadas/formato";
import { EstadoDeSedeBadge } from "../../_compartido/estado-de-sede";
import { EstadoDeOperadorBadge } from "../../_compartido/estado-de-operador";
import { ContactoDeOperador } from "../../_compartido/contacto";
import {
  AccionesDeEstadoOperador,
  AsignarSede,
  RestablecerAcceso,
  type JornadaAbiertaDeOperador,
} from "./acciones-operador";

export const metadata: Metadata = {
  title: "Super administración · Ficha de operador",
  robots: { index: false, follow: false },
};

/**
 * Ficha de un operador.
 *
 * Los bloques del requisito con dos cambios de Claudia (28/10): en vez de
 * volumen, **las operaciones del mes**, sede por sede; y **sin solicitudes de
 * aprobación pendientes**, que son gestión interna del operador.
 *
 * Usuarios, trabajadores, cajas y equipos son de solo lectura. La única
 * escritura sobre un usuario del operador es restablecer el acceso de su
 * principal, disponible siempre y con motivo.
 */
export default async function SuperAdminOperadorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hecho?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const { id } = await params;
  const { hecho } = await searchParams;
  const operador = findOperatorById(id);
  if (!operador) notFound();

  const red = redEnAlcance(GLOBAL_SCOPE);
  const ahora = new Date();
  const r = resumenDeOperador(operador, ahora);
  const usuarios = [...adminUsersOf(operador.id)].sort(
    (a, b) => Number(b.isPrincipal) - Number(a.isPrincipal) || a.fullName.localeCompare(b.fullName, "es"),
  );
  const principal = administradorPrincipalDe(operador.id);
  const pasados = historialDeOperador(operador.id).filter((t) => t.endedAt).slice().reverse();
  const baja = operador.status === "baja";
  const aviso = hecho ? AVISOS[hecho] : undefined;
  const sinAsignar = SEDES.filter((s) => s.status !== "cerrada" && estadoDeSede(s) === "sin-asignar").map((s) => ({
    id: s.id,
    nombre: s.name,
    codigo: s.code,
  }));
  const jornadasAbiertas: JornadaAbiertaDeOperador[] = r.jornadasAbiertas.map((j) => ({
    id: j.id,
    sede: SEDES.find((s) => s.id === j.sedeId)?.name ?? j.sedeId,
    caja: j.cajaNombre,
    trabajador: j.workerName,
    desde: fechaYHora(j.openedAt),
  }));
  const suspensiones = listarEventos({ operatorId: operador.id }).filter(
    (e) => e.type === "operador.suspendido" || e.type === "operador.reactivado" || e.type === "operador.baja",
  );
  const mes = new Intl.DateTimeFormat("es", { month: "long", timeZone: "America/Havana" }).format(ahora);

  return (
    <>
      <PageHeader
        title={operador.name}
        description={`${operador.legalId} · alta el ${fechaCorta(operador.createdAt)}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/operadores">
              <ArrowLeft aria-hidden="true" />
              Volver a Operadores
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
          <EstadoDeOperadorBadge estado={operador.status} />
        </div>
        {operador.status === "suspendido" ? (
          <Alert variant="warning" title="Suspendido por PuntoCash">
            {operador.suspension ? (
              <p>
                <strong>{operador.suspension.reason}</strong> · desde el {fechaCorta(operador.suspension.at)}, por{" "}
                {operador.suspension.by}.
              </p>
            ) : null}
            <p className="mt-1">Ni sus administradores ni los trabajadores de sus sedes pueden iniciar sesión.</p>
          </Alert>
        ) : null}
        {baja ? (
          <Alert variant="info" title="Dado de baja">
            Ya no opera en la red. Su historial sigue disponible.
          </Alert>
        ) : null}
      </div>

      <Section title="Datos del operador">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Dato etiqueta="Nombre o razón social" valor={operador.name} />
              <Dato etiqueta="Documento" valor={operador.legalId} numerico />
              <div className="sm:col-span-2">
                <Dato etiqueta="Contacto" valor={<ContactoDeOperador operador={operador} />} />
              </div>
              <Dato etiqueta="Alta en la red" valor={fechaCorta(operador.createdAt)} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Sedes"
        description={r.sedes.length === 0 ? "No administra ninguna sede." : `Administra ${r.sedes.length} ${r.sedes.length === 1 ? "sede" : "sedes"}.`}
        actions={
          operador.status === "activo" ? (
            <AsignarSede operadorId={operador.id} operadorNombre={operador.name} sedes={sinAsignar} hoy={fechaCorta(ahora.toISOString())} />
          ) : null
        }
      >
        {r.sedes.length === 0 ? (
          <Vacio>Todavía no se le ha entregado ninguna sede.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {r.sedes.map((s) => {
                  const tramo = asignacionVigente(s.id);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <Link href={`/super-admin/sedes/${s.id}` as Route} className="text-body font-medium text-text-primary underline-offset-4 hover:underline">
                          {s.name}
                        </Link>
                        <p className="pc-numeric mt-0.5 text-body-sm text-text-secondary">
                          {s.code} · {s.locality}
                          {tramo ? ` · desde el ${fechaCorta(tramo.startedAt)}` : ""}
                        </p>
                      </div>
                      <EstadoDeSedeBadge estado={estadoDeSede(s)} />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>

      <Section
        title={`Operaciones de ${mes}`}
        description="Las que se hicieron en cada sede mientras la operaba. El volumen y los importes están en Reportes."
      >
        <Card>
          <CardContent className="pt-6">
            <p className="pc-numeric text-screen-title text-text-primary">{r.operacionesDelMes}</p>
            {r.operacionesPorSede.length > 0 ? (
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {r.operacionesPorSede.map((x) => (
                  <li key={x.sede.id} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <span className="text-body text-text-primary">{x.sede.name}</span>
                    <span className="pc-numeric text-body text-text-primary">{x.operaciones}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </Section>

      <Section title="Historial de asignaciones" description="Las sedes que tuvo antes. Es un registro: no se edita ni se borra.">
        {pasados.length === 0 ? (
          <Vacio>Ninguna sede anterior.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ol className="flex flex-col divide-y divide-border">
                {pasados.map((t) => {
                  const sede = SEDES.find((s) => s.id === t.branchId);
                  return (
                    <li key={t.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 lg:grid-cols-[16rem_1fr] lg:gap-6">
                      <div>
                        <p className="text-body font-medium text-text-primary">{sede?.name ?? t.branchId}</p>
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

      <Section
        title="Usuarios administradores"
        description={`${r.usuariosActivos} de ${r.usuarios} activos. Los gestiona su administrador principal desde su consola.`}
        actions={!baja && principal ? <RestablecerAcceso operadorId={operador.id} principal={{ nombre: principal.fullName, correo: principal.email }} /> : null}
      >
        <Card>
          <CardContent className="pt-6">
            <ul className="flex flex-col divide-y divide-border">
              {usuarios.map((u) => (
                <li key={u.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-body font-medium text-text-primary">
                      {u.fullName}
                      {u.isPrincipal ? <Badge variant="info">Principal</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-body-sm text-text-secondary">
                      {/* Si el identificador ya es su correo, repetirlo enmascarado no aporta nada. */}
                      {u.identifier === u.email ? u.identifier : `${u.identifier} · ${maskEmail(u.email)}`}
                    </p>
                    <p className="mt-0.5 text-body-sm text-text-secondary">
                      {u.lastAccessAt ? `Último acceso: ${fechaYHora(u.lastAccessAt)}` : "Nunca ha entrado"}
                    </p>
                  </div>
                  {u.status === "activo" ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Desactivado</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section title="Trabajadores" description="Los de sus sedes. Los da de alta y los gestiona el operador.">
        {r.sedes.length === 0 ? (
          <Vacio>Sin sedes, no tiene trabajadores.</Vacio>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {r.sedes.map((s) => {
              const trabajadores = red.trabajadores(s.id);
              return (
                <Card key={s.id}>
                  <CardContent className="pt-6">
                    <h3 className="text-body font-semibold text-text-primary">{s.name}</h3>
                    {trabajadores.length === 0 ? (
                      <p className="mt-2 text-body-sm text-text-secondary">Sin personal dado de alta.</p>
                    ) : (
                      <ul className="mt-3 flex flex-col divide-y divide-border">
                        {trabajadores.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                            <span className="min-w-0">
                              <span className="block text-body text-text-primary">{t.fullName}</span>
                              <span className="block text-caption text-text-secondary">{t.identifier}</span>
                            </span>
                            {t.status === "activo" ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Desactivado</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Cajas y equipos" description="Lo que tiene montado en cada sede. Solo se consulta.">
        {r.sedes.length === 0 ? (
          <Vacio>Sin sedes, no tiene cajas ni equipos.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <table className="w-full text-body">
                <thead>
                  <tr className="text-left text-caption uppercase tracking-wide text-text-secondary">
                    <th className="pb-2 font-medium">Sede</th>
                    <th className="pb-2 text-right font-medium">Cajas</th>
                    <th className="pb-2 text-right font-medium">Con equipo</th>
                    <th className="pb-2 text-right font-medium">Kioscos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.sedes.map((s) => {
                    const cajas = red.cajasActivas(s.id);
                    const conEquipo = cajas.filter((c) => red.cajaTieneEquipo(c.id)).length;
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-3 text-text-primary">{s.name}</td>
                        <td className="pc-numeric py-2 text-right">{cajas.length}</td>
                        <td className={`pc-numeric py-2 text-right ${conEquipo < cajas.length ? "text-warning-foreground" : ""}`}>{conEquipo}</td>
                        <td className="pc-numeric py-2 text-right">{red.kioscos(s.id).length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </Section>

      <Section title="Estado del operador" description="Suspender corta el acceso a toda la empresa y se revierte. Dar de baja es definitivo.">
        {baja ? null : (
          <AccionesDeEstadoOperador
            operadorId={operador.id}
            operadorNombre={operador.name}
            suspendido={operador.status === "suspendido"}
            alcance={{ sedes: r.sedes.length, administradores: r.usuariosActivos, trabajadores: r.trabajadoresActivos }}
            jornadasAbiertas={jornadasAbiertas}
            sedes={r.sedes.map((s) => ({ id: s.id, nombre: s.name }))}
          />
        )}
        <h3 className="mt-6 mb-3 text-body font-semibold text-text-primary">Historial</h3>
        {suspensiones.length === 0 ? (
          <Vacio>Nunca ha estado suspendido.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ol className="flex flex-col divide-y divide-border">
                {suspensiones.map((e) => (
                  <li key={e.id} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {e.type === "operador.suspendido" ? "Suspendido" : e.type === "operador.reactivado" ? "Reactivado" : "Dado de baja"}
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
    </>
  );
}

const AVISOS: Readonly<Record<string, { titulo: string; texto: string }>> = {
  suspendido: { titulo: "Operador suspendido", texto: "Ni sus administradores ni los trabajadores de sus sedes pueden iniciar sesión." },
  reactivado: { titulo: "Operador reactivado", texto: "Sus administradores y trabajadores ya pueden iniciar sesión." },
  baja: { titulo: "Operador dado de baja", texto: "Su historial sigue disponible." },
  "sede-asignada": { titulo: "Sede asignada", texto: "Sus administradores ya la ven en su consola y pueden ponerla en marcha." },
};

function Dato({ etiqueta, valor, numerico }: { etiqueta: string; valor: React.ReactNode; numerico?: boolean }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{etiqueta}</dt>
      <dd className={`mt-1 text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>{valor}</dd>
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
