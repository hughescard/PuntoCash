import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { maskEmail } from "@/features/auth/two-factor";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { operacionesDe } from "@/features/network/jornadas";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { sedesDondeHaTrabajado, trabajadorDeRed } from "@/features/super-admin/trabajadores";
import { ContactoDeOperador } from "../../_compartido/contacto";
import { EstadoDeOperadorBadge } from "../../_compartido/estado-de-operador";
import { EstadoDeSedeBadge } from "../../_compartido/estado-de-sede";
import { estadoDeSede } from "@/features/network/assignments";
import { fechaCorta, fechaYHora, hora } from "@/app/admin/(app)/jornadas/formato";
import { EstadoDeJornadaBadge } from "../../equipos/cajas-list";
import { EXPLICACION_SIN_ACCESO, MOTIVO_SIN_ACCESO } from "../estado-de-acceso";

export const metadata: Metadata = {
  title: "Super administración · Trabajador",
  robots: { index: false, follow: false },
};

/** Cuántas jornadas recientes se enumeran: lo suficiente para ver un patrón. */
const JORNADAS_RECIENTES = 8;

/**
 * La ficha de un trabajador, **sin una sola acción**.
 *
 * Ni editar, ni desactivar, ni reactivar, ni asistir su acceso: ninguna de
 * esas existe aquí, tampoco deshabilitada. La ficha lo dice donde se nota, y
 * dice cuál es el recurso real de PuntoCash, que es suspender la sede o al
 * operador.
 *
 * Lo que sí resuelve es la pregunta que trae a alguien a esta pantalla:
 * **por qué esta persona no puede entrar**. Las tres razones se arreglan en
 * sitios distintos y por eso se nombran por separado.
 *
 * Las cajas en las que ha operado son consecuencia de los equipos en los que
 * inició sesión, no de una asignación: un trabajador pertenece a una sede y
 * opera cualquiera de sus cajas.
 */
