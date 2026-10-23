import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { formatAmount, formatSignedAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { fechaYHora, nombreDeJornada } from "../../../formato";

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
            {m.motivo ? <Dato etiqueta="Motivo" valor={m.motivo} /> : null}
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
