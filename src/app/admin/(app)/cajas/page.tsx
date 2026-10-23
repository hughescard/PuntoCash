import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { CirclePlus, Store } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance, type RedEnAlcance } from "@/features/network/scoped-reads";
import type { Sede } from "@/features/network/sedes";
import { diaEnCuba } from "@/features/network/jornadas";
import { jornadaDeCaja } from "../jornadas/formato";
import { CajasDeSede, type CajaRow } from "./cajas-de-sede";

export const metadata: Metadata = {
  title: "Administración de sede · Cajas",
  robots: { index: false, follow: false },
};

/**
 * Cajas — **§4 del FRD**.
 *
 * Una sede llega vacía: PuntoCash la crea y la entrega, y es el mercante quien
 * decide cuántos mostradores abre (**A4**). Esta es la pantalla donde se hace,
 * y la primera que alguien abre cuando le acaban de asignar una sucursal.
 *
 * ── Por qué se agrupa por sede ────────────────────────────────────────────
 * **FR-AD-CAJA-3** exige que una sede sin ninguna caja **no se represente como
 * una ausencia**. Una tabla plana de cajas no puede decir nada de una sede que
 * no tiene ninguna: la fila simplemente no existiría, y quien abre esto por
 * primera vez —justo el caso en que ninguna sede tiene cajas— vería una tabla
 * vacía sin entender qué le falta. Agrupando por sede, cada una tiene su
 * bloque y el que está vacío lo dice con todas las letras.
 *
 * ── La jornada ────────────────────────────────────────────────────────────
 * **FR-AD-CAJA-1**: el estado de la jornada de cada caja y quién la tiene
 * abierta, con «en sesión» si la está operando ahora mismo.
 */
export default async function AdminCajasPage({
  searchParams,
}: {
  searchParams: Promise<{ creada?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  /* El identificador llega por la URL, así que se busca **dentro del alcance**
     en vez de confiar en él: un enlace pegado a mano no puede nombrar la caja
     de otro operador (**A1**). La vista lo garantiza por su cuenta; buscar
     además entre las sedes visibles es lo que hace que el aviso hable de la
     sede que se está mirando y no de otra. */
  const { creada } = await searchParams;
  const cajaCreada = creada
    ? sedes.flatMap((sede) => red.cajasConHistorico(sede.id)).find((caja) => caja.id === creada)
    : undefined;

  return (
    <>
      <PageHeader
        title="Cajas"
        description="Los mostradores de cada sede. Una caja necesita un equipo vinculado antes de poder operar."
        actions={
          sedes.length > 0 ? (
            <Button asChild>
              <Link href="/admin/cajas/nueva">
                <CirclePlus aria-hidden="true" />
                Crear caja
              </Link>
            </Button>
          ) : null
        }
      />

      {/* El alta encamina al paso siguiente en vez de dejar a nadie en una
          lista (**FR-AD-CAJA-7**). */}
      {cajaCreada ? (
        <Alert variant="success" title={`${cajaCreada.name} creada`} className="mb-8">
          Ya forma parte de la sede, pero todavía no puede operar: el paso siguiente es vincularle
          un equipo.{" "}
          <Link href="/admin/equipos/vincular" className="font-semibold underline underline-offset-4">
            Vincular un equipo
          </Link>
        </Alert>
      ) : null}

      {sedes.length === 0 ? (
        <Alert variant="info" title="Todavía no tienes sedes asignadas">
          Cuando PuntoCash te asigne una sede, podrás crear aquí sus cajas.
        </Alert>
      ) : (
        sedes.map((sede) => <BloqueDeSede key={sede.id} red={red} sede={sede} />)
      )}
    </>
  );
}

function BloqueDeSede({ red, sede }: { red: RedEnAlcance; sede: Sede }): React.JSX.Element {
  const hoy = diaEnCuba(new Date());
  const activas = red.cajasActivas(sede.id).length;
  const cajas: CajaRow[] = red.cajasConHistorico(sede.id).map((caja) => {
    const equipo = red.equipoDeCaja(caja.id);
    return {
      id: caja.id,
      name: caja.name,
      status: caja.status,
      equipo: equipo ? { id: equipo.id, label: equipo.label } : null,
      alta: caja.createdBy ? `${formatDate(new Date(caja.createdAt))} · ${caja.createdBy}` : formatDate(new Date(caja.createdAt)),
      ...(caja.retiredReason ? { motivoRetirada: caja.retiredReason } : {}),
      jornada: jornadaDeCaja(red.jornadaAbiertaDeCaja(caja.id), hoy),
      ultimaActiva: caja.status === "activa" && activas <= 1 && sede.status === "activa",
      sedeId: sede.id,
    };
  });

  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-3">
          <Store className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {sede.name}
          {sede.status === "suspendida" ? <Badge variant="warning">Sede suspendida</Badge> : null}
        </span>
      }
      description={
        cajas.length === 0
          ? undefined
          : `${activas} ${activas === 1 ? "caja activa" : "cajas activas"} de ${cajas.length} en total.`
      }
    >
      {cajas.length === 0 ? (
        /* **FR-AD-CAJA-3**: el estado en que llega toda sede recién asignada,
           dicho como una situación y no como una tabla vacía. */
        <div className="rounded-card border border-border bg-surface px-6 py-10 text-center">
          <p className="text-body text-text-primary">
            Esta sede todavía no tiene cajas. Crea al menos una para poder vincular un equipo y
            empezar a operar.
          </p>
          <Button variant="secondary" className="mt-6" asChild>
            <Link href={`/admin/cajas/nueva?sede=${sede.id}` as Route}>
              <CirclePlus aria-hidden="true" />
              Crear la primera caja
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Solo cajas retiradas: la sede no puede operar, y el indicador de
              Cajas del menú la cuenta (**FR-AD-SHELL-3**). Se dice aquí, arriba
              de su histórico. */}
          {activas === 0 ? (
            <Alert variant="warning" title="Esta sede no tiene ninguna caja activa" className="mb-4">
              Crea una caja o reactiva una retirada para poder vincular un equipo y volver a operar.{" "}
              <Link href={`/admin/cajas/nueva?sede=${sede.id}` as Route} className="font-semibold underline underline-offset-4">
                Crear una caja
              </Link>
            </Alert>
          ) : null}
          <CajasDeSede cajas={cajas} />
        </>
      )}
    </Section>
  );
}

