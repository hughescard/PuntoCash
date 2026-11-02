import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, FileSpreadsheet, FileText, Layers, MapPin, Store } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { sumarDias } from "@/features/network/promotions";
import { diaLargo } from "@/app/admin/(app)/reportes/calculo";
import { TablaReporte } from "@/app/admin/(app)/reportes/tabla-reporte";
import { GraficoPorDia } from "@/app/admin/(app)/reportes/grafico-por-dia";
import { FormularioPeriodo } from "@/app/admin/(app)/reportes/formulario-periodo";
import { Cifra } from "@/app/admin/(app)/reportes/cifra";
import { calcularReporteDeRed, COLUMNA_SEDES, PRIMERA_COLUMNA_RED, type CorteRed } from "./calculo";

export const metadata: Metadata = {
  title: "Super administración · Reportes",
  robots: { index: false, follow: false },
};

const CORTES: readonly { value: CorteRed; label: string; icon: typeof Store }[] = [
  { value: "operador", label: "Por operador", icon: Building2 },
  { value: "sede", label: "Por sede", icon: Store },
  { value: "servicio", label: "Por servicio", icon: Layers },
  { value: "provincia", label: "Por provincia", icon: MapPin },
  { value: "dia", label: "Por día", icon: CalendarDays },
];

/**
 * Reportes de la red — **FR-SA-REP-1** a **FR-SA-REP-9**.
 *
 * El volumen de toda la red, en un corte a la vez y en un rango de fechas. La
 * definición es la de Admin: por moneda, en bruto, cada operación completada una
 * vez, sin convertir una moneda en otra. Cada operación es del mercante que
 * administraba la sede **el día en que se hizo**. El corte por operador se
 * puede ver en total o dividido entre las sedes de cada uno, que es lo que deja
 * comparar mercantes de distinto tamaño. Sin comisiones ni márgenes **[A8]**.
 * Se exporta a Excel y a PDF con los cinco cortes; solo hay totales.
 */
