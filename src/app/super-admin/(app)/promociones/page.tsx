import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, History, Megaphone, Plus } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { cn } from "@/lib/utils";
import { fecha, vigencia } from "@/app/admin/(app)/promociones/formato";
import { diaEnCuba } from "@/features/network/jornadas";
import { estadoDe, hoyEnCuba, MAX_EN_ROTACION, promocionPorId, type EstadoPromocion } from "@/features/network/promotions";
import { promocionesDeRed, sedesParaLista, sedesSaturadasHoy } from "@/features/super-admin/promociones";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

export const metadata: Metadata = {
  title: "Super administración · Promociones",
  robots: { index: false, follow: false },
};

/**
 * Promociones de red — **FR-SA-PROM-1**, **FR-SA-PROM-5**, **FR-SA-PROM-6**.
 *
 * Las que PuntoCash publica, en tres pestañas por estado calculado con la
 * fecha de hoy. Las de los operadores no están en la lista —no son de esta
 * consola—, pero cuentan: el aviso de arriba suma las dos para decir qué salas
 * ya pasan de cuatro promociones a la vez, y de quién es el exceso.
 */

type Pestana = "vigentes" | "programadas" | "vencidas";

const PESTANAS: readonly { id: Pestana; estado: EstadoPromocion; label: string; icon: typeof Megaphone }[] = [
  { id: "vigentes", estado: "vigente", label: "Vigentes", icon: Megaphone },
  { id: "programadas", estado: "programada", label: "Programadas", icon: CalendarClock },
  { id: "vencidas", estado: "vencida", label: "Vencidas", icon: History },
];

const VACIO: Record<Pestana, string> = {
  vigentes: "PuntoCash no anuncia hoy ninguna promoción de red.",
  programadas: "No hay ninguna promoción de red programada para más adelante.",
  vencidas: "Todavía no ha terminado ninguna promoción de red.",
};

interface Fila {
  id: string;
  titulo: string;
  dondeSeMuestra: string;
  vigencia: string;
  publicadaPor: string;
  retirada: string | null;
}

export default async function SuperAdminPromocionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pestana?: string; guardada?: string; retirada?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { pestana, guardada, retirada } = await searchParams;
  const activa = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0]!;

  const hoy = hoyEnCuba();
  const todas = promocionesDeRed();
  const porEstado = (estado: EstadoPromocion) => todas.filter((p) => estadoDe(p, hoy) === estado);

  const filas: Fila[] = porEstado(activa.estado)
    .sort((a, b) =>
      /* Las vencidas, de la que terminó más tarde a la que antes; una retirada
         terminó el día en que se retiró, no en su fecha de fin. */
      activa.estado === "vencida" ? finReal(b).localeCompare(finReal(a)) : a.desde.localeCompare(b.desde),
    )
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      dondeSeMuestra: sedesParaLista(p),
      vigencia: vigencia(p.desde, p.hasta),
      publicadaPor: p.creadaPor,
      retirada: p.retirada ? fecha(diaEnCuba(p.retirada.at)) : null,
    }));

  const saturadas = sedesSaturadasHoy();
  const recienGuardada = guardada ? promocionPorId(guardada) : null;

  const columnas: ResponsiveColumn<Fila>[] = [
    { key: "titulo", header: "Promoción", cell: (f) => <TituloEnlace fila={f} />, hiddenOnCard: true },
    {
      key: "donde",
      header: "Dónde se muestra",
      /* Una lista de sedes no manda sobre el ancho de la tabla: se recorta con
         el valor entero al pasar el ratón, y debajo de xl son tarjetas. */
      cell: (f) => (
        <span className="block text-text-secondary xl:max-w-64 xl:truncate" title={f.dondeSeMuestra}>
          {f.dondeSeMuestra}
        </span>
      ),
    },
    {
      key: "vigencia",
      header: "Fechas",
      cell: (f) => <span className="pc-numeric text-text-secondary lg:whitespace-nowrap">{f.vigencia}</span>,
    },
    {
      key: "publica",
      header: "Publicada por",
      cell: (f) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="text-text-secondary">{f.publicadaPor}</span>
          {f.retirada ? <Badge variant="neutral">Retirada el {f.retirada}</Badge> : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Promociones"
        description="Lo que PuntoCash anuncia en la pantalla informativa de sus sedes."
        actions={
          <Button asChild>
            <Link href="/super-admin/promociones/nueva">
              <Plus aria-hidden="true" />
              Nueva promoción
            </Link>
          </Button>
        }
      />

      {recienGuardada ? (
        <Alert variant="success" title="Promoción guardada" className="mb-8">
          {estadoDe(recienGuardada, hoy) === "vigente"
            ? "Ya está en la pantalla informativa de las sedes a las que llega."
            : `Empezará a verse en la pantalla informativa de las sedes a las que llega el ${fecha(recienGuardada.desde)}.`}
        </Alert>
      ) : null}
      {retirada ? (
        <Alert variant="success" title="Promoción retirada" className="mb-8">
          Ya no se muestra en ninguna pantalla. Queda aquí, en Vencidas.
        </Alert>
      ) : null}

      {saturadas.length > 0 ? (
        <Alert variant="warning" title="Demasiadas promociones en pantalla" className="mb-8">
          {saturadas.map((s) => (
            <p key={s.id}>
              {s.nombre} tiene {s.total} promociones en pantalla a la vez ({s.composicion}).
            </p>
          ))}
          <p className="mt-1">
            Cada una ocupa su propia pantalla durante 12 segundos: con más de {MAX_EN_ROTACION}, un cliente que espera
            no llega a verlas todas. Las de un operador solo puede retirarlas su administrador.
          </p>
        </Alert>
      ) : null}

      <nav aria-label="Estado de las promociones" className="mb-8">
        <ul className="flex flex-wrap gap-2">
          {PESTANAS.map((p) => {
            const Icon = p.icon;
            const actual = p.id === activa.id;
            return (
              <li key={p.id}>
                <Link
                  href={(p.id === "vigentes" ? "/super-admin/promociones" : `/super-admin/promociones?pestana=${p.id}`) as Route}
                  aria-current={actual ? "page" : undefined}
                  className={cn(
                    "inline-flex h-control items-center gap-2 rounded-control border px-4 text-label font-semibold",
                    "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                    actual
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {p.label}
                  <span className="pc-numeric opacity-80">{porEstado(p.estado).length}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Section title={activa.label}>
        <ResponsiveTable
          rows={filas}
          columns={columnas}
          rowKey={(f) => f.id}
          cardTitle={(f) => <TituloEnlace fila={f} />}
          empty={<p className="text-body text-text-secondary">{VACIO[activa.id]}</p>}
        />
      </Section>
    </>
  );
}

function TituloEnlace({ fila }: { fila: Fila }): React.JSX.Element {
  return (
    <Link
      href={`/super-admin/promociones/${fila.id}` as Route}
      className="font-semibold text-text-primary underline-offset-4 hover:underline"
    >
      {fila.titulo}
    </Link>
  );
}

/** El día en que de verdad dejó de verse: el de su retirada, o su fecha de fin. */
function finReal(p: { hasta: string; retirada?: { at: string } | undefined }): string {
  return p.retirada ? diaEnCuba(p.retirada.at) : p.hasta;
}
