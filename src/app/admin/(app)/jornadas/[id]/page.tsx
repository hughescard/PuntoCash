import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { conciliacionDe, MOTIVO_MIN } from "@/features/network/jornadas";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { diaEnCuba, fechaCorta, fechaYHora, nombreDeJornada } from "../formato";
import { ForzarCierre } from "./forzar-cierre";
import { CuerpoDeJornada } from "./cuerpo-de-jornada";
import { mensaje } from "../../mensajes";

export const metadata: Metadata = {
  title: "Administración de sede · Jornada",
  robots: { index: false, follow: false },
};

/**
 * Una jornada — **FR-AD-JOR-4** a **FR-AD-JOR-14**. Toda cifra de una
 * cerrada es la que se guardó al cerrarla (**FR-AD-JOR-6**). Una jornada de
 * otra empresa responde como inexistente (**FR-AD-NAV-3**).
 */
export default async function AdminJornadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ forzada?: string; yaCerrada?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const { forzada, yaCerrada } = await searchParams;
  const j = redEnAlcance(session.scope).jornada(id);
  if (!j) notFound();

  const sede = session.sedes.find((s) => s.id === j.sedeId);
  const hoy = diaEnCuba(new Date());
  const deOtroDia = j.estado === "abierta" && diaEnCuba(j.openedAt) < hoy;
  const conciliacion = conciliacionDe(j);
  const red = redEnAlcance(session.scope);
  const trabajadorVisible = session.sedes.some((s) => red.trabajadores(s.id).some((w) => w.id === j.workerId));
  /* Cada diferencia espera su visto bueno en Aprobaciones (FR-AD-APR-1); aquí se dice en qué quedó. */
  const solicitudes = red.solicitudesDeJornada(j.id);

  return (
    <>
      <PageHeader
        title={nombreDeJornada(j)}
        description={`Jornada de ${sede?.name ?? ""}, abierta el ${fechaYHora(j.openedAt)}.`}
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {j.estado === "abierta" ? (
              <ForzarCierre
                id={j.id}
                caja={j.cajaNombre}
                trabajador={j.workerName}
                sesionActiva={j.sesionActiva}
                equipo={j.equipo?.label ?? null}
                motivoMin={MOTIVO_MIN}
              />
            ) : null}
            <Button variant="secondary" asChild>
              <Link href="/admin/jornadas">
                <ArrowLeft aria-hidden="true" />
                Volver a Jornadas
              </Link>
            </Button>
          </div>
        }
      />

      {forzada === "1" && j.estado === "forzada" ? (
        <Alert variant="success" title="Jornada cerrada" className="mb-8">
          La caja ya está cerrada. {j.workerName} tendrá que abrir una jornada nueva para volver a operar en ella.
        </Alert>
      ) : null}

      {yaCerrada === "1" && j.estado !== "abierta" ? (
        <Alert variant="info" title={mensaje("jornadas", "ya-cerrada")} className="mb-8">
          Se cerró mientras confirmabas, así que no se ha forzado nada. Esto es lo que ha quedado.
        </Alert>
      ) : null}

      {deOtroDia ? (
        <Alert variant="warning" title={`Sigue abierta desde el ${fechaCorta(j.openedAt)}`} className="mb-8">
          Nadie ha hecho su cierre. Si nadie va a hacerlo, puedes forzar el cierre.
        </Alert>
      ) : null}

      {/* FR-AD-JOR-14: el motivo y quién lo declaró. */}
      {j.cierreForzado ? (
        <Alert variant="warning" title="Cierre forzado" className="mb-8">
          <p>
            La cerró {j.cierreForzado.por} el {fechaYHora(j.cierreForzado.at)}: «{j.cierreForzado.motivo}»
          </p>
          {/* FR-AD-JOR-20: el conteo que faltó llega con la apertura siguiente. */}
          {conciliacion?.estado === "contada" ? (
            <p className="mt-1">
              Se contó al abrir la{" "}
              <Link href={`/admin/jornadas/${conciliacion.jornada.id}` as Route} className="font-semibold underline underline-offset-4">
                jornada siguiente
              </Link>{" "}
              ({conciliacion.jornada.workerName}, {fechaYHora(conciliacion.jornada.openedAt)}):{" "}
              {conciliacion.diferencias.length === 0
                ? "coincidió con el saldo en libros."
                : conciliacion.diferencias
                    /* «Otro» se lee «diferencia», como en la apertura (FR-AD-JOR-19). */
                    .map((d) => `${!d.motivo || d.motivo === "Otro" ? "diferencia" : d.motivo.toLowerCase()} de ${formatAmount(Math.abs(d.diferencia))} ${d.currency}`)
                    .join(", ") + "."}
            </p>
          ) : (
            <p className="mt-1">
              <strong>Pendiente de conciliar.</strong> Nadie ha contado esta caja desde el cierre: el primer conteo será
              el de quien abra la próxima jornada.
            </p>
          )}
        </Alert>
      ) : null}

      <CuerpoDeJornada j={j} base="/admin" trabajadorVisible={trabajadorVisible} solicitudes={solicitudes} />
    </>
  );
}
