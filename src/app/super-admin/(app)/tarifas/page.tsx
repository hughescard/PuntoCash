import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Badge, Button, Card } from "@/components/ui";
import { WORKER_SERVICES } from "@/features/operations/services";
import { TARIFA_POR_SERVICIO, tarifasDeGiro } from "@/features/network/tarifas";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

export const metadata: Metadata = {
  title: "Super administración · Tarifas",
  robots: { index: false, follow: false },
};

/**
 * Tarifas — lo que paga el cliente por cada servicio, además del importe de
 * la operación. Las fija solo PuntoCash, para toda la red.
 *
 * Una fila por servicio disponible, con lo que dice de su tarifa. Que el cambio
 * de moneda y las remesas no la llevan no se edita: es cómo funcionan esos
 * servicios. Los giros llevan una por moneda, que se gobierna en su pantalla.
 */
export default async function SuperAdminTarifasPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const disponibles = WORKER_SERVICES.filter((s) => s.status === "available");
  const monedasConGiro = tarifasDeGiro().length;

  return (
    <>
      <PageHeader
        title="Tarifas"
        description="Lo que paga el cliente por cada servicio, además del importe de la operación. Las fija PuntoCash para toda la red; las sedes no las cambian."
      />

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
                ) : (
                  <>
                    <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-2 text-body-sm sm:grid-cols-[auto_1fr] sm:items-center">
                      <dt className="text-text-secondary">{tarifa.operacion}</dt>
                      <dd className="text-text-primary">
                        Por tramos de importe ·{" "}
                        {monedasConGiro === 0
                          ? "en ninguna moneda"
                          : monedasConGiro === 1
                            ? "en 1 moneda"
                            : `en ${monedasConGiro} monedas`}
                        . La paga el remitente.
                      </dd>
                      <dt className="text-text-secondary">{tarifa.sinTarifa}</dt>
                      <dd>
                        <Badge variant="neutral">Sin tarifa</Badge>
                      </dd>
                    </dl>
                    <Button variant="secondary" asChild className="self-start xl:self-center">
                      <Link href="/super-admin/tarifas/giros">
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
        Los servicios que todavía no están disponibles dirán si llevan tarifa cuando se definan.
      </p>
    </>
  );
}
