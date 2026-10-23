import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, FileSpreadsheet, FileText, Layers, Store, UserRound } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { sumarDias } from "@/features/network/promotions";
import { calcularReporte, diaLargo, type Corte } from "./calculo";
import { TablaReporte } from "./tabla-reporte";
import { GraficoPorDia } from "./grafico-por-dia";
import { FormularioPeriodo } from "./formulario-periodo";

export const metadata: Metadata = {
  title: "Administración de sede · Reportes",
  robots: { index: false, follow: false },
};

const CORTES: readonly { value: Corte; label: string; icon: typeof Store }[] = [
  { value: "sede", label: "Por sede", icon: Store },
  { value: "servicio", label: "Por servicio", icon: Layers },
  { value: "trabajador", label: "Por trabajador", icon: UserRound },
  { value: "dia", label: "Por día", icon: CalendarDays },
];

/**
 * Reportes — **FR-AD-REP-1** a **FR-AD-REP-13**.
 *
 * El volumen de las sedes que deja ver la cabecera, en un corte a la vez y en
 * un rango de fechas. Todo se calcula aquí, en el servidor, con la definición
 * de volumen del dominio (`volumen.ts`): por moneda, en bruto, cada operación
 * una vez y solo las completadas. El corte, el rango y el trabajador viajan en
 * la dirección, así que un reporte se puede guardar o compartir como enlace y
 * funciona antes de hidratar. Sin comisiones ni márgenes **[A8]**. Se exporta
 * a Excel y a PDF con los cuatro cortes (**FR-AD-REP-7**, **FR-AD-REP-13**).
 */
