import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Badge, Button, Card } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { WORKER_SERVICES } from "@/features/operations/services";
import { TARIFA_POR_SERVICIO } from "@/features/network/tarifas";
import { AvisosDeTarifa } from "./avisos-de-tarifa";
import { avisosMostrados, monedasDeGiros, sedesConGiros } from "./datos";

export const metadata: Metadata = {
  title: "Administración de sede · Tarifas",
  robots: { index: false, follow: false },
};

/**
 * Tarifas — lo que paga el cliente por cada servicio, además del importe de
 * la operación. La misma pantalla que la de Super administración, de solo
 * lectura: las fija PuntoCash para toda la red (decisión del 24/11/2026).
 *
 * Va por servicio, como allí, para que un servicio nuevo con tarifa sea una
 * fila más.
 */
export default async function AdminTarifasPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  const conGiros = sedesConGiros(sedes);
  const conTarifa = monedasDeGiros(red, sedes).filter((m) => m.tarifa !== null).length;
  const disponibles = WORKER_SERVICES.filter((s) => s.status === "available");

  return (
    <>
      <PageHeader
        title="Tarifas"
        description="Lo que paga el cliente por cada servicio, además del importe de la operación. Las fija PuntoCash y son las mismas en todas las sedes."
      />

      <AvisosDeTarifa avisos={avisosMostrados(sedes)} />

      <Card>
        <ul className="divide-y divide-border">
          {disponibles.map((s) => {
            const tarifa = TARIFA_POR_SERVICIO[s.id];
            const Icono = s.icon;
            return (
              <li key={s.id} className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:gap-6">
                <div className="flex min-w-0 items-center gap-3 xl:w-56 xl:shrink-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-primary">
                    <Icono className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-body font-semibold text-text-primary">{s.name}</span>
                </div>

                {!tarifa || tarifa.tipo === "sin-tarifa" ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="shrink-0">
                      <Badge variant="neutral">Sin tarifa</Badge>
                    </span>
                    <span className="text-body-sm text-text-secondary">{tarifa?.motivo ?? "Sin definir."}</span>
                  </div>
                ) : conGiros.length === 0 ? (
                  <p className="min-w-0 flex-1 text-body-sm text-text-secondary">
                    {sedes.length === 1 ? "Esta sede no ofrece" : "Tus sedes no ofrecen"} {s.name}.
                  </p>
                ) : (
                  <>
                    <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-2 text-body-sm sm:grid-cols-[auto_1fr] sm:items-center">
                      <dt className="text-text-secondary">{tarifa.operacion}</dt>
                      <dd className="text-text-primary">
                        Por tramos de importe ·{" "}
                        {conTarifa === 0
                          ? "en ninguna moneda"
                          : conTarifa === 1
                            ? "en 1 moneda"
                            : `en ${conTarifa} monedas`}
                        {sedes.length === 1 ? " de esta sede" : " de tus sedes"}. La paga el remitente.
                      </dd>
                      <dt className="text-text-secondary">{tarifa.sinTarifa}</dt>
                      <dd>
                        <Badge variant="neutral">Sin tarifa</Badge>
                      </dd>
                    </dl>
                    <Button variant="secondary" asChild className="self-start xl:self-center">
                      <Link href="/admin/tarifas/giros">
                        Ver tarifas de giros
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="mt-4 text-body-sm text-text-secondary">
        Los servicios que todavía no están disponibles dirán si llevan tarifa cuando PuntoCash los defina.
      </p>
    </>
  );
}
