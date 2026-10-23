import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, History, Megaphone, Plus } from "lucide-react";
import { diaEnCuba } from "@/features/network/jornadas";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { cn } from "@/lib/utils";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import {
  estadoDe,
  hoyEnCuba,
  MAX_EN_ROTACION,
  type EstadoPromocion,
} from "@/features/network/promotions";
import { redEnAlcance, type PromocionVisible } from "@/features/network/scoped-reads";
import { vigencia, fecha } from "./formato";

export const metadata: Metadata = {
  title: "Administración de sede · Promociones",
  robots: { index: false, follow: false },
};

/**
 * Promociones — **FR-AD-PROM-1** a **FR-AD-PROM-3**, **FR-AD-PROM-6**.
 *
 * Las de la empresa y las de PuntoCash, en tres pestañas por estado. El estado
 * se calcula con la fecha de hoy: nadie tiene que mover una promoción de
 * pestaña cuando empieza o termina. El selector de alcance reduce la lista a
 * las que se muestran en esa sede (**FR-AD-SCOPE-4**).
 */

type Pestana = "vigentes" | "programadas" | "vencidas";

const PESTANAS: readonly { id: Pestana; estado: EstadoPromocion; label: string; icon: typeof Megaphone }[] = [
  { id: "vigentes", estado: "vigente", label: "Vigentes", icon: Megaphone },
  { id: "programadas", estado: "programada", label: "Programadas", icon: CalendarClock },
  { id: "vencidas", estado: "vencida", label: "Vencidas", icon: History },
];

interface Fila {
  id: string;
  titulo: string;
  sedes: string;
  vigencia: string;
  propia: boolean;
  retirada: string | null;
}

export default async function AdminPromocionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pestana?: string; guardada?: string; retirada?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { pestana, guardada, retirada } = await searchParams;
  const activa = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0]!;

  const hoy = hoyEnCuba();
  const sedes = sedesVisibles(session);
  const idsVisibles = sedes.map((s) => s.id);
  const nombre = (id: string) => session.sedes.find((s) => s.id === id)?.name ?? id;
  const red = redEnAlcance(session.scope);

  const visibles = red
    .promociones()
    .map((v) => ({ ...v, sedesEnAlcance: v.sedesEnAlcance.filter((s) => idsVisibles.includes(s)) }))
    .filter((v) => v.sedesEnAlcance.length > 0);

  const porEstado = (estado: EstadoPromocion) => visibles.filter((v) => estadoDe(v.promo, hoy) === estado);

  const filas: Fila[] = porEstado(activa.estado)
    .sort((a, b) =>
      /* FR-AD-PROM-2: las vencidas, de la que terminó más tarde a la que antes;
         una retirada terminó el día en que se retiró, no en su fecha de fin. */
      activa.estado === "vencida" ? finReal(b.promo).localeCompare(finReal(a.promo)) : a.promo.desde.localeCompare(b.promo.desde),
    )
    .map((v) => ({
      id: v.promo.id,
      titulo: v.promo.titulo,
      sedes: textoSedes(v, session.sedes.length, nombre),
      vigencia: vigencia(v.promo.desde, v.promo.hasta),
      propia: v.propia,
      retirada: v.promo.retirada ? fecha(diaEnCuba(v.promo.retirada.at)) : null,
    }));

  /* **FR-AD-PROM-8**, mirado desde hoy: una sede con más de cuatro en pantalla. */
  const saturadas = sedes
    .map((sede) => ({
      sede,
      n: porEstado("vigente").filter((v) => v.sedesEnAlcance.includes(sede.id)).length,
    }))
    .filter((x) => x.n > MAX_EN_ROTACION);

  const recienGuardada = guardada ? red.promocion(guardada) : null;

  const columnas: ResponsiveColumn<Fila>[] = [
    {
      key: "titulo",
      header: "Promoción",
      cell: (f) => <TituloEnlace fila={f} />,
      hiddenOnCard: true,
    },
    { key: "sedes", header: "Sedes", cell: (f) => <span className="text-text-secondary">{f.sedes}</span> },
    {
      key: "vigencia",
      header: "Fechas",
      cell: (f) => <span className="pc-numeric text-text-secondary lg:whitespace-nowrap">{f.vigencia}</span>,
    },
    {
      key: "origen",
      header: "Publica",
      cell: (f) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          {f.propia ? <Badge variant="neutral">Tu empresa</Badge> : <Badge variant="info">PuntoCash</Badge>}
          {f.retirada ? <Badge variant="neutral">Retirada el {f.retirada}</Badge> : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Promociones"
        description="Lo que cada sucursal anuncia en su pantalla informativa."
        actions={
          <Button asChild>
            <Link href="/admin/promociones/nueva">
              <Plus aria-hidden="true" />
              Nueva promoción
            </Link>
          </Button>
        }
      />

      {recienGuardada ? (
        <Alert variant="success" title="Promoción guardada" className="mb-8">
          {estadoDe(recienGuardada.promo, hoy) === "vigente"
            ? "Ya está en la pantalla informativa de sus sedes."
            : `Empezará a verse en la pantalla informativa de sus sedes el ${fecha(recienGuardada.promo.desde)}.`}
        </Alert>
      ) : null}
      {retirada ? (
        <Alert variant="success" title="Promoción retirada" className="mb-8">
          Ya no se muestra en ninguna pantalla. Queda aquí, en Vencidas.
        </Alert>
      ) : null}

      {saturadas.length > 0 ? (
        <Alert variant="warning" title="Demasiadas promociones en pantalla" className="mb-8">
          {saturadas.map((x) => (
            <p key={x.sede.id}>
              {x.sede.name} tiene {x.n} promociones en pantalla a la vez.
            </p>
          ))}
          <p className="mt-1">
            Cada una ocupa su propia pantalla durante 12 segundos: con más de {MAX_EN_ROTACION}, un
            cliente que espera no llega a verlas todas.
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
                  href={(p.id === "vigentes" ? "/admin/promociones" : `/admin/promociones?pestana=${p.id}`) as Route}
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

const VACIO: Record<Pestana, string> = {
  vigentes: "Ninguna de tus sedes anuncia hoy ninguna promoción.",
  programadas: "No hay ninguna promoción programada para más adelante.",
  vencidas: "Todavía no ha terminado ninguna promoción.",
};

function TituloEnlace({ fila }: { fila: Fila }): React.JSX.Element {
  return (
    <Link
      href={`/admin/promociones/${fila.id}` as Route}
      className="font-semibold text-text-primary underline-offset-4 hover:underline"
    >
      {fila.titulo}
    </Link>
  );
}

/** Las sedes donde se ve, dentro del alcance. «Todas tus sedes» si son todas. */
function textoSedes(v: PromocionVisible, totalAlcance: number, nombre: (id: string) => string): string {
  if (totalAlcance > 1 && v.sedesEnAlcance.length === totalAlcance) return "Todas tus sedes";
  return v.sedesEnAlcance.map(nombre).join(", ");
}

/** El día en que de verdad dejó de verse: el de su retirada, o su fecha de fin. */
function finReal(p: { hasta: string; retirada?: { at: string } }): string {
  return p.retirada ? diaEnCuba(p.retirada.at) : p.hasta;
}
