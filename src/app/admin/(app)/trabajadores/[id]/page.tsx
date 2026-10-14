import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { documentTypeLabel } from "@/features/customers/customers";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { motivoDeBloqueo, type NetworkWorker } from "@/features/network/workers";
import { EstadoTrabajador } from "../trabajadores-list";
import { AccionesTrabajador } from "./acciones-trabajador";

export const metadata: Metadata = {
  title: "Administración de sede · Ficha de trabajador",
  robots: { index: false, follow: false },
};

/**
 * Ficha de un trabajador — **§7 del FRD**, **FR-AD-TRAB-9** y
 * **FR-AD-TRAB-16**.
 *
 * La guarda va primero, y es la parte que no puede añadirse después sin dejar
 * huecos: **FR-AD-NAV-2** exige comprobar el alcance **antes de representar
 * nada**, y **FR-AD-NAV-3**, que alguien de otra empresa responda exactamente
 * igual que alguien que no existe. Por eso hay un solo `notFound()` para los
 * dos casos: si se distinguieran, probar identificadores bastaría para saber
 * quién trabaja en la competencia.
 *
 * ── Lo que esta pantalla distingue, y por qué importa ─────────────────────
 * **FR-AD-TRAB-16**: «no puede acceder» tiene varias causas y se resuelven de
 * formas distintas. Un trabajador **desactivado** lo desactivó esta consola y
 * esta consola lo reactiva. Uno cuya **sede está suspendida o cerrada por
 * PuntoCash**, o cuyo **operador** lo está, no puede entrar aunque figure
 * activo, y **nada de lo que haya en esta pantalla lo arregla**. Mezclar los
 * dos casos llevaría a alguien a reactivar a quien ya está activo y a concluir
 * que el producto está roto.
 *
 * ── Lo que falta, dicho en vez de dibujado vacío ──────────────────────────
 * **FR-AD-TRAB-9** pide además la **actividad reciente** —últimas jornadas,
 * cajas operadas y volumen— y eso lo sabrá §9 Jornadas. Y las acciones
 * —editar, reasignar, regenerar credencial, desactivar, ayudar con el
 * acceso— llegan en el tramo siguiente. Las dos cosas se anuncian: un bloque
 * vacío se lee como «este trabajador no ha operado nunca», que es otra cosa.
 */
