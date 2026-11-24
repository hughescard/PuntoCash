import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card } from "@/components/ui";
import { MonedaDeTarifa, TramosDeTarifa } from "@/components/patterns/tarifa-de-giro";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { importe } from "@/lib/formato-de-tarifa";
import { fechaYHora } from "../../jornadas/formato";
import { AvisosDeTarifa } from "../avisos-de-tarifa";
import { avisosMostrados, enumerar, monedasDeGiros, sedesConGiros, type MonedaDeGiros } from "../datos";

export const metadata: Metadata = {
  title: "Administración de sede · Tarifas de giros",
  robots: { index: false, follow: false },
};

/**
 * Tarifas de giros — la de Super administración, de solo lectura, y solo con
 * las monedas en que las sedes del selector envían giros.
 *
 * Arriba, las que tienen tarifa, con su tabla y desde cuándo rige. Abajo, las
 * que la sede maneja pero en las que PuntoCash no ha puesto tarifa: en ellas
 * no se envían giros, y así el administrador sabe por qué no las ofrece la caja.
 */
export default async function AdminTarifasDeGirosPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  const varias = sedes.length > 1;
  const monedas = monedasDeGiros(red, sedes);
  const con = monedas.filter((m) => m.tarifa !== null);
  const sin = monedas.filter((m) => m.tarifa === null);

  return (
    <>
      <PageHeader
        title="Tarifas de giros"
        description="La paga el remitente al enviar, según lo que recibe el beneficiario. Cobrar un giro no lleva tarifa. Las fija PuntoCash."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/tarifas">
              <ArrowLeft aria-hidden="true" />
              Volver a Tarifas
            </Link>
          </Button>
        }
      />

      <AvisosDeTarifa avisos={avisosMostrados(sedes)} />

      {sedesConGiros(sedes).length === 0 ? (
        <Alert variant="info" title={varias ? "Tus sedes no ofrecen Giros" : "Esta sede no ofrece Giros"}>
          Las tarifas de giros solo se aplican donde PuntoCash habilita el servicio.
        </Alert>
      ) : (
        <>
          <section aria-labelledby="con-tarifa" className="flex flex-col gap-6">
            <h2 id="con-tarifa" className="sr-only">
              Monedas en las que se envían giros
            </h2>
            {con.length === 0 ? (
              <Alert variant="warning" title="No se pueden enviar giros en ninguna moneda">
                PuntoCash no ha definido la tarifa de ninguna de las monedas {varias ? "de tus sedes" : "de esta sede"}.
              </Alert>
            ) : (
              con.map((m) => <TarjetaDeTarifa key={m.code} moneda={m} varias={varias} />)
            )}
          </section>

          {sin.length > 0 ? (
            <Section
              title="Sin tarifa"
              description="En estas monedas no se envían giros: PuntoCash no les ha definido tarifa."
              className="mt-10"
            >
              <Card>
                <ul className="divide-y divide-border">
                  {sin.map((m) => (
                    <li key={m.code} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
                      <MonedaDeTarifa code={m.code} nombre={m.nombre} />
                      {varias ? (
                        <span className="text-body-sm text-text-secondary">{enumerar(m.sedes.map((s) => s.name))}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}
        </>
      )}
    </>
  );
}

function TarjetaDeTarifa({ moneda: m, varias }: { moneda: MonedaDeGiros; varias: boolean }): React.JSX.Element {
  const t = m.tarifa!;
  return (
    <Card>
      <div className="px-6 pt-6 pb-4">
        <MonedaDeTarifa code={m.code} nombre={m.nombre} />
      </div>

      <dl className="grid grid-cols-1 gap-x-10 gap-y-3 px-6 pb-5 text-body-sm sm:grid-cols-2 lg:flex">
        <div>
          <dt className="text-text-secondary">Giro mínimo</dt>
          <dd className="pc-numeric mt-0.5 text-body font-semibold text-text-primary">
            {importe(t.minimo)} {m.code}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">En vigor desde</dt>
          <dd className="mt-0.5 text-text-primary">{fechaYHora(t.desde)}</dd>
        </div>
        {varias ? (
          <div>
            <dt className="text-text-secondary">Se envían giros en</dt>
            <dd className="mt-0.5 text-text-primary">{enumerar(m.sedes.map((s) => s.name))}</dd>
          </div>
        ) : null}
      </dl>

      <TramosDeTarifa code={m.code} tramos={t.tramos} />
    </Card>
  );
}