export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string; desde?: string; hasta?: string; trabajador?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const reporte = calcularReporte(session, params);
  const { corte, hoy, desde, hasta, recortado, varias, trabajadores, trabajador, monedas, total, divisas } = reporte;
  const filas = reporte.cortes[corte];
  /* Todas las tarjetas del total con el mismo tamaño de cifra: el que deja caber la más larga. */
  const largoMayor = Math.max(String(total.operaciones).length, ...monedas.map((m) => formatAmount(total.volumen[m] ?? 0).length));
  const hayOperaciones = total.operaciones > 0;

  const exportar = (formato: "xlsx" | "pdf") => {
    const q = new URLSearchParams({ desde, hasta });
    if (trabajador) q.set("trabajador", trabajador.id);
    return `/admin/reportes/exportar/${formato}?${q.toString()}`;
  };

  const enlace = (cambios: Record<string, string | undefined>): Route => {
    const q = new URLSearchParams();
    const todo = { corte, desde, hasta, trabajador: trabajador?.id, ...cambios };
    /* Agrupar por trabajador no lleva filtro de trabajador. */
    if (todo.corte === "trabajador") todo.trabajador = undefined;
    for (const [k, v] of Object.entries(todo)) if (v) q.set(k, v);
    return `/admin/reportes?${q.toString()}` as Route;
  };

  const rangos = [
    { label: "Hoy", desde: hoy, hasta: hoy },
    { label: "Últimos 7 días", desde: sumarDias(hoy, -6), hasta: hoy },
    { label: "Últimos 30 días", desde: sumarDias(hoy, -29), hasta: hoy },
    { label: "Mes en curso", desde: `${hoy.slice(0, 8)}01`, hasta: hoy },
  ];

  return (
    <>
      <PageHeader
        title="Reportes"
        description="El volumen de tus sedes: lo operado en cada moneda, contando cada operación completada una vez."
        actions={
          /* FR-AD-REP-7: los cortes del periodo y el trabajador que hay en pantalla. Enlaces
             corrientes y no `Link`: un archivo no se precarga. */
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <a href={exportar("xlsx")} download>
                <FileSpreadsheet aria-hidden="true" />
                Exportar a Excel
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <a href={exportar("pdf")} download>
                <FileText aria-hidden="true" />
                Exportar a PDF
              </a>
            </Button>
          </div>
        }
      />

      {/* Dos preguntas distintas, cada una con su nombre: qué es cada fila, y qué operaciones cuentan. */}
      <nav aria-labelledby="agrupar-por" className="mb-8">
        <h2 id="agrupar-por" className="mb-3 text-label font-semibold text-text-primary">
          Agrupar por
        </h2>
        <ul className="flex flex-wrap gap-2">
          {CORTES.map((c) => (
            <li key={c.value}>
              <Link
                href={enlace({ corte: c.value })}
                aria-current={corte === c.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-control items-center gap-2 rounded-control border px-4 text-label font-semibold",
                  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
                  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                  corte === c.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                <c.icon className="size-[18px] shrink-0" aria-hidden="true" />
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* FR-AD-REP-2: el rango, con sus accesos rápidos. Un formulario corriente: funciona sin hidratar. */}
      <section aria-labelledby="que-operaciones" className="mb-8 flex flex-col gap-4">
        <h2 id="que-operaciones" className="text-label font-semibold text-text-primary">
          Qué operaciones
        </h2>
        <ul className="flex flex-wrap gap-2">
          {rangos.map((r) => {
            const activo = r.desde === desde && r.hasta === hasta;
            return (
              <li key={r.label}>
                <Link
                  href={enlace({ desde: r.desde, hasta: r.hasta })}
                  aria-current={activo ? "true" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-4 text-body-sm font-semibold",
                    "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                    activo
                      ? "border-primary bg-primary-subtle text-text-primary"
                      : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  {r.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <FormularioPeriodo key={`${desde}-${hasta}-${trabajador?.id ?? ""}`} className={cn("grid grid-cols-2 gap-4 lg:items-end", corte === "trabajador" ? "lg:max-w-2xl" : "lg:grid-cols-[1fr_1fr_1.4fr]")}>
          <input type="hidden" name="corte" value={corte} />
          <label className="flex flex-col gap-2 text-label font-semibold text-text-primary">
            Desde
            <Input type="date" name="desde" defaultValue={desde} max={hoy} className="pc-numeric" />
          </label>
          <label className="flex flex-col gap-2 text-label font-semibold text-text-primary">
            Hasta
            <Input type="date" name="hasta" defaultValue={hasta} max={hoy} className="pc-numeric" />
          </label>
          {corte === "trabajador" ? null : (
            <label className="col-span-2 flex flex-col gap-2 text-label font-semibold text-text-primary lg:col-span-1">
              Trabajador
              <select
                name="trabajador"
                defaultValue={trabajador?.id ?? ""}
                className="h-control w-full rounded-control border border-border bg-surface px-4 text-body font-normal text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="">Todos</option>
                {trabajadores.map(({ w, sede }) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName}
                    {varias ? ` · ${sede.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </FormularioPeriodo>
      </section>

      {/* Con un trabajador elegido, todo lo de debajo es solo suyo: se dice arriba, con la salida a la vista. */}
      {trabajador ? (
        <div
          role="status"
          className="mb-8 flex flex-col gap-3 rounded-card border border-primary bg-primary-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-3 text-body text-text-primary">
            <UserRound className="size-5 shrink-0" aria-hidden="true" />
            <span>
              Solo las operaciones de <strong className="font-semibold">{trabajador.fullName}</strong>
              {varias ? <span className="text-text-secondary"> · {trabajadores.find(({ w }) => w.id === trabajador.id)!.sede.name}</span> : null}
              . {corte === "dia" ? "El total, el gráfico y la tabla" : "El total y la tabla"} son solo suyos.
            </span>
          </p>
          <Link
            href={enlace({ trabajador: "" })}
            className="shrink-0 font-semibold text-primary underline underline-offset-4"
          >
            Ver todos los trabajadores
          </Link>
        </div>
      ) : null}

      {recortado ? (
        <Alert variant="info" title="El periodo máximo es de un año" className="mb-8">
          Se muestra desde el {diaLargo(desde)} hasta el {diaLargo(hasta)}.
        </Alert>
      ) : null}

      {/* El total del periodo: operaciones y una cifra por moneda, nunca sumadas entre sí. */}
      <section aria-label="Total del periodo" className="mb-8">
        <h2 className="mb-4 text-section-title text-text-primary">
          Total del periodo
          {trabajador ? <span className="text-text-secondary"> · {trabajador.fullName}</span> : null}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-4">
          <Cifra etiqueta="Operaciones completadas" valor={String(total.operaciones)} largo={largoMayor} />
          {monedas.map((m) => (
            <Cifra key={m} etiqueta={`Volumen en ${m}`} valor={formatAmount(total.volumen[m] ?? 0)} largo={largoMayor} />
          ))}
        </div>
        {/* FR-AD-REP-11: sin operaciones se dice una vez, aquí; las tablas
            siguen enseñando cada sede, trabajador o día con cero (FR-AD-REP-4). */}
        {!hayOperaciones ? (
          <p className="mt-4 text-body text-text-secondary">No hubo ninguna operación completada en ese periodo.</p>
        ) : null}
      </section>

      {corte === "dia" && monedas.length > 0 ? (
        <GraficoPorDia key={monedas.join("-")} dias={filas} monedas={monedas} deQuien={trabajador?.fullName ?? null} />
      ) : null}

      <TablaReporte
        key={`${corte}-${desde}-${hasta}-${trabajador?.id ?? ""}`}
        filas={filas}
        columnas={monedas}
        ordenable={corte === "sede" || corte === "trabajador"}
        primera={{ sede: "Sede", servicio: "Servicio", trabajador: "Trabajador", dia: "Día" }[corte]}
        vacio="No hubo ninguna operación completada en ese periodo."
      />

      {corte === "servicio" && divisas.length > 0 ? (
        <section aria-labelledby="cambio-por-divisa" className="mt-10">
          <h2 id="cambio-por-divisa" className="text-section-title text-text-primary">
            Cambio de moneda por divisa
          </h2>
          <p className="mb-4 mt-1 text-body text-text-secondary">
            Lo comprado y lo vendido es volumen. La posición neta —comprado menos vendido— no lo es: dice cuánta
            divisa ganó o perdió la caja en el periodo.
          </p>
          <TablaReporte
            filas={divisas.map((d) => ({
              key: d.currency,
              titulo: d.currency,
              operaciones: d.operaciones,
              volumen: {
                Comprado: d.comprado,
                Vendido: d.vendido,
                Volumen: d.comprado + d.vendido,
                "Posición neta": d.comprado - d.vendido,
              },
            }))}
            columnas={["Comprado", "Vendido", "Volumen", "Posición neta"]}
            conSigno={["Posición neta"]}
            ordenable={false}
            primera="Divisa"
            vacio=""
          />
        </section>
      ) : null}
    </>
  );
}

function Cifra({ etiqueta, valor, largo }: { etiqueta: string; valor: string; largo: number }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="px-4 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</p>
        {/* Una cifra no se parte nunca en dos líneas: si las hay largas, todas bajan de tamaño. */}
        <p
          className={cn(
            "pc-numeric mt-2 whitespace-nowrap text-text-primary",
            /* En el teléfono, dos tarjetas por fila: el tamaño se ajusta a la cifra más larga del total. */
            largo > 12 ? "text-body font-semibold" : largo > 8 ? "text-card-title" : "text-section-title",
            largo > 12 ? "sm:text-section-title" : "sm:text-screen-title",
          )}
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}
