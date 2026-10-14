"use client";

import * as React from "react";
import Link from "next/link";
import { Home, MapPin } from "lucide-react";

import {
  ensurePairingChallenge,
  syncKioskDeviceCookie,
  useKioskBranch,
  useKioskDevice,
} from "@/features/kiosk/device-session";
import { KioskPairingScreen } from "./kiosk-pairing-screen";

/**
 * Envuelve toda pantalla de `/kiosk/autoservicio`. Un kiosco sin sesión de
 * dispositivo no llega nunca al catálogo ni a un flujo: muestra la pantalla de
 * vinculación (Autoservicio FRD **FR-AS-LINK-1**). Si el administrador lo
 * desvincula con un cliente a medio flujo, el flujo cae en el momento — la
 * suscripción a `storage` de `device-session.ts` vuelve a representar este gate
 * en cuanto el vínculo desaparece (**FR-AS-LINK-6**).
 *
 * Tiene dos fuentes, igual que su gemelo de Worker (`RegisterDeviceGate`), y
 * usa cada una cuando sirve:
 *
 *   · **Antes de hidratar**, la del servidor: `serverLinked`, leída de la
 *     cookie espejo (`features/devices/device-cookie.ts`). Antes este gate
 *     devolvía `null` hasta hidratar, que es el fotograma en blanco que esa
 *     cookie existe para eliminar — y el espejo del kiosco se escribía sin que
 *     nadie lo leyera.
 *   · **Después**, la del propio equipo: `localStorage`, que es la fuente de
 *     verdad y la única que se entera al instante de un vínculo o un
 *     desvínculo.
 */
export function KioskDeviceGate({
  serverLinked,
  children,
}: {
  serverLinked: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const device = useKioskDevice();

  React.useEffect(() => {
    // Primer arranque: crear el equipo y su primer reto de vinculación.
    if (device === null) {
      ensurePairingChallenge();
      return;
    }
    /* Un kiosco ya vinculado antes de que el espejo existiera, o uno al que le
       limpiaron las cookies: reescribirlo para que la próxima carga no empiece
       mostrando la pantalla de vinculación. */
    if (device !== undefined) syncKioskDeviceCookie();
  }, [device]);

  // Todavía sin hidratar, o el equipo se está creando: la respuesta buena es
  // la que ya tomó el servidor.
  if (device === undefined || device === null) {
    return serverLinked ? <>{children}</> : <KioskPairingScreen />;
  }

  if (device.status === "unlinked") return <KioskPairingScreen />;
  return <>{children}</>;
}

/**
 * Right-hand side of the kiosk header. A linked kiosk shows which sede it
 * belongs to — so the client knows which counters will honour their code —
 * and the permanent "Inicio". An unlinked kiosk shows neither: there is no
 * catalog to go back to, and no sede to name.
 */
export function KioskHeaderActions({
  serverBranchName,
}: {
  serverBranchName?: string;
}): React.JSX.Element | null {
  const branch = useKioskBranch();
  /* Antes de hidratar, el nombre que leyó el servidor de la cookie espejo; en
     cuanto el navegador responde, el suyo, que es el que se entera de un
     desvínculo al instante. */
  const name = branch?.name ?? serverBranchName;
  if (!name) return null;

  return (
    <>
      <span className="inline-flex items-center gap-2 px-2 text-label text-text-on-primary-muted">
        <MapPin className="size-[18px] text-gold" aria-hidden="true" />
        <span className="font-semibold text-white">{name}</span>
      </span>
      <span aria-hidden="true" className="h-6 w-px bg-white/15" />
      <Link
        href="/kiosk/autoservicio"
        className="inline-flex h-control items-center gap-2 rounded-control px-4 text-label font-semibold text-white transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-white/[0.08] outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <Home className="size-[18px]" aria-hidden="true" />
        Inicio
      </Link>
    </>
  );
}
