import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { monedaDelCatalogo } from "@/features/network/currencies";
import { menorDenominacion, tarifaDeGiro } from "@/features/network/tarifas";
import { MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { EditorDeTarifa } from "./editor-de-tarifa";

export const metadata: Metadata = {
  title: "Super administración · Tarifa de giros",
  robots: { index: false, follow: false },
};

/**
 * Definir o cambiar la tarifa de giros de una moneda: el giro mínimo y los
 * tramos. Es una pantalla y no un diálogo porque la tabla de tramos crece y en
 * el teléfono no cabe en una ventana.
 *
 * Una moneda que no admite tarifa (fuera del catálogo, retirada sin tarifa, o
 * sin ninguna denominación en circulación) responde como inexistente: desde
 * Tarifas de giros no hay enlace a ella.
 */
export default async function SuperAdminTarifaDeMonedaPage({ params }: { params: Promise<{ moneda: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const { moneda: code } = await params;

  const moneda = monedaDelCatalogo(code);
  const tarifa = tarifaDeGiro(code);
  const menor = menorDenominacion(code);
  if (!moneda || (moneda.retiradaEl && !tarifa) || menor === null) notFound();

  return (
    <>
      <PageHeader
        title={`${tarifa ? "Cambiar" : "Definir"} la tarifa de giros en ${code}`}
        description={`${moneda.name}. Se aplica a lo que recibe el beneficiario y la paga el remitente al enviar.`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/tarifas/giros">
              <ArrowLeft aria-hidden="true" />
              Volver a Tarifas de giros
            </Link>
          </Button>
        }
      />
      <EditorDeTarifa
        moneda={code}
        nombre={moneda.name}
        menor={menor}
        motivoMin={MOTIVO_MIN_LENGTH}
        inicial={tarifa ? { minimo: tarifa.minimo, tramos: tarifa.tramos } : null}
      />
    </>
  );
}
