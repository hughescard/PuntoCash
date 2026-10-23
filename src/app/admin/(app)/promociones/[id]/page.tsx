import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { diaEnCuba } from "@/features/network/jornadas";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import {
  estadoDe,
  hoyEnCuba,
  IMAGEN_MAX_BYTES,
  MAX_EN_ROTACION,
  TEXTO_MAX,
  TITULO_MAX,
  urlDeImagen,
} from "@/features/network/promotions";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { PromocionForm, VistaPrevia } from "../promocion-form";
import { RetirarPromocion } from "./retirar-promocion";
import { fecha, vigencia } from "../formato";

export const metadata: Metadata = {
  title: "Administración de sede · Promoción",
  robots: { index: false, follow: false },
};

/**
 * Una promoción — **FR-AD-PROM-3**, **FR-AD-PROM-9**.
 *
 * Si es de la empresa y no ha terminado, la pantalla es su edición, con
 * **Retirar** arriba. Si es de PuntoCash, o ya terminó, se lee y se dice por
 * qué no se puede tocar, en lugar de ofrecer controles que fallan. Una
 * promoción de otra empresa responde como inexistente (**FR-AD-NAV-3**).
 */
export default async function AdminPromocionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const red = redEnAlcance(session.scope);
  const v = red.promocion(id);
  if (!v) notFound();

  const hoy = hoyEnCuba();
  const estado = estadoDe(v.promo, hoy);
  const editable = v.propia && estado !== "vencida";
  const nombre = (sedeId: string) => session.sedes.find((s) => s.id === sedeId)?.name ?? sedeId;

  const volver = (
    <Button variant="secondary" asChild>
      <Link href="/admin/promociones">
        <ArrowLeft aria-hidden="true" />
        Volver a Promociones
      </Link>
    </Button>
  );

  if (editable) {
    const sedes = session.sedes.filter((s) => s.status !== "cerrada").map((s) => ({ id: s.id, name: s.name }));
    const otras = red
      .promociones()
      .filter((o) => o.promo.id !== id && estadoDe(o.promo, hoy) !== "vencida")
      .map((o) => ({ id: o.promo.id, sedes: o.sedesEnAlcance, desde: o.promo.desde, hasta: o.promo.hasta }));
    return (
      <>
        <PageHeader
          title="Editar promoción"
          description={
            estado === "vigente"
              ? "Está en pantalla. Lo que guardes se verá en sus sedes enseguida."
              : `Programada: empieza a verse el ${fecha(v.promo.desde)}.`
          }
          actions={
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <RetirarPromocion
                id={v.promo.id}
                titulo={v.promo.titulo}
                vigente={estado === "vigente"}
                sedes={v.sedesEnAlcance.map(nombre)}
              />
              {volver}
            </div>
          }
        />
        <PromocionForm
          datos={{
            id: v.promo.id,
            titulo: v.promo.titulo,
            texto: v.promo.texto,
            sedes: v.sedesEnAlcance,
            desde: v.promo.desde,
            hasta: v.promo.hasta,
            imagenUrl: urlDeImagen(v.promo),
          }}
          sedes={sedes}
          otras={otras}
          hoy={hoy}
          tituloMax={TITULO_MAX}
          textoMax={TEXTO_MAX}
          maxEnRotacion={MAX_EN_ROTACION}
          maxImagenBytes={IMAGEN_MAX_BYTES}
          inicioFijo={estado === "vigente"}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={v.promo.titulo} actions={volver} />

      {!v.propia ? (
        <Alert variant="info" title="Esta promoción la publica PuntoCash" className="mb-8">
          Se muestra en tus sedes y no puedes cambiarla ni retirarla.
        </Alert>
      ) : (
        <Alert variant="info" title={v.promo.retirada ? "Esta promoción se retiró" : "Esta promoción ya terminó"} className="mb-8">
          {v.promo.retirada
            ? `La retiró ${v.promo.retirada.por} el ${fecha(diaEnCuba(v.promo.retirada.at))}. `
            : null}
          Para volver a anunciarla, crea una nueva.
        </Alert>
      )}

      <Card className="max-w-form-max">
        <CardContent className="flex flex-col gap-5 pt-6">
          <Dato etiqueta="Texto" valor={v.promo.texto} />
          <Dato etiqueta="Sedes" valor={v.sedesEnAlcance.map(nombre).join(", ")} />
          <Dato etiqueta="Fechas" valor={vigencia(v.promo.desde, v.promo.hasta)} />
          <Dato etiqueta="Publicada por" valor={v.promo.creadaPor} />
          <div>
            <p className="flex items-center gap-2 text-caption uppercase tracking-wide text-text-secondary">
              <Info className="size-4" aria-hidden="true" />
              Así se ve en la pantalla de la sucursal
            </p>
            <VistaPrevia titulo={v.promo.titulo} texto={v.promo.texto} imagen={urlDeImagen(v.promo)} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</p>
      <p className="mt-1 text-body text-text-primary">{valor}</p>
    </div>
  );
}
