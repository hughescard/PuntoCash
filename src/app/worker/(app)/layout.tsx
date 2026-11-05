import * as React from "react";
import { redirect } from "next/navigation";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { CajaProvider } from "@/features/worker/caja-context";
import { getVistaDeCaja } from "@/features/worker/sesion-servidor";
import { WorkerIdentity } from "./worker-identity";
import { WorkerSidebar } from "./worker-sidebar";

/**
 * Authenticated Worker shell — manual §10 "Estructura global de las aplicaciones".
 *
 *   Header 72px · Sidebar 240px · Área principal con padding de 32px
 *
 * La sesión se resuelve aquí, en el servidor: sin un trabajador verificado en
 * este equipo **[R13]**, o si lo desactivaron o el equipo cambió de caja, se
 * vuelve al inicio de sesión. Con sesión, la foto de su caja se entrega a
 * todas las pantallas (`CajaProvider`).
 */
export default async function WorkerAppLayout({ children }: { children: React.ReactNode }) {
  const vista = await getVistaDeCaja();
  if (!vista) redirect("/worker/login");

  return (
    <CajaProvider vista={vista}>
      <AppShell
        header={
          <AppHeader
            brand={<Logo variant="onDark" size="md" />}
            actions={
              <WorkerIdentity
                worker={{
                  fullName: vista.trabajador.fullName,
                  initials: vista.trabajador.initials,
                  caja: vista.caja.nombre,
                  sede: vista.sede.nombre,
                }}
              />
            }
          />
        }
        sidebar={<WorkerSidebar />}
      >
        <AppMain>{children}</AppMain>
      </AppShell>
    </CajaProvider>
  );
}
