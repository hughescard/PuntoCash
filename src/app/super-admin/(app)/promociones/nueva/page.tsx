import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { hoyEnCuba, IMAGEN_MAX_BYTES, MAX_EN_ROTACION, TEXTO_MAX, TITULO_MAX } from "@/features/network/promotions";
import { promocionesQueCuentan, sedesParaElegir } from "@/features/super-admin/promociones";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { PromocionRedForm } from "../promocion-red-form";

export const metadata: Metadata = {
  title: "Super administración · Nueva promoción de red",
  robots: { index: false, follow: false },
};

/** Alta de una promoción de red — **FR-SA-PROM-2**. */
export default async function SuperAdminNuevaPromocionPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const hoy = hoyEnCuba();
  return (
    <>
      <PageHeader
        title="Nueva promoción de red"
        description="Lo que PuntoCash anuncia en la pantalla informativa de sus sedes."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/promociones">
              <ArrowLeft aria-hidden="true" />
              Volver a Promociones
            </Link>
          </Button>
        }
      />
      <PromocionRedForm
        datos={{ titulo: "", texto: "", destino: "red", sedes: [], desde: hoy, hasta: "" }}
        sedes={sedesParaElegir()}
        otras={promocionesQueCuentan()}
        hoy={hoy}
        tituloMax={TITULO_MAX}
        textoMax={TEXTO_MAX}
        maxEnRotacion={MAX_EN_ROTACION}
        maxImagenBytes={IMAGEN_MAX_BYTES}
      />
    </>
  );
}
