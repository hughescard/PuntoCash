import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES } from "@/features/network/sedes";
import { OPERATORS } from "@/features/network/operators";
import { asignacionVigente } from "@/features/network/assignments";
import { CATALOGO_MONEDAS, monedasDeSede } from "@/features/network/currencies";
import { MONEDA_LOCAL, motivoFueraDeVigor, rangoDe, SERVICIO_CAMBIO, tasaDe, tasasDeSede } from "@/features/network/rates";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { fechaCorta, fechaYHora } from "@/app/admin/(app)/jornadas/formato";
import { TablaDeRangos, type FilaDeRango } from "./tabla-de-rangos";
import { TasasPorSede, type SedeConTasas } from "./tasas-por-sede";

export const metadata: Metadata = {
  title: "Super administración · Monedas y tasas",
  robots: { index: false, follow: false },
};

/**
 * Monedas y tasas — el marco dentro del cual cada operador fija sus tasas.
 *
 * Dos vistas:
 *
 *   · **Monedas y rangos** (decisión del 27/10): una tabla, una fila por moneda
 *     del catálogo, con su rango de compra y de venta contra el CUP. Sin
 *     rango, nadie la cotiza. El catálogo es fijo (decisión del 28/10).
 *   · **Tasas por sede** (decisión del 28/10): de solo lectura y sin capa de
 *     alertas. Qué monedas tiene y qué tasa publica cada sede.
 */
export default async function SuperAdminMonedasYTasasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;
  const vista = inicial.vista === "sedes" ? "sedes" : "rangos";
  const red = redEnAlcance(GLOBAL_SCOPE);
  const vivas = SEDES.filter((s) => s.status !== "cerrada");

  const filas: FilaDeRango[] = CATALOGO_MONEDAS.filter((m) => m.code !== MONEDA_LOCAL).map((m) => {
    const rango = rangoDe(m.code);
    const conLaMoneda = vivas.filter((s) => monedasDeSede(s.id).some((x) => x.code === m.code));
    const tasas = vivas
      .map((s) => ({ s, t: tasaDe(s.id, m.code) }))
      .filter((x): x is { s: (typeof vivas)[number]; t: NonNullable<ReturnType<typeof tasaDe>> } => x.t !== null)
      .map(({ s, t }) => ({ sedeId: s.id, sedeNombre: s.name, compra: t.compra, venta: t.venta }));
    return {
      code: m.code,
      nombre: m.name,
      rango: rango ? { compra: rango.compra, venta: rango.venta } : null,
      actualizadoEl: rango ? fechaCorta(rango.updatedAt) : null,
      actualizadoPor: rango ? rango.updatedBy : null,
      enLista: conLaMoneda.length,
      /* Las que la tienen en su lista y Cambio de moneda: las que la cotizarían con rango. */
      esperando: rango ? 0 : conLaMoneda.filter((s) => s.services.includes(SERVICIO_CAMBIO)).length,
      cotizan: vivas.filter((s) => red.tablero(s.id).some((t) => t.currency === m.code)).length,
      tasas,
    };
  });

  const sedes: SedeConTasas[] = vivas
    .map((s) => {
      const opId = asignacionVigente(s.id)?.operatorId ?? null;
      const definidas = tasasDeSede(s.id);
      return {
        id: s.id,
        nombre: s.name,
        codigo: s.code,
        operadorId: opId,
        operador: opId ? OPERATORS.find((o) => o.id === opId)?.name ?? null : null,
        cambio: s.services.includes(SERVICIO_CAMBIO),
        monedas: monedasDeSede(s.id).map((m) => {
          const t = definidas.find((x) => x.code === m.code) ?? null;
          const rango = rangoDe(m.code);
          return {
            code: m.code,
            nombre: CATALOGO_MONEDAS.find((c) => c.code === m.code)?.name ?? m.code,
            local: m.code === MONEDA_LOCAL,
            compra: t?.compra ?? null,
            venta: t?.venta ?? null,
            enVigor: t !== null && motivoFueraDeVigor(s.id, m.code) === null,
            sinRango: m.code !== MONEDA_LOCAL && !rango,
            rango: rango ? { compra: rango.compra, venta: rango.venta } : null,
            cambio: t ? `${fechaYHora(t.updatedAt)} · ${t.updatedBy}` : null,
            fijadaAuto: Boolean(t?.fijadaAlLimite),
          };
        }),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      <PageHeader
        title="Monedas y tasas"
        description="El rango de cada moneda contra el peso cubano, y las tasas que publica cada sede dentro de él."
      />

      <nav aria-label="Vistas" className="mb-6 flex gap-1 border-b border-border">
        <Pestana href="/super-admin/monedas-y-tasas" activa={vista === "rangos"}>
          Monedas y rangos
        </Pestana>
        <Pestana href="/super-admin/monedas-y-tasas?vista=sedes" activa={vista === "sedes"}>
          Tasas por sede
        </Pestana>
      </nav>

      {vista === "rangos" ? <TablaDeRangos filas={filas} /> : <TasasPorSede sedes={sedes} inicial={inicial} />}
    </>
  );
}

function Pestana({ href, activa, children }: { href: string; activa: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <Link
      href={href as Route}
      aria-current={activa ? "page" : undefined}
      className={cn(
        "-mb-px inline-flex min-h-control-sm items-center border-b-2 px-4 text-label font-medium outline-none focus-visible:underline",
        activa ? "border-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </Link>
  );
}
