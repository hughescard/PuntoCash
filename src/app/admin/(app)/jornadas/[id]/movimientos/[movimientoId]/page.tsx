import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { todasLasDenominaciones } from "@/features/network/denominaciones";
import { formatAmount, formatSignedAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { DiferenciaDeApertura, fechaYHora, nombreDeJornada } from "../../../formato";

export const metadata: Metadata = {
  title: "Administración de sede · Movimiento",
  robots: { index: false, follow: false },
};

/** El detalle de un movimiento, en solo lectura — **FR-AD-JOR-17**. */
export default async function AdminMovimientoPage({
  params,
}: {
  params: Promise<{ id: string; movimientoId: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id, movimientoId } = await params;
  const red = redEnAlcance(session.scope);
  const j = red.jornada(id);
  const m = j?.movimientos.find((x) => x.id === movimientoId);
  if (!j || !m) notFound();
  /* Si el movimiento registró una diferencia, la solicitud que la acompaña. */
  const solicitud = red.solicitudesDeJornada(j.id).find((s) => s.movimientoId === m.id) ?? null;
  /* El fondeo de una apertura con cierre anterior: lo recibido frente a lo entregado. */
  const cierreAnterior = m.concepto === "Fondeo inicial" ? j.apertura.cierreAnterior : null;
  const apertura = cierreAnterior ? (j.apertura.monedas.find((a) => a.currency === m.currency) ?? null) : null;
  const composicion =
    apertura && apertura.diferencia === 0 && apertura.composicion && Object.keys(apertura.composicion).length > 0 ? apertura.composicion : null;

  return (
    <>
      <PageHeader
        title={m.concepto}
        description={`Jornada ${nombreDeJornada(j)}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/jornadas/${j.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a la jornada
            </Link>
          </Button>
        }
      />
      <Card className="max-w-form-max">
        <CardContent className="pt-6">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Dato etiqueta="Fecha y hora" valor={fechaYHora(m.fechaHora)} />
            <Dato
              etiqueta="Tipo"
              valor={<Badge variant={m.tipo === "entrada" ? "success" : "error"}>{m.tipo === "entrada" ? "Entrada" : "Salida"}</Badge>}
            />
            <Dato etiqueta="Importe" valor={`${formatSignedAmount(m.amount)} ${m.currency}`} numerico />
            {m.saldoAntes !== undefined ? (
              <Dato etiqueta="Saldo antes" valor={`${formatAmount(m.saldoAntes)} ${m.currency}`} numerico />
            ) : null}
            <Dato etiqueta="Saldo después" valor={`${formatAmount(m.saldoDespues)} ${m.currency}`} numerico />
            <Dato
              etiqueta="Operación"
              valor={
                m.operationCode ? (
                  <Link href={`/admin/operaciones/${m.operationCode}` as Route} className="underline underline-offset-4 hover:text-primary">
                    {m.operationCode}
                  </Link>
                ) : (
                  "Movimiento interno de caja"
                )
              }
              numerico={Boolean(m.operationCode)}
            />
            {m.motivo ? (
              <Dato etiqueta="Motivo" valor={m.motivo} />
            ) : m.concepto === "Ajuste de cierre" || m.concepto === "Ajuste de efectivo" ? (
              <Dato etiqueta="Motivo" valor="Sin explicar" />
            ) : null}
            {m.supervisor ? <Dato etiqueta="Supervisor" valor={m.supervisor} /> : null}
            {m.observaciones ? <Dato etiqueta="Observaciones" valor={m.observaciones} /> : null}
            {solicitud ? (
              <Dato
                etiqueta="Aprobación"
                valor={
                  <Link href={`/admin/aprobaciones/${solicitud.id}` as Route} className="underline underline-offset-4 hover:text-primary">
                    {solicitud.estado === "pendiente"
                      ? "Pendiente de aprobación"
                      : `${solicitud.estado === "aprobada" ? "Aprobada" : "Rechazada"} por ${solicitud.resolucion?.por ?? "la administración"}`}
                  </Link>
                }
              />
            ) : null}
          </dl>
        </CardContent>
      </Card>
      {cierreAnterior && apertura ? (
        <Card className="mt-6 max-w-form-max">
          <CardHeader>
            <CardTitle>{apertura.diferencia === 0 && !composicion ? "Apertura" : "Diferencia con el cierre anterior"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-0">
            {apertura.diferencia === 0 && !composicion ? (
              <p className="text-body text-text-primary">
                {cierreAnterior.sinArqueo ? "Coincidió con lo que había en libros al forzar el cierre" : "Coincidió con lo que entregó quien cerró"}{" "}
                <span className="text-text-secondary">
                  ({cierreAnterior.workerName} · {fechaYHora(cierreAnterior.closedAt)})
                </span>
              </p>
            ) : (
              <>
                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Dato
                    etiqueta={cierreAnterior.sinArqueo ? "En libros al forzar el cierre" : "Entregado"}
                    valor={`${formatAmount(apertura.dejado ?? 0)} ${m.currency}`}
                    numerico
                  />
                  <Dato etiqueta="Recibido" valor={`${formatAmount(apertura.contado)} ${m.currency}`} numerico />
                  <Dato
                    etiqueta="Diferencia"
                    valor={<DiferenciaDeApertura currency={m.currency} diferencia={apertura.diferencia} motivo={apertura.motivo} />}
                  />
                  <Dato
                    etiqueta={cierreAnterior.sinArqueo ? "Cierre forzado" : "Cerró"}
                    valor={`${cierreAnterior.workerName} · ${fechaYHora(cierreAnterior.closedAt)}`}
                  />
                  <Dato etiqueta="Motivo" valor={apertura.motivo ?? "Sin explicar"} />
                  {apertura.supervisor ? <Dato etiqueta="Supervisor" valor={apertura.supervisor} /> : null}
                  {apertura.observaciones ? <Dato etiqueta="Observaciones" valor={apertura.observaciones} /> : null}
                </dl>
                {composicion ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-caption uppercase tracking-wide text-text-secondary">Billetes que cambiaron</p>
                    <BilletesDelMovimiento
                      billetes={composicion}
                      currency={m.currency}
                      tipos={todasLasDenominaciones(m.currency)}
                      nombre="que cambiaron al abrir"
                      leyenda="En positivo los recibidos de más; en negativo los que faltaban de lo entregado."
                    />
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
      <Card className="mt-6 max-w-form-max">
        <CardHeader>
          <CardTitle>Billetes y monedas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <BilletesDelMovimiento billetes={m.billetes} currency={m.currency} tipos={todasLasDenominaciones(m.currency)} />
        </CardContent>
      </Card>
    </>
  );
}

function Dato({ etiqueta, valor, numerico = false }: { etiqueta: string; valor: React.ReactNode; numerico?: boolean }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className={numerico ? "pc-numeric mt-1 text-body text-text-primary" : "mt-1 text-body text-text-primary"}>{valor}</dd>
    </div>
  );
}
