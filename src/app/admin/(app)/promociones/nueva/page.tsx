import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import {
  estadoDe,
  hoyEnCuba,
  IMAGEN_MAX_BYTES,
  MAX_EN_ROTACION,
  TEXTO_MAX,
  TITULO_MAX,
} from "@/features/network/promotions";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { PromocionForm } from "../promocion-form";

export const metadata: Metadata = {
  title: "Administración de sede · Nueva promoción",
  robots: { index: false, follow: false },
};

/** Alta de una promoción — **FR-AD-PROM-4**. */
export default async function AdminNuevaPromocionPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const hoy = hoyEnCuba();
  const sedes = session.sedes.filter((s) => s.status !== "cerrada").map((s) => ({ id: s.id, name: s.name }));
  /* La sede filtrada en la cabecera, o la única, ya viene marcada. */
  const preelegidas = session.selected ? [session.selected.id] : sedes.length === 1 ? [sedes[0]!.id] : [];

  const otras = redEnAlcance(session.scope)
    .promociones()
    .filter((v) => estadoDe(v.promo, hoy) !== "vencida")
    .map((v) => ({ id: v.promo.id, sedes: v.sedesEnAlcance, desde: v.promo.desde, hasta: v.promo.hasta }));

  return (
    <>
      <PageHeader
        title="Nueva promoción"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/promociones">
              <ArrowLeft aria-hidden="true" />
              Volver a Promociones
            </Link>
          </Button>
        }
      />
      <PromocionForm
        datos={{ titulo: "", texto: "", sedes: preelegidas, desde: hoy, hasta: "" }}
        sedes={sedes}
        otras={otras}
        hoy={hoy}
        tituloMax={TITULO_MAX}
        textoMax={TEXTO_MAX}
        maxEnRotacion={MAX_EN_ROTACION}
        maxImagenBytes={IMAGEN_MAX_BYTES}
      />
    </>
  );
}
