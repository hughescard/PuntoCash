import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { inventarioDeRed, VENTANA_DE_USO_DIAS } from "@/features/super-admin/inventario";
import { EquiposTabs, type PestanaEquipos } from "./equipos-tabs";
import { CajasDeRedList, type CajaRow } from "./cajas-list";
import { KioscosDeRedList, type KioscoRow } from "./kioscos-list";
import { fechaCorta, fechaYHora } from "@/app/admin/(app)/jornadas/formato";

export const metadata: Metadata = {
  title: "Super administración · Cajas y equipos",
  robots: { index: false, follow: false },
};

/**
 * Cajas y equipos de la red — el inventario de todo lo que está montado.
 *
 * **Enteramente de solo lectura.** No hay un control para crear una caja, ni
 * para vincular un equipo, ni deshabilitado: eso lo hace el administrador de
 * la sede, delante del aparato. La pantalla lo dice en lugar de dejar el
 * hueco, porque la primera reacción de quien llega aquí es buscar el botón.
 *
 * Las sedes **sin ninguna caja** no caben en una tabla de cajas, así que se
 * anuncian encima con enlace al listado de Sedes, que ya filtra por eso.
 */
export default async function SuperAdminEquiposPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;
  const activa: PestanaEquipos = inicial.pestana === "kioscos" ? "kioscos" : "cajas";

  const { cajas, kioscos, sinCajas } = inventarioDeRed();

  const filasCajas: CajaRow[] = cajas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    sedeId: c.sede.id,
    sede: c.sede.nombre,
    codigoSede: c.sede.codigo,
    provincia: c.sede.provincia,
    operadorId: c.operador?.id ?? null,
    operador: c.operador?.name ?? null,
    estado: c.estado,
    retiro: c.retiro ? { fecha: fechaCorta(c.retiro.at), motivo: c.retiro.motivo } : null,
    equipo: c.equipo
      ? {
          id: c.equipo.id,
          label: c.equipo.label,
          vinculado: fechaCorta(c.equipo.linkedAt),
          vinculadoPor: c.equipo.linkedBy,
        }
      : null,
    jornada: c.jornada
      ? {
          id: c.jornada.id,
          estado: c.jornada.estado,
          trabajador: c.jornada.trabajador,
          fecha: fechaCorta(c.jornada.openedAt),
        }
      : null,
    actividad: c.ultimaActividad ? fechaYHora(c.ultimaActividad) : null,
  }));

  const filasKioscos: KioscoRow[] = kioscos.map((k) => ({
    id: k.id,
    label: k.label,
    sedeId: k.sede.id,
    sede: k.sede.nombre,
    provincia: k.sede.provincia,
    operadorId: k.operador?.id ?? null,
    operador: k.operador?.name ?? null,
    vinculado: fechaCorta(k.linkedAt),
    vinculadoPor: k.linkedBy,
    actividad: k.lastSeenAt ? fechaYHora(k.lastSeenAt) : null,
    operaciones: k.operaciones,
  }));

  return (
    <>
      <PageHeader
        title="Cajas y equipos"
        description="El inventario de la red. Las cajas las crea el administrador de cada sede, y los equipos los vincula él, delante del equipo. Aquí solo se consultan."
      />

      <EquiposTabs activa={activa} cuentaCajas={filasCajas.length} cuentaKioscos={filasKioscos.length} />

      {activa === "cajas" ? (
        <>
          {sinCajas.length > 0 ? (
            <Alert
              variant="info"
              title={
                sinCajas.length === 1
                  ? "Una sede no tiene ninguna caja y no aparece en esta tabla"
                  : `${sinCajas.length} sedes no tienen ninguna caja y no aparecen en esta tabla`
              }
              className="mb-8"
            >
              {sinCajas.map((s) => s.sede.nombre).join(", ")}. Sin cajas no pueden operar, y montarlas es cosa de su
              operador.{" "}
              <Link href={"/super-admin/sedes?sinCajas=1" as Route} className="font-semibold underline underline-offset-4">
                Verlas en Sedes
              </Link>
              .
            </Alert>
          ) : null}

          <CajasDeRedList rows={filasCajas} inicial={inicial} />
        </>
      ) : (
        <>
          <Alert variant="info" title="Las pantallas informativas no se inventarían aquí" className="mb-8">
            Una pantalla de sala no se vincula ni tiene sesión: solo muestra lo que su sede publica. El producto no
            sabe cuántas hay ni dónde están, y no es un fallo de esta pantalla.
          </Alert>

          <KioscosDeRedList rows={filasKioscos} inicial={inicial} ventanaDias={VENTANA_DE_USO_DIAS} />
        </>
      )}
    </>
  );
}
