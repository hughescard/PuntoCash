import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { findSedeById } from "@/features/network/sedes";
import { asignacionVigente, estadoDeSede } from "@/features/network/assignments";
import { findOperatorById } from "@/features/network/operators";
import { municipioDeLocalidad, provinciaDeLocalidad } from "@/features/geography/provincias-de-cuba";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { EditarSedeForm } from "./editar-sede-form";

export const metadata: Metadata = {
  title: "Super administración · Editar sede",
  robots: { index: false, follow: false },
};

/**
 * Editar los datos de una sede. Código y nombre siempre; dirección, municipio,
 * teléfono y horario solo mientras no tiene operador (decisión del 27/10):
 * con operador, esos datos son del mercante, que es quien está en la sucursal.
 */
export default async function SuperAdminEditarSedePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const { id } = await params;
  const sede = findSedeById(id);
  if (!sede || sede.status === "cerrada") notFound();

  const sinAsignar = estadoDeSede(sede) === "sin-asignar";
  const tramo = asignacionVigente(sede.id);
  const operador = tramo ? findOperatorById(tramo.operatorId)?.name ?? null : null;

  return (
    <>
      <PageHeader
        title={`Editar ${sede.name}`}
        description={sede.code}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/super-admin/sedes/${sede.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a la ficha
            </Link>
          </Button>
        }
      />
      <EditarSedeForm
        sede={{
          id: sede.id,
          codigo: sede.code,
          nombre: sede.name,
          direccion: sede.address,
          provincia: provinciaDeLocalidad(sede.locality),
          municipio: municipioDeLocalidad(sede.locality),
          telefono: sede.phone,
          horario: sede.horario,
        }}
        contactoEditable={sinAsignar}
        operador={operador}
      />
    </>
  );
}
