import * as React from "react";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { KioskDeviceGate, KioskHeaderActions } from "./kiosk-device-gate";

/**
 * Self-service kiosk shell — manual §10 structure, §21 "Kiosco inteligente"
 * pattern: header only, no sidebar, larger controls, guided navigation.
 *
 * The kiosk has a DEVICE session, not a person's: it is linked to one sede
 * by that sede's admin (see `@/features/kiosk/device-session`). So the header
 * names the sede, never an operator, and carries a single, always-available
 * way back to the start. Screens inside a flow add their own "Cancelar"
 * affordance, matching how the Worker flows keep exactly one escape hatch per
 * screen. Until the device is linked, `KioskDeviceGate` replaces every screen
 * with the pairing screen and the header shows only the brand.
 */
export default function KioskAutoservicioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      header={
        <AppHeader brand={<Logo variant="onDark" size="md" showDescriptor />} actions={<KioskHeaderActions />} />
      }
    >
      <AppMain>
        <KioskDeviceGate>{children}</KioskDeviceGate>
      </AppMain>
    </AppShell>
  );
}
