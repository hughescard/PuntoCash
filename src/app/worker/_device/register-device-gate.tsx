"use client";

import * as React from "react";

import { Alert } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { DevicePairingPanel, SimulatorLink } from "@/components/patterns/device-pairing-panel";
import { findBranchById, findRegisterById } from "@/features/branches/branches";
import type { UnlinkedDevice } from "@/features/devices/device-link";
import {
  ensureRegisterPairingChallenge,
  registerPairingQrPayload,
  useRegisterDevice,
} from "@/features/worker/register-device";

/**
 * Wraps every `/worker` route (Worker FRD §2.1). A computer that is not yet
 * a caja never reaches the sign-in: it shows the pairing screen instead. Once
 * linked, the link is remembered and the usual access (credentials + second
 * factor) runs on top of it. If the admin unlinks the caja, whatever is on
 * screen — sign-in or an operation in progress — is replaced on the spot by
 * the pairing screen: the Worker's session on this computer ends with it.
 */
export function RegisterDeviceGate({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  const device = useRegisterDevice();

  React.useEffect(() => {
    // First start ever: create the device and its first pairing challenge.
    if (device === null) ensureRegisterPairingChallenge();
  }, [device]);

  // Not hydrated yet, or the device is being created: render nothing rather
  // than flash the pairing screen at a caja that is already linked.
  if (device === undefined || device === null) return null;
  if (device.status === "unlinked") return <RegisterPairingScreen device={device} />;
  return <>{children}</>;
}

/**
 * Full-screen, outside the shell like the sign-in (FR-SHELL-3): until the
 * device is a caja there is no sede, no caja and no Worker to show.
 */
function RegisterPairingScreen({ device }: { device: UnlinkedDevice }): React.JSX.Element {
  const previousBranch = findBranchById(device.unlinkedFrom?.branchId);
  const previousRegister = findRegisterById(device.unlinkedFrom?.registerId);

  return (
    <main className="flex min-h-screen flex-col bg-canvas px-8 py-10">
      <div className="flex justify-center">
        <Logo size="md" showDescriptor />
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center text-center">
        <p className="text-overline uppercase text-text-secondary">PuntoCash · Worker</p>
        <h1 className="mt-3 text-screen-title text-text-primary">Vincula este equipo como caja</h1>
        <p className="mt-3 max-w-2xl text-body text-text-secondary">
          Este equipo todavía no es la caja de ninguna sede. El administrador de la sede debe vincularlo desde
          su panel web, en <span className="font-semibold text-text-primary">Cajas</span>, eligiendo la sede y
          la caja. Se hace una sola vez: después, cada trabajador inicia sesión con su propia cuenta.
        </p>

        {previousBranch ? (
          <Alert variant="warning" title="Este equipo fue desvinculado" className="mt-8 w-full text-left">
            El administrador lo desvinculó de {previousRegister ? `${previousRegister.name} · ` : ""}
            {previousBranch.name} y se cerró la sesión del trabajador. Para volver a operar en este equipo,
            debe vincularlo de nuevo.
          </Alert>
        ) : null}

        <DevicePairingPanel
          className="mt-8 w-full"
          device={device}
          qrPayload={registerPairingQrPayload(device)}
          onExpired={ensureRegisterPairingChallenge}
          demoNote={
            <>
              Versión de demostración: el panel del administrador aún no existe. Para simular la vinculación,
              abre <SimulatorLink /> en otra pestaña. El QR es ilustrativo y no se puede escanear.
            </>
          }
        />
      </div>
    </main>
  );
}