export default async function SuperAdminTrabajadorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id } = await params;
  const fila = trabajadorDeRed(id);
  if (!fila) notFound();

  const { trabajador: t, sede, operador, bloqueo } = fila;
  const red = redEnAlcance(GLOBAL_SCOPE);
  const jornadas = red.jornadasDeTrabajador(t.id);
  const recientes = jornadas.slice(0, JORNADAS_RECIENTES);
  const historialDeSedes = sedesDondeHaTrabajado(t.id);
  /* La sede solo se nombra cuando no es la suya: repetirla en cada caja
     convierte una frase corta en una lista ilegible. */
  const cajas = [
    ...new Set(
      jornadas.map((j) =>
        j.sedeId === sede.id ? j.cajaNombre : `${j.cajaNombre} de ${nombreDeSede(j.sedeId, sede.id, sede.name)}`,
      ),
    ),
  ];

  return (
    <>
      <PageHeader
        title={t.fullName}
        description={`${t.identifier} · ${sede.name}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/trabajadores">
              <ArrowLeft aria-hidden="true" />
              Volver a Trabajadores
            </Link>
          </Button>
        }
      />

      {/* 1 · Por qué puede o no puede entrar */}
      {bloqueo ? (
        <Alert variant={bloqueo === "desactivado" ? "info" : "warning"} title={`No puede entrar · ${MOTIVO_SIN_ACCESO[bloqueo]}`} className="mb-8">
          {EXPLICACION_SIN_ACCESO[bloqueo]}
        </Alert>
      ) : null}

      {/* 2 · Datos */}
      <Section title="Datos del trabajador">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Identificador de acceso" valor={t.identifier} numerico />
              <Dato etiqueta="Documento" valor={`${t.documentType} ${t.documentId}`} numerico />
              <Dato etiqueta="Teléfono" valor={t.phone} numerico />
              <Dato etiqueta="Correo de verificación" valor={maskEmail(t.email)} />
              <Dato etiqueta="Alta" valor={fechaCorta(t.createdAt)} />
              <Dato
                etiqueta="Estado en su consola"
                valor={t.status === "activo" ? "Activo" : `Desactivado${t.deactivation?.at ? ` el ${fechaCorta(t.deactivation.at)}` : ""}`}
              />
            </dl>
          </CardContent>
        </Card>
      </Section>

      {/* 3 · Dónde trabaja y quién lo gobierna */}
      <Section title="Sede y operador">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Dato
                etiqueta="Sede"
                valor={
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/super-admin/sedes/${sede.id}` as Route} className="underline underline-offset-4 hover:text-primary">
                      {sede.name}
                    </Link>
                    <EstadoDeSedeBadge estado={estadoDeSede(sede)} />
                  </span>
                }
              />
              <Dato
                etiqueta="Operador"
                valor={
                  operador ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link href={`/super-admin/operadores/${operador.id}` as Route} className="underline underline-offset-4 hover:text-primary">
                        {operador.name}
                      </Link>
                      <EstadoDeOperadorBadge estado={operador.status} />
                    </span>
                  ) : (
                    "Sin operador asignado"
                  )
                }
              />
            </dl>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-body-sm text-text-secondary">
                {operador ? (
                  <>
                    Los trabajadores los gestiona su administrador, {operador.name}: él los da de alta, los edita, los
                    desactiva y les presta asistencia de acceso. Si hay un problema con esta persona, el recurso de
                    PuntoCash es suspender su sede o a su operador.
                  </>
                ) : (
                  <>
                    Esta sede no tiene operador, así que hoy nadie gestiona a sus trabajadores. Se resuelve asignándole
                    uno desde la ficha de la sede.
                  </>
                )}
              </p>
              {operador ? (
                <div className="mt-3">
                  <ContactoDeOperador operador={operador} />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 4 · Actividad */}
      <Section
        title="Actividad reciente"
        description={
          cajas.length === 0
            ? "Todavía no ha abierto ninguna jornada."
            : `Ha operado en ${cajas.length === 1 ? "una caja" : `${cajas.length} cajas`}: ${cajas.join(", ")}. La caja la determina el equipo en el que inicia sesión, no una asignación.`
        }
      >
        {recientes.length === 0 ? (
          <Vacio>Sin jornadas.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {recientes.map((j) => (
                  <li key={j.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="flex min-w-0 flex-col">
                      <Link href={`/super-admin/jornadas/${j.id}` as Route} className="font-medium text-text-primary underline underline-offset-4 hover:text-primary">
                        {j.cajaNombre} · {fechaCorta(j.openedAt)}
                      </Link>
                      {/* La sede solo cuando no es la suya: repetida en cada fila es ruido. */}
                      <span className="text-caption text-text-secondary">
                        {j.sedeId === sede.id ? null : `${nombreDeSede(j.sedeId, sede.id, sede.name)} · `}
                        Abrió a las {hora(j.openedAt)}
                        {j.closedAt ? ` y cerró a las ${hora(j.closedAt)}` : " y sigue abierta"}
                      </span>
                    </span>
                    <span className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
                      <EstadoDeJornadaBadge estado={j.estado} />
                      <span className="text-caption text-text-secondary">
                        {operacionesDe(j)} {operacionesDe(j) === 1 ? "operación" : "operaciones"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {jornadas.length > recientes.length ? (
                <p className="mt-4 text-body-sm text-text-secondary">
                  Y {jornadas.length - recientes.length} más.{" "}
                  <Link href={`/super-admin/jornadas?trabajador=${t.id}` as Route} className="font-medium underline underline-offset-4 hover:text-primary">
                    Verlas todas en Jornadas
                  </Link>
                  .
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </Section>

      {/* 5 · Historial de sedes */}
      <Section title="Sedes en las que ha trabajado" description="Las sedes donde ha abierto alguna jornada, de la más reciente a la más antigua.">
        {historialDeSedes.length === 0 ? (
          <Vacio>Ninguna todavía.</Vacio>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {historialDeSedes.map(({ sede: s, jornadas: n, ultima }) => (
                  <li key={s.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <Link href={`/super-admin/sedes/${s.id}` as Route} className="text-text-primary underline underline-offset-4 hover:text-primary">
                        {s.name}
                      </Link>
                      {s.id === sede.id ? <span className="text-caption text-text-secondary">su sede actual</span> : null}
                    </span>
                    <span className="text-body-sm text-text-secondary">
                      {n} {n === 1 ? "jornada" : "jornadas"} · la última el {fechaYHora(ultima)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>
    </>
  );
}

function nombreDeSede(sedeId: string, actualId: string, actualNombre: string): string {
  if (sedeId === actualId) return actualNombre;
  const red = redEnAlcance(GLOBAL_SCOPE);
  return red.sede(sedeId)?.name ?? "Otra sede";
}

function Dato({ etiqueta, valor, numerico }: { etiqueta: string; valor: React.ReactNode; numerico?: boolean }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className={`mt-1 text-body text-text-primary${numerico ? " pc-numeric" : ""}`}>{valor}</dd>
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-body text-text-secondary">{children}</CardContent>
    </Card>
  );
}
