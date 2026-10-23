import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { formatAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { monedaDelCatalogo } from "@/features/network/currencies";
import { MONEDA_LOCAL } from "@/features/network/rates";
import { redEnAlcance, type RedEnAlcance } from "@/features/network/scoped-reads";
import type { Sede } from "@/features/network/sedes";

export const metadata: Metadata = {
  title: "Administración de sede · Tasas",
  robots: { index: false, follow: false },
};

/**
 * Tasas — **FR-AD-TASA-1** a **FR-AD-TASA-17**.
 *
 * Una tasa es siempre una moneda **contra el peso cubano**: lo que la sede paga
 * y lo que cobra por una unidad (decisión del 15/10/2026). Es lo que el
 * cliente lee en el tablero, y el tablero lo lee de aquí.
 *
 * ── Dos formas, según el alcance ──────────────────────────────────────────
 * Esta pantalla es **siempre la tabla**, una columna por cada sede que deja
 * ver el selector de la cabecera: todas, o solo la filtrada. No edita nada
 * (**FR-AD-TASA-9**): cada sede responde de su tasa, y cambiar varias a la vez
 * no debe ser posible. Para cambiar las de una sede se entra en **su propia
 * ruta**, `/admin/tasas/[sedeId]`, que **no toca el filtro de la cabecera**.
 * La primera versión entraba cambiando ese filtro, y al volver a Tasas desde
 * el menú la pantalla seguía filtrada sin que nada lo hiciera evidente.
 */
export default async function AdminTasasPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);

  return (
    <>
      <PageHeader
        title="Tasas"
        /* **FR-AD-TASA-6**: lo que se edita aquí no es una cifra interna. */
        description="Esta es la tasa con la que cotiza cada sede y la que muestra su tablero de tasas en el kiosco y en la pantalla informativa."
      />

      {sedes.length === 0 ? (
        <Alert variant="info" title="Todavía no tienes sedes asignadas">
          Cuando PuntoCash te asigne una sede, podrás fijar aquí sus tasas.
        </Alert>
      ) : (
        <Comparativa red={red} sedes={sedes} />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
 * Todas mis sedes — FR-AD-TASA-9
 * ---------------------------------------------------------------------- */

interface FilaComparativa {
  code: string;
  name: string;
  /** Por sede: las cifras, o por qué no hay. */
  celdas: Record<string, { cifras: string; fijada: boolean } | { nota: string }>;
}

function Comparativa({
  red,
  sedes,
}: {
  red: RedEnAlcance;
  sedes: readonly Sede[];
}): React.JSX.Element {
  const codes: string[] = [];
  for (const sede of sedes) {
    for (const m of red.monedas(sede.id)) {
      if (m.code !== MONEDA_LOCAL && !codes.includes(m.code)) codes.push(m.code);
    }
  }

  const filas: FilaComparativa[] = codes.map((code) => ({
    code,
    name: monedaDelCatalogo(code)?.name ?? code,
    celdas: Object.fromEntries(
      sedes.map((sede) => {
        const t = red.tasas(sede.id).find((x) => x.code === code);
        const motivo = red.motivoSinCotizacion(sede.id, code);
        if (t && !motivo) {
          return [
            sede.id,
            {
              cifras: `${formatAmount(t.compra, 2)} / ${formatAmount(t.venta, 2)}`,
              fijada: Boolean(t.fijadaAlLimite),
            },
          ];
        }
        const nota =
          motivo === "sin-servicio"
            ? "No cotiza"
            : motivo === "fuera-de-la-lista"
              ? "No la maneja"
              : motivo === "sin-rango"
                ? "Sin rango de PuntoCash"
                : motivo === "sin-moneda-local"
                  ? "Sin peso cubano"
                  : "Sin tasa";
        return [sede.id, { nota }];
      }),
    ),
  }));

  const fijadas = sedes.flatMap((sede) =>
    red
      .tasas(sede.id)
      .filter((t) => t.fijadaAlLimite)
      .map((t) => ({ sede, code: t.code })),
  );

  const columnas: ResponsiveColumn<FilaComparativa>[] = [
    {
      key: "moneda",
      header: "Moneda",
      cell: (fila) => <NombreMoneda code={fila.code} name={fila.name} />,
      hiddenOnCard: true,
    },
    ...sedes.map((sede) => ({
      key: sede.id,
      header: sede.name,
      cell: (fila: FilaComparativa) => {
        const celda = fila.celdas[sede.id];
        if (!celda) return null;
        if ("nota" in celda) return <span className="text-text-secondary">{celda.nota}</span>;
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="pc-numeric">{celda.cifras}</span>
            {celda.fijada ? <Badge variant="warning">Ajustada por PuntoCash</Badge> : null}
          </span>
        );
      },
    })),
  ];

  return (
    <>
      {/* **FR-AD-TASA-9**: lo que la pantalla impide, y cómo llegar a hacerlo.
          Con una sola sede a la vista no hay nada que comparar ni que impedir. */}
      {sedes.length > 1 ? (
        <Alert variant="info" title="Las tasas se cambian sede por sede" className="mb-8">
          Aquí se comparan. Para fijar o cambiar las de una sede, entra en ella.
        </Alert>
      ) : null}

      {fijadas.length > 0 ? (
        <Alert variant="warning" title="PuntoCash cambió un rango y ajustó tasas" className="mb-8">
          {fijadas.map((f, i) => (
            <React.Fragment key={`${f.sede.id}-${f.code}`}>
              {i > 0 ? ", " : null}
              <Link
                href={`/admin/tasas/${f.sede.id}` as Route}
                className="font-semibold underline underline-offset-4"
              >
                {f.code} en {f.sede.name}
              </Link>
            </React.Fragment>
          ))}
          . Confírmalas o elige otras desde su sede.
        </Alert>
      ) : null}

      <Section title="Compra / venta en CUP">
        <ResponsiveTable
          rows={filas}
          columns={columnas}
          rowKey={(fila) => fila.code}
          cardTitle={(fila) => <NombreMoneda code={fila.code} name={fila.name} />}
          empty={<p className="text-body text-text-secondary">Tus sedes no manejan ninguna moneda además del peso cubano.</p>}
        />
      </Section>

      <Section title={sedes.length > 1 ? "Cambiar las tasas de una sede" : "Cambiar las tasas"}>
        <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {sedes.map((sede) => (
            <li key={sede.id}>
              <Button variant="secondary" className="w-full sm:w-auto" asChild>
                <Link href={`/admin/tasas/${sede.id}` as Route}>
                  {sede.name}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function NombreMoneda({ code, name }: { code: string; name: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-3">
      <CurrencyFlag currency={code} />
      <span className="pc-numeric font-semibold text-text-primary">{code}</span>
      <span className="text-text-secondary">{name}</span>
    </span>
  );
}