export default async function SuperAdminReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ corte?: string; desde?: string; hasta?: string; por?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const params = await searchParams;
  const reporte = calcularReporteDeRed(params);
  const { corte, vista, hoy, desde, hasta, recortado, monedas, total, divisas } = reporte;
  const porSede = corte === "operador" && vista === "sede";
  const filas = porSede ? reporte.operadorPorSede : reporte.cortes[corte];
  const largoMayor = Math.max(String(total.operaciones).length, ...monedas.map((m) => formatAmount(total.volumen[m] ?? 0).length));
  const hayOperaciones = total.operaciones > 0;

  const exportar = (formato: "xlsx" | "pdf") => `/super-admin/reportes/exportar/${formato}?${new URLSearchParams({ desde, hasta }).toString()}`;

  const enlace = (cambios: Record<string, string | undefined>): Route => {
    const q = new URLSearchParams();
    const todo = { corte, desde, hasta, por: vista === "sede" ? "sede" : undefined, ...cambios };
    /* La vista «por sede» solo existe en el corte por operador. */
    if (todo.corte !== "operador") todo.por = undefined;
    for (const [k, v] of Object.entries(todo)) if (v) q.set(k, v);
    return `/super-admin/reportes?${q.toString()}` as Route;
  };

  const rangos = [
    { label: "Hoy", desde: hoy, hasta: hoy },
    { label: "Últimos 7 días", desde: sumarDias(hoy, -6), hasta: hoy },
    { label: "Últimos 30 días", desde: sumarDias(hoy, -29), hasta: hoy },
    { label: "Mes en curso", desde: `${hoy.slice(0, 8)}01`, hasta: hoy },
  ];

  /* Las columnas de cifras: las monedas y, en el corte por operador, las sedes. */
  const columnas = corte === "operador" ? [COLUMNA_SEDES, ...monedas] : monedas;

  return (
    <>
      <PageHeader
        title="Reportes"
        description="El volumen de la red: lo operado en cada moneda, contando cada operación completada una vez."
        actions={
          /* Enlaces corrientes y no `Link`: un archivo no se precarga. */
          <div className="flex flex-col gap-2 sm:flex-row">
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
        <FormularioPeriodo
          key={`${desde}-${hasta}`}
          ruta="/super-admin/reportes"
          className="grid grid-cols-2 gap-4 lg:max-w-xl lg:items-end"
        >
          <input type="hidden" name="corte" value={corte} />
          {vista === "sede" && corte === "operador" ? <input type="hidden" name="por" value="sede" /> : null}
          <label className="flex flex-col gap-2 text-label font-semibold text-text-primary">
            Desde
            <Input type="date" name="desde" defaultValue={desde} max={hoy} className="pc-numeric" />
          </label>
          <label className="flex flex-col gap-2 text-label font-semibold text-text-primary">
            Hasta
            <Input type="date" name="hasta" defaultValue={hasta} max={hoy} className="pc-numeric" />
          </label>
        </FormularioPeriodo>
      </section>

      {recortado ? (
        <Alert variant="info" title="El periodo máximo es de un año" className="mb-8">
          Se muestra desde el {diaLargo(desde)} hasta el {diaLargo(hasta)}.
        </Alert>
      ) : null}

      {/* El total del periodo: operaciones y una cifra por moneda, nunca sumadas entre sí. */}
      <section aria-label="Total del periodo" className="mb-8">
        <h2 className="mb-4 text-section-title text-text-primary">Total del periodo</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-4">
          <Cifra etiqueta="Operaciones completadas" valor={String(total.operaciones)} largo={largoMayor} />
          {monedas.map((m) => (
            <Cifra key={m} etiqueta={`Volumen en ${m}`} valor={formatAmount(total.volumen[m] ?? 0)} largo={largoMayor} />
          ))}
        </div>
        {/* Sin operaciones se dice una vez, aquí; las tablas siguen enseñando cada fila con cero. */}
        {!hayOperaciones ? (
          <p className="mt-4 text-body text-text-secondary">No hubo ninguna operación completada en ese periodo.</p>
        ) : null}
      </section>

      {corte === "dia" && monedas.length > 0 ? (
        <GraficoPorDia key={monedas.join("-")} dias={filas} monedas={monedas} deQuien={null} />
      ) : null}

      {/* FR-SA-REP-4: el total y la comparación por sede administrada, las dos a un toque. */}
      {corte === "operador" ? (
        <section aria-labelledby="ver-operadores" className="mb-6">
          <h2 id="ver-operadores" className="mb-3 text-label font-semibold text-text-primary">
            Ver
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(
              [
                { valor: "total", label: "Total del mercante" },
                { valor: "sede", label: "Por sede administrada" },
              ] as const
            ).map((o) => {
              const activo = vista === o.valor;
              return (
                <li key={o.valor}>
                  <Link
                    href={enlace({ por: o.valor === "sede" ? "sede" : undefined })}
                    aria-current={activo ? "true" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full border px-4 text-body-sm font-semibold",
                      "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                      activo
                        ? "border-primary bg-primary-subtle text-text-primary"
                        : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                    )}
                  >
                    {o.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 max-w-3xl text-body-sm text-text-secondary">
            {porSede
              ? "Cada cifra dividida entre las sedes que el mercante administró en el periodo: sirve para comparar mercantes de distinto tamaño."
              : "Cada operación es del mercante que administraba la sede el día en que se hizo. «Sedes» son las que administró en algún momento del periodo."}
          </p>
        </section>
      ) : null}

      <TablaReporte
        key={`${corte}-${vista}-${desde}-${hasta}`}
        filas={filas}
        columnas={columnas}
        ordenable={corte === "operador" || corte === "sede" || corte === "provincia"}
        primera={PRIMERA_COLUMNA_RED[corte]}
        enteras={corte === "operador" ? [COLUMNA_SEDES] : []}
        operacionesConDecimales={porSede}
        /* FR-SA-REP-5: para ver las sedes de más y de menos actividad, la tabla abre por operaciones. */
        {...(corte === "sede" ? { ordenInicial: { clave: "operaciones", desc: true } } : {})}
        vacio="No hubo ninguna operación completada en ese periodo."
      />

      {corte === "servicio" && divisas.length > 0 ? (
        <section aria-labelledby="cambio-por-divisa" className="mt-10">
          <h2 id="cambio-por-divisa" className="text-section-title text-text-primary">
            Cambio de moneda por divisa
          </h2>
          <p className="mb-4 mt-1 text-body text-text-secondary">
            Lo comprado y lo vendido es volumen. La posición neta —comprado menos vendido— no lo es: dice cuánta
            divisa ganó o perdió la red en el periodo.
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
