import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { EquiposTabs, type PestanaEquipos } from "./equipos-tabs";
import { CajasYEquipos, type CajaEquipoRow } from "./cajas-y-equipos";
import { KioscosDeSede, type KioscoRow } from "./kioscos-de-sede";

export const metadata: Metadata = {
  title: "Administración de sede · Equipos",
  robots: { index: false, follow: false },
};

/**
 * Equipos — **§3 del FRD**. La sección que Worker y Kiosco dan por existente:
 * sin ella, ninguna de las dos superficies arranca.
 *
 * ── Qué hay y qué falta ──────────────────────────────────────────────────
 * Las dos pestañas, **Cajas** y **Kioscos**, con sus listados y su
 * desvinculación. Falta el acto de vincular —con sus dos vías, QR y código— en
 * `/admin/equipos/vincular`, que hoy es un marcador.
 *
 * ── Lo que esta pantalla no afirma, a propósito ───────────────────────────
 * Dos columnas que los requisitos piden y que el dominio **no sabe** para toda
 * la red, cada una por su razón, y ninguna de las dos se inventa:
 *
 *   · El **estado de la jornada** de cada caja (**FR-AD-EQ-5**). Vive en
 *     `caja-data.ts` y los flujos de Worker que la abren corren en el navegador
 *     del trabajador, así que desde el servidor solo se vería la de una caja
 *     simulada (ver `features/admin/register-guards.ts`). Llega con §9.
 *   · Las **solicitudes generadas en el periodo** por cada kiosco
 *     (**FR-AD-EQ-12**). Las produce el propio kiosco y viven en su navegador
 *     (`features/kiosk/self-service-request.ts`), no en la red. Llega cuando
 *     las solicitudes se modelen para toda la red, con §10 y §11.
 *
 * Una columna que siempre dijera «cerrada» o «0» se leería como un dato y no
 * como una ausencia, y este demo es la referencia que van a copiar quienes
 * implementen.
 */
export default async function AdminEquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ pestana?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { pestana } = await searchParams;
  /* Cajas por defecto (**FR-AD-EQ-1**), y cualquier otro valor en la URL cae
     ahí: una pestaña inventada a mano no debe dejar la pantalla en blanco. */
  const activa: PestanaEquipos = pestana === "kioscos" ? "kioscos" : "cajas";

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);

  /* Solo las cajas **activas**: una retirada no puede tener equipo —el dominio
     no deja retirarla si lo tiene (**FR-AD-CAJA-10**)— así que listarla aquí
     solo añadiría filas sobre las que no hay nada que hacer. Su histórico se
     consulta en Cajas. */
  const filas: readonly CajaEquipoRow[] = sedes.flatMap((sede) =>
    red.cajasActivas(sede.id).map((caja): CajaEquipoRow => {
      const equipo = red.equipoDeCaja(caja.id);
      return {
        id: caja.id,
        sede: sede.name,
        caja: caja.name,
        equipo: equipo
          ? {
              id: equipo.id,
              label: equipo.label,
              vinculadoEl: formatDate(new Date(equipo.linkedAt)),
              por: equipo.linkedBy,
              ultimaActividad: equipo.lastSeenAt
                ? formatDateTime(new Date(equipo.lastSeenAt))
                : null,
            }
          : null,
      };
    }),
  );

  /* **FR-AD-EQ-6**: las cajas sin equipo **primero**. `sort` es estable, así
     que dentro de cada grupo se conserva el orden de llegada —por sede y por
     caja—, que es el que alguien espera al recorrer la lista. */
  const ordenadas = [...filas].sort(
    (a, b) => Number(Boolean(a.equipo)) - Number(Boolean(b.equipo)),
  );

  const sinEquipo = filas.filter((fila) => fila.equipo === null).length;

  /* **FR-AD-EQ-12**: solo los kioscos **vinculados**, y de sedes del alcance.
     Una sede sin kioscos no aparece, y no es una omisión: un kiosco es
     opcional, así que su ausencia no afirma nada que haya que corregir. */
  const kioscos: readonly KioscoRow[] = sedes.flatMap((sede) =>
    red.kioscos(sede.id).map((kiosco): KioscoRow => ({
      id: kiosco.id,
      sede: sede.name,
      label: kiosco.label,
      vinculadoEl: formatDate(new Date(kiosco.linkedAt)),
      por: kiosco.linkedBy,
      ultimaActividad: kiosco.lastSeenAt ? formatDateTime(new Date(kiosco.lastSeenAt)) : null,
    })),
  );

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Las máquinas de tus sedes: la caja de cada mostrador y los kioscos de autoservicio."
        actions={
          <Button asChild>
            <Link href="/admin/equipos/vincular">
              <Link2 aria-hidden="true" />
              Vincular un equipo
            </Link>
          </Button>
        }
      />

      <EquiposTabs activa={activa} cuentaCajas={filas.length} cuentaKioscos={kioscos.length} />

      {activa === "cajas" ? (
        <>
          {/* **FR-AD-EQ-6**: una caja sin equipo es una caja en la que nadie
              puede iniciar sesión, así que se dice arriba y no se deja al
              lector contar filas. */}
          {sinEquipo > 0 ? (
            <Alert
              variant="warning"
              title={
                sinEquipo === 1
                  ? "Una de tus cajas no tiene equipo vinculado"
                  : `${sinEquipo} de tus cajas no tienen equipo vinculado`
              }
              className="mb-8"
            >
              En una caja sin equipo no puede iniciar sesión ningún trabajador. Vincúlale uno para
              ponerla a operar.
            </Alert>
          ) : null}

          <CajasYEquipos filas={ordenadas} />
        </>
      ) : (
        <Section
          title="Kioscos de autoservicio"
          description="Se atan a la sede, no a un mostrador, y una sede puede tener varios."
        >
          <KioscosDeSede filas={kioscos} />
        </Section>
      )}
    </>
  );
}
