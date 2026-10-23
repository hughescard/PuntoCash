import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { CATALOGO_MONEDAS, monedaDelCatalogo } from "@/features/network/currencies";
import { redEnAlcance, type RedEnAlcance } from "@/features/network/scoped-reads";
import type { Sede } from "@/features/network/sedes";
import { AnadirMoneda, MonedasDeSede, type MonedaRow } from "./monedas-de-sede";

export const metadata: Metadata = {
  title: "Administración de sede · Monedas",
  robots: { index: false, follow: false },
};

/**
 * Monedas — la lista de monedas que maneja cada sede (**FR-AD-MON-1** a **FR-AD-MON-10**).
 *
 * Agrupada por sede, como Cajas: la lista es **de la sede**, no de la empresa,
 * y una sucursal puede manejar libras y otra no.
 *
 * **Toda sede activa tiene su lista, tenga o no el servicio de Cambio de
 * moneda** (decisión del 15/10/2026): una sede de solo remesas también maneja
 * efectivo en varias monedas. Por eso aquí no aparece el servicio por ninguna
 * parte; aparecerá en Tasas, que es donde condiciona algo.
 *
 * Lo que se calcula antes de ofrecer nada, para que el diálogo de retirar
 * pueda decir **antes** de confirmar si se puede y qué arrastra: qué cajas
 * tienen saldo, cuáles la tienen en cero y si es la última moneda de la sede.
 */
export default async function AdminMonedasPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);

  return (
    <>
      <PageHeader
        title="Monedas"
        description="Las monedas que maneja cada sede. Son las que sus trabajadores pueden habilitar en su caja."
      />

      {sedes.length === 0 ? (
        <Alert variant="info" title="Todavía no tienes sedes asignadas">
          Cuando PuntoCash te asigne una sede, podrás decidir aquí qué monedas maneja.
        </Alert>
      ) : (
        sedes.map((sede) => <BloqueDeSede key={sede.id} red={red} sede={sede} />)
      )}
    </>
  );
}

function BloqueDeSede({ red, sede }: { red: RedEnAlcance; sede: Sede }): React.JSX.Element {
  const editable = sede.status !== "cerrada";
  const totalCajas = red.cajasActivas(sede.id).length;
  const lista = red.monedas(sede.id);
  const esUnica = sede.status === "activa" && lista.length <= 1;

  const filas: MonedaRow[] = lista.map(({ code }) => {
    const enCajas = red.cajasConMoneda(sede.id, code);
    return {
      code,
      name: monedaDelCatalogo(code)?.name ?? code,
      cajas: enCajas.filter((c) => c.register.status === "activa").map((c) => c.register.name),
      cajasConSaldo: enCajas.filter((c) => c.saldo !== 0).map((c) => nombreDeCaja(c.register)),
      totalCajas,
      esUnica,
      tasas: red.tasasQueArrastra(sede.id, code),
    };
  });

  const enLista = new Set(lista.map((m) => m.code));
  const disponibles = CATALOGO_MONEDAS.filter((m) => !enLista.has(m.code));

  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-3">
          <Store className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {sede.name}
          {sede.status === "suspendida" ? <Badge variant="warning">Sede suspendida</Badge> : null}
          {sede.status === "cerrada" ? <Badge variant="neutral">Sede cerrada</Badge> : null}
        </span>
      }
      description={`${lista.length} ${lista.length === 1 ? "moneda" : "monedas"}`}
    >
      <MonedasDeSede sede={{ id: sede.id, name: sede.name }} filas={filas} editable={editable} />
      {/* Debajo de la lista y no en la cabecera de la sección: en un teléfono la
          cabecera no tiene sitio para el nombre de la sede y el botón a la vez,
          y «añadir otra» se lee mejor al final de lo que ya hay. */}
      {editable && disponibles.length > 0 ? (
        <div className="mt-4">
          <AnadirMoneda sede={{ id: sede.id, name: sede.name }} disponibles={disponibles} />
        </div>
      ) : null}
    </Section>
  );
}

/** Una caja retirada se nombra como tal: también cuenta al retirar una moneda (FR-AD-MON-7). */
function nombreDeCaja(r: { name: string; status: string }): string {
  return r.status === "retirada" ? `${r.name} (retirada)` : r.name;
}
