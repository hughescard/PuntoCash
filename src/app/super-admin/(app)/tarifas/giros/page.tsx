import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { CATALOGO_MONEDAS } from "@/features/network/currencies";
import { inicioDeTramo, menorDenominacion, tarifaDeGiro } from "@/features/network/tarifas";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { fechaCorta } from "@/app/admin/(app)/jornadas/formato";
import { TarifasDeGiros, type MonedaConTarifa, type MonedaSinTarifa } from "./tarifas-de-giros";

export const metadata: Metadata = {
  title: "Super administración · Tarifas de giros",
  robots: { index: false, follow: false },
};

/**
 * Tarifas de giros — la política de cada moneda: giro mínimo y tramos.
 *
 * Arriba, las monedas en las que se envían giros, cada una con su tabla. Abajo,
 * las que no tienen tarifa: en esas no se envían giros hasta que se defina.
 * Las retiradas del catálogo sin tarifa no aparecen: no se abre nada en ellas.
 */
export default async function SuperAdminTarifasDeGirosPage({
  searchParams,
}: {
  searchParams: Promise<{ guardada?: string; nueva?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const { guardada, nueva } = await searchParams;

  const con: MonedaConTarifa[] = [];
  const sin: MonedaSinTarifa[] = [];
  for (const m of CATALOGO_MONEDAS) {
    const t = tarifaDeGiro(m.code);
    if (t) {
      con.push({
        code: m.code,
        nombre: m.name,
        retirada: Boolean(m.retiradaEl),
        minimo: t.minimo,
        tramos: t.tramos.map((x, i) => ({ ...x, ...inicioDeTramo(t, i) })),
        actualizadoEl: fechaCorta(t.updatedAt),
        actualizadoPor: t.updatedBy,
      });
    } else if (!m.retiradaEl) {
      sin.push({ code: m.code, nombre: m.name, sinDenominaciones: menorDenominacion(m.code) === null });
    }
  }
  const recienGuardada = guardada ? con.find((c) => c.code === guardada) ?? null : null;

  return (
    <>
      <PageHeader
        title="Tarifas de giros"
        description="La paga el remitente al enviar, según lo que recibe el beneficiario. Cobrar un giro no lleva tarifa."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/tarifas">
              <ArrowLeft aria-hidden="true" />
              Volver a Tarifas
            </Link>
          </Button>
        }
      />

      {recienGuardada ? (
        <Alert variant="success" title={nueva ? "Tarifa definida" : "Tarifa guardada"} className="mb-8">
          {nueva
            ? `Ya se pueden enviar giros en ${recienGuardada.code} en todas las sedes que tienen Giros.`
            : `Los giros en ${recienGuardada.code} que se envíen desde ahora pagan la tarifa nueva. Los ya enviados no cambian.`}
        </Alert>
      ) : null}

      <TarifasDeGiros con={con} sin={sin} />
    </>
  );
}
