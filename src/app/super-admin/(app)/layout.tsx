import * as React from "react";
import { redirect } from "next/navigation";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { SEDES } from "@/features/network/sedes";
import { estadoDeSede } from "@/features/network/assignments";
import { SuperAdminBrand, SuperAdminIdentity } from "./sa-identity";
import { SuperAdminMobileNav } from "./sa-mobile-nav";
import { SuperAdminSidebar } from "./sa-sidebar";
import type { SuperAdminNavBadges } from "./sa-nav";

/**
 * Shell de la consola de PuntoCash (FR-SA-SHELL-1): la misma composición que
 * Admin de sede —cabecera, barra lateral en tres bloques, área de trabajo— y,
 * como ella, fluida y usable en un teléfono (FR-SA-SHELL-6).
 *
 * La sesión se resuelve aquí, en el servidor, antes de representar nada; una
 * cuenta desactivada con la sesión abierta vuelve al acceso en la siguiente
 * petición.
 */
export default async function SuperAdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const sinAsignar = SEDES.filter((sede) => estadoDeSede(sede) === "sin-asignar").length;
  const badges: SuperAdminNavBadges = { sedes: sinAsignar > 0 ? sinAsignar : undefined };

  return (
    <AppShell
      fluid
      header={<AppHeader brand={<SuperAdminBrand />} actions={<SuperAdminIdentity session={session} />} />}
      sidebar={<SuperAdminSidebar badges={badges} principal={session.user.isPrincipal} />}
      bottomBar={
        <SuperAdminMobileNav
          badges={badges}
          principal={session.user.isPrincipal}
          fullName={session.user.fullName}
          area={session.user.area}
        />
      }
    >
      <AppMain>{children}</AppMain>
    </AppShell>
  );
}
