import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { conciliacionDe } from "@/features/network/jornadas";
import { OPERATORS } from "@/features/network/operators";
import { asignacionVigente } from "@/features/network/assignments";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { diaEnCuba, fechaCorta, fechaYHora, nombreDeJornada } from "@/app/admin/(app)/jornadas/formato";
import { CuerpoDeJornada } from "@/app/admin/(app)/jornadas/[id]/cuerpo-de-jornada";

export const metadata: Metadata = {
  title: "Super administración · Jornada",
  robots: { index: false, follow: false },
};

/**
 * Una jornada de la red, **sin una sola acción**.
 *
 * El cuerpo es el mismo que ve el administrador de la sede: si PuntoCash y
 * el mercante leyeran dos versiones distintas del mismo día de caja, la
 * conciliación no serviría de nada. Lo que no se trae es forzar el cierre,
 * que es del mercante, ni el detalle de cada movimiento ni la ficha de cada
 * solicitud, que son sus herramientas para resolver un descuadre.
 *
 * Lo que esta consola añade es el **operador responsable**, que es con quien
 * se concilia.
 */
export default async function SuperAdminJornadaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id } = await params;
  const red = redEnAlcance(GLOBAL_SCOPE);
  const j = red.jornada(id);
  if (!j) notFound();

  const sede = red.sede(j.sedeId);
  const tramo = asignacionVigente(j.sedeId);
  const operador = tramo ? OPERATORS.find((o) => o.id === tramo.operatorId) ?? null : null;
  const conciliacion = conciliacionDe(j);
  const deOtroDia = j.estado === "abierta" && diaEnCuba(j.openedAt) < diaEnCuba(new Date());

  return (
    <>
      <PageHeader
        title={nombreDeJornada(j)}
        description={
          <>
            {sede ? (
              <Link href={`/super-admin/sedes/${j.sedeId}` as Route} className="underline underline-offset-4 hover:text-primary">
                {sede.name}
              </Link>
            ) : (
              "Sede desconocida"
            )}
            {operador ? (
              <>
                {" · "}
                <Link href={`/super-admin/operadores/${operador.id}` as Route} className="underline underline-offset-4 hover:text-primary">
                  {operador.name}
                </Link>
              </>
            ) : (
              " · sin operador"
            )}
            {` · abierta el ${fechaYHora(j.openedAt)}`}
          </>
        }
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/jornadas">
              <ArrowLeft aria-hidden="true" />
              Volver a Jornadas
            </Link>
          </Button>
        }
      />

      {deOtroDia ? (
        <Alert variant="warning" title={`Sigue abierta desde el ${fechaCorta(j.openedAt)}`} className="mb-8">
          Nadie ha hecho su cierre. Forzarlo es cosa de su administrador
          {operador ? `, ${operador.name}` : ""}: PuntoCash no cierra cajas ajenas.
        </Alert>
      ) : null}

      {j.cierreForzado ? (
        <Alert variant="warning" title="Cierre forzado" className="mb-8">
          <p>
            La cerró {j.cierreForzado.por} el {fechaYHora(j.cierreForzado.at)}: «{j.cierreForzado.motivo}»
          </p>
          {conciliacion?.estado === "contada" ? (
            <p className="mt-1">
              Se contó al abrir la{" "}
              <Link href={`/super-admin/jornadas/${conciliacion.jornada.id}` as Route} className="font-semibold underline underline-offset-4">
                jornada siguiente
              </Link>{" "}
              ({conciliacion.jornada.workerName}, {fechaYHora(conciliacion.jornada.openedAt)}):{" "}
              {conciliacion.diferencias.length === 0
                ? "coincidió con el saldo en libros."
                : conciliacion.diferencias
                    .map(
                      (d) =>
                        `${!d.motivo || d.motivo === "Otro" ? "diferencia" : d.motivo.toLowerCase()} de ${formatAmount(Math.abs(d.diferencia))} ${d.currency}`,
                    )
                    .join(", ") + "."}
            </p>
          ) : (
            <p className="mt-1">
              <strong>Pendiente de conciliar.</strong> Nadie ha contado esta caja desde el cierre: el primer conteo
              será el de quien abra la próxima jornada.
            </p>
          )}
        </Alert>
      ) : null}

      <CuerpoDeJornada
        j={j}
        base="/super-admin"
        trabajadorVisible
        solicitudes={red.solicitudesDeJornada(j.id)}
      />
    </>
  );
}
