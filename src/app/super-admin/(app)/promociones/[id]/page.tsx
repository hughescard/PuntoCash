import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { fecha, vigencia } from "@/app/admin/(app)/promociones/formato";
import { VistaPrevia } from "@/app/admin/(app)/promociones/promocion-form";
import { diaEnCuba } from "@/features/network/jornadas";
import {
  estadoDe,
  hoyEnCuba,
  IMAGEN_MAX_BYTES,
  MAX_EN_ROTACION,
  promocionPorId,
  TEXTO_MAX,
  TITULO_MAX,
  urlDeImagen,
} from "@/features/network/promotions";
import {
  promocionesQueCuentan,
  quienPublica,
  resumenDeSedes,
  sedesDePromocion,
  sedesParaElegir,
} from "@/features/super-admin/promociones";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { PromocionRedForm } from "../promocion-red-form";
import { RetirarPromocionRed } from "./retirar-promocion-red";

export const metadata: Metadata = {
  title: "Super administración · Promoción",
  robots: { index: false, follow: false },
};

/**
 * Una promoción — **FR-SA-PROM-3**, **FR-SA-PROM-4**.
 *
 * Si es de red y no ha terminado, la pantalla es su edición, con **Retirar**
 * arriba. Si la publica un operador, o ya terminó, se lee y se dice por qué no
 * se puede tocar, en lugar de ofrecer controles que fallan: PuntoCash cuenta
 * con las de los operadores, pero quien las gobierna es su administrador.
 */
export default async function SuperAdminPromocionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id } = await params;
  const promo = promocionPorId(decodeURIComponent(id));
  if (!promo) notFound();

  const hoy = hoyEnCuba();
  const estado = estadoDe(promo, hoy);
  const editable = promo.origen === "red" && estado !== "vencida";

  const volver = (
    <Button variant="secondary" asChild>
      <Link href="/super-admin/promociones">
        <ArrowLeft aria-hidden="true" />
        Volver a Promociones
      </Link>
    </Button>
  );

  if (editable) {
    const elegibles = sedesParaElegir();
    const ids = new Set(elegibles.map((s) => s.id));
    return (
      <>
        <PageHeader
          title="Editar promoción de red"
          description={
            estado === "vigente"
              ? "Está en pantalla. Lo que guardes se verá enseguida en las sedes a las que llega."
              : `Programada: empieza a verse el ${fecha(promo.desde)}.`
          }
          actions={
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <RetirarPromocionRed
                id={promo.id}
                titulo={promo.titulo}
                vigente={estado === "vigente"}
                llegaA={promo.sedes === "red" ? "toda la red" : resumenDeSedes(promo)}
              />
              {volver}
            </div>
          }
        />
        <PromocionRedForm
          datos={{
            id: promo.id,
            titulo: promo.titulo,
            texto: promo.texto,
            destino: promo.sedes === "red" ? "red" : "sedes",
            sedes: promo.sedes === "red" ? [] : promo.sedes.filter((s) => ids.has(s)),
            desde: promo.desde,
            hasta: promo.hasta,
            imagenUrl: urlDeImagen(promo),
          }}
          sedes={elegibles}
          otras={promocionesQueCuentan(promo.id)}
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

  const publica = quienPublica(promo);
  return (
    <>
      <PageHeader title={promo.titulo} actions={volver} />

      {promo.origen === "operador" ? (
        <Alert variant="info" title={`Esta promoción la publica ${publica.texto}`} className="mb-8">
          PuntoCash la ve porque cuenta en la pantalla de cada sala, pero no la cambia ni la retira: la gobierna el
          administrador de ese operador.{" "}
          {publica.operatorId ? (
            <Link href={`/super-admin/operadores/${publica.operatorId}` as Route} className="underline underline-offset-4">
              Ver el operador
            </Link>
          ) : null}
        </Alert>
      ) : (
        <Alert variant="info" title={promo.retirada ? "Esta promoción se retiró" : "Esta promoción ya terminó"} className="mb-8">
          {promo.retirada ? `La retiró ${promo.retirada.por} el ${fecha(diaEnCuba(promo.retirada.at))}. ` : null}
          Para volver a anunciarla, crea una nueva.
        </Alert>
      )}

      <Card className="max-w-form-max">
        <CardContent className="flex flex-col gap-5 pt-6">
          <Dato etiqueta="Texto" valor={promo.texto} />
          <Dato etiqueta="Dónde se muestra" valor={sedesDePromocion(promo)} />
          <Dato etiqueta="Fechas" valor={vigencia(promo.desde, promo.hasta)} />
          <Dato etiqueta="Publicada por" valor={promo.origen === "red" ? promo.creadaPor : publica.texto} />
          <div>
            <p className="flex items-center gap-2 text-caption uppercase tracking-wide text-text-secondary">
              <Info className="size-4" aria-hidden="true" />
              Así se ve en la pantalla de la sucursal
            </p>
            <VistaPrevia titulo={promo.titulo} texto={promo.texto} imagen={urlDeImagen(promo)} />
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
