import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import type { NetworkWorker } from "@/features/network/workers";
import { AsistenciaDeAcceso } from "./asistencia-de-acceso";

export const metadata: Metadata = {
  title: "Administración de sede · Ayudar con el acceso",
  robots: { index: false, follow: false },
};

/**
 * Ayudar con el acceso — **FR-AD-TRAB-10** y **FR-AD-TRAB-11**.
 *
 * Es el caso que el PRD de producto §5.1 llama «la asistencia del
 * administrador de sede»: el trabajador dice que **no le llega el código**.
 *
 * ── Un solo remedio, y por qué ────────────────────────────────────────────
 * Si el código no llega, la causa que un administrador puede arreglar es una:
 * **el correo está mal**. Y arreglarlo vale doble, porque la recuperación de
 * contraseña de Worker (**Worker FRD §2.13**) manda su código a esa misma
 * dirección, así que con el correo equivocado tampoco esa vía le sirve.
 *
 * Hasta la v4.12 esta pantalla tenía también un «liberar el bloqueo del
 * reto». **No había tal bloqueo**: el reto es de un solo intento de acceso en
 * una sola máquina, y a quien se le agota le basta con volver al inicio de
 * sesión para que nazca otro entero (**FR-2FA-15** de Worker). El único
 * bloqueo real que un trabajador encuentra es **estar desactivado**, y eso
 * tiene su propia acción en la ficha (**FR-AD-TRAB-15**, **FR-AUTH-9**).
 *
 * ── Aquí el correo se enseña entero, y es deliberado ──────────────────────
 * El listado y la ficha lo enmascaran. Esta pantalla no: **FR-AD-TRAB-10**
 * pide mostrar el correo registrado porque el trabajo que se viene a hacer es
 * **detectar que está mal escrito**, y `j•••z@puntocash.com` esconde
 * precisamente la errata que se busca. Quien llega aquí es quien lo tecleó en
 * el alta y quien puede cambiarlo.
 */
export default async function AdminAsistenciaAccesoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const red = redEnAlcance(session.scope);

  let trabajador: NetworkWorker | null = null;
  let sedeName = "";
  for (const sede of session.sedes) {
    const encontrado = red.trabajadores(sede.id).find((w) => w.id === id);
    if (encontrado) {
      trabajador = encontrado;
      sedeName = sede.name;
      break;
    }
  }

  if (!trabajador) notFound();

  return (
    <>
      <PageHeader
        title={`Ayudar a ${trabajador.firstName} con el acceso`}
        description={`${trabajador.identifier} · ${sedeName}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/trabajadores/${trabajador.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a su ficha
            </Link>
          </Button>
        }
      />

      <AsistenciaDeAcceso
        trabajador={{
          id: trabajador.id,
          nombre: trabajador.fullName,
          primerNombre: trabajador.firstName,
          correo: trabajador.email,
        }}
      />
    </>
  );
}
