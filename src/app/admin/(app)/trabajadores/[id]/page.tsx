import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { ResponsiveTable } from "@/components/patterns/responsive-table";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { documentTypeLabel } from "@/features/customers/customers";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { motivoDeBloqueo, type NetworkWorker } from "@/features/network/workers";
import { conciliacionDe, diaEnCuba, operacionesDe, type Jornada } from "@/features/network/jornadas";
import { Diferencia, EstadoBadge, fechaCorta, fechaYHora, hora } from "../../jornadas/formato";
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
 * ── Actividad reciente ────────────────────────────────────────────────────
 * **FR-AD-TRAB-9**: su jornada en curso, si la tiene, sus últimas jornadas y
 * las cajas en que operó. Su **volumen** está en Reportes, filtrado por él:
 * aquí, el enlace.
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
  const susJornadas = red.jornadasDeTrabajador(trabajador.id);
  const enCurso = susJornadas.find((j) => j.estado === "abierta") ?? null;
  const recientes = susJornadas.slice(0, 10);
  const nombreDeSede = (sedeId: string) => session.sedes.find((s) => s.id === sedeId)?.name ?? "";
  const cajasOperadas = [...new Map(susJornadas.map((j) => [j.registerId, `${j.cajaNombre} de ${nombreDeSede(j.sedeId)}`])).values()];

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

      {/* FR-AD-TRAB-9: lo que ha operado; su volumen, en Reportes. */}
      <Section title="Actividad reciente">
        {enCurso ? (
          <Alert variant="info" title="Tiene una jornada abierta" className="mb-6">
            En {enCurso.cajaNombre} de {nombreDeSede(enCurso.sedeId)}, desde el {fechaYHora(enCurso.openedAt)}.{" "}
            <Link href={`/admin/jornadas/${enCurso.id}` as Route} className="font-semibold underline underline-offset-4">
              Ver la jornada
            </Link>
          </Alert>
        ) : null}
        {cajasOperadas.length > 0 ? (
          <p className="mb-4 text-body text-text-secondary">
            Ha operado en {cajasOperadas.length === 1 ? cajasOperadas[0] : `${cajasOperadas.slice(0, -1).join(", ")} y ${cajasOperadas.at(-1)}`}.{" "}
            <Link
              href={`/admin/reportes?corte=dia&trabajador=${trabajador.id}` as Route}
              className="font-semibold text-primary underline underline-offset-4"
            >
              Ver su volumen por día
            </Link>
          </p>
        ) : null}
        <ResponsiveTable
          rows={recientes}
          rowKey={(j) => j.id}
          rowLink={(j) => ({ href: `/admin/jornadas/${j.id}`, label: `Ver jornada de ${j.cajaNombre}, ${fechaCorta(j.openedAt)}` })}
          columns={[
            { key: "fecha", header: "Fecha", cell: (j) => <span className="whitespace-nowrap">{fechaCorta(j.openedAt)}</span>, hiddenOnCard: true },
            {
              key: "caja",
              header: "Caja",
              cell: (j) => `${j.cajaNombre}${session.sedes.length > 1 ? ` · ${nombreDeSede(j.sedeId)}` : ""}`,
            },
            {
              key: "horas",
              header: "Apertura y cierre",
              cell: (j) => (
                <span className="pc-numeric whitespace-nowrap text-text-secondary">
                  {hora(j.openedAt)} – {j.closedAt ? (diaEnCuba(j.closedAt) === diaEnCuba(j.openedAt) ? hora(j.closedAt) : fechaYHora(j.closedAt)) : "…"}
                </span>
              ),
            },
            { key: "estado", header: "Estado", cell: (j) => <EstadoBadge estado={j.estado} />, hiddenOnCard: true },
            { key: "ops", header: "Operaciones", numeric: true, cell: (j) => operacionesDe(j) },
            { key: "cierre", header: "Cierre", cell: (j) => <ResultadoDeCierre jornada={j} /> },
          ]}
          cardTitle={(j) => fechaCorta(j.openedAt)}
          cardBadge={(j) => <EstadoBadge estado={j.estado} />}
          empty={<p className="text-body text-text-secondary">{trabajador.firstName} todavía no ha abierto ninguna jornada.</p>}
        />
        {susJornadas.length > recientes.length ? (
          <p className="mt-3 text-body-sm text-text-secondary">
            Las {recientes.length} más recientes de {susJornadas.length}. Las demás están en{" "}
            <Link href="/admin/jornadas" className="font-semibold text-primary underline underline-offset-4">
              Jornadas
            </Link>
            , filtrando por trabajador.
          </p>
        ) : null}
      </Section>

      <Section title="Acciones">
        <AccionesTrabajador
          trabajador={{
            id: trabajador.id,
            nombre: trabajador.fullName,
            sedeId: trabajador.branchId,
            sedeName,
            activo: trabajador.status === "activo",
            jornadaAbierta: enCurso
              ? { id: enCurso.id, caja: enCurso.cajaNombre, sede: nombreDeSede(enCurso.sedeId) }
              : null,
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

/** Cómo cerró: lo mismo que la columna «Cierre» de Jornadas (**FR-AD-JOR-1**). */
function ResultadoDeCierre({ jornada: j }: { jornada: Jornada }): React.JSX.Element {
  if (j.estado === "abierta") return <span className="text-text-secondary">—</span>;
  if (!j.arqueo) {
    return (
      <span className="flex flex-col">
        <span className="text-text-secondary">Sin contar</span>
        {conciliacionDe(j)?.estado === "pendiente" ? (
          <span className="text-body-sm font-semibold text-warning-foreground">Pendiente de conciliar</span>
        ) : null}
      </span>
    );
  }
  const difs = j.arqueo.monedas.filter((m) => m.diferencia !== 0);
  if (difs.length === 0) return <span className="font-semibold text-text-primary">Cuadrada</span>;
  return (
    <span className="flex flex-col">
      {difs.map((d) => (
        <Diferencia key={d.currency} currency={d.currency} diferencia={d.diferencia} />
      ))}
    </span>
  );
}
