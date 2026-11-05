import * as React from "react";

import { TERMINALS } from "@/features/network/devices";
import { findSedeById } from "@/features/network/sedes";
import { getEquipo } from "@/features/worker/sesion-servidor";
import { RegisterDeviceGate } from "./_device/register-device-gate";

/**
 * Toda ruta de Worker se usa en un equipo vinculado a una caja de una sede
 * (Worker FRD §2.1, FR-DEV-1.1). **Lo decide el servidor**, preguntando a la
 * red con el identificador que guarda la cookie del equipo: el mismo registro
 * en el que el administrador lo vinculó desde `/admin/equipos/vincular`.
 */
export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { sesion } = await getEquipo();
  const linked = sesion?.status === "vinculado";

  /* Solo en la demostración: los equipos de caja que la red ya tiene, para
     que este navegador pueda ser uno de ellos. */
  const equiposDemo = linked
    ? []
    : TERMINALS.filter((t) => t.kind === "caja" && t.registerId).map((t) => ({
        id: t.id,
        label: t.label,
        sede: findSedeById(t.branchId)?.name ?? "",
      }));

  return (
    <RegisterDeviceGate linked={linked} equiposDemo={equiposDemo}>
      {children}
    </RegisterDeviceGate>
  );
}
