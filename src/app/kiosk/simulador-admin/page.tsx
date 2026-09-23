import type { Metadata } from "next";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui";
import { KioskLinkSimulator } from "./kiosk-link-simulator";

export const metadata: Metadata = {
  title: "Simulador · Equipos de la sede",
  description: "Simulación de demostración del panel del administrador de sede.",
  robots: { index: false, follow: false },
};

/**
 * DEMO-ONLY. Stand-in for the "Kioscos de autoservicio" and "Cajas" sections of the sede
 * admin's web panel, which does not exist yet (see `ARCHITECTURE.md`). A
 * kiosk or a caja cannot be used until an admin links it, so without this
 * the demo would stop at the pairing screen. Delete it once `/admin` ships
 * the real sections.
 */
export default function KioskAdminSimulatorPage() {
  return (
    <AppShell
      header={
        <AppHeader
          brand={<Logo variant="onDark" size="md" />}
          actions={<Badge variant="accent">Simulador de demostración</Badge>}
        />
      }
    >
      <AppMain constrained>
        <KioskLinkSimulator />
      </AppMain>
    </AppShell>
  );
}
