"use client";

import * as React from "react";
import Link from "next/link";
import { Home, MapPin } from "lucide-react";

import { ensurePairingChallenge, useKioskBranch, useKioskDevice } from "@/features/kiosk/device-session";
import { KioskPairingScreen } from "./kiosk-pairing-screen";

/**
 * Wraps every screen of `/kiosk/autoservicio`. A kiosk without a device
 * session never reaches the catalog or a flow: it shows the pairing screen
 * instead (Autoservicio FRD FR-AS-LINK-1). If the admin unlinks the device
 * while a client is mid-flow, the flow is dropped on the spot — the
 * `storage` subscription in `device-session.ts` re-renders this gate the
 * moment the link disappears (FR-AS-LINK-6).
 */
export function KioskDeviceGate({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  const device = useKioskDevice();

  React.useEffect(() => {
    // First start ever: create the device and its first pairing challenge.
    if (device === null) ensurePairingChallenge();
  }, [device]);

  // Not hydrated yet, or the device is being created: render nothing rather
  // than flash the pairing screen at a kiosk that is already linked.
  if (device === undefined || device === null) return null;
  if (device.status === "unlinked") return <KioskPairingScreen device={device} />;
  return <>{children}</>;
}

/**
 * Right-hand side of the kiosk header. A linked kiosk shows which sede it
 * belongs to — so the client knows which counters will honour their code —
 * and the permanent "Inicio". An unlinked kiosk shows neither: there is no
 * catalog to go back to, and no sede to name.
 */
export function KioskHeaderActions(): React.JSX.Element | null {
  const branch = useKioskBranch();
  if (!branch) return null;

  return (
    <>
      <span className="inline-flex items-center gap-2 px-2 text-label text-text-on-primary-muted">
        <MapPin className="size-[18px] text-gold" aria-hidden="true" />
        <span className="font-semibold text-white">{branch.name}</span>
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