export default async function AdminTrabajadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const red = redEnAlcance(session.scope);

  /* Se busca **dentro del alcance**, sede a sede, en vez de resolver por id y
     comprobar después: así un identificador ajeno no llega siquiera a
     encontrarse, y no hay una rama donde se haya leído algo que no se debía. */
  let trabajador: NetworkWorker | null = null;
  let sedeName = "";
  for (const sede of session.sedes) {
    const encontrado = red.trabajadores(sede.id).find((w) => w.id === id);
    if (encontrado) {
      trabajador = encontrado;
      sedeName = sede.name;
      break;
    }
  }

  if (!trabajador) notFound();

  const bloqueo = motivoDeBloqueo(trabajador);

  return (
    <>
      <PageHeader
        title={trabajador.fullName}
        description={`${trabajador.identifier} · ${sedeName}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/trabajadores">
              <ArrowLeft aria-hidden="true" />
              Volver a Trabajadores
            </Link>
          </Button>
        }
      />

      <AvisoDeAcceso bloqueo={bloqueo} sedeName={sedeName} trabajador={trabajador} />

      <Section title="Datos">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 wide:grid-cols-3">
              <Dato label="Estado" valor={<EstadoTrabajador status={trabajador.status} />} />
              <Dato label="Identificador de acceso" valor={trabajador.identifier} numerico />
              <Dato
                label="Documento"
                valor={trabajador.documentId}
                nota={documentTypeLabel(trabajador.documentType)}
                numerico
              />
              <Dato label="Teléfono" valor={trabajador.phone} numerico />
              {/* **FR-AD-TRAB-6**: es el canal del segundo factor, y la
                  etiqueta ya lo dice —sin nota debajo, v4.8—. Enmascarado,
                  igual que en el listado y que en la propia verificación. */}
              <Dato label="Correo de verificación" valor={maskEmail(trabajador.email)} />
              <Dato label="Alta" valor={formatDate(new Date(trabajador.createdAt))} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="Sede">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="flex items-center gap-2 text-body text-text-primary">
              <Building2 className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
              <span className="font-medium">{sedeName}</span>
            </p>
            {/* Ninguna caja, ni aquí ni en el alta (**FR-AD-TRAB-4**, **[A13]**):
                la caja la determina el equipo en el que el trabajador inicie
                sesión. La v4.7 del documento retiró la explicación en pantalla
                que la v4.6 exigía — la ausencia de la caja es la explicación. */}
          </CardContent>
        </Card>
      </Section>

      <Section title="Actividad reciente">
        <Alert variant="info" title="Llega con Jornadas">
          Las últimas jornadas de {trabajador.firstName}, las cajas que operó y su volumen son
          datos de §9, que todavía no está construida. Se mostrarán aquí en cuanto exista, en vez
          de dibujarse ahora en blanco.
        </Alert>
      </Section>

      <Section title="Acciones">
        <AccionesTrabajador
          trabajador={{
            id: trabajador.id,
            nombre: trabajador.fullName,
            sedeId: trabajador.branchId,
            sedeName,
            activo: trabajador.status === "activo",
          }}
          sedes={session.sedes
            .filter((sede) => sede.status !== "cerrada")
            .map((sede) => ({
              id: sede.id,
              name: sede.name,
              suspendida: sede.status === "suspendida",
            }))}
        />
      </Section>
    </>
  );
}

/**
 * El aviso de **FR-AD-TRAB-16**, que es el que separa las causas.
 *
 * Un bloqueo que viene de PuntoCash —sede suspendida o cerrada, operador
 * suspendido— se dice **sin ofrecer nada**: no hay acción en esta consola que
 * lo resuelva, y sugerirla sería mandar a alguien a intentar lo imposible.
 */
function AvisoDeAcceso({
  bloqueo,
  sedeName,
  trabajador,
}: {
  bloqueo: ReturnType<typeof motivoDeBloqueo>;
  sedeName: string;
  trabajador: NetworkWorker;
}): React.JSX.Element | null {
  if (bloqueo === null) return null;

  if (bloqueo === "desactivado") {
    return (
      <Alert
        variant="warning"
        title="Este trabajador está desactivado y no puede iniciar sesión"
        className="mb-12"
      >
        {trabajador.deactivation
          ? `Lo desactivó ${trabajador.deactivation.by} el ${formatDateTime(new Date(trabajador.deactivation.at))}: «${trabajador.deactivation.reason}».`
          : "No se registró el motivo."}{" "}
        Nada de lo que operó se ha borrado ni alterado. Puede reactivarse desde esta consola.
      </Alert>
    );
  }

  const PORQUE: Record<Exclude<typeof bloqueo, null | "desactivado">, string> = {
    "sede-suspendida": `${sedeName} está suspendida por PuntoCash.`,
    "sede-cerrada": `${sedeName} está cerrada.`,
    "operador-suspendido": "Tu empresa está suspendida por PuntoCash.",
    "sin-operador": `${sedeName} no tiene ninguna empresa asignada ahora mismo.`,
  };

  return (
    <Alert variant="error" title={`No puede acceder: ${PORQUE[bloqueo]}`} className="mb-12">
      Figura como activo y sus datos están intactos, pero no podrá iniciar sesión mientras eso
      siga así. No es algo que se resuelva desde esta consola: lo decide PuntoCash.
    </Alert>
  );
}

function Dato({
  label,
  valor,
  nota,
  numerico,
}: {
  label: string;
  valor: React.ReactNode;
  nota?: string;
  numerico?: boolean;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{label}</dt>
      <dd className={`mt-1 text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>
        {valor}
      </dd>
      {nota ? <p className="mt-1 text-caption text-text-secondary">{nota}</p> : null}
    </div>
  );
}
