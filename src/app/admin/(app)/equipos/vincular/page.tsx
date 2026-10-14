import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { formatPairingCode, retosDeDemostracion } from "@/features/network/devices";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { VincularFlow, type SedeParaVincular } from "./vincular-flow";

export const metadata: Metadata = {
  title: "Administración de sede · Vincular un equipo",
  robots: { index: false, follow: false },
};

/**
 * El acto de vincular — **§3.4**, **FR-AD-EQ-17 a FR-AD-EQ-24**.
 *
 * **Es el único sitio del producto desde el que un equipo se vincula**
 * (**FR-AD-EQ-3**, **A10**). El Super Admin ve estos mismos equipos en toda
 * la red y no toca ninguno.
 *
 * Lo que el servidor resuelve antes de pintar nada:
 *
 *   · **Las sedes del alcance**, y solo esas (**FR-AD-EQ-7**, **A1**). Una
 *     cerrada no admite equipos —el dominio la rechaza— así que tampoco se
 *     ofrece; una suspendida sí, porque la suspensión es temporal y montar la
 *     sucursal mientras tanto es precisamente lo que hay que poder hacer.
 *   · **Las cajas de cada una, con su equipo si lo tienen.** El selector las
 *     necesita para marcar inhabilitadas las que ya están ocupadas y decir
 *     cuál las ocupa (**FR-AD-EQ-8**), y se leen por la vista con alcance, no
 *     del dominio a pelo.
 *
 * Que la pantalla no ofrezca una sede ajena es comodidad: el control está en
 * `vincularEquipo`, que comprueba el alcance **antes** que el propio reto,
 * para que un reto válido presentado contra una sede ajena no se distinga de
 * uno inválido.
 */
export default async function AdminVincularEquipoPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const red = redEnAlcance(session.scope);

  const sedes: readonly SedeParaVincular[] = session.sedes
    .filter((sede) => sede.status !== "cerrada")
    .map((sede) => ({
      id: sede.id,
      name: sede.name,
      suspendida: sede.status === "suspendida",
      cajas: red.cajasActivas(sede.id).map((caja) => ({
        id: caja.id,
        name: caja.name,
        equipoId: red.equipoDeCaja(caja.id)?.id ?? null,
      })),
    }));

  /* Andamio de la demostración, no del producto: mientras Worker y Kiosco
     resuelvan su vínculo en el `localStorage` del terminal, su código no llega
     a este servidor y esta pantalla no tendría ninguno que encontrar
     (**FR-AD-EQ-26**). Desaparece con **FR-DEV-8**. */
  const retosDemo = retosDeDemostracion().map((reto) => ({
    deviceId: reto.deviceId,
    kind: reto.kind,
    codigo: formatPairingCode(reto.code),
  }));

  return (
    <>
      <PageHeader
        title="Vincular un equipo"
        description="Identifica el equipo por su QR o su código de seis cifras, y elige a qué se ata."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/equipos">
              <ArrowLeft aria-hidden="true" />
              Volver a Equipos
            </Link>
          </Button>
        }
      />

      {sedes.length === 0 ? (
        <Alert variant="info" title="No hay ninguna sede a la que vincular un equipo">
          Tus sedes están cerradas, o todavía no tienes ninguna asignada.
        </Alert>
      ) : (
        <VincularFlow sedes={sedes} retosDemo={retosDemo} />
      )}
    </>
  );
}
