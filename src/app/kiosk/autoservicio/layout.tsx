import * as React from "react";
import { cookies } from "next/headers";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { findBranchById } from "@/features/branches/branches";
import { DEVICE_COOKIE_NAMES, parseDeviceCookie } from "@/features/devices/device-cookie";
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
 *
 * El servidor lee la cookie espejo del vínculo y le dice al gate qué debe
 * pintar **antes de hidratar**, igual que hace `worker/layout.tsx`. Eso es lo
 * que evita el fotograma en blanco en un terminal de sala que ya está
 * vinculado.
 */
export default async function KioskAutoservicioLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const device = parseDeviceCookie(store.get(DEVICE_COOKIE_NAMES.kiosco)?.value);
  const branch = findBranchById(device?.branchId);

  return (
    <AppShell
      header={
        <AppHeader
          brand={<Logo variant="onDark" size="md" showDescriptor />}
          actions={<KioskHeaderActions serverBranchName={branch?.name} />}
        />
      }
    >
      <AppMain>
        <KioskDeviceGate serverLinked={device !== null}>{children}</KioskDeviceGate>
      </AppMain>
    </AppShell>
  );
}
