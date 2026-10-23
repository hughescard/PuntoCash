import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { conciliacionDe, MOTIVO_MIN, saldosDe } from "@/features/network/jornadas";
import type { Solicitud } from "@/features/network/aprobaciones";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { diaEnCuba, Diferencia, DiferenciaDeApertura, EstadoBadge, fechaCorta, fechaYHora, hora, nombreDeJornada } from "../formato";
import { ForzarCierre } from "./forzar-cierre";
import { MovimientosDeJornada } from "./movimientos-de-jornada";
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
  const saldos = saldosDe(j);
  const conciliacion = conciliacionDe(j);
  const red = redEnAlcance(session.scope);
  const trabajadorVisible = session.sedes.some((s) => red.trabajadores(s.id).some((w) => w.id === j.workerId));
  const previo = j.apertura.cierreAnterior;
  /* Cada diferencia espera su visto bueno en Aprobaciones (FR-AD-APR-1); aquí se dice en qué quedó. */
  const solicitudes = red.solicitudesDeJornada(j.id);
  const solicitudDe = (tipo: "cierre" | "apertura", currency: string) =>
    solicitudes.find((x) => x.tipo === tipo && x.currency === currency) ?? null;

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

      <Section title="La jornada">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Estado" valor={<EstadoBadge estado={j.estado} />} />
              <Dato
                etiqueta="Trabajador"
                valor={
                  trabajadorVisible ? (
                    <Link href={`/admin/trabajadores/${j.workerId}` as Route} className="underline underline-offset-4 hover:text-primary">
                      {j.workerName}
                    </Link>
                  ) : (
                    j.workerName
                  )
                }
              />
              <Dato etiqueta="Equipo" valor={j.equipo ? `${j.equipo.label} · ${j.equipo.id}` : "—"} />
              <Dato etiqueta="Apertura" valor={fechaYHora(j.openedAt)} />
              <Dato
                etiqueta="Cierre"
                valor={
                  j.closedAt
                    ? diaEnCuba(j.closedAt) === diaEnCuba(j.openedAt)
                      ? hora(j.closedAt)
                      : fechaYHora(j.closedAt)
                    : "Abierta"
                }
              />
            </dl>
          </CardContent>
        </Card>
      </Section>

      {/* FR-AD-JOR-18 y 19: lo que encontró quien abrió, contra lo que dejó el cierre anterior. */}
      <Section
        title="Apertura"
        description={
          previo
            ? undefined
            : "Es la primera jornada registrada de esta caja: no hay un cierre anterior con el que comparar."
        }
      >
        <Card>
          <CardContent className="pt-6">
            {previo ? (
              <p className="mb-4 text-body-sm text-text-secondary">
                Comparada con el cierre de la{" "}
                <Link href={`/admin/jornadas/${previo.jornadaId}` as Route} className="font-semibold text-text-primary underline underline-offset-4">
                  jornada anterior
                </Link>{" "}
                de esta caja ({previo.workerName}, {fechaYHora(previo.closedAt)}).
                {previo.sinArqueo
                  ? " Ese fue un cierre forzado: lo dejado es el saldo en libros, y este es el primer conteo de la caja desde entonces."
                  : null}
              </p>
            ) : null}
            <ul className="flex flex-col divide-y divide-border">
              {j.apertura.monedas.map((m) => (
                <li
                  key={m.currency}
                  className={
                    previo
                      ? "grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr_1fr_1.5fr] sm:items-start"
                      : "grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:items-start"
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <CurrencyFlag currency={m.currency} />
                    <span className="pc-numeric font-semibold">{m.currency}</span>
                  </span>
                  {previo ? (
                    <span className="pc-numeric text-body-sm text-text-secondary">
                      Dejado {m.dejado === null ? "—" : formatAmount(m.dejado)}
                    </span>
                  ) : null}
                  <span className="pc-numeric text-body-sm text-text-secondary">Contado {formatAmount(m.contado)}</span>
                  {previo ? (
                    <span className="flex flex-col">
                      {m.diferencia === 0 ? (
                        <span className="font-semibold text-text-primary">Coincide</span>
                      ) : (
                        <DiferenciaDeApertura currency={m.currency} diferencia={m.diferencia} motivo={m.motivo} />
                      )}
                      {m.observaciones ? <span className="text-body-sm text-text-secondary">{m.observaciones}</span> : null}
                      <EstadoDeAprobacion solicitud={solicitudDe("apertura", m.currency)} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section title={j.estado === "abierta" ? "Saldos" : "Saldos al cerrar"}>
        <Card>
          <CardContent className="pt-6">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-caption uppercase tracking-wide text-text-secondary">
                  <th className="pb-2 font-medium">Moneda</th>
                  <th className="pb-2 text-right font-medium">Fondeo inicial</th>
                  <th className="pb-2 text-right font-medium">{j.estado === "abierta" ? "Ahora" : "Final"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {saldos.map((s) => (
                  <tr key={s.currency}>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-2">
                        <CurrencyFlag currency={s.currency} />
                        <span className="pc-numeric font-semibold">{s.currency}</span>
                      </span>
                    </td>
                    <td className="pc-numeric py-2 text-right">
                      {formatAmount(j.fondeo.find((f) => f.currency === s.currency)?.amount ?? 0)}
                    </td>
                    <td className="pc-numeric py-2 text-right font-semibold">{formatAmount(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Section>

      {j.arqueo ? (
        <Section title="Cierre" description={`Confirmado por ${j.workerName} el ${fechaYHora(j.arqueo.confirmadoAt)}.`}>
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border">
                {j.arqueo.monedas.map((m) => (
                  <li key={m.currency} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr_1fr_1.5fr] sm:items-center">
                    <span className="inline-flex items-center gap-2">
                      <CurrencyFlag currency={m.currency} />
                      <span className="pc-numeric font-semibold">{m.currency}</span>
                    </span>
                    <span className="pc-numeric text-body-sm text-text-secondary">Esperado {formatAmount(m.esperado)}</span>
                    <span className="pc-numeric text-body-sm text-text-secondary">Contado {formatAmount(m.contado)}</span>
                    <span className="flex flex-col">
                      <Diferencia currency={m.currency} diferencia={m.diferencia} />
                      {m.motivo ? <span className="text-body-sm text-text-secondary">{m.motivo}</span> : null}
                      <EstadoDeAprobacion solicitud={solicitudDe("cierre", m.currency)} />
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Section>
      ) : null}

      <Section title="Movimientos">
        <MovimientosDeJornada
          jornadaId={j.id}
          rows={j.movimientos.map((m) => ({
            id: m.id,
            hora: hora(m.fechaHora),
            operacion: m.operationCode ?? null,
            tipo: m.tipo,
            concepto: m.concepto,
            currency: m.currency,
            amount: m.amount,
            saldoDespues: m.saldoDespues,
          }))}
        />
      </Section>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
    </div>
  );
}

/** En qué quedó la solicitud de una diferencia, con enlace a ella. */
function EstadoDeAprobacion({ solicitud }: { solicitud: Solicitud | null }): React.JSX.Element | null {
  if (!solicitud) return null;
  const texto =
    solicitud.estado === "pendiente"
      ? "Pendiente de aprobación"
      : `${solicitud.estado === "aprobada" ? "Aprobada" : "Rechazada"} por ${solicitud.resolucion?.por ?? "la administración"}`;
  return (
    <Link
      href={`/admin/aprobaciones/${solicitud.id}` as Route}
      className={
        solicitud.estado === "pendiente"
          ? "w-fit text-body-sm font-semibold text-warning-foreground underline underline-offset-4"
          : "w-fit text-body-sm text-text-secondary underline underline-offset-4 hover:text-primary"
      }
    >
      {texto}
    </Link>
  );
}
